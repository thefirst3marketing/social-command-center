import { useEffect, useState } from 'react'
import Head from 'next/head'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

const JADE = '#4a9e8a'

function formatNum(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

export default function ClientReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/data?owner=client')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  const accounts = data?.accounts || []
  const snapshots = data?.snapshots || {}
  const history = data?.history || {}
  const posts = data?.posts || {}
  const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <Head>
        <title>Social Report — The First Three</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9f7f4', fontFamily: 'system-ui, sans-serif' }}>

        {/* Header */}
        <div style={{ background: '#1a1a2e', color: '#fff', padding: '40px 48px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
              Social Media Report
            </div>
            <div style={{ fontSize: 13, color: '#c9a96e', fontFamily: 'monospace' }}>
              Prepared by The First Three · {reportDate}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 48px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa' }}>Loading report...</div>
          ) : (
            accounts.map((account: any) => {
              const snap = snapshots[account.id]
              const hist = history[account.id] || []
              const acctPosts = (posts[account.id] || []).slice(0, 6)
              const chartData = hist.map((h: any) => ({
                date: format(parseISO(h.scraped_at), 'MMM d'),
                followers: h.followers,
              }))
              const platformLabel = account.platform === 'instagram' ? 'Instagram' : 'TikTok'

              return (
                <div key={account.id} style={{ marginBottom: 48 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#fff', background: account.platform === 'instagram' ? '#C13584' : '#000', padding: '3px 10px', borderRadius: 4 }}>{platformLabel}</span>
                    <h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#1a1a1a' }}>@{account.handle}</h2>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                      { label: 'Followers', value: formatNum(snap?.followers) },
                      { label: 'Avg. likes', value: formatNum(Math.round(snap?.avg_likes || 0)) },
                      { label: 'Engagement rate', value: snap?.engagement_rate ? parseFloat(snap.engagement_rate).toFixed(2) + '%' : '—' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e8e4df', borderRadius: 10, padding: '16px 20px' }}>
                        <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Playfair Display, serif', color: '#1a1a1a' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  {chartData.length > 1 && (
                    <div style={{ background: '#fff', border: '1px solid #e8e4df', borderRadius: 10, padding: '20px', marginBottom: 24 }}>
                      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Follower growth</div>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={chartData}>
                          <Line type="monotone" dataKey="followers" stroke={JADE} strokeWidth={2} dot={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#aaa' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#aaa' }} width={50} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: any) => [formatNum(v), 'Followers']} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top posts */}
                  {acctPosts.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recent posts</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {acctPosts.map((p: any) => (
                          <a key={p.id} href={p.post_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <div style={{ background: '#fff', border: '1px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                              {p.thumbnail_url && <img src={p.thumbnail_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />}
                              <div style={{ padding: '10px 12px' }}>
                                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 8 }}>
                                  {p.caption || '(no caption)'}
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                  {p.views > 0 && <span style={{ fontSize: 11, color: JADE }}>👁 {formatNum(p.views)}</span>}
                                  <span style={{ fontSize: 11, color: '#bbb' }}>♥ {formatNum(p.likes)}</span>
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px solid #e8e4df', margin: '40px 0 0' }} />
                </div>
              )
            })
          )}

          <div style={{ textAlign: 'center', fontSize: 12, color: '#ccc', padding: '20px 0', fontFamily: 'monospace' }}>
            The First Three · thefirstthree.co
          </div>
        </div>
      </div>
    </>
  )
}
