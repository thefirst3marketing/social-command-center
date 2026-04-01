import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import path from 'path'

const SHEET_ID = process.env.GOOGLE_SHEET_ID!

const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : undefined,
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? undefined : './google-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

const ACCOUNTS = [
  { handle: 'tesiakuh',        platform: 'instagram', owner: 'tesia',  tabName: '@tesiakuh (IG)',           pillars: ['Trends', 'Events', 'Hobbies', 'Carousels'] },
  { handle: 'atetheplate_',    platform: 'instagram', owner: 'tesia',  tabName: '@atetheplate_ (IG)',        pillars: ['Recipes', 'Mukbang', 'Special Feature', 'Restaurant Highlight'] },
  { handle: 'atetheplate_',    platform: 'tiktok',    owner: 'tesia',  tabName: '@atetheplate_ (TT)',        pillars: ['Recipes', 'Mukbang', 'Special Feature', 'Restaurant Highlight'] },
  { handle: 'zachforcontroller', platform: 'instagram', owner: 'client', tabName: '@zachforcontroller (IG)', pillars: ["Where's the Audit", 'Foodie Content', 'Endorsements', 'Class is in Session', 'Get to Know Zach'] },
  { handle: 'zachforcontroller', platform: 'tiktok',    owner: 'client', tabName: '@zachforcontroller (TT)', pillars: ["Where's the Audit", 'Foodie Content', 'Endorsements', 'Class is in Session', 'Get to Know Zach'] },
]

function parseNum(v: any) {
  if (!v) return 0
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { owner } = req.query

  try {
    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() as any })
    const accounts = owner ? ACCOUNTS.filter(a => a.owner === owner) : ACCOUNTS
    const result: any[] = []

    for (const acct of accounts) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${acct.tabName}'!A1:O200`,
      })

      const rows = response.data.values || []
      const isIG = acct.platform === 'instagram'
      const posts: any[] = []
      const pillarStats: Record<string, { views: number[], likes: number[], saves: number[], comments: number[], watchPct: number[] }> = {}

      for (const pillar of acct.pillars) {
        pillarStats[pillar] = { views: [], likes: [], saves: [], comments: [], watchPct: [] }
      }

      // Skip title row (0) and header row (1), read from row 2 onwards
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i]
        if (!row || !row[0] || !row[1]) continue // skip empty/avg rows
        const pillar = row[2] || ''
        if (pillar.startsWith('✦')) continue // skip average rows

        if (isIG) {
          const post = {
            date: row[0],
            content: row[1],
            pillar,
            views: parseNum(row[3]),
            existingReach: parseNum(row[4]),
            newReach: parseNum(row[5]),
            shares: parseNum(row[6]),
            saves: parseNum(row[7]),
            follows: parseNum(row[8]),
            skipRate: parseNum(row[9]),
            watchTime: parseNum(row[10]),
            length: parseNum(row[11]),
            watchPct: parseNum(row[12]),
            postUrl: row[13] || '',
            notes: row[14] || '',
          }
          posts.push(post)
          if (!pillarStats[pillar]) pillarStats[pillar] = { views: [], likes: [], saves: [], comments: [], watchPct: [] }
          pillarStats[pillar].views.push(post.views)
          pillarStats[pillar].saves.push(post.saves)
          pillarStats[pillar].watchPct.push(post.watchPct)
        } else {
          const post = {
            date: row[0],
            content: row[1],
            pillar,
            views: parseNum(row[3]),
            likes: parseNum(row[4]),
            comments: parseNum(row[5]),
            saves: parseNum(row[6]),
          }
          posts.push(post)
          if (!pillarStats[pillar]) pillarStats[pillar] = { views: [], likes: [], saves: [], comments: [], watchPct: [] }
          pillarStats[pillar].views.push(post.views)
          pillarStats[pillar].likes.push(post.likes)
          pillarStats[pillar].saves.push(post.saves)
          pillarStats[pillar].comments.push(post.comments)
        }
      }

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

      const pillarSummary = Object.entries(pillarStats).map(([pillar, stats]) => ({
        pillar,
        postCount: stats.views.length,
        avgViews: avg(stats.views),
        avgLikes: avg(stats.likes),
        avgSaves: avg(stats.saves),
        avgComments: avg(stats.comments),
        avgWatchPct: avg(stats.watchPct),
      }))

      // Overall stats
      const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0)
      const avgViews = posts.length ? totalViews / posts.length : 0
      const topPost = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0))[0]
      const bestPillar = pillarSummary.sort((a, b) => b.avgViews - a.avgViews)[0]

      result.push({
        ...acct,
        posts,
        pillarSummary,
        stats: { totalPosts: posts.length, avgViews, topPost, bestPillar },
      })
    }

    res.status(200).json({ accounts: result })
  } catch (err: any) {
    console.error('Sheets error:', err)
    res.status(500).json({ error: err.message })
  }
}
