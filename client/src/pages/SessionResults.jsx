import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Eye, Edit2, X, AlertTriangle, Trash2, RefreshCw, CheckCircle, TrendingUp, Users, Award } from 'lucide-react'
import SessionAnalytics from './SessionAnalytics'

const C = {
  primary:       "#84B179",          // main green
  primaryLight:  "#A2CB8B",          // lighter green
  primarySoft:   "#C7EABB",          // soft mint
  primaryMuted:  "#C7EABB",          // same soft mint for muted backgrounds
  primaryDark:   "#5a8a50",          // darker green for hover/text
  surface:       "#ffffff",          // card surface
  surfaceAlt:    "#E8F5BD",          // page background tint
  border:        "#A2CB8B",          // medium green border
  borderLight:   "#C7EABB",          // light mint border
  ink:           "#1a2e18",          // near-black text
  text:          "#213d1f",          // body text
  textSecondary: "#3d6b3a",          // secondary text
  textMuted:     "#6a9068",          // muted/placeholder text
}

export default function SessionResults({ session, onBack }) {
  const { accessToken } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('results')
  const [feedbackModal, setFeedbackModal] = useState(null)
  const [overrideModal, setOverrideModal] = useState(null)
  const [newScore, setNewScore] = useState('')
  const [newStudentId, setNewStudentId] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingSession, setDeletingSession] = useState(false)
  const [reprocessingId, setReprocessingId] = useState(null)
  const [reviewingId, setReviewingId] = useState(null)

  const totalMarks = session.total_marks || 100

  useEffect(() => { fetchSubmissions() }, [])

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const data = await res.json()
      setSubmissions(data.data?.submissions || [])
    } catch (err) { console.error('Failed to fetch submissions:', err) }
    finally { setLoading(false) }
  }

  const getStudentLabel = (sub, index) => {
    if (sub.student_id && sub.student_id.trim()) return sub.student_id.trim()
    if (sub.file_name) return sub.file_name.replace(/\.[^/.]+$/, '')
    return `Submission-${index + 1}`
  }

  const getFeedback = (sub) => {
    try {
      if (!sub.ai_feedback) return null
      return typeof sub.ai_feedback === 'string' ? JSON.parse(sub.ai_feedback) : sub.ai_feedback
    } catch { return null }
  }

  const getScoreColor = (score) => {
    if (score === '--' || score === null || score === undefined) return C.textMuted
    const pct = (score / totalMarks) * 100
    if (pct >= 70) return C.primary
    if (pct >= 40) return '#d97706'
    return '#dc2626'
  }

  const getPlagiarismPercent = (flagStatus) => {
    if (!flagStatus) return null
    const match = flagStatus.match(/(\d+)%/)
    return match ? parseInt(match[1]) : null
  }

  const handleMarkReviewed = async (sub) => {
    setReviewingId(sub.id)
    try {
      const score = sub.final_score ?? sub.ai_score
      const res = await fetch(`/api/submissions/${sub.id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ final_score: score, override_reason: sub.override_reason || null, student_id: sub.student_id || undefined })
      })
      if (!res.ok) throw new Error('Failed')
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'completed' } : s))
    } catch (err) {
      console.error('Mark reviewed failed:', err)
      alert('Failed to mark as reviewed.')
    } finally { setReviewingId(null) }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}/export-csv`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await res.json().catch(() => null)
      if (!data) {
        const blob = await fetch(`/api/sessions/${session.id}/export-csv`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.blob())
        downloadBlob(blob, `${session.title}-report.csv`); return
      }
      const header = 'Student ID,Score,Status,Feedback,Strengths,Improvements,Override Reason,Submitted At\n'
      const rows = submissions.map((sub, i) => {
        const studentId = getStudentLabel(sub, i)
        const score = sub.final_score ?? sub.ai_score ?? ''
        const fb = getFeedback(sub) || {}
        const clean = (s) => (s || '').replace(/"/g, '""')
        return `"${clean(studentId)}",${score},"${sub.status}","${clean(fb.feedback)}","${clean(fb.strengths)}","${clean(fb.improvements)}","${clean(sub.override_reason)}","${new Date(sub.created_at).toLocaleString()}"`
      }).join('\n')
      downloadBlob(new Blob([header + rows], { type: 'text/csv' }), `${session.title}-report.csv`)
    } catch (err) { console.error('CSV export failed:', err.message) }
    finally { setExporting(false) }
  }

  const handleExportPDF = async () => {
    setExportingPDF(true)
    try {
      const studentMap = Object.fromEntries(submissions.map((sub, i) => [sub.id, getStudentLabel(sub, i)]))
      const res = await fetch(`/api/sessions/${session.id}/export-pdf`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentMap })
      })
      if (!res.ok || res.headers.get('content-type')?.includes('json')) {
        const getRes = await fetch(`/api/sessions/${session.id}/export-pdf`, { headers: { Authorization: `Bearer ${accessToken}` } })
        downloadBlob(await getRes.blob(), `${session.title}-report.pdf`); return
      }
      downloadBlob(await res.blob(), `${session.title}-report.pdf`)
    } catch (err) { console.error('PDF export failed:', err.message) }
    finally { setExportingPDF(false) }
  }

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleReprocess = async (sub) => {
    if (!confirm(`Reprocess "${getStudentLabel(sub, 0)}"? This will re-run AI grading.`)) return
    setReprocessingId(sub.id)
    try {
      const res = await fetch(`/api/sessions/${session.id}/submissions/${sub.id}/reprocess`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) throw new Error('Reprocess failed')
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'queued', ai_score: null, ai_feedback: null } : s))
      alert('Reprocessing started — check back in a moment.')
    } catch (err) { console.error('Reprocess failed:', err); alert('Failed to reprocess.') }
    finally { setReprocessingId(null) }
  }

  const handleDeleteSubmission = async (subId) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return
    setDeletingId(subId)
    try {
      const res = await fetch(`/api/submissions/${subId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) throw new Error('Delete failed')
      setSubmissions(prev => prev.filter(s => s.id !== subId))
    } catch (err) { console.error('Delete failed:', err); alert('Failed to delete submission.') }
    finally { setDeletingId(null) }
  }

  const handleDeleteSession = async () => {
    if (!confirm(`Delete session "${session.title}" and ALL its submissions? This cannot be undone.`)) return
    setDeletingSession(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) throw new Error('Delete failed')
      onBack()
    } catch (err) { console.error('Delete session failed:', err); alert('Failed to delete session.'); setDeletingSession(false) }
  }

  const handleOverrideSave = async () => {
    if (!newScore) return
    setSaving(true)
    try {
      await fetch(`/api/submissions/${overrideModal.id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ final_score: parseInt(newScore), override_reason: overrideReason, student_id: newStudentId.trim() || undefined })
      })
      setSubmissions(prev => prev.map(s =>
        s.id === overrideModal.id
          ? { ...s, final_score: parseInt(newScore), override_reason: overrideReason, student_id: newStudentId.trim() || s.student_id, status: 'completed' }
          : s
      ))
      setOverrideModal(null); setNewScore(''); setOverrideReason(''); setNewStudentId('')
    } catch (err) { console.error('Override failed:', err) }
    finally { setSaving(false) }
  }

  const gradedSubmissions = submissions.filter(s => s.ai_score !== null)
  const scores = gradedSubmissions.map(s => parseFloat(s.final_score ?? s.ai_score)).filter(n => !isNaN(n))
  const classAverage = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '--'
  const highestScore = scores.length > 0 ? Math.max(...scores) : '--'
  const lowestScore  = scores.length > 0 ? Math.min(...scores) : '--'

  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 10,
    border: `1.5px solid ${C.border}`, fontSize: 13.5, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', color: C.ink,
    background: C.surface, transition: 'border-color 0.15s'
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", padding: '28px 32px', minHeight: '100vh', background: "#E8F5BD" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .action-btn-outline:hover { background: ${C.primarySoft} !important; border-color: ${C.primaryLight} !important; }
        .delete-btn:hover { opacity: 0.85; }
        input:focus, textarea:focus, select:focus { border-color: ${C.primary} !important; box-shadow: 0 0 0 3px rgba(132,177,121,0.15); }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: C.textSecondary, fontSize: 13, fontWeight: 600, marginBottom: 10,
            padding: '4px 0', transition: 'color 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.color = C.primaryDark}
            onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
          >
            <ArrowLeft size={16} /> Back to Sessions
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: '0 0 5px', letterSpacing: '-0.5px' }}>{session.title}</h1>
          <p style={{ fontSize: 12.5, color: C.textMuted, margin: 0 }}>
            {totalMarks} marks · {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={handleExportCSV} disabled={exporting} style={{
            background: C.surface, color: C.text, border: `1.5px solid ${C.border}`,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primarySoft; e.currentTarget.style.borderColor = C.primary }}
            onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border }}
          >
            {exporting ? 'Exporting…' : '↓ Export CSV'}
          </button>
          <button onClick={handleExportPDF} disabled={exportingPDF} style={{
            background: C.primary, color: '#fff', border: 'none',
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: `0 4px 14px rgba(132,177,121,0.35)`, transition: 'all 0.15s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.primaryDark}
            onMouseLeave={e => e.currentTarget.style.background = C.primary}
          >
            {exportingPDF ? 'Generating…' : '↓ Export PDF'}
          </button>
          <button onClick={handleDeleteSession} disabled={deletingSession} style={{
            background: '#fff0f0', color: '#dc2626', border: '1px solid #fecaca',
            padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
          }}>
            <Trash2 size={13} /> {deletingSession ? 'Deleting…' : 'Delete Session'}
          </button>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 26, background: C.primarySoft, borderRadius: 11, padding: 3, width: 'fit-content', border: `1px solid ${C.borderLight}` }}>
        {['results', 'analytics'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 26px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
            background: activeTab === tab ? C.surface : 'transparent',
            color: activeTab === tab ? C.ink : C.textMuted,
            boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
            transition: 'all 0.15s', letterSpacing: '-0.1px'
          }}>
            {tab === 'results' ? 'Results' : 'Analytics'}
          </button>
        ))}
      </div>

      {activeTab === 'results' && (
        <>
          {/* ─── Stat Cards ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 26 }}>
            {[
              { label: 'Class Average', value: classAverage, icon: TrendingUp, color: C.primary,     bg: C.primarySoft },
              { label: 'Highest Score', value: highestScore, icon: Award,      color: '#059669',      bg: '#d1fae5'     },
              { label: 'Lowest Score',  value: lowestScore,  icon: Users,      color: lowestScore === 0 ? '#dc2626' : C.textSecondary, bg: lowestScore === 0 ? '#fee2e2' : C.primarySoft }
            ].map((stat, i) => (
              <div key={i} style={{
                background: C.surface, borderRadius: 14, padding: '22px 24px',
                border: `1px solid ${C.borderLight}`, boxShadow: '0 1px 6px rgba(132,177,121,0.08)',
                display: 'flex', alignItems: 'center', gap: 18
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${C.borderLight}` }}>
                  <stat.icon size={22} color={stat.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, letterSpacing: '-1.5px', lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>out of {totalMarks}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Submissions Table ─── */}
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.borderLight}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(132,177,121,0.08)', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.primary }}>
                  {['Student ID', 'Status', 'Score', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 22px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.92)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ padding: '44px', textAlign: 'center', color: C.textMuted, fontSize: 13.5 }}>Loading submissions…</td></tr>
                ) : submissions.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '44px', textAlign: 'center', color: C.textMuted, fontSize: 13.5 }}>No submissions yet — upload answer sheets to get started</td></tr>
                ) : submissions.map((sub, index) => {
                  const score = sub.final_score ?? sub.ai_score
                  const scoreColor = getScoreColor(score)
                  const feedback = getFeedback(sub)
                  const isCompleted = sub.status === 'completed'
                  const isReviewRequired = sub.status === 'review_required'
                  const isGraded = isCompleted || isReviewRequired
                  const plagPct = getPlagiarismPercent(sub.flag_status)
                  const studentLabel = getStudentLabel(sub, index)
                  const isReprocessing = reprocessingId === sub.id
                  const isReviewing = reviewingId === sub.id

                  const statusMap = {
                    completed:       { label: 'Graded ✓',        bg: C.primarySoft,  color: C.primaryDark },
                    review_required: { label: 'Review Required', bg: '#fef3c7',       color: '#b45309'     },
                    error:           { label: 'Error',           bg: '#fee2e2',       color: '#dc2626'     },
                    queued:          { label: 'Queued',          bg: '#fef9c3',       color: '#a16207'     },
                    grading:         { label: 'Grading…',        bg: '#dbeafe',       color: '#1d4ed8'     },
                  }
                  const st = statusMap[sub.status] || { label: sub.status, bg: C.primarySoft, color: C.textMuted }

                  return (
                    <tr key={sub.id}
                      style={{ borderTop: `1px solid ${C.borderLight}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = "#E8F5BD"}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{studentLabel}</span>
                          {plagPct && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <AlertTriangle size={9} /> {plagPct}% match
                            </span>
                          )}
                        </div>
                        {sub.override_reason && <div style={{ fontSize: 11.5, color: '#7c3aed', marginTop: 2, fontWeight: 500 }}>Override applied</div>}
                        {sub.student_id && sub.file_name && sub.student_id !== sub.file_name && (
                          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>File: {sub.file_name.replace(/\.[^/.]+$/, '')}</div>
                        )}
                      </td>

                      <td style={{ padding: '14px 22px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: scoreColor, letterSpacing: '-0.5px' }}>
                            {score !== null && score !== undefined ? `${score}/${totalMarks}` : '—'}
                          </span>
                          {isReviewRequired && (
                            <button onClick={() => handleMarkReviewed(sub)} disabled={isReviewing} style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: 'none',
                              background: isReviewing ? C.primarySoft : C.primary,
                              color: '#fff', fontSize: 11, fontWeight: 700,
                              cursor: isReviewing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                            }}>
                              <CheckCircle size={11} /> {isReviewing ? 'Saving…' : 'Mark Reviewed'}
                            </button>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 22px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {feedback && (
                            <button onClick={() => setFeedbackModal({ sub, feedback })} className="action-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 11.5, cursor: 'pointer', fontWeight: 600, color: C.textSecondary, transition: 'all 0.15s' }}>
                              <Eye size={11} /> Feedback
                            </button>
                          )}
                          {isGraded && (
                            <button onClick={() => { setOverrideModal(sub); setNewScore(String(score || 0)); setOverrideReason(sub.override_reason || ''); setNewStudentId(sub.student_id || '') }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 8, border: 'none', background: C.primarySoft, fontSize: 11.5, cursor: 'pointer', fontWeight: 700, color: C.primaryDark, transition: 'all 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = C.primaryLight + '55'}
                              onMouseLeave={e => e.currentTarget.style.background = C.primarySoft}
                            >
                              <Edit2 size={11} /> Override
                            </button>
                          )}
                          <button onClick={() => handleReprocess(sub)} disabled={isReprocessing} className="action-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 11.5, cursor: isReprocessing ? 'not-allowed' : 'pointer', fontWeight: 600, color: C.textSecondary, transition: 'all 0.15s' }}>
                            <RefreshCw size={11} style={{ animation: isReprocessing ? 'spin 1s linear infinite' : 'none' }} />
                            {isReprocessing ? 'Queuing…' : 'Reprocess'}
                          </button>
                          <button onClick={() => handleDeleteSubmission(sub.id)} disabled={deletingId === sub.id} className="delete-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 8, border: 'none', background: '#fee2e2', fontSize: 11.5, cursor: 'pointer', fontWeight: 700, color: '#dc2626', transition: 'opacity 0.15s' }}>
                            <Trash2 size={11} /> {deletingId === sub.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'analytics' && <SessionAnalytics session={session} />}

      

      {/* ─── Feedback Modal ─── */}
      {feedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,14,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,30,14,0.22)', border: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.3px' }}>
                {getStudentLabel(feedbackModal.sub, 0)}
              </h3>
              <button onClick={() => setFeedbackModal(null)} style={{ background: C.primarySoft, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color={C.textSecondary} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 0 24px', borderBottom: `1px solid ${C.borderLight}`, marginBottom: 22 }}>
              <div style={{ fontSize: 56, fontWeight: 800, color: getScoreColor(feedbackModal.sub.final_score ?? feedbackModal.sub.ai_score), letterSpacing: '-3px', lineHeight: 1 }}>
                {(feedbackModal.sub.final_score ?? feedbackModal.sub.ai_score)}/{totalMarks}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
                {Math.round(((feedbackModal.sub.final_score ?? feedbackModal.sub.ai_score) / totalMarks) * 100)}% score
              </div>
              {feedbackModal.sub.status === 'review_required' && (
                <button onClick={async () => { await handleMarkReviewed(feedbackModal.sub); setFeedbackModal(prev => ({ ...prev, sub: { ...prev.sub, status: 'completed' } })) }}
                  style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 12px rgba(132,177,121,0.3)` }}>
                  <CheckCircle size={14} /> Mark as Reviewed
                </button>
              )}
              {feedbackModal.sub.status === 'completed' && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.primary, fontWeight: 700 }}>✓ Reviewed</div>
              )}
            </div>

            {[
              { key: 'feedback',     label: 'AI Feedback',            labelColor: C.textMuted,  bg: "#E8F5BD"  },
              { key: 'strengths',    label: 'Strengths',              labelColor: '#059669',    bg: '#f0fdf4'  },
              { key: 'improvements', label: 'Areas for Improvement', labelColor: '#d97706',    bg: '#fffbeb'  },
            ].map(({ key, label, labelColor, bg }) => feedbackModal.feedback?.[key] && (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{label}</div>
                <p style={{ fontSize: 13.5, color: C.text, lineHeight: 1.65, margin: 0, background: bg, padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.borderLight}` }}>{feedbackModal.feedback[key]}</p>
              </div>
            ))}

            <button onClick={() => setFeedbackModal(null)} style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: C.primarySoft, color: C.primaryDark, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginTop: 6, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.primaryLight; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.primarySoft; e.currentTarget.style.color = C.primaryDark }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ─── Override Modal ─── */}
      {overrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,14,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: C.surface, borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(15,30,14,0.22)', border: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.3px' }}>Override Grade</h3>
              <button onClick={() => setOverrideModal(null)} style={{ background: C.primarySoft, border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} color={C.textSecondary} />
              </button>
            </div>

            {[
              { label: 'Student ID', hint: 'Used in CSV/PDF exports', value: newStudentId, onChange: e => setNewStudentId(e.target.value), placeholder: 'e.g. STU-001 or John Smith', type: 'text' },
              { label: `New Score (out of ${totalMarks})`, value: newScore, onChange: e => setNewScore(e.target.value), type: 'number', min: 0, max: totalMarks },
            ].map(({ label, hint, ...props }, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 5 }}>
                  {label} {hint && <span style={{ fontWeight: 400, color: C.textMuted }}>— {hint}</span>}
                </label>
                <input style={inputStyle} {...props} />
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: C.textSecondary, display: 'block', marginBottom: 5 }}>Reason for Override</label>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={3}
                placeholder="e.g. Marked question 3 manually"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button onClick={handleOverrideSave} disabled={saving} style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px rgba(132,177,121,0.35)`, marginBottom: 10, transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.primaryDark}
              onMouseLeave={e => e.currentTarget.style.background = C.primary}
            >
              {saving ? 'Saving…' : 'Save Override'}
            </button>
            <button onClick={() => setOverrideModal(null)} style={{ width: '100%', padding: 11, borderRadius: 11, border: `1.5px solid ${C.border}`, background: C.surface, color: C.textSecondary, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.primarySoft }}
              onMouseLeave={e => { e.currentTarget.style.background = C.surface }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}