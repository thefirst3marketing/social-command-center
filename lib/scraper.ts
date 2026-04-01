import { supabase } from './supabase'
import { INSTAGRAM_HANDLES, TIKTOK_HANDLES } from './accounts'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!
const APIFY_BASE = 'https://api.apify.com/v2'

async function runActor(actorId: string, input: object): Promise<any[]> {
  const runRes = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const run = await runRes.json()
  const runId = run?.data?.id
  if (!runId) throw new Error(`Failed to start actor ${actorId}`)

  // Poll until finished (max 5 min)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`)
    const status = await statusRes.json()
    if (status?.data?.status === 'SUCCEEDED') break
    if (['FAILED','ABORTED','TIMED-OUT'].includes(status?.data?.status)) {
      throw new Error(`Actor ${actorId} failed: ${status?.data?.status}`)
    }
  }

  const datasetId = run?.data?.defaultDatasetId
  const itemsRes = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`)
  return itemsRes.json()
}

export async function scrapeInstagram() {
  // Run both actors - profile for follower counts, posts for content data
  const [profileItems, postItems] = await Promise.all([
    runActor('dSCLg0C3YEZ83HzYX', { usernames: INSTAGRAM_HANDLES }),
    runActor('nH2AHrwxeTRJoN5hX', { username: INSTAGRAM_HANDLES, resultsLimit: 20 }),
  ])

  // Build follower lookup by username
  const followersByUsername: Record<string, number> = {}
  for (const profile of profileItems) {
    const username = (profile.username || '').toLowerCase()
    if (username && profile.followersCount) {
      followersByUsername[username] = profile.followersCount
    }
  }

  // Attach follower count to each post
  return postItems.map((post: any) => {
    const username = (post.author || post.ownerUsername || post.username || '').toLowerCase()
    return {
      ...post,
      followersCount: followersByUsername[username] || post.followersCount || null,
    }
  })
}

export async function scrapeTikTok() {
  // Run both actors in parallel - profile for follower counts, videos for content data
  const [profileItems, videoItems] = await Promise.all([
    runActor('0FXVyOXXEmdGcV88a', {
      profiles: TIKTOK_HANDLES.map(h => `https://www.tiktok.com/@${h}`),
    }),
    runActor('GdWCkxBtKWOsKjdch', {
      profiles: TIKTOK_HANDLES.map(h => `https://www.tiktok.com/@${h}`),
      resultsType: 'user',
      maxItems: 20,
    }),
  ])

  // Build follower lookup by username
  const followersByUsername: Record<string, number> = {}
  for (const profile of profileItems) {
    const username = (profile.username || profile.uniqueId || '').toLowerCase()
    if (username && (profile.followers || profile.followerCount)) {
      followersByUsername[username] = profile.followers || profile.followerCount
    }
  }

  // Attach follower count to each video
  return videoItems.map((video: any) => {
    const username = (video.author || '').replace('@', '').toLowerCase()
    return {
      ...video,
      _followers: followersByUsername[username] || null,
    }
  })
}

export async function ingestInstagramData(items: any[]) {
  // Group posts by username
  const byUser: Record<string, any[]> = {}
  for (const item of items) {
    const user = item.author || item.ownerUsername || item.username
    if (!user) continue
    if (!byUser[user]) byUser[user] = []
    byUser[user].push(item)
  }

  for (const [username, posts] of Object.entries(byUser)) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('handle', `@${username}`)
      .eq('platform', 'instagram')
      .single()
    if (!account) continue

    const totalLikes = posts.reduce((s, p) => s + (p.numberOfLikes || p.likesCount || 0), 0)
    const totalComments = posts.reduce((s, p) => s + (p.numberOfComments || p.commentsCount || 0), 0)
    const followerCount = posts[0]?.followersCount || null

    await supabase.from('snapshots').insert({
      account_id: account.id,
      followers: followerCount,
      avg_likes: posts.length ? totalLikes / posts.length : 0,
      avg_comments: posts.length ? totalComments / posts.length : 0,
      engagement_rate: followerCount && posts.length
        ? ((totalLikes + totalComments) / posts.length / followerCount) * 100
        : null,
      raw: posts[0],
    })

    for (const p of posts) {
      const likes = p.numberOfLikes || p.likesCount || 0
      const comments = p.numberOfComments || p.commentsCount || 0
      await supabase.from('posts').upsert({
        account_id: account.id,
        post_id: p.id || p.shortCode,
        platform: 'instagram',
        posted_at: p.timestamp || p.postedAt,
        caption: (p.caption || p.textCaption || '').slice(0, 500),
        media_type: p.type || p.mediaType,
        thumbnail_url: p.displayUrl || p.thumbnailUrl,
        post_url: p.postUrl || p.url,
        likes,
        comments,
        views: p.videoViewCount || p.videoPlayCount || 0,
        saves: p.saveCount || 0,
        engagement_rate: followerCount
          ? ((likes + comments) / followerCount) * 100
          : null,
      }, { onConflict: 'post_id,platform' })
    }
  }
}

export async function ingestTikTokData(items: any[]) {
  // Items from this actor are individual videos, group by author
  const byUser: Record<string, any[]> = {}
  for (const item of items) {
    const username = (item.author || '').replace('@', '').toLowerCase()
    if (!username) continue
    if (!byUser[username]) byUser[username] = []
    byUser[username].push(item)
  }

  for (const [username, videos] of Object.entries(byUser)) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('handle', `@${username}`)
      .eq('platform', 'tiktok')
      .single()
    if (!account) continue

    const totalLikes = videos.reduce((s: number, v: any) => s + (v.diggs || v.diggCount || 0), 0)
    const totalViews = videos.reduce((s: number, v: any) => s + (v.plays || v.playCount || 0), 0)
    // followers not returned per-video, leave null until profile scraper added
    const followers = videos[0]?._followers || videos[0]?.authorMeta?.fans || null

    await supabase.from('snapshots').insert({
      account_id: account.id,
      followers,
      avg_likes: videos.length ? totalLikes / videos.length : 0,
      avg_views: videos.length ? totalViews / videos.length : 0,
      engagement_rate: followers && videos.length
        ? (totalLikes / videos.length / followers) * 100
        : null,
      raw: videos[0],
    })

    for (const v of videos) {
      const likes = v.diggs || v.diggCount || 0
      const views = v.plays || v.playCount || 0
      const comments = v.comments || v.commentCount || 0
      const shares = v.shares || v.shareCount || 0
      const saves = v.bookmarks || v.collectCount || 0

      await supabase.from('posts').upsert({
        account_id: account.id,
        post_id: v.id || v.videoId,
        platform: 'tiktok',
        posted_at: v.createTime ? new Date(v.createTime * 1000).toISOString() : null,
        caption: (v.text || '').slice(0, 500),
        media_type: 'video',
        thumbnail_url: v.cover || v.covers?.[0] || v.thumbnail,
        post_url: v.webVideoUrl || `https://www.tiktok.com/@${username}/video/${v.id}`,
        likes,
        comments,
        views,
        shares,
        saves,
        engagement_rate: followers ? (likes / followers) * 100 : null,
      }, { onConflict: 'post_id,platform' })
    }
  }
}
