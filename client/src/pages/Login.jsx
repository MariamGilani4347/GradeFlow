import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login, googleLogin } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focused, setFocused] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      await googleLogin(credentialResponse.credential)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
        
        .login-card { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .error-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        
        .input-group:focus-within label { color: rgb(80,140,70); }
        .input-group:focus-within .icon-container { color: rgb(132,177,121); transform: scale(1.1); }
        
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(132,177,121,0.4) !important; filter: brightness(1.05); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        
        .hover-link:hover { color: rgb(80,140,70) !important; opacity: 0.85; }
        .back-btn:hover { background: rgba(132, 177, 121, 0.08) !important; }
      `}</style>

      {/* Decorative Brand Blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.grid} />

      <div className="login-card" style={s.card}>
        <button className="back-btn" onClick={() => navigate('/')} style={s.backBtn}>
          <ChevronLeft size={16} /> Back to home
        </button>

        <header style={s.header}>
          <div style={s.logoIcon}><GraduationCap size={28} color="white" /></div>
          <div>
            <h1 style={s.logoTitle}>GradeFlow</h1>
            <p style={s.logoSub}>Assessment Excellence</p>
          </div>
        </header>

        <div style={s.headText}>
          <h2 style={s.heading}>Welcome Back</h2>
          <p style={s.subheading}>Access your educator dashboard</p>
        </div>

        {error && (
          <div className="error-shake" style={s.errorBanner}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Email Field */}
          <div className="input-group" style={s.fieldWrap}>
            <label style={s.label}>Email Address</label>
            <div style={{
              ...s.inputBox,
              borderColor: focused === 'email' ? 'rgb(132, 177, 121)' : 'rgb(220, 232, 218)',
              boxShadow: focused === 'email' ? '0 0 0 4px rgba(132, 177, 121, 0.12)' : 'none'
            }}>
              <div className="icon-container" style={{ transition: 'all 0.2s' }}>
                <Mail size={18} color={focused === 'email' ? 'rgb(132, 177, 121)' : '#94a3b8'} />
              </div>
              <input
                type="email"
                placeholder="you@school.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                style={s.input}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="input-group" style={s.fieldWrap}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={s.label}>Password</label>
              <Link to="/forgot-password" className="hover-link" style={s.forgotLink}>Forgot password?</Link>
            </div>
            <div style={{
              ...s.inputBox,
              borderColor: focused === 'pass' ? 'rgb(132, 177, 121)' : 'rgb(220, 232, 218)',
              boxShadow: focused === 'pass' ? '0 0 0 4px rgba(132, 177, 121, 0.12)' : 'none'
            }}>
              <div className="icon-container" style={{ transition: 'all 0.2s' }}>
                <Lock size={18} color={focused === 'pass' ? 'rgb(132, 177, 121)' : '#94a3b8'} />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
                style={s.input}
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={s.optionsRow}>
            <label style={s.rememberLabel}>
              <input type="checkbox" style={s.checkbox} />
              <span>Keep me signed in</span>
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1 }}>
            {loading ? (
              <div style={s.loaderWrap}>
                <div style={s.spinner} /> Authenticating...
              </div>
            ) : (
              <div style={s.btnContent}>
                Sign Into Portal <ArrowRight size={18} strokeWidth={2.5} />
              </div>
            )}
          </button>

          <div style={s.googleWrap}>
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Google sign-in failed. Please try again.')}
              useOneTap={false}
              theme="outline"
              size="large"
              width="100%"
            />
          </div>
        </form>

        <div style={s.footer}>
          <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>OR</span>
              <div style={s.dividerLine} />
          </div>
          <p style={s.signupText}>
            New to the platform? <Link to="/signup" style={s.signupLink}>Register Free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'rgb(248,253,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", position: 'relative', overflow: 'hidden', padding: 20 },
  blob1: { position: 'fixed', top: -150, right: -150, width: 450, height: 450, borderRadius: '50%', background: 'rgba(132,177,121,0.12)', filter: 'blur(80px)', pointerEvents: 'none' },
  blob2: { position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(199,234,187,0.2)', filter: 'blur(80px)', pointerEvents: 'none' },
  grid: { position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(rgb(132,177,121) 0.6px, transparent 0.6px)', backgroundSize: '32px 32px', opacity: 0.1, pointerEvents: 'none' },
  
  card: { position: 'relative', background: '#fff', borderRadius: 32, padding: '40px', width: '100%', maxWidth: 440, boxShadow: '0 10px 40px rgba(0,0,0,0.02), 0 24px 80px rgba(132,177,121,0.1), inset 0 0 0 1.5px rgb(241, 248, 222)', zIndex: 1 },
  
  backBtn: { background: 'rgba(0,0,0,0.02)', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '8px 14px', position: 'absolute', top: 32, right: 40, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' },
  
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 },
  logoIcon: { width: 52, height: 52, borderRadius: 18, background: 'linear-gradient(135deg, rgb(132,177,121), rgb(80,140,70))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(132,177,121,0.35)' },
  logoTitle: { fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' },
  logoSub: { fontSize: 10, fontWeight: 800, color: 'rgb(132,177,121)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' },
  
  headText: { marginBottom: 32 },
  heading: { fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' },
  subheading: { fontSize: 15, color: '#64748b', margin: 0, fontWeight: 600 },
  
  errorBanner: { display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2', border: '1.2px solid #fee2e2', borderRadius: 14, padding: '12px 16px', color: '#dc2626', fontSize: 14, fontWeight: 700, marginBottom: 24 },
  
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  fieldWrap: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 14, fontWeight: 800, color: '#374151', marginBottom: 8, transition: 'color 0.2s' },
  inputBox: { display: 'flex', alignItems: 'center', gap: 12, border: '1.8px solid rgb(232, 245, 189)', borderRadius: 16, padding: '13px 18px', background: '#fdfdfd', transition: 'all 0.25s' },
  input: { flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#1e293b', background: 'transparent' },
  eyeBtn: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' },
  
  forgotLink: { fontSize: 13, fontWeight: 700, color: 'rgb(132,177,121)', textDecoration: 'none' },
  
  optionsRow: { display: 'flex', alignItems: 'center', marginTop: -4, marginBottom: 4 },
  rememberLabel: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#64748b', fontWeight: 600, cursor: 'pointer' },
  checkbox: { accentColor: 'rgb(132,177,121)', width: 17, height: 17, borderRadius: 4 },
  
  submitBtn: { cursor: 'pointer', border: 'none', borderRadius: 18, background: 'linear-gradient(135deg, rgb(132,177,121), rgb(80,140,70))', padding: '16px', color: '#fff', fontSize: 16, fontWeight: 800, transition: 'all 0.3s' },
  btnContent: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' },
  googleWrap: { marginTop: 4, display: 'flex', justifyContent: 'center' },
  
  loaderWrap: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' },
  spinner: { width: 20, height: 20, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  
  footer: { marginTop: 32 },
  divider: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, background: 'rgb(241, 248, 222)' },
  dividerText: { fontSize: 11, color: '#94a3b8', fontWeight: 800, letterSpacing: '1px' },
  signupText: { textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#475569', margin: 0 },
  signupLink: { color: 'rgb(132,177,121)', fontWeight: 800, textDecoration: 'none', marginLeft: 4 }
}