import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Plus, FileText, Loader, X, Upload, BarChart2, Search, GraduationCap, LayoutDashboard, ClipboardList, Bell, LogOut, ChevronRight, Archive, Eye, Calendar, User, BookOpen, ChevronDown } from 'lucide-react'
import SessionResults from './SessionResults'

const statusConfig = {
  draft:           { label: 'Draft',           color: '#64748b', bg: '#f1f5f9' },
  queued:          { label: 'Queued',           color: '#f59e0b', bg: '#fef3c7' },
  grading:         { label: 'Grading',          color: '#2563eb', bg: '#dbeafe' },
  review_required: { label: 'Review Required',  color: '#8b5cf6', bg: '#ede9fe' },
  completed:       { label: 'Completed',        color: '#16a34a', bg: '#dcfce7' },
  error:           { label: 'Error',            color: '#ef4444', bg: '#fee2e2' },
  active:          { label: 'Active',           color: '#2563eb', bg: '#dbeafe' },
}

export default function Sessions({ courseId }) {
  const { accessToken, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [sessions, setSessions]               = useState([])
  const [loading, setLoading]                 = useState(true)
  const [showModal, setShowModal]             = useState(false)
  const [title, setTitle]                     = useState('')
  const [rubricText, setRubricText]           = useState('')
  const [totalMarks, setTotalMarks]           = useState(100)
  const [creating, setCreating]               = useState(false)
  const [error, setError]                     = useState('')
  const [selectedSession, setSelectedSession] = useState(null)
  const [uploadSession, setUploadSession]     = useState(null)
  const [viewingResults, setViewingResults]   = useState(false)
  const [search, setSearch]                   = useState('')
  const [archiving, setArchiving]             = useState(null)
  const [unreadCount, setUnreadCount]         = useState(0)

  // ── RUBRIC STATE ──
  const [rubrics, setRubrics]               = useState([])
  const [selectedRubricId, setSelectedRubricId] = useState('')
  const [rubricMode, setRubricMode]         = useState('saved') // 'saved' | 'manual'

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken || localStorage.getItem('accessToken')}`,
  }

  useEffect(() => { fetchSessions(); fetchUnreadCount(); fetchRubrics() }, [])

  // ── Fetch saved rubrics for dropdown ──
  const fetchRubrics = async () => {
    try {
      const res = await fetch('/api/rubrics', { headers: authHeaders })
      const data = await res.json()
      setRubrics(data.data || [])
    } catch {
      setRubrics([])
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const stored = JSON.parse(localStorage.getItem('notifications_state') || '{"read":[],"dismissed":[]}')
      const res = await fetch('/api/sessions', { headers: authHeaders })
      const data = await res.json()
      const allSessions = data.data || []
      const unread = allSessions.filter(s =>
        (s.status === 'completed' || s.status === 'review_required') &&
        !stored.read.includes(s.id) &&
        !stored.dismissed.includes(s.id)
      )
      setUnreadCount(unread.length)
    } catch {
      setUnreadCount(0)
    }
  }

  // ── UPDATED: added Rubrics link ──
  const navLinks = [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Sessions',      icon: ClipboardList,   path: '/dashboard/sessions' },
    { label: 'Rubrics',       icon: BookOpen,        path: '/dashboard/rubrics' },
    { label: 'Notifications', icon: Bell,            path: '/dashboard/notifications', badge: unreadCount },
  ]

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sessions', { headers: authHeaders })
      const data = await res.json()
      setSessions(data.data || [])
    } catch (err) { console.error('Failed to fetch sessions:', err) }
    finally { setLoading(false) }
  }

  const createSession = async () => {
    if (!title.trim()) return setError('Title is required.')

    // Validate rubric input based on mode
    if (rubricMode === 'saved' && !selectedRubricId) return setError('Please select a rubric or switch to manual entry.')
    if (rubricMode === 'manual' && !rubricText.trim()) return setError('Rubric / Marking scheme is required.')

    setCreating(true); setError('')

    // Build payload: send rubric_id if saved rubric selected, else rubric_text + total_marks
    const payload = {
      title,
      course_id: courseId || null,
      ...(rubricMode === 'saved'
        ? { rubric_id: selectedRubricId }
        : { rubric_text: rubricText, total_marks: parseInt(totalMarks) || 100 }
      )
    }

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error)
      setSessions(prev => [data.data, ...prev])
      closeModal()
      setUploadSession(data.data)
    } catch { setError('Failed to create session.') }
    finally { setCreating(false) }
  }

  const handleArchive = async (session) => {
    if (!confirm(`Archive "${session.title}"? It will be hidden from the main list.`)) return
    setArchiving(session.id)
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ status: 'archived' })
      })
      setSessions(prev => prev.filter(s => s.id !== session.id))
    } catch (err) {
      console.error('Archive failed:', err)
      alert('Failed to archive session.')
    } finally { setArchiving(null) }
  }

  const closeModal = () => {
    setShowModal(false); setError('')
    setTitle(''); setRubricText(''); setTotalMarks(100)
    setSelectedRubricId(''); setRubricMode('saved')
  }

  const filtered = sessions.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()))

  if (viewingResults && selectedSession) {
    return <SessionResults session={selectedSession} onBack={() => { setViewingResults(false); setSelectedSession(null); fetchSessions() }} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif", background: 'rgb(232,245,189)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 236, minHeight: '100vh', background: '#fff', borderRight: '1px solid rgb(199,234,187)', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, bottom: 0, padding: '24px 0', zIndex: 100 }}>
        <div style={{ padding: '0 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgb(132,177,121), rgb(162,203,139))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(132,177,121,0.3)' }}>
              <GraduationCap size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>GradeFlow</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Assessment Platform</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 8 }}>Main Menu</div>
          {navLinks.map(({ label, icon: Icon, path, badge }) => {
            const active = location.pathname === path
            return (
              <Link key={label} to={path} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 4, background: active ? 'rgb(232,245,189)' : 'transparent', color: active ? 'rgb(132,177,121)' : '#64748b', fontWeight: active ? 600 : 400, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', borderLeft: active ? '3px solid rgb(132,177,121)' : '3px solid transparent' }}>
                  <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge > 0 && (
                    <span style={{ background: 'rgb(132,177,121)', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{badge}</span>
                  )}
                  {active && <ChevronRight size={13} />}
                </div>
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '0 12px', borderTop: '1px solid rgb(199,234,187)', paddingTop: 12 }}>
          <div onClick={() => { logout(); navigate('/login') }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>
            <LogOut size={15} /><span>Logout</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 236, flex: 1, padding: '0 32px 48px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid rgb(199,234,187)', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 12 }}>
            <Calendar size={12} />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 12, padding: '7px 14px', border: '1px solid rgb(199,234,187)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, rgb(132,177,121), rgb(162,203,139))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user?.full_name || 'Teacher'}</div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>Teacher</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>My Sessions</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, border: 'none', background: 'rgb(132,177,121)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(132,177,121,0.35)' }}>
            <Plus size={16} /> New Session
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions by name..." style={{ width: '100%', padding: '11px 14px 11px 40px', borderRadius: 12, border: '1px solid rgb(199,234,187)', background: '#fff', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={14} /></button>}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader size={28} color="rgb(132,177,121)" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '72px 40px', textAlign: 'center', border: '1px solid rgb(199,234,187)' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgb(232,245,189)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText size={32} color="rgb(132,177,121)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {search ? `No sessions matching "${search}"` : 'No sessions yet'}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              {search ? 'Try a different search term' : 'Create your first session to get started'}
            </div>
            {!search && (
              <button onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, border: 'none', background: 'rgb(132,177,121)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                <Plus size={15} /> Create First Session
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgb(199,234,187)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgb(232,245,189)' }}>
                  {['Session Title', 'Status', 'Submissions', 'Created At', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 20px', textAlign: 'left', fontSize: 11, color: 'rgb(99,148,89)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((session) => {
                  const s = statusConfig[session.status] || statusConfig.draft
                  return (
                    <tr key={session.id} style={{ borderTop: '1px solid rgb(232,245,189)', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgb(240,250,232)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '15px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgb(232,245,189)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={16} color="rgb(132,177,121)" />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{session.title}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{session.total_marks || 100} marks</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.color }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '15px 20px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BarChart2 size={13} color="rgb(132,177,121)" />
                          {session.submission_count || 0}
                        </div>
                      </td>
                      <td style={{ padding: '15px 20px', fontSize: 12, color: '#94a3b8' }}>
                        {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '15px 20px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setUploadSession(session)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid rgb(199,234,187)', background: '#fff', fontSize: 11, fontWeight: 600, color: 'rgb(99,148,89)', cursor: 'pointer' }}>
                            <Upload size={11} /> Upload
                          </button>
                          <button onClick={() => { setSelectedSession(session); setViewingResults(true) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgb(132,177,121)', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                            <Eye size={11} /> View
                          </button>
                          <button onClick={() => handleArchive(session)} disabled={archiving === session.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 11, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                            <Archive size={11} /> {archiving === session.id ? '...' : 'Archive'}
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
      </main>

      {/* ── Create Session Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Create New Session</h2>
              <button onClick={closeModal} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} color="#64748b" />
              </button>
            </div>

            {error && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 14 }}>{error}</div>}

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Session Title *</label>
              <input placeholder="e.g. Math Quiz Week 1" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgb(199,234,187)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            {/* Rubric section */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Rubric / Marking Scheme *</label>
                {/* Toggle between saved and manual */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 2 }}>
                  <button
                    onClick={() => setRubricMode('saved')}
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: rubricMode === 'saved' ? 'rgb(132,177,121)' : 'transparent', color: rubricMode === 'saved' ? '#fff' : '#64748b', transition: 'all 0.15s' }}
                  >
                    Saved
                  </button>
                  <button
                    onClick={() => setRubricMode('manual')}
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: rubricMode === 'manual' ? 'rgb(132,177,121)' : 'transparent', color: rubricMode === 'manual' ? '#fff' : '#64748b', transition: 'all 0.15s' }}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {rubricMode === 'saved' ? (
                <>
                  {/* Rubric dropdown */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedRubricId}
                      onChange={e => setSelectedRubricId(e.target.value)}
                      style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: 10, border: '1px solid rgb(199,234,187)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: selectedRubricId ? '#0f172a' : '#94a3b8', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">— Select a saved rubric —</option>
                      {rubrics.map(r => (
                        <option key={r.id} value={r.id}>{r.title} ({r.total_marks} marks)</option>
                      ))}
                    </select>
                    <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>

                  {/* Preview of selected rubric */}
                  {selectedRubricId && (() => {
                    const r = rubrics.find(r => r.id === selectedRubricId)
                    if (!r) return null
                    return (
                      <div style={{ marginTop: 10, background: 'rgb(248,253,246)', border: '1px solid rgb(199,234,187)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgb(99,148,89)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</div>
                        {(r.criteria || []).slice(0, 3).map((c, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', padding: '3px 0', borderBottom: i < Math.min(r.criteria.length, 3) - 1 ? '1px solid rgb(232,245,189)' : 'none' }}>
                            <span>{c.name}</span>
                            <span style={{ fontWeight: 600, color: 'rgb(99,148,89)' }}>{c.maxPoints} pts</span>
                          </div>
                        ))}
                        {r.criteria?.length > 3 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>+{r.criteria.length - 3} more criteria</div>}
                      </div>
                    )
                  })()}

                  {rubrics.length === 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                      No saved rubrics yet.{' '}
                      <Link to="/dashboard/rubrics" style={{ color: 'rgb(99,148,89)', fontWeight: 600 }}>Create one in Rubric Manager →</Link>
                    </div>
                  )}
                </>
              ) : (
                /* Manual text entry */
                <textarea
                  placeholder="Describe how to grade the answers..."
                  value={rubricText}
                  onChange={e => setRubricText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgb(199,234,187)', fontSize: 13, minHeight: 100, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              )}
            </div>

            {/* Total Marks — only shown for manual rubric entry */}
            {rubricMode === 'manual' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Total Marks</label>
                <input
                  type="number" placeholder="100" value={totalMarks}
                  onChange={e => setTotalMarks(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgb(199,234,187)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            )}

            <button onClick={createSession} disabled={creating} style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: 'rgb(132,177,121)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
      )}

      {uploadSession && <UploadCenterModal session={uploadSession} onClose={() => { setUploadSession(null); fetchSessions(); fetchUnreadCount() }} />}
    </div>
  )
}

/* ── Upload Center Modal (unchanged) ── */
function UploadCenterModal({ session, onClose }) {
  const { accessToken } = useAuth()
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef()

  const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  const ACCEPTED_EXT = ['.pdf', '.jpg', '.jpeg', '.png']

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.some(ext => f.name.toLowerCase().endsWith(ext))
    )
    setFiles(prev => [...prev, ...valid.map(file => ({
      id: Math.random().toString(36).slice(2), file,
      name: file.name, size: (file.size / 1024).toFixed(1) + ' KB',
      status: 'pending', progress: 0, error: null,
    }))])
  }

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id))
  const pendingCount = files.filter(f => f.status === 'pending').length
  const allDone = files.length > 0 && files.every(f => f.status === 'done')
  const tick = (id, val) => setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: val } : f))

  const uploadAll = async () => {
    for (const fileObj of files.filter(f => f.status === 'pending')) {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', progress: 10 } : f))
      try {
        tick(fileObj.id, 20)
        const presignRes = await fetch(`/api/sessions/${session.id}/presign`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ file_name: fileObj.name, content_type: fileObj.file.type || 'application/octet-stream' })
        })
        const presignData = await presignRes.json()
        if (!presignRes.ok) throw new Error(presignData.error)
        const { upload_url, file_url } = presignData.data
        tick(fileObj.id, 45)
        await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': fileObj.file.type }, body: fileObj.file })
        tick(fileObj.id, 75)
        await fetch(`/api/sessions/${session.id}/submissions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ file_url, file_key: fileObj.name, file_name: fileObj.name })
        })
        tick(fileObj.id, 100)
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'done', progress: 100 } : f))
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', error: err.message } : f))
      }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '90%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Upload Answer Sheets</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color="#64748b" />
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Session: <strong style={{ color: '#0f172a' }}>{session.title}</strong></p>

        <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current.click()}
          style={{ border: `2.5px dashed ${dragging ? 'rgb(132,177,121)' : 'rgb(199,234,187)'}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', background: dragging ? 'rgb(232,245,189)' : '#f8fafc', cursor: 'pointer', marginBottom: 16, transition: 'all 0.2s' }}
        >
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgb(232,245,189)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Upload size={22} color="rgb(132,177,121)" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
            {dragging ? 'Drop files here' : 'Drag & drop or click to browse'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Upload student answer sheets for AI grading</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {['PDF', 'JPG', 'PNG'].map(t => (
              <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgb(199,234,187)', color: 'rgb(99,148,89)' }}>{t}</span>
            ))}
          </div>
        </div>

        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {files.map(f => (
              <div key={f.id} style={{ background: f.status === 'error' ? '#fff1f2' : f.status === 'done' ? '#f0fdf4' : '#f8fafc', borderRadius: 12, padding: '12px 14px', border: `1px solid ${f.status === 'error' ? '#fca5a5' : f.status === 'done' ? '#bbf7d0' : 'rgb(199,234,187)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{f.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: f.status === 'error' ? '#ef4444' : f.status === 'done' ? '#16a34a' : '#94a3b8' }}>
                      {f.status === 'uploading' ? `${f.progress}%` : f.status === 'done' ? '✓ Done' : f.status === 'error' ? 'Failed' : f.size}
                    </span>
                    {(f.status === 'pending' || f.status === 'error') && (
                      <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}><X size={13} /></button>
                    )}
                  </div>
                </div>
                <div style={{ height: 4, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${f.progress}%`, background: f.status === 'error' ? '#ef4444' : f.status === 'done' ? '#16a34a' : 'rgb(132,177,121)', borderRadius: 999, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={uploadAll} disabled={pendingCount === 0 || allDone}
          style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: pendingCount === 0 ? '#e2e8f0' : allDone ? '#16a34a' : 'rgb(132,177,121)', color: pendingCount === 0 ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 14, cursor: pendingCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {allDone ? '✓ All Uploaded — Grading Started' : pendingCount === 0 ? 'Add files to start grading' : `Submit ${pendingCount} File${pendingCount > 1 ? 's' : ''} for Grading`}
        </button>
        {allDone && <p style={{ textAlign: 'center', fontSize: 12, color: '#16a34a', marginTop: 10, fontWeight: 600 }}>✓ Submitted. AI grading has started — check back soon.</p>}
      </div>
    </div>
  )
}