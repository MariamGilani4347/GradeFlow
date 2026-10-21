import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#16a34a', '#6366f1', '#f59e0b', '#ef4444', '#0ea5e9']
const GRADE_COLORS = { A: '#16a34a', B: '#6366f1', C: '#f59e0b', D: '#f97316', F: '#ef4444' }

export default function SessionAnalytics({ session }) {
  const { accessToken } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sessions/${session.id}/analytics`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then(r => r.json())
      .then(res => {
        setData(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session.id])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>
      Loading analytics...
    </div>
  )

  if (!data || !data.totalSubmissions) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>
      No graded submissions yet — analytics will appear once grading is complete.
    </div>
  )

  const totalMarks = session.total_marks || 100

  // Grade bands
  const gradeBands = [
    { name: 'A (80-100%)', value: data.gradeBands?.A || 0, color: '#16a34a' },
    { name: 'B (60-79%)', value: data.gradeBands?.B || 0, color: '#6366f1' },
    { name: 'C (40-59%)', value: data.gradeBands?.C || 0, color: '#f59e0b' },
    { name: 'D (20-39%)', value: data.gradeBands?.D || 0, color: '#f97316' },
    { name: 'F (0-19%)', value: data.gradeBands?.F || 0, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Score range histogram
  const scoreRanges = [
    { range: '0-20', count: data.scoreRanges?.['0-20'] || 0 },
    { range: '21-40', count: data.scoreRanges?.['21-40'] || 0 },
    { range: '41-60', count: data.scoreRanges?.['41-60'] || 0 },
    { range: '61-80', count: data.scoreRanges?.['61-80'] || 0 },
    { range: '81-100', count: data.scoreRanges?.['81-100'] || 0 },
  ]

  // Pass/fail
  const passFailData = [
    { name: 'Pass (≥50%)', value: data.passed || 0 },
    { name: 'Fail (<50%)', value: data.failed || 0 },
  ].filter(d => d.value > 0)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}>
          <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color || '#6366f1', margin: 0 }}>{p.name}: {p.value}</p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Graded', value: data.totalSubmissions, color: '#6366f1', bg: '#eff6ff' },
          { label: 'Class Average', value: `${data.avgScore}/${totalMarks}`, color: '#0ea5e9', bg: '#f0f9ff' },
          { label: 'Highest', value: `${data.highest}/${totalMarks}`, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Lowest', value: `${data.lowest}/${totalMarks}`, color: '#ef4444', bg: '#fee2e2' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Score Distribution Histogram */}
        <div style={card}>
          <h3 style={cardTitle}>Score Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreRanges} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Students" fill="#6366f1" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Bands Pie */}
        <div style={card}>
          <h3 style={cardTitle}>Grade Bands</h3>
          {gradeBands.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={gradeBands} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                  {gradeBands.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, color: '#64748b' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pass/Fail + Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Pass/Fail */}
        <div style={card}>
          <h3 style={cardTitle}>Pass / Fail Rate</h3>
          {passFailData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={passFailData} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value">
                  <Cell fill="#16a34a" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary Stats */}
        <div style={card}>
          <h3 style={cardTitle}>Session Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Pass Rate', value: `${data.totalSubmissions > 0 ? Math.round((data.passed / data.totalSubmissions) * 100) : 0}%`, color: '#16a34a' },
              { label: 'Fail Rate', value: `${data.totalSubmissions > 0 ? Math.round((data.failed / data.totalSubmissions) * 100) : 0}%`, color: '#ef4444' },
              { label: 'Flagged for Plagiarism', value: data.flagged || 0, color: '#f59e0b' },
              { label: 'Manually Overridden', value: data.overridden || 0, color: '#8b5cf6' },
              { label: 'Total Submissions', value: data.totalSubmissions, color: '#0f172a' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const Empty = () => (
  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>
    No data yet
  </div>
)

const card = {
  background: '#fff', borderRadius: 14, padding: '20px',
  border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
}

const cardTitle = {
  fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0'
}