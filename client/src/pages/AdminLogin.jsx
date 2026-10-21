import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Shield, User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, ChevronLeft } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focused, setFocused] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/admin/login', form)
      localStorage.setItem('adminToken', res.data.token)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid admin credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        
        .admin-card { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .input-group:focus-within label { color: rgb(80,130,70); }
        .input-group:focus-within .icon-box { color: rgb(132,177,121); transform: scale(1.1); }
        
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(80,130,70,0.35) !important; filter: brightness(1.05); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        
        .back-link:hover { background: rgba(132, 177, 121, 0.08) !important; }
        .footer-link:hover { color: rgb(132,177,121) !important; text-decoration: underline; }
      `}</style>

      {/* Atmospheric Background */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.grid} />
      
      {/* Structural Watermark */}
      <div style={s.watermark}>
        <Shield size={380} color="rgba(132,177,121,0.03)" />
      </div>

      <div className="admin-card" style={s.card}>
        <button onClick={() => navigate('/')} style={s.backBtn} className="back-link">
          <ChevronLeft size={14} /> Home
        </button>

        <header style={s.header}>
          <div style={s.logoIcon}>
            <ShieldCheck size={28} color="white" />
          </div>
          <div>
            <h1 style={s.logoTitle}>GradeFlow</h1>
            <div style={s.adminBadge}>
              <div style={s.badgePulse} /> Admin Console
            </div>
          </div>
        </header>

        <section style={s.headText}>
          <h2 style={s.heading}>Secure Login</h2>
          <p style={s.subheading}>Restricted access to management systems</p>
        </section>

        {/* Security Alert Strip */}
        <div style={s.securityBanner}>
          <Shield size={14} />
          <span>Encrypted Session • ID Tracking Enabled</span>
        </div>

        {error && (
          <div style={s.errorStrip}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Username */}
          <div className="input-group" style={s.fieldWrap}>
            <label style={s.label}>Administrative Username</label>
            <div style={{
              ...s.inputBox,
              borderColor: focused === 'user' ? 'rgb(132, 177, 121)' : 'rgb(220, 232, 218)',
              boxShadow: focused === 'user' ? '0 0 0 4px rgba(132, 177, 121, 0.12)' : 'none'
            }}>
              <div className="icon-box" style={{ transition: 'all 0.2s' }}>
                <User size={18} color={focused === 'user' ? 'rgb(132, 177, 121)' : '#94a3b8'} />
              </div>
              <input
                type="text" placeholder="Enter admin ID" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                onFocus={() => setFocused('user')} onBlur={() => setFocused(null)}
                style={s.input} required
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group" style={s.fieldWrap}>
            <label style={s.label}>Security Keyphrase</label>
            <div style={{
              ...s.inputBox,
              borderColor: focused === 'pass' ? 'rgb(132, 177, 121)' : 'rgb(220, 232, 218)',
              boxShadow: focused === 'pass' ? '0 0 0 4px rgba(132, 177, 121, 0.12)' : 'none'
            }}>
              <div className="icon-box" style={{ transition: 'all 0.2s' }}>
                <Lock size={18} color={focused === 'pass' ? 'rgb(132, 177, 121)' : '#94a3b8'} />
              </div>
              <input
                type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
                style={s.input} required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1 }}>
            {loading ? (
              <div style={s.loaderContent}><div style={s.spinner} /> Authorizing...</div>
            ) : (
              <div style={s.btnInner}>
                Authorize Credentials <ArrowRight size={18} />
              </div>
            )}
          </button>
        </form>

        <footer style={s.footer}>
          <div style={s.divider} />
          <p style={s.footerText}>
            Standard user? <span onClick={() => navigate('/login')} style={s.footerLink} className="footer-link">Teacher Portal</span>
          </p>
        </footer>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'rgb(248,253,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", position: 'relative', overflow: 'hidden', padding: 20 },
  blob1: { position: 'fixed', top: -150, right: -150, width: 450, height: 450, borderRadius: '50%', background: 'rgba(132,177,121,0.12)', filter: 'blur(80px)', pointerEvents: 'none' },
  blob2: { position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(199,234,187,0.2)', filter: 'blur(80px)', pointerEvents: 'none' },
  grid: { position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(rgb(132,177,121) 0.6px, transparent 0.6px)', backgroundSize: '32px 32px', opacity: 0.1, pointerEvents: 'none' },
  watermark: { position: 'fixed', bottom: -100, right: -100, zIndex: 0, pointerEvents: 'none' },
  
  card: { position: 'relative', background: '#fff', borderRadius: 32, padding: '48px 40px', width: '100%', maxWidth: 440, boxShadow: '0 8px 30px rgba(0,0,0,0.02), 0 24px 60px rgba(80,130,70,0.1), inset 0 0 0 1.5px rgb(241, 248, 222)', zIndex: 1 },
  
  backBtn: { background: 'rgba(0,0,0,0.02)', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '8px 14px', position: 'absolute', top: 32, right: 40, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' },
  
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 },
  logoIcon: { width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, rgb(80,130,70), rgb(50,100,45))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(80,130,70,0.4)' },
  logoTitle: { fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' },
  adminBadge: { fontSize: 10, color: 'rgb(80,130,70)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, background: 'rgb(232,245,189)', padding: '2px 10px', borderRadius: 20 },
  badgePulse: { width: 6, height: 6, borderRadius: '50%', background: 'rgb(132,177,121)', boxShadow: '0 0 0 3px rgba(132,177,121,0.2)' },
  
  headText: { marginBottom: 28 },
  heading: { fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' },
  subheading: { fontSize: 14, color: '#64748b', fontWeight: 600, margin: 0 },
  
  securityBanner: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgb(240,252,236)', border: '1px solid rgb(199,234,187)', borderRadius: 12, padding: '10px 14px', fontSize: 11, fontWeight: 800, color: 'rgb(60,110,50)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 },
  
  errorStrip: { display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2', border: '1.2px solid #fee2e2', borderRadius: 14, padding: '12px 16px', color: '#dc2626', fontSize: 14, fontWeight: 700, marginBottom: 24, animation: 'fadeIn 0.3s ease' },
  
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  fieldWrap: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 8, transition: 'color 0.2s' },
  
  inputBox: { display: 'flex', alignItems: 'center', gap: 12, border: '1.8px solid rgb(232, 245, 189)', borderRadius: 16, padding: '13px 18px', background: '#fdfdfd', transition: 'all 0.25s' },
  input: { flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#1e293b', background: 'transparent' },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 },
  
  submitBtn: { cursor: 'pointer', border: 'none', borderRadius: 18, background: 'linear-gradient(135deg, rgb(80,130,70), rgb(50,100,45))', padding: '16px', color: '#fff', fontSize: 16, fontWeight: 800, transition: 'all 0.3s', marginTop: 8 },
  btnInner: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' },
  
  loaderContent: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' },
  spinner: { width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  
  footer: { marginTop: 36 },
  divider: { height: 1, background: 'rgb(241, 248, 222)', marginBottom: 24 },
  footerText: { textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#64748b' },
  footerLink: { color: 'rgb(80,130,70)', fontWeight: 800, cursor: 'pointer', marginLeft: 6, transition: 'color 0.2s' }
}