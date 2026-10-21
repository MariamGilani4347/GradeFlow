import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  LayoutDashboard, ClipboardList, Bell, LogOut,
  GraduationCap, ChevronRight, BookOpen, Plus,
  Pencil, Trash2, Eye, Clock, Search, X, Check,
  AlertTriangle, Zap, Loader
} from "lucide-react"

function Skeleton({ w = "100%", h = 20, radius = 6 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
  )
}

const emptyCriterion = () => ({ id: `c${Date.now()}${Math.random()}`, name: "", maxPoints: "", description: "" })

function Modal({ title, onClose, width = 680, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: `min(${width}px, 95vw)`, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px 18px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{title}</span>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 10, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} color="#64748b" />
          </button>
        </div>
        <div style={{ padding: 28 }}>{children}</div>
      </div>
    </div>
  )
}

function iStyle(err) {
  return { width: "100%", padding: "9px 13px", borderRadius: 10, fontSize: 13, color: "#0f172a", border: `1.5px solid ${err ? "#ef4444" : "#e2e8f0"}`, outline: "none", background: "#f8fafc", boxSizing: "border-box" }
}

function PreviewModal({ rubric, onClose }) {
  const total = rubric.total_marks || rubric.criteria?.reduce((s, c) => s + Number(c.maxPoints || c.max_points || 0), 0) || 0
  const criteria = rubric.criteria_json || rubric.criteria || []
  return (
    <Modal title={`Preview — ${rubric.title}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 999, background: "rgba(132,177,121,0.15)", color: "rgb(99,148,89)" }}>{total} marks total</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 999, background: "#f1f5f9", color: "#64748b" }}>{criteria.length} criteria</span>
      </div>
      {criteria.map((c, i) => {
        const pts = c.maxPoints || c.max_points || 0
        return (
          <div key={i} style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 12, padding: "14px 18px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{i + 1}. {c.name || "Unnamed"}</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 999, background: "rgba(132,177,121,0.15)", color: "rgb(99,148,89)" }}>{pts} pts</span>
            </div>
            {c.description && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{c.description}</p>}
            <div style={{ background: "#e2e8f0", borderRadius: 4, height: 4 }}>
              <div style={{ width: `${total > 0 ? (Number(pts) / total) * 100 : 0}%`, background: "linear-gradient(90deg, rgb(132,177,121), rgb(162,203,139))", borderRadius: 4, height: 4 }} />
            </div>
          </div>
        )
      })}
    </Modal>
  )
}

function RubricFormModal({ initial, onSave, onClose, saving }) {
  const isEdit = !!initial
  // Normalise: API may return criteria_json, local state uses criteria
  const initCriteria = (initial?.criteria_json || initial?.criteria || [emptyCriterion()]).map(c => ({
    id: c.id || `c${Date.now()}${Math.random()}`,
    name: c.name || "",
    maxPoints: c.maxPoints ?? c.max_points ?? "",
    description: c.description || "",
  }))

  const [title, setTitle]       = useState(initial?.title || "")
  const [criteria, setCriteria] = useState(initCriteria)
  const [errors, setErrors]     = useState({})

  const totalMarks = criteria.reduce((s, c) => s + Number(c.maxPoints || 0), 0)

  function updateCriterion(id, field, val) {
    setCriteria(cs => cs.map(c => c.id === id ? { ...c, [field]: val } : c))
  }
  function addCriterion() { setCriteria(cs => [...cs, emptyCriterion()]) }
  function removeCriterion(id) { if (criteria.length > 1) setCriteria(cs => cs.filter(c => c.id !== id)) }

  function validate() {
    const e = {}
    if (!title.trim()) e.title = true
    criteria.forEach(c => {
      if (!c.name.trim()) e[`n_${c.id}`] = true
      if (!c.maxPoints || isNaN(c.maxPoints) || Number(c.maxPoints) <= 0) e[`p_${c.id}`] = true
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    // Send in the shape the API expects
    onSave({
      id: initial?.id,
      title: title.trim(),
      total_marks: totalMarks,
      criteria_json: criteria.map(c => ({
        name: c.name,
        max_points: Number(c.maxPoints),
        description: c.description,
      })),
    })
  }

  return (
    <Modal title={isEdit ? "Edit Rubric" : "Create New Rubric"} onClose={onClose}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rubric Title *</label>
        <input placeholder="e.g. Physics Rubric – Chapter 3" value={title} onChange={e => setTitle(e.target.value)} style={iStyle(errors.title)} />
        {errors.title && <p style={{ color: "#ef4444", fontSize: 11, margin: "4px 0 0" }}>Title is required</p>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Criteria *</label>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 999, background: "rgba(132,177,121,0.15)", color: "rgb(99,148,89)" }}>Total: {totalMarks} marks</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1.6fr 28px", gap: 8, marginBottom: 6 }}>
        {["Criterion", "Max Pts", "Description", ""].map((h, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
        ))}
      </div>

      {criteria.map(c => (
        <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 1.6fr 28px", gap: 8, marginBottom: 8, alignItems: "start" }}>
          <input placeholder="Name *" value={c.name} onChange={e => updateCriterion(c.id, "name", e.target.value)} style={iStyle(errors[`n_${c.id}`])} />
          <input type="number" min={0} placeholder="Pts *" value={c.maxPoints} onChange={e => updateCriterion(c.id, "maxPoints", e.target.value)} style={iStyle(errors[`p_${c.id}`])} />
          <input placeholder="Description (optional)" value={c.description} onChange={e => updateCriterion(c.id, "description", e.target.value)} style={iStyle(false)} />
          <button onClick={() => removeCriterion(c.id)} disabled={criteria.length === 1} style={{ border: "none", background: "none", cursor: criteria.length > 1 ? "pointer" : "default", color: criteria.length > 1 ? "#ef4444" : "#e2e8f0", padding: "8px 4px", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      ))}

      <button onClick={addCriterion} style={{ background: "none", border: "1.5px dashed rgb(132,177,121)", color: "rgb(99,148,89)", borderRadius: 10, padding: "7px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <Plus size={13} /> Add Criterion
      </button>

      <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#374151", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgb(132,177,121), rgb(99,148,89))", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader size={13} /> : <Check size={14} />}
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Rubric"}
        </button>
      </div>
    </Modal>
  )
}

function DeleteModal({ rubric, onConfirm, onClose, saving }) {
  return (
    <Modal title="Delete Rubric?" onClose={onClose} width={420}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <AlertTriangle size={20} color="#ef4444" />
        </div>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>"{rubric.title}"</p>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>This cannot be undone. Sessions using this rubric will not be affected.</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#374151", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
        <button onClick={onConfirm} disabled={saving} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════
export default function RubricManager() {
  const location = useLocation()
  const navigate = useNavigate()
  const { accessToken, user, logout } = useAuth()

  const [rubrics, setRubrics]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [apiError, setApiError] = useState('')
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)
  const [target, setTarget]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }

  // ── Load rubrics from API ──
  useEffect(() => {
    fetchRubrics()
    fetchUnreadCount()
  }, [accessToken])

  const fetchRubrics = async () => {
    setLoading(true); setApiError('')
    try {
      const res = await fetch('/api/rubrics', { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load rubrics')
      setRubrics(data.data || [])
    } catch (e) {
      setApiError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const stored = JSON.parse(localStorage.getItem('notifications_state') || '{"read":[],"dismissed":[]}')
      const res = await fetch('/api/sessions', { headers: authHeaders })
      const data = await res.json()
      const unread = (data.data || []).filter(s =>
        (s.status === 'completed' || s.status === 'review_required') &&
        !stored.read.includes(s.id) && !stored.dismissed.includes(s.id)
      )
      setUnreadCount(unread.length)
    } catch { setUnreadCount(0) }
  }

  function openCreate()   { setTarget(null); setModal("create") }
  function openEdit(r)    { setTarget(r);    setModal("edit") }
  function openPreview(r) { setTarget(r);    setModal("preview") }
  function openDelete(r)  { setTarget(r);    setModal("delete") }
  function closeModal()   { setModal(null);  setTarget(null);  setSaving(false) }

  async function handleSave(payload) {
    setSaving(true)
    try {
      const isEdit = modal === "edit"
      const url    = isEdit ? `/api/rubrics/${target.id}` : '/api/rubrics'
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(payload) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      if (isEdit) {
        setRubrics(rs => rs.map(r => r.id === target.id ? data.data : r))
      } else {
        setRubrics(rs => [data.data, ...rs])
      }
      closeModal()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      const res = await fetch(`/api/rubrics/${target.id}`, { method: 'DELETE', headers: authHeaders })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed') }
      setRubrics(rs => rs.filter(r => r.id !== target.id))
      closeModal()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = rubrics.filter(r => r.title?.toLowerCase().includes(search.toLowerCase()))

  // ── UPDATED: added Rubrics link ──
  const navLinks = [
    { label: "Dashboard",     icon: LayoutDashboard, path: "/dashboard" },
    { label: "Sessions",      icon: ClipboardList,   path: "/dashboard/sessions" },
    { label: "Rubrics",       icon: BookOpen,        path: "/dashboard/rubrics" },
    { label: "Notifications", icon: Bell,            path: "/dashboard/notifications", badge: unreadCount > 0 ? unreadCount : null },
  ]

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f8fafc" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .nav-link:hover  { background: rgb(232,245,189) !important; color: rgb(132,177,121) !important; }
        .rubric-card     { transition: transform 0.2s, box-shadow 0.2s; }
        .rubric-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }
        .action-btn:hover { background: rgb(132,177,121) !important; color: #fff !important; border-color: transparent !important; }
      `}</style>

      {/* SIDEBAR — identical to DashboardHome */}
     
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
        
      {/* MAIN */}
      <main style={{ marginLeft: 240, flex: 1, minWidth: 0, background: "rgb(232,245,189)" }}>

        {/* Top bar */}
        <div style={{ background: "rgb(232,245,189)", borderBottom: "1px solid rgb(199,234,187)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>Rubric Manager</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#94a3b8", fontSize: 11, marginTop: 1 }}>
              <BookOpen size={11} />
              <span>{rubrics.length} rubric{rubrics.length !== 1 ? "s" : ""} saved</span>
            </div>
          </div>
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, rgb(132,177,121), rgb(99,148,89))", color: "#fff", border: "none", borderRadius: 12, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(132,177,121,0.4)" }}>
            <Plus size={15} /> Create New Rubric
          </button>
        </div>

        <div style={{ padding: "28px 32px 48px" }}>

          {/* Dark banner */}
          <div style={{ borderRadius: 20, background: "linear-gradient(120deg, #0f172a 0%, #1e293b 60%, #0f2d1a 100%)", padding: "24px 32px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -30, top: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(132,177,121,0.07)" }} />
            <div style={{ position: "absolute", right: 32, top: "50%", transform: "translateY(-50%)", opacity: 0.06 }}><BookOpen size={90} color="white" /></div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(132,177,121,0.15)", border: "1px solid rgba(132,177,121,0.3)", borderRadius: 999, padding: "3px 12px", marginBottom: 10 }}>
                <Zap size={11} color="rgb(132,177,121)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgb(162,203,139)", letterSpacing: "0.05em" }}>Reusable Grading Criteria</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>Your Rubrics</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: 0, maxWidth: 420, lineHeight: 1.6 }}>Create structured marking schemes once, reuse them across sessions for consistent AI grading.</p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 380, marginBottom: 24 }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input placeholder="Search rubrics..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 13px 9px 36px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fff", outline: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", boxSizing: "border-box" }} />
          </div>

          {/* API error */}
          {apiError && (
            <div style={{ background: "#fee2e2", color: "#ef4444", padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} /> {apiError}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {[1,2,3].map(i => <Skeleton key={i} h={200} radius={16} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: "64px 32px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <BookOpen size={36} color="#e2e8f0" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>No rubrics found</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>{search ? "Try a different search term" : "Create your first rubric to get started"}</div>
            </div>
          )}

          {/* Cards grid */}
          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {filtered.map(rubric => {
                const criteria = rubric.criteria_json || rubric.criteria || []
                return (
                  <div key={rubric.id} className="rubric-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ flex: 1, marginRight: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(132,177,121,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <BookOpen size={15} color="rgb(99,148,89)" />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{rubric.title}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8", paddingLeft: 40 }}>
                          <Clock size={10} />
                          {new Date(rubric.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "rgba(132,177,121,0.15)", color: "rgb(99,148,89)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {rubric.total_marks} marks
                      </span>
                    </div>

                    {/* Criteria preview */}
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                      {criteria.slice(0, 3).map((c, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < Math.min(criteria.length, 3) - 1 ? "1px solid #f1f5f9" : "none" }}>
                          <span style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{c.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "rgb(99,148,89)" }}>{c.maxPoints || c.max_points} pts</span>
                        </div>
                      ))}
                      {criteria.length > 3 && (
                        <div style={{ fontSize: 11, color: "#94a3b8", paddingTop: 6 }}>+{criteria.length - 3} more criteria</div>
                      )}
                      {criteria.length === 0 && (
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>No criteria defined</div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="action-btn" onClick={() => openPreview(rubric)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "7px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#374151", cursor: "pointer", transition: "all 0.15s" }}>
                        <Eye size={12} /> Preview
                      </button>
                      <button className="action-btn" onClick={() => openEdit(rubric)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "7px 0", borderRadius: 8, border: "1px solid rgba(132,177,121,0.4)", background: "rgba(132,177,121,0.1)", color: "rgb(99,148,89)", cursor: "pointer", transition: "all 0.15s" }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => openDelete(rubric)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #fecaca", background: "#fff5f5", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.15s" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {(modal === "create" || modal === "edit") && <RubricFormModal initial={modal === "edit" ? target : null} onSave={handleSave} onClose={closeModal} saving={saving} />}
      {modal === "preview" && target && <PreviewModal rubric={target} onClose={closeModal} />}
      {modal === "delete"  && target && <DeleteModal rubric={target} onConfirm={handleDelete} onClose={closeModal} saving={saving} />}
    </div>
  )
}