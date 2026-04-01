export interface AccountInsights {
  accountId: string
  handle: string
  platform: string
  bestPostAnalysis: string
  bestTimeToPost: string
  captionPatterns: string
  weeklySummary: string
  generatedAt: string
}

export async function generateInsights(
  account: { id: string; handle: string; platform: string; client_name?: string },
  posts: any[],
  snapshot: any
): Promise<AccountInsights | null> {
  if (!posts || posts.length < 3) return null

  const sortedByPerformance = [...posts].sort((a, b) => {
    const aScore = (a.views || 0) + (a.likes || 0) * 3 + (a.comments || 0) * 5
    const bScore = (b.views || 0) + (b.likes || 0) * 3 + (b.comments || 0) * 5
    return bScore - aScore
  })

  const topPosts = sortedByPerformance.slice(0, 3)
  const bottomPosts = sortedByPerformance.slice(-3)
  const bestPost = topPosts[0]

  const postSummary = posts.map(p => ({
    caption: p.caption?.slice(0, 100) || '(no caption)',
    likes: p.likes || 0,
    comments: p.comments || 0,
    views: p.views || 0,
    postedAt: p.posted_at,
    mediaType: p.media_type,
  }))

  const prompt = `You are a social media strategist analyzing performance data for ${account.handle} on ${account.platform}.

Here is their recent post data (last ${posts.length} posts):
${JSON.stringify(postSummary, null, 2)}

Current followers: ${snapshot?.followers || 'unknown'}
Average engagement rate: ${snapshot?.engagement_rate ? parseFloat(snapshot.engagement_rate).toFixed(2) + '%' : 'unknown'}

Best performing post:
- Caption: "${bestPost.caption?.slice(0, 200) || '(no caption)'}"
- Likes: ${bestPost.likes}, Comments: ${bestPost.comments}, Views: ${bestPost.views}
- Posted: ${bestPost.posted_at}

Respond ONLY with a JSON object in this exact format, no preamble, no markdown:
{
  "bestPostAnalysis": "2-3 sentences explaining why the best post likely outperformed. Be specific about caption style, timing, content type, or engagement triggers.",
  "bestTimeToPost": "1-2 sentences on the best day and time to post based on when top posts were published.",
  "captionPatterns": "2-3 sentences on what the top performing captions have in common vs the weaker ones. Look at length, tone, hooks, CTAs.",
  "weeklySummary": "A professional 3-4 sentence paragraph suitable to send to a client. Mention the top post, overall engagement health, and one specific recommendation for next week. Write as if from The First Three agency."
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.map((c: any) => c.text || '').join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      accountId: account.id,
      handle: account.handle,
      platform: account.platform,
      bestPostAnalysis: parsed.bestPostAnalysis,
      bestTimeToPost: parsed.bestTimeToPost,
      captionPatterns: parsed.captionPatterns,
      weeklySummary: parsed.weeklySummary,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('Insights generation failed for', account.handle, err)
    return null
  }
}
