import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useNavigate, useLocation, Link } from "react-router-dom"
import {
  LayoutDashboard, ClipboardList, Bell, LogOut,
  Calendar, User, GraduationCap, TrendingUp, FileText,
  BarChart2, ChevronRight, Activity, Award, Clock, Zap, Users,
  BookOpen, Sparkles
} from "lucide-react"

const COLORS = {
  primary: "rgb(94, 163, 79)",
  primaryLight: "rgb(134, 193, 119)",
  primarySoft: "rgb(199, 234, 187)",
  primaryMuted: "rgb(220, 242, 210)",
  primaryDark: "rgb(58, 120, 46)",
  surface: "#ffffff",
  surfaceAlt: "#E8F5BD",
  border: "#c8e896",
  borderLight: "#d4eeaa",
  text: "#1a2e18",
  textSecondary: "#3a5c38",
  textMuted: "#6a9468",
  ink: "#0f1e0e",
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, paddingTop: 8 }}>
      {data.map((d, i) => {
        const isHighlighted = i === 3 || i === 4
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, color: isHighlighted ? COLORS.primaryDark : COLORS.textMuted, fontWeight: 700, letterSpacing: "-0.2px" }}>{d.value}</span>
            <div style={{
              width: "100%", borderRadius: "5px 5px 0 0",
              height: `${Math.max((d.value / max) * 100, 6)}px`,
              background: isHighlighted
                ? `linear-gradient(175deg, ${COLORS.primary}, ${COLORS.primaryLight})`
                : `linear-gradient(175deg, #d5e8cf, #e8f4e4)`,
              transition: "height 0.7s cubic-bezier(.34,1.56,.64,1)",
              boxShadow: isHighlighted ? `0 4px 14px rgba(94,163,79,0.3)` : "none",
            }} />
            <span style={{ fontSize: 9.5, color: COLORS.textMuted, letterSpacing: "0.01em" }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function LineChartSVG({ data }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted, fontSize: 12, gap: 6 }}>
      <Activity size={14} /> Not enough data
    </div>
  )
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 380, H = 110
  const pad = { l: 24, r: 16, t: 16, b: 24 }
  const pts = data.map((d, i) => {
    const x = pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r)
    const y = pad.t + (1 - d.value / max) * (H - pad.t - pad.b)
    return [x, y]
  })
  const polyline = pts.map(p => p.join(",")).join(" ")
  const area = [`${pts[0][0]},${H - pad.b}`, ...pts.map(p => p.join(",")), `${pts[pts.length - 1][0]},${H - pad.b}`].join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 140, overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.18" />
          <stop offset="100%" stopColor={COLORS.primary} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad.l} y1={pad.t + (1 - t) * (H - pad.t - pad.b)} x2={W - pad.r} y2={pad.t + (1 - t) * (H - pad.t - pad.b)} stroke={COLORS.borderLight} strokeWidth="1" />
      ))}
      <polygon points={area} fill="url(#areaGrad)" />
      <polyline points={polyline} fill="none" stroke={COLORS.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={4} fill={COLORS.primary} stroke="#fff" strokeWidth={2.5} />
          <text x={x} y={H - 5} textAnchor="middle" fontSize={9} fill={COLORS.textMuted}>{data[i].label}</text>
        </g>
      ))}
    </svg>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft:           { bg: "#f1f5f9",              color: "#64748b"              },
    grading:         { bg: "#dbeafe",              color: "#1d4ed8"              },
    active:          { bg: "#dbeafe",              color: "#1d4ed8"              },
    completed:       { bg: "rgb(220, 242, 214)",   color: "rgb(58, 120, 46)"    },
    review_required: { bg: "#ede9fe",              color: "#7c3aed"              },
    error:           { bg: "#fee2e2",              color: "#dc2626"              },
  }
  const c = map[status] || map.draft
  const label = status === 'review_required' ? 'Graded ✓' : status || 'draft'
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color, textTransform: "capitalize", letterSpacing: "0.02em", display: "inline-block" }}>
      {label}
    </span>
  )
}

