import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { posts, pillarSummary, handle, platform } = req.body
  if (!posts?.length) return res.status(400).json({ error: 'No posts provided' })

  const isIG = platform === 'instagram'
  const topPost = [...posts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0))[0]
  const bestPillar = pillarSummary?.[0]
  const worstPillar = pillarSummary?.[pillarSummary.length - 1]

  // Build rich post summaries with ALL available metrics
  const richPosts = posts.slice(0, 20).map((p: any) => {
    const base: any = {
      date: p.date,
      content: p.content,
      pillar: p.pillar,
      views: p.views,
    }
    if (isIG) {
      base.existingReach = p.existingReach
      base.newReach = p.newReach
      base.shares = p.shares
      base.saves = p.saves
      base.follows = p.follows
      base.skipRate = p.skipRate ? `${p.skipRate}%` : null
      base.watchTime = p.watchTime ? `${p.watchTime}s` : null
      base.length = p.length ? `${p.length}s` : null
      base.watchPct = p.watchPct ? `${p.watchPct.toFixed(1)}%` : null
    } else {
      base.likes = p.likes
      base.comments = p.comments
      base.saves = p.saves
    }
    return base
  })

  // Build pillar analysis
  const pillarAnalysis = pillarSummary?.map((p: any) => {
    const base: any = {
      pillar: p.pillar,
      postCount: p.postCount,
      avgViews: Math.round(p.avgViews),
      avgSaves: Math.round(p.avgSaves),
    }
    if (isIG) {
      base.avgWatchPct = p.avgWatchPct ? `${p.avgWatchPct.toFixed(1)}%` : null
    } else {
      base.avgLikes = Math.round(p.avgLikes)
      base.avgComments = Math.round(p.avgComments)
    }
    return base
  })

  const platformContext = isIG
    ? 'Instagram. Key metrics: views, existing reach (followers who saw it), new reach (non-followers), saves (intent signal), follows generated, skip rate (lower = better), and % watch time (higher = better retention).'
    : 'TikTok. Key metrics: views, likes, comments, saves.'

  const prompt = `You are a senior social media strategist at The First Three, a boutique content agency. You are analyzing @${handle} on ${platformContext}

FULL POST DATA (all ${posts.length} posts with complete metrics):
${JSON.stringify(richPosts, null, 2)}

PILLAR PERFORMANCE SUMMARY:
${JSON.stringify(pillarAnalysis, null, 2)}

TOP POST: "${topPost?.content}"
${isIG ? `- Views: ${topPost?.views}, New reach: ${topPost?.newReach}, Saves: ${topPost?.saves}, Follows: ${topPost?.follows}, Watch time: ${topPost?.watchPct}%` : `- Views: ${topPost?.views}, Likes: ${topPost?.likes}, Saves: ${topPost?.saves}`}

WEAKEST PILLAR: ${worstPillar?.pillar} (avg ${Math.round(worstPillar?.avgViews || 0)} views)
STRONGEST PILLAR: ${bestPillar?.pillar} (avg ${Math.round(bestPillar?.avgViews || 0)} views)

Using ALL the data above (not just views — consider saves, watch time, skip rate, new reach, follows where available), provide sharp, specific, data-driven insights. Reference actual numbers. Be direct and actionable.

Respond ONLY with a JSON object, no preamble, no markdown:
{
  "bestPostAnalysis": "2-3 sentences explaining exactly why the top post outperformed using specific metrics. Reference actual numbers. What made it convert — was it the new reach? high saves? watch time? the pillar?",
  "captionPatterns": "2-3 sentences analyzing pillar performance using ALL metrics, not just views. Which pillar drives the most follows or saves? Which has the best watch time? Give a clear recommendation to double down or pivot with a specific reason.",
  "bestTimeToPost": "1-2 sentences on the best day/time to post based on the dates in the data. Be specific if you can see a pattern.",
  "weeklySummary": "A confident, professional 4-5 sentence paragraph written as The First Three agency to send to a client. Reference the top pillar, best performing post with specific numbers, one metric that stands out (could be saves, watch time, follows — whatever tells the best story), and one specific content recommendation for next week."
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    const text = data.content?.map((c: any) => c.text || '').join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.status(200).json({ insights: [{ ...parsed, handle, platform }] })
  } catch (err: any) {
    console.error('Insights error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
