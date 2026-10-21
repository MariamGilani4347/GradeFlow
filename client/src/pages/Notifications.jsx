import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { X, Bell, CheckCircle, AlertTriangle, Info, Check, GraduationCap, LayoutDashboard, ClipboardList, LogOut, ChevronRight, Calendar, User, BookOpen } from 'lucide-react'

const STORAGE_KEY = 'notifications_state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { read: [], dismissed: [] }
  } catch { return { read: [], dismissed: [] } }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function isToday(dateStr) {
  const d = new Date(dateStr), now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function buildNotifications(sessions, persistedState) {
  return sessions
    .filter(s => !persistedState.dismissed.includes(s.id))
    .map(s => ({
      id: s.id,
      type: s.status === 'completed' ? 'success' : s.status === 'error' ? 'warning' : 'info',
      message: s.status === 'completed'
        ? `Session "${s.title}" grading completed`
        : s.status === 'error'
        ? `Session "${s.title}" encountered an error`
        : `Session "${s.title}" was created`,
      timestamp: s.created_at,
      read: persistedState.read.includes(s.id),
    }))
}

const TYPE_CONFIG = {
  success: { icon: CheckCircle,   color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  warning: { icon: AlertTriangle, color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  info:    { icon: Info,          color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, user, logout } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sessions', { headers: authHeaders })
      const data = await res.json()
      const persisted = loadState()
      const built = buildNotifications(data.data || [], persisted)
      setNotifications(built)
    } catch (err) {
      console.error(err)
      setError('Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  const markRead = (id) => {
    const persisted = loadState()
    if (!persisted.read.includes(id)) { persisted.read.push(id); saveState(persisted) }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = () => {
    const persisted = loadState()
    notifications.forEach(n => { if (!persisted.read.includes(n.id)) persisted.read.push(n.id) })
    saveState(persisted)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id) => {
    if (!confirm('Remove this notification?')) return
    const persisted = loadState()
    if (!persisted.dismissed.includes(id)) { persisted.dismissed.push(id); saveState(persisted) }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unreadCount  = notifications.filter(n => !n.read).length
  const todayItems   = notifications.filter(n => isToday(n.timestamp))
  const earlierItems = notifications.filter(n => !isToday(n.timestamp))

  // ── UPDATED: added Rubrics link ──
  const navLinks = [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Sessions',      icon: ClipboardList,   path: '/dashboard/sessions' },
    { label: 'Rubrics',       icon: BookOpen,        path: '/dashboard/rubrics' },
    { label: 'Notifications', icon: Bell,            path: '/dashboard/notifications', badge: unreadCount },
  ]

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
                  {badge > 0 && <span style={{ background: 'rgb(132,177,121)', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{badge}</span>}
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

        {/* Topbar */}
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

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Notifications</h1>
              {unreadCount > 0 && (
                <span style={{ background: 'rgb(132,177,121)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{unreadCount} new</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Your session activity and updates</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: 'rgb(80,130,70)', border: '1px solid rgb(199,234,187)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              <Check size={14} /> Mark all as read
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div style={{ maxWidth: 720 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid rgb(232,245,189)', opacity: 1 - i * 0.2 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgb(232,245,189)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 13, background: 'rgb(232,245,189)', borderRadius: 6, width: `${70 - i * 10}%`, marginBottom: 8 }} />
                    <div style={{ height: 11, background: 'rgb(240,250,236)', borderRadius: 6, width: '25%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40, background: '#fff1f2', borderRadius: 14, border: '1px solid #fecdd3' }}>
              <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>{error}</div>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: 20, border: '1px solid rgb(199,234,187)' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgb(232,245,189)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Bell size={28} color="rgb(132,177,121)" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>All caught up!</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>No notifications to show</div>
            </div>
          ) : (
            <>
              {todayItems.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 4 }}>Today</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {todayItems.map(n => <NotificationItem key={n.id} notification={n} onMarkRead={markRead} onDelete={deleteNotification} />)}
                  </div>
                </div>
              )}
              {earlierItems.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 4 }}>Earlier</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {earlierItems.map(n => <NotificationItem key={n.id} notification={n} onMarkRead={markRead} onDelete={deleteNotification} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function NotificationItem({ notification: n, onMarkRead, onDelete }) {
  const cfg = TYPE_CONFIG[n.type]
  const Icon = cfg.icon
  return (
    <div
      onClick={() => !n.read && onMarkRead(n.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, background: n.read ? '#fff' : 'rgb(248,253,246)', borderRadius: 14, padding: '14px 16px', border: `1px solid ${n.read ? 'rgb(232,245,189)' : 'rgb(199,234,187)'}`, boxShadow: n.read ? '0 1px 4px rgba(0,0,0,0.04)' : '0 2px 8px rgba(132,177,121,0.12)', transition: 'background 0.12s', cursor: n.read ? 'default' : 'pointer' }}
      onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = 'rgb(240,250,236)' }}
      onMouseLeave={e => { e.currentTarget.style.background = n.read ? '#fff' : 'rgb(248,253,246)' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#0f172a', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(n.timestamp)}</div>
      </div>
      {!n.read && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(132,177,121)', flexShrink: 0, boxShadow: '0 0 0 2px rgba(132,177,121,0.25)' }} />
      )}
      <button
        onClick={e => { e.stopPropagation(); onDelete(n.id) }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}