import { useEffect, useState } from 'react'
import Head from 'next/head'
import { startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO, isValid } from 'date-fns'

type DateFilter = 'all' | 'month' | '30days'

const CORAL = '#e8927c'
const CORAL_LIGHT = '#fbeaf0'
const CORAL_DARK = '#993556'
const DARK = '#1a1612'
const WARM_BG = '#faf8f5'
const CARD_BG = '#ffffff'
const BORDER = '#e8e2da'
const MUTED = '#b8b0a6'
const BODY = '#3d3630'
const GREEN = '#639922'
const GREEN_LIGHT = '#eaf3de'

function formatNum(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.round(n).toString()
}

function filterPostsByDate(posts: any[], dateFilter: DateFilter) {
  if (dateFilter === 'all') return posts
  const now = new Date()
  const interval = dateFilter === 'month'
    ? { start: startOfMonth(now), end: endOfMonth(now) }
    : { start: subDays(now, 30), end: now }
  return posts.filter(p => {
    if (!p.date) return false
    try {
      const d = parseISO(p.date)
      return isValid(d) && isWithinInterval(d, interval)
    } catch { return false }
  })
}

function recalcPillarSummary(posts: any[], allPillars: string[], isIG: boolean) {
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  return allPillars.map(pillar => {
    const pp = posts.filter(p => p.pillar === pillar)
    return {
      pillar,
      postCount: pp.length,
      avgViews: avg(pp.map(p => p.views || 0)),
      avgSaves: avg(pp.map(p => p.saves || 0)),
      avgLikes: avg(pp.map(p => p.likes || 0)),
      avgComments: avg(pp.map(p => p.comments || 0)),
      avgShares: avg(pp.map(p => p.shares || 0)),
      avgWatchPct: avg(pp.filter(p => p.watchPct > 0).map(p => p.watchPct || 0)),
    }
  }).filter(p => p.postCount > 0).sort((a, b) => b.avgViews - a.avgViews)
}

function IGIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad-z4c" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad-z4c)"/>
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
    </svg>
  )
}

function TTIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#010101"/>
      <path d="M17 8.5c-1.2-.1-2.1-.7-2.6-1.5v7.5c0 2-1.6 3.5-3.7 3.5S7 16.5 7 14.5s1.6-3.5 3.7-3.5c.2 0 .4 0 .6.1v2.1c-.2-.1-.4-.1-.6-.1-1 0-1.7.6-1.7 1.4s.7 1.4 1.7 1.4 1.7-.6 1.7-1.4V6h2c.3 1.4 1.3 2.4 2.6 2.6V8.5z" fill="white"/>
    </svg>
  )
}

