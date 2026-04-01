import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { rows } = req.body
  if (!rows?.length) return res.status(400).json({ error: 'No data received' })

  let inserted = 0
  const errors: string[] = []

  for (const row of rows) {
    const { handle, platform, date, content, pillar, views, existingReach, newReach,
            shares, saves, follows, skipRate, watchTime, length, pctWatchTime, postUrl, notes } = row

    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('handle', `@${handle.replace('@', '')}`)
      .eq('platform', platform.toLowerCase())
      .single()

    if (!account) {
      errors.push(`Account not found: @${handle} (${platform})`)
      continue
    }

    const { error } = await supabase.from('posts').upsert({
      account_id: account.id,
      post_id: postUrl || `${handle}-${date}-${Math.random()}`,
      platform: platform.toLowerCase(),
      posted_at: date ? new Date(date).toISOString() : new Date().toISOString(),
      caption: content || null,
      post_url: postUrl || null,
      views: views || 0,
      likes: 0,
      comments: 0,
      shares: shares || 0,
      saves: saves || 0,
      engagement_rate: null,
      raw: { pillar, existingReach, newReach, follows, skipRate, watchTime, length, pctWatchTime, notes },
    }, { onConflict: 'post_id,platform' })

    if (error) { errors.push(`Error for @${handle}: ${error.message}`); continue }

    // Also update snapshot with latest follower-level data if available
    if (date) {
      await supabase.from('snapshots').upsert({
        account_id: account.id,
        scraped_at: new Date(date).toISOString(),
        avg_views: views || null,
        avg_likes: null,
      })
    }

    inserted++
  }

  res.status(200).json({ success: true, inserted, errors })
}