function Skeleton({ w = "100%", h = 20, radius = 6 }) {
  return <div style={{ width: w, height: h, borderRadius: radius, background: "linear-gradient(90deg, #f0f7ee 25%, #e4f0e0 50%, #f0f7ee 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

export default function DashboardHome() {
  const { user, logout, accessToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [stats, setStats]             = useState(null)
  const [sessions, setSessions]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [scoreDistribution, setScoreDistribution] = useState([
    { label: "0–20", value: 0 }, { label: "21–40", value: 0 }, { label: "41–60", value: 0 },
    { label: "61–80", value: 0 }, { label: "81–100", value: 0 },
  ])
  const [submissionVolume, setSubmissionVolume] = useState([
    { label: "Mon", value: 0 }, { label: "Tue", value: 0 }, { label: "Wed", value: 0 },
    { label: "Thu", value: 0 }, { label: "Fri", value: 0 }, { label: "Sat", value: 0 }, { label: "Sun", value: 0 },
  ])

  const headers = { Authorization: `Bearer ${accessToken}` }

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, seRes] = await Promise.all([
          fetch('/api/sessions/dashboard-stats', { headers }),
          fetch('/api/sessions', { headers }),
        ])
        const [s, se] = await Promise.all([sRes.json(), seRes.json()])
        setStats(s.data || {})
        const allSessions = se.data || []
        setSessions(allSessions.slice(0, 6))

        const stored = JSON.parse(localStorage.getItem('notifications_state') || '{"read":[],"dismissed":[]}')
        const unread = allSessions.filter(s =>
          (s.status === 'completed' || s.status === 'review_required') &&
          !stored.read.includes(s.id) &&
          !stored.dismissed.includes(s.id)
        )
        setUnreadCount(unread.length)

        // ── Fetch all submissions to build charts ──
        const sessionDetails = await Promise.all(
          allSessions.map(sess =>
            fetch(`/api/sessions/${sess.id}`, { headers }).then(r => r.json()).catch(() => null)
          )
        )
        const allSubmissions = sessionDetails.flatMap(d => d?.data?.submissions || [])

        // Score Distribution — bucket by percentage
        const dist = [0, 0, 0, 0, 0]
        allSubmissions.forEach(sub => {
          const score = sub.final_score ?? sub.ai_score
          if (score === null || score === undefined) return
          const total = sub.total_marks || 100
          const pct = (parseFloat(score) / total) * 100
          if (pct <= 20)      dist[0]++
          else if (pct <= 40) dist[1]++
          else if (pct <= 60) dist[2]++
          else if (pct <= 80) dist[3]++
          else                dist[4]++
        })
        setScoreDistribution([
          { label: "0–20", value: dist[0] }, { label: "21–40", value: dist[1] },
          { label: "41–60", value: dist[2] }, { label: "61–80", value: dist[3] },
          { label: "81–100", value: dist[4] },
        ])

        // Submission Volume — count per day for last 7 days
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const now = new Date()
        const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6); sevenDaysAgo.setHours(0,0,0,0)
        const dayCounts = {}
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgo); d.setDate(sevenDaysAgo.getDate() + i)
          dayCounts[d.toDateString()] = { label: dayNames[d.getDay()], value: 0 }
        }
        allSubmissions.forEach(sub => {
          const d = new Date(sub.created_at)
          const key = d.toDateString()
          if (dayCounts[key]) dayCounts[key].value++
        })
        setSubmissionVolume(Object.values(dayCounts))

      } catch (e) {
        console.error('Dashboard load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [accessToken])

  const handleLogout = () => { logout(); navigate("/login") }
  const firstName = user?.full_name?.split(" ")[0] || "Teacher"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const navLinks = [
    { label: "Dashboard",     icon: LayoutDashboard, path: "/dashboard" },
    { label: "Sessions",      icon: ClipboardList,   path: "/dashboard/sessions" },
    { label: "Rubrics",       icon: BookOpen,        path: "/dashboard/rubrics" },
    { label: "Notifications", icon: Bell,            path: "/dashboard/notifications", badge: unreadCount > 0 ? unreadCount : null },
  ]

  const metricCards = [
    { label: "Total Sessions",    value: stats?.sessions    ?? "—", icon: ClipboardList, color: "#6366f1", bg: "#eef2ff", accent: "#c7d2fe" },
    { label: "Total Submissions", value: stats?.submissions ?? "—", icon: FileText,      color: "#0284c7", bg: "#e0f2fe", accent: "#bae6fd" },
    { label: "Graded",            value: stats?.graded      ?? "—", icon: Award,         color: COLORS.primaryDark, bg: COLORS.primarySoft, accent: COLORS.primaryLight },
    { label: "Average Score",     value: stats?.avgScore    ? `${parseFloat(stats.avgScore).toFixed(1)}%` : "—", icon: TrendingUp, color: COLORS.primary, bg: COLORS.primaryMuted, accent: COLORS.primarySoft },
  ]


  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#E8F5BD" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .nav-link { transition: all 0.15s ease !important; }
        .nav-link:hover { background: #d4edaa !important; color: ${COLORS.primaryDark} !important; }
        .metric-card { transition: all 0.2s ease !important; }
        .metric-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(94,163,79,0.12) !important; }
        .session-row { transition: background 0.12s ease !important; }
        .session-row:hover { background: ${COLORS.primaryMuted} !important; }
        .action-btn { transition: all 0.15s ease !important; }
        .action-btn:hover { background: ${COLORS.primary} !important; color: #fff !important; border-color: transparent !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 99px; }
      `}</style>

      {/* ─── SIDEBAR ─── */}
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


      {/* ─── MAIN ─── */}
      <main style={{ marginLeft: 248, flex: 1, minWidth: 0, background: COLORS.surfaceAlt }}>
        {/* Topbar */}
        <div style={{
          background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
          padding: "0 32px", display: "flex", alignItems: "center",
          justifyContent: "space-between", height: 62, position: "sticky",
          top: 0, zIndex: 50, boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: COLORS.ink, margin: 0, letterSpacing: "-0.4px" }}>Dashboard</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
              <Calendar size={11} />
              <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to="/dashboard/notifications" style={{ textDecoration: "none", position: "relative" }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: COLORS.surfaceAlt,
                border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", transition: "all 0.15s"
              }}
                onMouseEnter={e => { e.currentTarget.style.background = COLORS.primarySoft; e.currentTarget.style.borderColor = COLORS.primaryLight }}
                onMouseLeave={e => { e.currentTarget.style.background = COLORS.surfaceAlt; e.currentTarget.style.borderColor = COLORS.border }}
              >
                <Bell size={15} color={COLORS.textSecondary} />
                {unreadCount > 0 && (
                  <div style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: "50%", background: COLORS.primary, border: "1.5px solid #fff" }} />
                )}
              </div>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.surface, borderRadius: 12, padding: "7px 14px", border: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={14} color="white" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{user?.full_name || "Teacher"}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Educator</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 32px 56px" }}>

          {/* Welcome Banner */}
          <div style={{
            borderRadius: 18, overflow: "hidden", marginBottom: 28, position: "relative",
            background: "linear-gradient(118deg, #0d1f0b 0%, #183515 55%, #0d2b1a 100%)",
            padding: "28px 32px", boxShadow: "0 8px 32px rgba(0,0,0,0.14)"
          }}>
            <div style={{ position: "absolute", right: -40, top: -40, width: 220, height: 220, borderRadius: "50%", background: `rgba(94,163,79,0.07)`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 28, bottom: -20, opacity: 0.05, pointerEvents: "none" }}><GraduationCap size={120} color="white" /></div>
            <div style={{ position: "relative" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(134,193,119,0.14)", border: "1px solid rgba(134,193,119,0.28)",
                borderRadius: 999, padding: "4px 13px", marginBottom: 12
              }}>
                <Sparkles size={11} color={COLORS.primaryLight} />
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primaryLight, letterSpacing: "0.06em" }}>AI-Powered Grading</span>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.6px", lineHeight: 1.2 }}>
                {greeting}, {firstName} 👋
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13.5, margin: 0, maxWidth: 380, lineHeight: 1.65 }}>
                Here's a snapshot of your grading activity and student performance.
              </p>
            </div>
          </div>

          {/* Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {metricCards.map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} className="metric-card" style={{
                  background: COLORS.surface, borderRadius: 16, padding: "22px 22px 20px",
                  border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.03)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color={card.color} strokeWidth={2.2} />
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: card.accent, marginTop: 4 }} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.ink, letterSpacing: "-1.5px", marginBottom: 5, lineHeight: 1 }}>
                    {loading ? <Skeleton w={60} h={28} /> : card.value}
                  </div>
                  <div style={{ fontSize: 12.5, color: COLORS.textMuted, fontWeight: 500, letterSpacing: "0.01em" }}>{card.label}</div>
                </div>
              )
            })}
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
            {[
              {
                title: "Score Distribution", subtitle: "Submissions by score range",
                icon: BarChart2, chart: <BarChart data={scoreDistribution} />
              },
              {
                title: "Submission Volume", subtitle: "Last 7 days",
                icon: TrendingUp, chart: <LineChartSVG data={submissionVolume} />
              }
            ].map((card, i) => (
              <div key={i} style={{ background: COLORS.surface, borderRadius: 16, padding: "22px", border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink, letterSpacing: "-0.2px" }}>{card.title}</div>
                    <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 3 }}>{card.subtitle}</div>
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.borderLight}` }}>
                    <card.icon size={15} color={COLORS.primary} />
                  </div>
                </div>
                {card.chart}
              </div>
            ))}
          </div>

          {/* Recent Sessions */}
          <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink, letterSpacing: "-0.2px" }}>Recent Sessions</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Latest grading sessions</div>
              </div>
              <Link to="/dashboard/sessions" style={{
                textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 700, color: COLORS.primaryDark,
                padding: "6px 14px", borderRadius: 9,
                background: COLORS.primarySoft, border: `1px solid ${COLORS.primaryLight}`,
                transition: "all 0.15s"
              }}>
                View all <ChevronRight size={13} />
              </Link>
            </div>
            {loading ? (
              <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3].map(i => <Skeleton key={i} h={44} radius={10} />)}
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: "52px", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: COLORS.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <ClipboardList size={22} color={COLORS.primary} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, marginBottom: 5 }}>No sessions yet</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>Create your first grading session to get started</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.primaryMuted }}>
                    {["Title", "Status", "Submissions", "Created At", "Actions"].map(h => (
                      <th key={h} style={{ padding: "11px 22px", textAlign: "left", fontSize: 11, color: COLORS.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={s.id} className="session-row" style={{ borderBottom: i < sessions.length - 1 ? `1px solid ${COLORS.borderLight}` : "none" }}>
                      <td style={{ padding: "14px 22px" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, letterSpacing: "-0.1px" }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{s.total_marks ?? 100} marks</div>
                      </td>
                      <td style={{ padding: "14px 22px" }}><StatusBadge status={s.status} /></td>
                      <td style={{ padding: "14px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 8, background: COLORS.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Users size={12} color={COLORS.primary} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{s.submission_count || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 22px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: COLORS.textMuted }}>
                          <Clock size={11} />
                          {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>
                      <td style={{ padding: "14px 22px" }}>
                        <Link to="/dashboard/sessions" style={{ textDecoration: "none" }}>
                          <button className="action-btn" style={{
                            fontSize: 11.5, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
                            border: `1px solid ${COLORS.border}`, background: COLORS.surface,
                            color: COLORS.textSecondary, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 4
                          }}>
                            Open <ChevronRight size={11} />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}