function Pill({ text }: { text: string }) {
  return (
    <span style={{ display: 'inline-block', background: CORAL_LIGHT, color: CORAL_DARK, fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function HealthBadge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? GREEN_LIGHT : '#f8f4f0', borderRadius: 10, padding: '8px 14px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, color: highlight ? GREEN : MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: highlight ? GREEN : DARK }}>{value}</div>
    </div>
  )
}

function AccountCard({ account, dateFilter }: any) {
  const [tab, setTab] = useState<'pillars' | 'posts'>('pillars')
  const isIG = account.platform === 'instagram'

  const filteredPosts = filterPostsByDate(account.posts || [], dateFilter)
  const allPillars = account.pillarSummary?.map((p: any) => p.pillar) || []
  const pillarSummary = recalcPillarSummary(filteredPosts, allPillars, isIG)
  const hasPosts = filteredPosts.length > 0

  const byViews = [...pillarSummary].sort((a: any, b: any) => b.avgViews - a.avgViews)
  const bySaves = [...pillarSummary].sort((a: any, b: any) => b.avgSaves - a.avgSaves)
  const byWatch = isIG ? [...pillarSummary].sort((a: any, b: any) => (b.avgWatchPct || 0) - (a.avgWatchPct || 0)) : []
  const byLikes = !isIG ? [...pillarSummary].sort((a: any, b: any) => b.avgLikes - a.avgLikes) : []

  const topPost = filteredPosts.length ? [...filteredPosts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0))[0] : null
  const avgViews = filteredPosts.length ? filteredPosts.reduce((s: number, p: any) => s + (p.views || 0), 0) / filteredPosts.length : 0
  const top7 = [...filteredPosts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0)).slice(0, 7)

  return (
    <div style={{ background: CARD_BG, border: `0.5px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>

      <div style={{ background: DARK, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isIG ? <IGIcon size={20} /> : <TTIcon size={20} />}
          <span style={{ fontSize: 15, fontWeight: 500, color: '#faf8f5', letterSpacing: '-0.2px' }}>@{account.handle}</span>
        </div>
        <span style={{ fontSize: 11, color: '#6b6460' }}>{filteredPosts.length} posts{dateFilter !== 'all' ? ' (filtered)' : ''}</span>
      </div>

      {!hasPosts ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
          {dateFilter !== 'all' ? 'No posts in this time period — try "All time"' : 'No data yet'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `0.5px solid #f0ebe4` }}>
            <div style={{ padding: '14px 20px', borderRight: `0.5px solid #f0ebe4` }}>
              <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Avg views</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: DARK, letterSpacing: '-0.5px' }}>{formatNum(avgViews)}</div>
            </div>
            <div style={{ padding: '14px 20px', borderRight: `0.5px solid #f0ebe4` }}>
              <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Top pillar</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: DARK, marginTop: 2 }}>{byViews[0]?.pillar || '—'}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{formatNum(byViews[0]?.avgViews)} avg views</div>
            </div>
            <div style={{ padding: '14px 20px' }}>
              <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Best post</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: DARK, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{topPost?.content || '—'}</div>
              {topPost?.views > 0 && <div style={{ fontSize: 11, color: CORAL, marginTop: 3, fontWeight: 500 }}>👁 {formatNum(topPost.views)}</div>}
            </div>
          </div>

          <div style={{ padding: '12px 20px', borderBottom: `0.5px solid #f0ebe4` }}>
            <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Content health</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <HealthBadge label="Best for saves" value={bySaves[0]?.pillar || '—'} highlight={bySaves[0]?.pillar !== byViews[0]?.pillar} />
              {isIG && byWatch[0]?.avgWatchPct > 0 && (
                <HealthBadge label="Best retention" value={`${byWatch[0]?.pillar} · ${byWatch[0]?.avgWatchPct?.toFixed(1)}%`} highlight={byWatch[0]?.pillar !== byViews[0]?.pillar} />
              )}
              {!isIG && byLikes[0] && (
                <HealthBadge label="Most liked" value={byLikes[0]?.pillar || '—'} highlight={byLikes[0]?.pillar !== byViews[0]?.pillar} />
              )}
              <HealthBadge label="Needs more posts" value={[...pillarSummary].sort((a: any, b: any) => a.postCount - b.postCount)[0]?.pillar || '—'} />
            </div>
          </div>

          <div style={{ display: 'flex', padding: '0 20px', borderBottom: `0.5px solid #f0ebe4` }}>
            {(['pillars', 'posts'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: tab === t ? `2px solid ${CORAL}` : '2px solid transparent',
                color: tab === t ? CORAL : MUTED, fontSize: 12, fontWeight: tab === t ? 500 : 400,
                cursor: 'pointer', letterSpacing: '0.02em', marginBottom: -1, fontFamily: 'inherit',
              }}>
                {t === 'pillars' ? 'By pillar' : 'Top 7 posts'}
              </button>
            ))}
          </div>

          {tab === 'pillars' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: WARM_BG }}>
                    {['Pillar', 'Posts', 'Avg views', isIG ? 'Avg saves' : 'Avg likes', isIG ? '% Watch' : 'Avg saves'].map((h, i) => (
                      <th key={i} style={{ padding: '8px 20px', textAlign: i === 0 ? 'left' : 'center', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, borderBottom: `0.5px solid #f0ebe4` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byViews.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid #f8f4f0` }}>
                      <td style={{ padding: '10px 20px' }}><Pill text={p.pillar} /></td>
                      <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: 13, color: BODY }}>{p.postCount}</td>
                      <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: i === 0 ? CORAL : BODY }}>{formatNum(p.avgViews)}</td>
                      <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: 13, color: BODY }}>{isIG ? formatNum(p.avgSaves) : formatNum(p.avgLikes)}</td>
                      <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: 13, color: BODY }}>{isIG ? (p.avgWatchPct ? p.avgWatchPct.toFixed(1) + '%' : '—') : formatNum(p.avgSaves)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'posts' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: WARM_BG }}>
                    {['#', 'Content', 'Pillar', 'Views', isIG ? 'New reach' : 'Likes', 'Saves', isIG ? '% Watch' : 'Comments'].map((h, i) => (
                      <th key={i} style={{ padding: '8px 20px', textAlign: i < 3 ? 'left' : 'center', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, borderBottom: `0.5px solid #f0ebe4` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {top7.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `0.5px solid #f8f4f0` }}>
                      <td style={{ padding: '9px 20px', fontSize: 12, color: i === 0 ? CORAL : MUTED, fontWeight: i === 0 ? 600 : 400 }}>#{i + 1}</td>
                      <td style={{ padding: '9px 20px', fontSize: 13, color: BODY, maxWidth: 200 }}>
                        {p.postUrl ? <a href={p.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: CORAL, textDecoration: 'none' }}>{p.content}</a> : p.content}
                      </td>
                      <td style={{ padding: '9px 20px' }}><Pill text={p.pillar} /></td>
                      <td style={{ padding: '9px 20px', textAlign: 'center', fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? CORAL : DARK }}>{formatNum(p.views)}</td>
                      <td style={{ padding: '9px 20px', textAlign: 'center', fontSize: 13, color: BODY }}>{isIG ? formatNum(p.newReach) : formatNum(p.likes)}</td>
                      <td style={{ padding: '9px 20px', textAlign: 'center', fontSize: 13, color: BODY }}>{formatNum(p.saves)}</td>
                      <td style={{ padding: '9px 20px', textAlign: 'center', fontSize: 13, color: BODY }}>{isIG ? (p.watchPct ? p.watchPct.toFixed(1) + '%' : '—') : formatNum(p.comments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ZachDashboard() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  async function fetchData() {
    const res = await fetch('/api/sheets?owner=client')
    const json = await res.json()
    setData(json.accounts || [])
    setLastUpdated(new Date().toLocaleTimeString())
  }

  async function refresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)) }, [])

  const dateLabels: Record<DateFilter, string> = { all: 'All time', month: 'This month', '30days': 'Last 30 days' }
  const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <>
      <Head>
        <title>Zach for Controller — Social Report</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: WARM_BG, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <header style={{ background: DARK, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#faf8f5', letterSpacing: '-0.2px' }}>Zach for Controller</span>
            <span style={{ fontSize: 11, color: '#6b6460', letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 4 }}>Social Report</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {lastUpdated && <span style={{ fontSize: 11, color: '#6b6460', fontFamily: 'monospace' }}>Updated {lastUpdated}</span>}
            <span style={{ fontSize: 11, color: CORAL }}>{reportDate}</span>
            <button onClick={refresh} disabled={refreshing} style={{ background: 'transparent', color: '#faf8f5', border: `0.5px solid #444`, borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </header>

        <div style={{ background: CORAL_LIGHT, borderBottom: `0.5px solid #f0d0c4`, padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: CORAL_DARK }}>Prepared by <strong>The First Three</strong></span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'month', '30days'] as DateFilter[]).map(d => (
              <button key={d} onClick={() => setDateFilter(d)} style={{ padding: '5px 14px', borderRadius: 20, border: `0.5px solid`, borderColor: dateFilter === d ? CORAL_DARK : '#f0d0c4', background: dateFilter === d ? CORAL_DARK : 'transparent', color: dateFilter === d ? '#fff' : CORAL_DARK, fontSize: 11, fontWeight: dateFilter === d ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                {dateLabels[d]}
              </button>
            ))}
          </div>
        </div>

        <main style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: MUTED, fontSize: 13 }}>Loading...</div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: MUTED, fontSize: 13 }}>No data available</div>
          ) : (
            data.map((account: any) => (
              <AccountCard key={`${account.handle}-${account.platform}`} account={account} dateFilter={dateFilter} />
            ))
          )}

          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: MUTED, borderTop: `0.5px solid ${BORDER}`, marginTop: 8 }}>
            The First Three · thefirstthree.co
          </div>
        </main>
      </div>
    </>
  )
}
