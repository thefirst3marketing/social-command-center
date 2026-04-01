import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { owner } = req.query // 'tesia' | 'client' | undefined (all)

  // Get accounts
  let accountQuery = supabase.from('accounts').select('*')
  if (owner) accountQuery = accountQuery.eq('owner', owner)
  const { data: accounts, error } = await accountQuery

  if (error) return res.status(500).json({ error: error.message })

  const accountIds = accounts!.map(a => a.id)

  // Get latest snapshot per account
  const snapshots: Record<string, any> = {}
  for (const id of accountIds) {
    const { data } = await supabase
      .from('snapshots')
      .select('*')
      .eq('account_id', id)
      .order('scraped_at', { ascending: false })
      .limit(1)
      .single()
    if (data) snapshots[id] = data
  }

  // Get follower history (last 30 days) per account
  const history: Record<string, any[]> = {}
  for (const id of accountIds) {
    const { data } = await supabase
      .from('snapshots')
      .select('scraped_at, followers, engagement_rate')
      .eq('account_id', id)
      .order('scraped_at', { ascending: true })
      .limit(30)
    if (data) history[id] = data
  }

  // Get top posts per account (last 20)
  const posts: Record<string, any[]> = {}
  for (const id of accountIds) {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('account_id', id)
      .order('posted_at', { ascending: false })
      .limit(20)
    if (data) posts[id] = data
  }

  res.status(200).json({ accounts, snapshots, history, posts })
}
