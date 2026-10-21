import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

const COLORS = ['rgb(132,177,121)', '#6366f1', '#f59e0b', '#ef4444']

export default function Analytics() {
  const { accessToken } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Use proxy path — NO /api prefix, NO absolute URL
    fetch('/sessions/analytics', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(res => {
        setData(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Analytics error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [accessToken])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgb(199,234,187)', borderTop: '3px solid rgb(132,177,121)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading analytics...</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error || !data) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>No analytics data yet. Create some sessions first!</p>
        {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>Error: {error}</p>}
      </div>
    </div>
  )

  const scoreDistData = [
    { name: 'Excellent (80+)', value: parseInt(data.scoreDistribution?.excellent) || 0 },
    { name: 'Good (60–79)',    value: parseInt(data.scoreDistribution?.good) || 0 },
    { name: 'Average (40–59)', value: parseInt(data.scoreDistribution?.average) || 0 },
    { name: 'Poor (<40)',      value: parseInt(data.scoreDistribution?.poor) || 0 },
  ].filter(d => d.value > 0)

  const statusData = (data.statusBreakdown || []).map(s => ({
    name: s.status?.replace('_', ' '),
    value: parseInt(s.count)
  }))

  const avgPerSession = (data.avgPerSession || []).map(s => ({
    name: s.title?.length > 14 ? s.title.slice(0, 14) + '...' : s.title,
    avg: parseInt(s.avg_score) || 0,
  }))

  const sessionsOverTime = (data.sessionsOverTime || []).map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sessions: parseInt(s.count)
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}>
          <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color, margin: 0 }}>{p.name}: {p.value}</p>
          ))}
        </div>
      )
    }
    return null
  }

  const Empty = () => (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>No data yet</div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Analytics</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Overall grading activity across all sessions</p>
      </div>

      {/* Summary stats */}
      {data.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Sessions',    value: data.summary.totalSessions ?? 0,    color: '#6366f1', bg: '#eef2ff' },
            { label: 'Total Submissions', value: data.summary.totalSubmissions ?? 0, color: '#0ea5e9', bg: '#e0f2fe' },
            { label: 'Graded',            value: data.summary.graded ?? 0,           color: 'rgb(132,177,121)', bg: 'rgb(232,245,189)' },
            { label: 'Avg Score',         value: data.summary.avgScore ? `${parseFloat(data.summary.avgScore).toFixed(1)}%` : '—', color: '#f59e0b', bg: '#fef3c7' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 20, color: s.color, fontWeight: 800 }}>
                {String(s.value).charAt(0)}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={card}>
          <h2 style={cardTitle}>Average Score per Session</h2>
          {avgPerSession.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={avgPerSession} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg" name="Avg Score" fill="rgb(132,177,121)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={card}>
          <h2 style={cardTitle}>Score Distribution</h2>
          {scoreDistData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={scoreDistData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {scoreDistData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card}>
          <h2 style={cardTitle}>Sessions Created Over Time</h2>
          {sessionsOverTime.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={sessionsOverTime} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sessions" name="Sessions" stroke="rgb(132,177,121)" strokeWidth={2.5} dot={{ fill: 'rgb(132,177,121)', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={card}>
          <h2 style={cardTitle}>Submission Status Breakdown</h2>
          {statusData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

const card = { background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
const cardTitle = { fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 20px 0' }