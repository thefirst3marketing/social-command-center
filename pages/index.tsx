import { useEffect, useState } from 'react'
import Head from 'next/head'
import { startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO, isValid } from 'date-fns'

type View = 'all' | 'tesia' | 'client'
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

// Platform icons as SVG
function IGIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)"/>
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
      <path d="M18.5 9.5c-.5 0-1-.1-1.5-.3v.3c0 .1 0 .1 0 0" fill="#69C9D0"/>
    </svg>
  )
}

function Pill({ text, color = CORAL_DARK, bg = CORAL_LIGHT }: { text: string; color?: string; bg?: string }) {
  return (
    <span style={{ display: 'inline-block', background: bg, color, fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
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

function RecommendationCard({ text }: { text: string }) {
  return (
    <div style={{ background: CORAL_LIGHT, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 14, flexShrink: 0, color: CORAL }}>✦</span>
      <div style={{ fontSize: 13, color: CORAL_DARK, lineHeight: 1.6 }}>{text}</div>
    </div>
  )
}

function getRecommendation(pillars: any[], posts: any[], isIG: boolean): string {
  if (!pillars.length) return ''
  const byViews = [...pillars].sort((a: any, b: any) => b.avgViews - a.avgViews)
  const bySaves = [...pillars].sort((a: any, b: any) => b.avgSaves - a.avgSaves)
  const byWatch = isIG ? [...pillars].sort((a: any, b: any) => (b.avgWatchPct || 0) - (a.avgWatchPct || 0)) : []
  const top = byViews[0]
  const topSaves = bySaves[0]
  const low = [...pillars].sort((a: any, b: any) => a.postCount - b.postCount)[0]

  if (isIG && byWatch[0]?.avgWatchPct > 0 && byWatch[0]?.pillar !== top?.pillar) {
    return `Post more ${byWatch[0].pillar} — it has your best watch time (${byWatch[0].avgWatchPct?.toFixed(1)}%), meaning your audience is highly engaged. Pair it with a strong hook to boost reach.`
  }
  if (topSaves.pillar !== top.pillar) {
    return `${topSaves.pillar} gets the most saves (${formatNum(topSaves.avgSaves)} avg) — your audience treats it as reference content. Post at least 2 this week while continuing to grow ${top.pillar} for reach.`
  }
  if (low?.postCount < 2) {
    return `You haven't posted enough ${low.pillar} to evaluate it fairly — aim for at least 3 posts before drawing conclusions. Try a new format within that pillar this week.`
  }
  return `${top.pillar} is your top performer at ${formatNum(top.avgViews)} avg views. Double down this week with at least 2 posts in this pillar while testing a new angle.`
}

function AccountCard({ account, onGenerateInsights, insights, generatingInsights, dateFilter }: any) {
  const [tab, setTab] = useState<'pillars' | 'posts'>('pillars')
  const [showInsights, setShowInsights] = useState(false)
  const isIG = account.platform === 'instagram'
  const isClient = account.owner === 'client'

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
  const recommendation = hasPosts ? getRecommendation(pillarSummary, filteredPosts, isIG) : ''

  return (
    <div style={{ background: CARD_BG, border: `0.5px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>

      {/* Header */}
      <div style={{ background: isClient ? DARK : CARD_BG, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `0.5px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isIG ? <IGIcon size={20} /> : <TTIcon size={20} />}
          <span style={{ fontSize: 15, fontWeight: 500, color: isClient ? '#faf8f5' : DARK, letterSpacing: '-0.2px' }}>@{account.handle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {account.client_name && <span style={{ fontSize: 11, color: CORAL, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{account.client_name}</span>}
          <span style={{ fontSize: 11, color: isClient ? '#6b6460' : MUTED }}>{filteredPosts.length} posts{dateFilter !== 'all' ? ' (filtered)' : ''}</span>
        </div>
      </div>

      {!hasPosts ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: MUTED, fontSize: 13 }}>
          {dateFilter !== 'all' ? 'No posts in this time period — try "All time"' : 'No posts yet — add data to your Google Sheet'}
        </div>
      ) : (
        <>
          {/* Key metrics */}
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

          {/* Content health */}
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

          {/* Recommendation */}
          {recommendation && (
            <div style={{ padding: '12px 20px' }}>
              <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Post this week</div>
              <RecommendationCard text={recommendation} />
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', padding: '0 20px', borderTop: `0.5px solid #f0ebe4`, borderBottom: `0.5px solid #f0ebe4` }}>
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

          {/* Pillar table */}
          {tab === 'pillars' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: WARM_BG }}>
                    {['Pillar', 'Posts', 'Avg views', isIG ? 'Avg saves' : 'Avg likes', isIG ? '% Watch' : 'Avg saves', isIG ? 'Avg shares' : 'Avg comments'].map((h, i) => (
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
                      <td style={{ padding: '10px 20px', textAlign: 'center', fontSize: 13, color: BODY }}>{isIG ? formatNum(p.avgShares) : formatNum(p.avgComments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top 7 posts */}
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
                        {p.postUrl
                          ? <a href={p.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: CORAL, textDecoration: 'none' }}>{p.content}</a>
                          : p.content}
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

          {/* AI Insights */}
          <div style={{ borderTop: `0.5px solid #f0ebe4` }}>
            <button
              onClick={() => { if (!insights) onGenerateInsights(account.handle, account.platform); setShowInsights(!showInsights) }}
              style={{ width: '100%', padding: '11px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: CORAL, fontWeight: 500, letterSpacing: '0.02em', fontFamily: 'inherit' }}
            >
              <span>✦ AI insights</span>
              <span style={{ fontSize: 11, color: MUTED }}>{showInsights ? '▲ hide' : '▼ show'}</span>
            </button>

            {showInsights && (
              <div style={{ padding: '0 20px 20px', borderTop: `0.5px solid #f8f4f0` }}>
                {generatingInsights ? (
                  <div style={{ padding: '16px 0', fontSize: 13, color: MUTED, fontStyle: 'italic' }}>Analyzing your content...</div>
                ) : insights ? (
                  <>
                    {[
                      { label: 'Why your best post worked', text: insights.bestPostAnalysis },
                      { label: 'Pillar breakdown', text: insights.captionPatterns },
                      { label: 'Best time to post', text: insights.bestTimeToPost },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: `0.5px solid #f8f4f0` }}>
                        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: BODY, lineHeight: 1.7 }}>{item.text}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 16, background: WARM_BG, borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Weekly client summary</div>
                      <div style={{ fontSize: 13, color: BODY, lineHeight: 1.7 }}>{insights.weeklySummary}</div>
                      <button onClick={() => navigator.clipboard.writeText(insights.weeklySummary)} style={{ marginTop: 10, fontSize: 11, color: CORAL, background: 'none', border: `0.5px solid ${CORAL}`, borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Copy to clipboard
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '16px 0', fontSize: 13, color: MUTED, fontStyle: 'italic' }}>Click above to generate insights</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [view, setView] = useState<View>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [insights, setInsights] = useState<Record<string, any>>({})
  const [generatingInsights, setGeneratingInsights] = useState<Record<string, boolean>>({})
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  async function fetchData(owner?: string) {
    const url = owner && owner !== 'all' ? `/api/sheets?owner=${owner}` : '/api/sheets'
    const res = await fetch(url)
    const json = await res.json()
    setData(json.accounts || [])
    setLastUpdated(new Date().toLocaleTimeString())
  }

  async function refresh() {
    setRefreshing(true)
    await fetchData(view === 'all' ? undefined : view)
    setRefreshing(false)
  }

  async function generateInsightsFor(handle: string, platform: string) {
    const key = `${handle}-${platform}`
    setGeneratingInsights(prev => ({ ...prev, [key]: true }))
    const account = data.find((a: any) => a.handle === handle && a.platform === platform)
    if (!account?.posts?.length) { setGeneratingInsights(prev => ({ ...prev, [key]: false })); return }
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: account.posts, pillarSummary: account.pillarSummary, handle, platform }),
      })
      const json = await res.json()
      if (json.insights?.length) setInsights(prev => ({ ...prev, [key]: json.insights[0] }))
    } catch (e) { console.error(e) }
    setGeneratingInsights(prev => ({ ...prev, [key]: false }))
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)) }, [])
  useEffect(() => { setLoading(true); fetchData(view === 'all' ? undefined : view).finally(() => setLoading(false)) }, [view])

  const filtered = view === 'all' ? data : data.filter((a: any) => a.owner === view)

  const dateLabels: Record<DateFilter, string> = { all: 'All time', month: 'This month', '30days': 'Last 30 days' }

  return (
    <>
      <Head>
        <title>Command Center — The First Three</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: WARM_BG, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <header style={{ background: WARM_BG, borderBottom: `0.5px solid ${BORDER}`, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58, position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: DARK, letterSpacing: '-0.3px' }}>
              The First <span style={{ color: CORAL }}>Three</span>
            </span>
            <span style={{ fontSize: 11, color: MUTED, letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 4 }}>Command Center</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {lastUpdated && <span style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>Updated {lastUpdated}</span>}
            <button onClick={refresh} disabled={refreshing} style={{ background: refreshing ? '#f0ebe4' : DARK, color: refreshing ? MUTED : WARM_BG, border: 'none', borderRadius: 20, padding: '7px 18px', fontSize: 12, fontWeight: 500, cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}>
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </header>

        <main style={{ maxWidth: 1060, margin: '0 auto', padding: '24px 32px' }}>

          {/* Controls row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {(['all', 'tesia', 'client'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '7px 16px', borderRadius: 20, border: `0.5px solid`, borderColor: view === v ? DARK : BORDER, background: view === v ? DARK : 'transparent', color: view === v ? WARM_BG : MUTED, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}>
                {v === 'all' ? 'All accounts' : v === 'tesia' ? 'My accounts' : 'Clients'}
              </button>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: BORDER, margin: '0 4px' }} />

            {/* Date filter */}
            {(['all', 'month', '30days'] as DateFilter[]).map(d => (
              <button key={d} onClick={() => setDateFilter(d)} style={{ padding: '7px 16px', borderRadius: 20, border: `0.5px solid`, borderColor: dateFilter === d ? CORAL : BORDER, background: dateFilter === d ? CORAL_LIGHT : 'transparent', color: dateFilter === d ? CORAL_DARK : MUTED, fontSize: 12, fontWeight: dateFilter === d ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }}>
                {dateLabels[d]}
              </button>
            ))}

            <a href="/client" target="_blank" style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 20, border: `0.5px solid ${CORAL}`, color: CORAL, fontSize: 12, fontWeight: 500, textDecoration: 'none', letterSpacing: '0.02em' }}>
              Client report ↗
            </a>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: MUTED, fontSize: 13 }}>Loading from Google Sheets...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: MUTED, fontSize: 13 }}>No accounts found</div>
          ) : (
            filtered.map((account: any) => (
              <AccountCard
                key={`${account.handle}-${account.platform}`}
                account={account}
                insights={insights[`${account.handle}-${account.platform}`]}
                onGenerateInsights={generateInsightsFor}
                generatingInsights={generatingInsights[`${account.handle}-${account.platform}`]}
                dateFilter={dateFilter}
              />
            ))
          )}
        </main>
      </div>
    </>
  )
}
