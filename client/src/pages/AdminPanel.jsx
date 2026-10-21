import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Users, LayoutGrid, Zap, RefreshCw, LogOut, Trash2, Eye,
  RotateCcw, ChevronLeft, CheckCircle, XCircle, Clock,
  AlertTriangle, Activity, Shield, PlayCircle
} from 'lucide-react'

const token = () => localStorage.getItem('adminToken')
const auth = () => ({ Authorization: `Bearer ${token()}` })

const STATUS_MAP = {
  completed:       { color: 'rgb(80,130,70)',  bg: 'rgb(232,245,189)', border: 'rgb(199,234,187)' },
  grading:         { color: '#d97706',          bg: '#fef3c7',          border: '#fde68a' },
  queued:          { color: '#2563eb',          bg: '#dbeafe',          border: '#bfdbfe' },
  draft:           { color: '#64748b',          bg: '#f1f5f9',          border: '#e2e8f0' },
  error:           { color: '#dc2626',          bg: '#fee2e2',          border: '#fca5a5' },
  review_required: { color: '#d97706',          bg: '#fef3c7',          border: '#fde68a' },
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users')

  // ── Core data ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  // ── Queue data (real) ──────────────────────────────────────────────────────
  const [queueStats, setQueueStats] = useState({ waiting: 0, active: 0, failed: 0, completed: 0, delayed: 0 })
  const [failedJobs, setFailedJobs] = useState([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [retryingJob, setRetryingJob] = useState(null)
  const [deletingJob, setDeletingJob] = useState(null)
  const [retryingAll, setRetryingAll] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  // ── Session detail ─────────────────────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState(null)
  const [userSessions, setUserSessions] = useState([])
  const [userSessionsLoading, setUserSessionsLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false)
  const [reprocessing, setReprocessing] = useState(null)
  const [deletingSession, setDeletingSession] = useState(null)
  const [reprocessingSub, setReprocessingSub] = useState(null)
  const [deletingSub, setDeletingSub] = useState(null)

  useEffect(() => {
    const t = localStorage.getItem('adminToken')
    if (!t) { navigate('/admin/login', { replace: true }); return }
    fetchAll()
  }, [navigate])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [uRes, sRes, stRes] = await Promise.all([
        axios.get('/api/admin/users',    { headers: auth() }),
        axios.get('/api/admin/sessions', { headers: auth() }),
        axios.get('/api/admin/stats',    { headers: auth() }),
      ])
      setUsers(uRes.data.data || [])
      setSessions(sRes.data.data || [])
      setStats(stRes.data.data || {})
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('adminToken')
        navigate('/admin/login')
      }
    } finally { setLoading(false) }
  }

  // ── Fetch real queue data ──────────────────────────────────────────────────
  const fetchQueueData = useCallback(async () => {
    setQueueLoading(true)
    try {
      const [statsRes, failedRes] = await Promise.all([
        axios.get('/api/admin/queue/stats',  { headers: auth() }),
        axios.get('/api/admin/queue/failed', { headers: auth() }),
      ])
      setQueueStats(statsRes.data.data || {})
      setFailedJobs(failedRes.data.data || [])
    } catch (err) {
      console.error('Queue fetch error:', err.message)
    } finally { setQueueLoading(false) }
  }, [])

  // Fetch queue data when Queue Health tab is opened
  useEffect(() => {
    if (activeTab === 'queue') fetchQueueData()
  }, [activeTab, fetchQueueData])

  // ── Retry single job ───────────────────────────────────────────────────────
  const handleRetryJob = async (jobId) => {
    setRetryingJob(jobId)
    try {
      await axios.post(`/api/admin/queue/failed/${jobId}/retry`, {}, { headers: auth() })
      await fetchQueueData()
    } catch (err) {
      alert('Failed to retry job: ' + (err.response?.data?.error || err.message))
    } finally { setRetryingJob(null) }
  }

  // ── Delete single job ──────────────────────────────────────────────────────
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Remove this failed job from the queue?')) return
    setDeletingJob(jobId)
    try {
      await axios.delete(`/api/admin/queue/failed/${jobId}`, { headers: auth() })
      setFailedJobs(prev => prev.filter(j => j.id !== jobId))
      setQueueStats(prev => ({ ...prev, failed: Math.max(0, (prev.failed || 0) - 1) }))
    } catch (err) {
      alert('Failed to delete job: ' + (err.response?.data?.error || err.message))
    } finally { setDeletingJob(null) }
  }

  // ── Retry all failed ───────────────────────────────────────────────────────
  const handleRetryAll = async () => {
    if (!window.confirm(`Retry all ${queueStats.failed} failed jobs?`)) return
    setRetryingAll(true)
    try {
      const res = await axios.post('/api/admin/queue/failed/retry-all', {}, { headers: auth() })
      alert(res.data.message)
      await fetchQueueData()
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message))
    } finally { setRetryingAll(false) }
  }

  // ── Clear all failed ───────────────────────────────────────────────────────
  const handleClearAll = async () => {
    if (!window.confirm('Permanently delete ALL failed jobs? This cannot be undone.')) return
    setClearingAll(true)
    try {
      await axios.delete('/api/admin/queue/failed', { headers: auth() })
      setFailedJobs([])
      setQueueStats(prev => ({ ...prev, failed: 0 }))
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message))
    } finally { setClearingAll(false) }
  }

  // ── Session / user handlers ────────────────────────────────────────────────
  const viewUserSessions = async (user) => {
    setSelectedUser(user); setUserSessionsLoading(true); setActiveTab('sessions')
    try {
      const res = await axios.get(`/api/admin/users/${user.id}/sessions`, { headers: auth() })
      setUserSessions(res.data.data || [])
    } catch (err) { console.error(err) }
    finally { setUserSessionsLoading(false) }
  }

  const viewSessionDetail = async (sess) => {
    setSelectedSession(sess); setSessionDetailLoading(true)
    try {
      const res = await axios.get(`/api/admin/sessions/${sess.id}`, { headers: auth() })
      setSessionDetail(res.data.data)
    } catch (err) { console.error(err) }
    finally { setSessionDetailLoading(false) }
  }

  const handleReprocess = async (sessId) => {
    if (!window.confirm('Reprocess all submissions in this session?')) return
    setReprocessing(sessId)
    try {
      const res = await axios.post(`/api/admin/sessions/${sessId}/reprocess`, {}, { headers: auth() })
      alert(res.data.message)
      await fetchAll()
    } catch (err) { alert('Failed: ' + (err.response?.data?.error || err.message)) }
    finally { setReprocessing(null) }
  }

  const handleDeleteSession = async (sess) => {
    if (!window.confirm(`Delete session "${sess.title}" and ALL its submissions?`)) return
    setDeletingSession(sess.id)
    try {
      await axios.delete(`/api/admin/sessions/${sess.id}`, { headers: auth() })
      setSessions(prev => prev.filter(s => s.id !== sess.id))
      setUserSessions(prev => prev.filter(s => s.id !== sess.id))
      if (selectedSession?.id === sess.id) { setSelectedSession(null); setSessionDetail(null) }
    } catch (err) { alert('Failed: ' + (err.response?.data?.error || err.message)) }
    finally { setDeletingSession(null) }
  }

  const handleReprocessSub = async (sub) => {
    if (!window.confirm(`Reprocess "${sub.file_name || sub.id}"?`)) return
    setReprocessingSub(sub.id)
    try {
      await axios.post(`/api/admin/submissions/${sub.id}/reprocess`, {}, { headers: auth() })
      setSessionDetail(prev => ({
        ...prev,
        submissions: prev.submissions.map(s =>
          s.id === sub.id ? { ...s, status: 'queued', ai_score: null, ai_feedback: null, final_score: null } : s
        )
      }))
    } catch (err) { alert('Failed: ' + (err.response?.data?.error || err.message)) }
    finally { setReprocessingSub(null) }
  }

  const handleDeleteSub = async (subId) => {
    if (!window.confirm('Delete this submission?')) return
    setDeletingSub(subId)
    try {
      await axios.delete(`/api/admin/submissions/${subId}`, { headers: auth() })
      setSessionDetail(prev => ({ ...prev, submissions: prev.submissions.filter(s => s.id !== subId) }))
    } catch (err) { alert('Failed: ' + (err.response?.data?.error || err.message)) }
    finally { setDeletingSub(null) }
  }

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name} and all their data?`)) return
    try {
      await axios.delete(`/api/admin/users/${id}`, { headers: auth() })
      setUsers(prev => prev.filter(u => u.id !== id))
      if (selectedUser?.id === id) { setSelectedUser(null); setUserSessions([]) }
    } catch (err) { alert('Failed: ' + (err.response?.data?.error || err.message)) }
  }

  const handleLogout = () => { localStorage.removeItem('adminToken'); navigate('/') }
  const backToAllSessions = () => { setSelectedUser(null); setUserSessions([]); setSelectedSession(null); setSessionDetail(null) }
  const backToSessions = () => { setSelectedSession(null); setSessionDetail(null) }

  const currentSessions = selectedUser ? userSessions : sessions

  const tabs = [
    { id: 'users',    label: 'Users',        Icon: Users,      count: users.length },
    { id: 'sessions', label: 'Sessions',     Icon: LayoutGrid, count: sessions.length },
    { id: 'queue',    label: 'Queue Health', Icon: Zap,        count: queueStats.failed > 0 ? queueStats.failed : null, alert: true },
  ]

  return (
    <div style={s.root}>
      {/* Navbar */}
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <div style={s.navLogo}>
            <div style={s.logoBox}><Shield size={18} color="rgb(80,130,70)" /></div>
            <div>
              <div style={s.logoTitle}>GradeFlow</div>
              <div style={s.logoSub}>Admin Console</div>
            </div>
          </div>
          <div style={s.navDivider} />
          <div style={s.navStats}>
            {[
              { label: 'Teachers',    val: stats.totalUsers ?? 0 },
              { label: 'Sessions',    val: stats.totalSessions ?? 0 },
              { label: 'Submissions', val: stats.totalSubmissions ?? 0 },
              { label: 'Graded',      val: stats.graded ?? 0 },
            ].map((item, i) => (
              <div key={i} style={s.navStat}>
                <span style={s.navStatVal}>{item.val}</span>
                <span style={s.navStatLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={s.navRight}>
          <div style={s.adminBadge}><span style={s.adminDot} />Admin</div>
          <button style={s.logoutBtn} onClick={handleLogout}>
            <LogOut size={14} style={{ marginRight: 6 }} />Sign Out
          </button>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.hero}>
          <div>
            <h1 style={s.heroTitle}>Admin Dashboard</h1>
            <p style={s.heroSub}>Manage users, monitor sessions and track system health</p>
          </div>
          <button style={s.refreshBtn} onClick={fetchAll}>
            <RefreshCw size={14} style={{ marginRight: 6 }} />Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div style={s.summaryGrid}>
          {[
            { label: 'Total Teachers',  val: stats.totalUsers ?? 0,     Icon: Users,       color: 'rgb(132,177,121)' },
            { label: 'Total Sessions',  val: stats.totalSessions ?? 0,  Icon: LayoutGrid,  color: 'rgb(162,203,139)' },
            { label: 'Graded',          val: stats.graded ?? 0,         Icon: CheckCircle, color: 'rgb(199,234,187)' },
            { label: 'Avg Score',       val: `${stats.avgScore ?? 0}%`, Icon: Activity,    color: 'rgb(132,177,121)' },
          ].map(({ label, val, Icon: Ic, color }, i) => (
            <div key={i} style={s.summaryCard}>
              <div style={{ ...s.summaryIconBox, background: color + '33', border: `1.5px solid ${color}66` }}>
                <Ic size={20} color={color} />
              </div>
              <div style={s.summaryVal}>{val}</div>
              <div style={s.summaryLabel}>{label}</div>
              <div style={{ ...s.summaryBar, background: color }} />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={s.tabRow}>
          {tabs.map(({ id, label, Icon: Ic, count, alert }) => (
            <button key={id} onClick={() => { setActiveTab(id); backToAllSessions() }}
              style={{ ...s.tab, ...(activeTab === id ? s.tabActive : {}) }}>
              <Ic size={15} /><span>{label}</span>
              {count != null && (
                <span style={{ ...s.tabCount, ...(alert && count > 0 ? s.tabCountAlert : {}) }}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={s.loadingWrap}>
            <RefreshCw size={24} color="rgb(132,177,121)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={s.loadingText}>Loading...</p>
          </div>
        ) : (
          <>
            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <div style={s.card}>
                <div style={s.cardHead}>
                  <div>
                    <h2 style={s.cardTitle}>Registered Users</h2>
                    <p style={s.cardSub}>{users.length} teachers on the platform</p>
                  </div>
                </div>
                <div style={s.tableScroll}>
                  <table style={s.table}>
                    <thead><tr style={s.theadRow}>
                      {['Email','Name','Plan','Sessions','Verified','Joined','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={7} style={s.emptyCell}>No users registered yet</td></tr>
                      ) : users.map((u, i) => (
                        <tr key={i} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : 'rgb(250,254,248)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgb(240,250,236)'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : 'rgb(250,254,248)'}
                        >
                          <td style={{ ...s.td, color: 'rgb(60,110,50)', fontWeight: 600 }}>{u.email}</td>
                          <td style={s.td}>{u.full_name || '—'}</td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, ...(u.plan === 'pro' ? s.badgePro : s.badgeFree) }}>{u.plan || 'free'}</span>
                          </td>
                          <td style={s.td}>{u.session_count || 0}</td>
                          <td style={s.td}>
                            {u.is_email_verified
                              ? <span style={s.verified}><CheckCircle size={13} style={{ marginRight: 4 }} />Verified</span>
                              : <span style={s.unverified}><XCircle size={13} style={{ marginRight: 4 }} />Unverified</span>}
                          </td>
                          <td style={{ ...s.td, color: '#94a3b8' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                          <td style={s.td}>
                            <div style={s.actions}>
                              <button style={s.btnView} onClick={() => viewUserSessions(u)}>
                                <Eye size={13} style={{ marginRight: 4 }} />View Sessions
                              </button>
                              <button style={s.btnDelete} onClick={() => handleDeleteUser(u.id, u.full_name || u.email)}>
                                <Trash2 size={13} style={{ marginRight: 4 }} />Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── SESSIONS LIST ── */}
            {activeTab === 'sessions' && !selectedSession && (
              <div style={s.card}>
                <div style={s.cardHead}>
                  <div>
                    {selectedUser && (
                      <button style={s.backBtn} onClick={backToAllSessions}>
                        <ChevronLeft size={15} />Back to all sessions
                      </button>
                    )}
                    <h2 style={s.cardTitle}>
                      {selectedUser ? `Sessions — ${selectedUser.full_name || selectedUser.email}` : 'All Sessions'}
                    </h2>
                    <p style={s.cardSub}>{currentSessions.length} session{currentSessions.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {userSessionsLoading ? (
                  <div style={s.loadingWrap}>
                    <RefreshCw size={20} color="rgb(132,177,121)" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <div style={s.tableScroll}>
                    <table style={s.table}>
                      <thead><tr style={s.theadRow}>
                        {['Session Title','Teacher','Status','Submissions','Created At','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {currentSessions.length === 0 ? (
                          <tr><td colSpan={6} style={s.emptyCell}>No sessions found</td></tr>
                        ) : currentSessions.map((sess, i) => {
                          const sc = STATUS_MAP[sess.status] || STATUS_MAP.draft
                          const isReprocessing = reprocessing === sess.id
                          const isDeleting = deletingSession === sess.id
                          return (
                            <tr key={i} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : 'rgb(250,254,248)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgb(240,250,236)'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : 'rgb(250,254,248)'}
                            >
                              <td style={{ ...s.td, fontWeight: 600, color: '#1e293b' }}>{sess.title}</td>
                              <td style={s.td}>
                                <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{sess.teacher_name || '—'}</div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>{sess.teacher_email}</div>
                              </td>
                              <td style={s.td}>
                                <span style={{ ...s.badge, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                                  {sess.status || 'draft'}
                                </span>
                              </td>
                              <td style={s.td}>{sess.submission_count || 0}</td>
                              <td style={{ ...s.td, color: '#94a3b8' }}>{sess.created_at ? new Date(sess.created_at).toLocaleDateString() : '—'}</td>
                              <td style={s.td}>
                                <div style={s.actions}>
                                  <button style={s.btnView} onClick={() => viewSessionDetail(sess)}>
                                    <Eye size={13} style={{ marginRight: 4 }} />View
                                  </button>
                                  <button style={s.btnReprocess} disabled={isReprocessing} onClick={() => handleReprocess(sess.id)}>
                                    <RotateCcw size={13} style={{ marginRight: 4, animation: isReprocessing ? 'spin 1s linear infinite' : 'none' }} />
                                    {isReprocessing ? 'Processing...' : 'Reprocess'}
                                  </button>
                                  <button style={{ ...s.btnDelete, opacity: isDeleting ? 0.5 : 1 }} disabled={isDeleting} onClick={() => handleDeleteSession(sess)}>
                                    <Trash2 size={13} style={{ marginRight: 4 }} />
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── SESSION DETAIL ── */}
            {activeTab === 'sessions' && selectedSession && (
              <div style={s.card}>
                <div style={s.cardHead}>
                  <div>
                    <button style={s.backBtn} onClick={backToSessions}>
                      <ChevronLeft size={15} />Back to sessions
                    </button>
                    <h2 style={s.cardTitle}>{selectedSession.title}</h2>
                    <p style={s.cardSub}>{selectedSession.teacher_name} · {sessionDetail?.submissions?.length ?? 0} submissions</p>
                  </div>
                  <div style={s.actions}>
                    <button style={s.btnReprocess} onClick={() => handleReprocess(selectedSession.id)}>
                      <RotateCcw size={13} style={{ marginRight: 4 }} />Reprocess All
                    </button>
                    <button style={{ ...s.btnDelete, opacity: deletingSession === selectedSession.id ? 0.5 : 1 }}
                      disabled={deletingSession === selectedSession.id} onClick={() => handleDeleteSession(selectedSession)}>
                      <Trash2 size={13} style={{ marginRight: 4 }} />
                      {deletingSession === selectedSession.id ? 'Deleting...' : 'Delete Session'}
                    </button>
                  </div>
                </div>
                {sessionDetailLoading ? (
                  <div style={s.loadingWrap}>
                    <RefreshCw size={20} color="rgb(132,177,121)" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : sessionDetail ? (
                  <div style={s.tableScroll}>
                    <table style={s.table}>
                      <thead><tr style={s.theadRow}>
                        {['File','Student ID','Status','AI Score','Final Score','Graded At','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(sessionDetail.submissions || []).length === 0 ? (
                          <tr><td colSpan={7} style={s.emptyCell}>No submissions yet</td></tr>
                        ) : sessionDetail.submissions.map((sub, i) => {
                          const sc = STATUS_MAP[sub.status] || STATUS_MAP.draft
                          const isSubReprocessing = reprocessingSub === sub.id
                          const isSubDeleting = deletingSub === sub.id
                          return (
                            <tr key={i} style={{ ...s.tr, background: i % 2 === 0 ? '#fff' : 'rgb(250,254,248)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgb(240,250,236)'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : 'rgb(250,254,248)'}
                            >
                              <td style={{ ...s.td, color: 'rgb(60,110,50)', fontWeight: 600 }}>{sub.file_name || '—'}</td>
                              <td style={s.td}>{sub.student_id || '—'}</td>
                              <td style={s.td}>
                                <span style={{ ...s.badge, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>{sub.status}</span>
                              </td>
                              <td style={s.td}>{sub.ai_score ?? '—'}</td>
                              <td style={s.td}>{sub.final_score ?? '—'}</td>
                              <td style={{ ...s.td, color: '#94a3b8' }}>{sub.graded_at ? new Date(sub.graded_at).toLocaleDateString() : '—'}</td>
                              <td style={s.td}>
                                <div style={s.actions}>
                                  <button style={{ ...s.btnReprocess, opacity: isSubReprocessing ? 0.5 : 1 }}
                                    disabled={isSubReprocessing} onClick={() => handleReprocessSub(sub)}>
                                    <RotateCcw size={12} style={{ marginRight: 4, animation: isSubReprocessing ? 'spin 1s linear infinite' : 'none' }} />
                                    {isSubReprocessing ? 'Queuing...' : 'Reprocess'}
                                  </button>
                                  <button style={{ ...s.btnDelete, opacity: isSubDeleting ? 0.5 : 1 }}
                                    disabled={isSubDeleting} onClick={() => handleDeleteSub(sub.id)}>
                                    <Trash2 size={12} style={{ marginRight: 4 }} />
                                    {isSubDeleting ? '...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}

            {/* ── QUEUE HEALTH (real data) ── */}
            {activeTab === 'queue' && (
              <div>
                {/* Stat cards */}
                <div style={s.queueGrid}>
                  {[
                    { label: 'Waiting',   val: queueStats.waiting   ?? 0, Icon: Clock,         color: '#2563eb',        bg: '#dbeafe',          border: '#bfdbfe' },
                    { label: 'Active',    val: queueStats.active    ?? 0, Icon: Activity,      color: 'rgb(80,130,70)', bg: 'rgb(232,245,189)', border: 'rgb(199,234,187)' },
                    { label: 'Failed',    val: queueStats.failed    ?? 0, Icon: AlertTriangle, color: '#dc2626',        bg: '#fee2e2',          border: '#fca5a5', alert: true },
                    { label: 'Completed', val: queueStats.completed ?? 0, Icon: CheckCircle,   color: 'rgb(80,130,70)', bg: 'rgb(232,245,189)', border: 'rgb(199,234,187)' },
                  ].map(({ label, val, Icon: Ic, color, bg, border, alert }, i) => (
                    <div key={i} style={{ ...s.queueCard, background: bg, border: `1px solid ${border}`, borderTop: `4px solid ${color}` }}>
                      <div style={{ ...s.queueIconBox, background: color + '22' }}><Ic size={22} color={color} /></div>
                      <div style={{ ...s.queueVal, color }}>{val}</div>
                      <div style={s.queueLabel}>{label}</div>
                      {alert && val > 0 && (
                        <div style={s.alertTag}><AlertTriangle size={11} style={{ marginRight: 4 }} />Needs attention</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Failed jobs table */}
                <div style={s.card}>
                  <div style={s.cardHead}>
                    <div>
                      <h2 style={{ ...s.cardTitle, color: queueStats.failed > 0 ? '#dc2626' : '#0f172a' }}>
                        Failed Jobs {queueStats.failed > 0 && `(${queueStats.failed})`}
                      </h2>
                      <p style={s.cardSub}>Jobs that failed after all retry attempts</p>
                    </div>
                    <div style={s.actions}>
                      <button style={s.refreshBtn} onClick={fetchQueueData} disabled={queueLoading}>
                        <RefreshCw size={13} style={{ marginRight: 6, animation: queueLoading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                      </button>
                      {failedJobs.length > 0 && (
                        <>
                          <button style={s.btnReprocess} onClick={handleRetryAll} disabled={retryingAll}>
                            <PlayCircle size={13} style={{ marginRight: 4 }} />
                            {retryingAll ? 'Retrying...' : 'Retry All'}
                          </button>
                          <button style={s.btnDelete} onClick={handleClearAll} disabled={clearingAll}>
                            <Trash2 size={13} style={{ marginRight: 4 }} />
                            {clearingAll ? 'Clearing...' : 'Clear All'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {queueLoading ? (
                    <div style={s.loadingWrap}>
                      <RefreshCw size={20} color="rgb(132,177,121)" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : (
                    <div style={s.tableScroll}>
                      <table style={s.table}>
                        <thead><tr style={s.theadRow}>
                          {['Job ID','Submission ID','Error','Attempts','Failed At','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {failedJobs.length === 0 ? (
                            <tr><td colSpan={6} style={{ ...s.emptyCell, color: 'rgb(80,130,70)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <CheckCircle size={16} />No failed jobs — queue is healthy!
                              </div>
                            </td></tr>
                          ) : failedJobs.map((job, i) => {
                            const isRetrying = retryingJob === job.id
                            const isDeleting = deletingJob === job.id
                            return (
                              <tr key={i} style={{ ...s.tr, borderLeft: '3px solid #fca5a5', background: i % 2 === 0 ? '#fff' : '#fff5f5' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'}
                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fff5f5'}
                              >
                                <td style={s.td}><code style={s.code}>{job.id}</code></td>
                                <td style={s.td}>
                                  <code style={s.code}>{job.submissionId || '—'}</code>
                                  {job.sessionId && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>session: {job.sessionId}</div>}
                                </td>
                                <td style={{ ...s.td, color: '#dc2626', fontWeight: 600, maxWidth: 220 }}>
                                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.error}>
                                    {job.error}
                                  </div>
                                </td>
                                <td style={s.td}>
                                  <span style={{ ...s.badge, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                                    {job.attempts} attempt{job.attempts !== 1 ? 's' : ''}
                                  </span>
                                </td>
                                <td style={{ ...s.td, color: '#94a3b8', fontSize: '12px' }}>
                                  {job.finishedOn ? new Date(job.finishedOn).toLocaleString() : '—'}
                                </td>
                                <td style={s.td}>
                                  <div style={s.actions}>
                                    <button
                                      style={{ ...s.btnReprocess, opacity: isRetrying ? 0.5 : 1 }}
                                      disabled={isRetrying}
                                      onClick={() => handleRetryJob(job.id)}
                                    >
                                      <RotateCcw size={12} style={{ marginRight: 4, animation: isRetrying ? 'spin 1s linear infinite' : 'none' }} />
                                      {isRetrying ? 'Retrying...' : 'Retry'}
                                    </button>
                                    <button
                                      style={{ ...s.btnDelete, opacity: isDeleting ? 0.5 : 1 }}
                                      disabled={isDeleting}
                                      onClick={() => handleDeleteJob(job.id)}
                                    >
                                      <Trash2 size={12} style={{ marginRight: 4 }} />
                                      {isDeleting ? '...' : 'Delete'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#f8faf7', fontFamily: "'Nunito', sans-serif", color: '#1e293b' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', height: '64px', background: '#fff', borderBottom: '1px solid rgb(232,245,189)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(132,177,121,0.1)' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '32px' },
  navLogo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoBox: { width: '36px', height: '36px', borderRadius: '10px', background: 'rgb(232,245,189)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  logoSub: { fontSize: '10px', color: 'rgb(132,177,121)', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 },
  navDivider: { width: '1px', height: '28px', background: 'rgb(232,245,189)' },
  navStats: { display: 'flex', gap: '28px' },
  navStat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  navStatVal: { fontSize: '17px', fontWeight: '800', color: 'rgb(60,110,50)' },
  navStatLabel: { fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  adminBadge: { display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700, color: 'rgb(60,110,50)', background: 'rgb(232,245,189)', padding: '6px 14px', borderRadius: '20px' },
  adminDot: { width: '7px', height: '7px', borderRadius: '50%', background: 'rgb(132,177,121)', display: 'inline-block' },
  logoutBtn: { display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #fca5a5', color: '#dc2626', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  main: { padding: '32px 40px', maxWidth: '1440px', margin: '0 auto' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  heroTitle: { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' },
  heroSub: { fontSize: '14px', color: '#64748b', margin: 0 },
  refreshBtn: { display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid rgb(199,234,187)', color: 'rgb(60,110,50)', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', marginBottom: '32px' },
  summaryCard: { background: '#fff', border: '1px solid rgb(232,245,189)', borderRadius: '14px', padding: '24px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 1px 4px rgba(132,177,121,0.08)' },
  summaryIconBox: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' },
  summaryVal: { fontSize: '34px', fontWeight: '800', color: 'rgb(30,58,40)', lineHeight: 1, marginBottom: '4px' },
  summaryLabel: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '16px' },
  summaryBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', opacity: 0.5 },
  tabRow: { display: 'flex', gap: '4px', borderBottom: '2px solid rgb(232,245,189)', marginBottom: '24px' },
  tab: { display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: '-2px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s' },
  tabActive: { color: 'rgb(60,110,50)', borderBottomColor: 'rgb(132,177,121)', background: 'rgb(248,253,246)' },
  tabCount: { background: 'rgb(232,245,189)', color: 'rgb(60,110,50)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' },
  tabCountAlert: { background: '#fee2e2', color: '#dc2626' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px' },
  loadingText: { color: '#94a3b8', fontSize: '14px', marginTop: '12px' },
  card: { background: '#fff', border: '1px solid rgb(232,245,189)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(132,177,121,0.08)', marginBottom: '24px' },
  cardHead: { padding: '20px 24px', borderBottom: '1px solid rgb(240,250,236)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardTitle: { fontSize: '15px', fontWeight: '700', margin: '0 0 3px', color: '#0f172a' },
  cardSub: { fontSize: '12px', color: '#94a3b8', margin: 0 },
  backBtn: { display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'rgb(132,177,121)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, padding: '0 0 6px 0', marginBottom: '4px' },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  theadRow: { background: 'rgb(248,253,246)' },
  th: { padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'rgb(100,140,90)', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgb(232,245,189)', whiteSpace: 'nowrap' },
  tr: { transition: 'background 0.12s' },
  td: { padding: '14px 20px', fontSize: '13px', color: '#475569', borderBottom: '1px solid rgb(245,252,242)', verticalAlign: 'middle' },
  emptyCell: { padding: '52px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  badgeFree: { background: 'rgb(232,245,189)', color: 'rgb(60,110,50)' },
  badgePro: { background: '#fef3c7', color: '#d97706', border: '1px solid #fbbf2440' },
  verified: { display: 'flex', alignItems: 'center', color: 'rgb(80,130,70)', fontWeight: 700, fontSize: '12px' },
  unverified: { display: 'flex', alignItems: 'center', color: '#dc2626', fontWeight: 700, fontSize: '12px' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  btnView: { display: 'flex', alignItems: 'center', background: 'rgb(232,245,189)', border: '1px solid rgb(199,234,187)', color: 'rgb(60,110,50)', padding: '5px 13px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  btnDelete: { display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', padding: '5px 13px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  btnReprocess: { display: 'flex', alignItems: 'center', background: '#fff7ed', border: '1px solid #fed7aa', color: '#d97706', padding: '5px 13px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 },
  queueGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', marginBottom: '24px' },
  queueCard: { borderRadius: '14px', padding: '28px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  queueIconBox: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  queueVal: { fontSize: '44px', fontWeight: '800', lineHeight: 1, marginBottom: '8px' },
  queueLabel: { fontSize: '13px', color: '#64748b', fontWeight: 600 },
  alertTag: { display: 'inline-flex', alignItems: 'center', marginTop: '12px', background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: '1px solid #fca5a5' },
  code: { fontFamily: 'monospace', fontSize: '12px', background: 'rgb(248,253,246)', color: 'rgb(60,110,50)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgb(232,245,189)' },
}