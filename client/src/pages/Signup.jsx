import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import { 
  GraduationCap, User, Mail, Lock, Building2, 
  Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle, 
  ChevronLeft 
} from 'lucide-react'

export default function Signup() {
  const navigate = useNavigate()
  const { googleLogin } = useAuth()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', school_name: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focused, setFocused] = useState(null)

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return }
    setLoading(true); setServerError('')
    try {
      await authAPI.signup(form)
      navigate('/verify-email', { state: { email: form.email } })
    } catch (err) {
      setServerError(err.response?.data?.message || err.response?.data?.error || 'Signup failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleGoogle = async (credentialResponse) => {
    setServerError('')
    setLoading(true)
    try {
      await googleLogin(credentialResponse.credential)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.response?.data?.error || 'Google sign-up failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' })
  }

  const passwordStrength = () => {
    if (!form.password) return null
    if (form.password.length < 6) return { label: 'Too short', color: '#ef4444', width: '25%' }
    if (form.password.length < 8) return { label: 'Weak', color: '#f59e0b', width: '50%' }
    if (form.password.length < 12) return { label: 'Good', color: 'rgb(132,177,121)', width: '75%' }
    return { label: 'Strong', color: 'rgb(80,140,70)', width: '100%' }
  }
  const strength = passwordStrength()

  const fields = [
    { name: 'full_name', label: 'Full Name', placeholder: 'Jane Smith', type: 'text', Icon: User, required: true },
    { name: 'email', label: 'Email Address', placeholder: 'you@school.com', type: 'email', Icon: Mail, required: true },
    { name: 'school_name', label: 'School Name', placeholder: 'Optional — e.g. Westwood Academy', type: 'text', Icon: Building2, required: false },
  ]

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        
        .card-container { animation: slideUp 0.5s cubic-bezier(0,0,0.2,1) both; }
        .input-group:focus-within label { color: rgb(80,140,70); }
        .input-group:focus-within .icon-box { color: rgb(132,177,121); transform: scale(1.1); }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(132,177,121,0.4) !important; filter: brightness(1.05); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .hover-link:hover { opacity: 0.8; text-decoration: underline; }
      `}</style>

      {/* Decorative Blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.grid} />

      <div className="card-container" style={s.card}>
        <button className="hover-link" onClick={() => navigate('/')} style={s.backBtn}>
          <ChevronLeft size={16} /> Back
        </button>

        <header style={s.header}>
          <div style={s.logoIcon}><GraduationCap size={24} color="white" /></div>
          <div>
            <h1 style={s.heading}>Join GradeFlow</h1>
            <p style={s.subheading}>Empowering teachers with smart assessments</p>
          </div>
        </header>

        {serverError && (
          <div style={s.errorBanner} className="error-shake">
            <AlertCircle size={14} /> <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={s.form}>
          {fields.map(({ name, label, placeholder, type, Icon, required }) => (
            <div key={name} className="input-group" style={s.fieldWrap}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={s.label}>{label}</label>
                {!required && <span style={s.optionalTag}>Optional</span>}
              </div>
              
              <div style={{
                ...s.inputBox,
                borderColor: errors[name] ? '#ef4444' : focused === name ? 'rgb(132,177,121)' : 'rgb(220,232,218)',
                boxShadow: focused === name ? '0 0 0 4px rgba(132,177,121,0.12)' : 'none'
              }}>
                <div className="icon-box" style={{ transition: 'all 0.2s', display: 'flex' }}>
                   <Icon size={18} color={focused === name ? 'rgb(132,177,121)' : '#94a3b8'} />
                </div>
                <input
                  type={type} name={name} placeholder={placeholder} value={form[name]}
                  onChange={handleChange} onFocus={() => setFocused(name)} onBlur={() => setFocused(null)}
                  style={s.input}
                />
                {form[name] && !errors[name] && name !== 'school_name' && (
                  <CheckCircle size={16} color="rgb(132,177,121)" />
                )}
              </div>
              {errors[name] && <div style={s.fieldError}><AlertCircle size={12} /> {errors[name]}</div>}
            </div>
          ))}

          {/* Password Field */}
          <div className="input-group" style={s.fieldWrap}>
            <label style={s.label}>Security Password</label>
            <div style={{
              ...s.inputBox,
              borderColor: errors.password ? '#ef4444' : focused === 'pass' ? 'rgb(132,177,121)' : 'rgb(220,232,218)',
              boxShadow: focused === 'pass' ? '0 0 0 4px rgba(132,177,121,0.12)' : 'none'
            }}>
              <Lock size={18} color={focused === 'pass' ? 'rgb(132,177,121)' : '#94a3b8'} />
              <input
                type={showPass ? 'text' : 'password'} name="password"
                placeholder="6+ characters" value={form.password}
                onChange={handleChange} onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
                style={s.input}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Strength Indicator */}
            {strength && !errors.password && (
              <div style={s.strengthContainer}>
                <div style={s.strengthTrack}>
                  <div style={{ ...s.strengthFill, width: strength.width, background: strength.color }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: strength.color }}>{strength.label}</span>
              </div>
            )}
            {errors.password && <div style={s.fieldError}><AlertCircle size={12} /> {errors.password}</div>}
          </div>

          <p style={s.termsText}>
            By signing up, you agree to our <span className="hover-link" style={s.legalLink}>Terms</span> and <span className="hover-link" style={s.legalLink}>Privacy</span>.
          </p>

          <button type="submit" className="submit-btn" disabled={loading} style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <div style={s.loader} /> Creating...
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Next Step <ArrowRight size={18} strokeWidth={2.5} />
              </div>
            )}
          </button>

          <div style={s.googleDivider}>
            <span style={s.googleDividerLine} />
            <span>OR</span>
            <span style={s.googleDividerLine} />
          </div>

          <div style={s.googleWrap}>
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setServerError('Google sign-up failed. Please try again.')}
              useOneTap={false}
              theme="outline"
              size="large"
              width="100%"
            />
          </div>
        </form>

        <footer style={s.footer}>
          <div style={s.divider} />
          <p style={s.loginText}>
            Already on GradeFlow? <Link to="/login" style={s.loginLink}>Sign In</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'rgb(248,253,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", position: 'relative', overflow: 'hidden', padding: 20 },
  blob1: { position: 'fixed', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(132,177,121,0.1)', filter: 'blur(80px)', pointerEvents: 'none' },
  blob2: { position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(199,234,187,0.2)', filter: 'blur(80px)', pointerEvents: 'none' },
  grid: { position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(rgb(199,234,187) 0.5px, transparent 0.5px)', backgroundSize: '30px 30px', opacity: 0.4, pointerEvents: 'none' },
  
  card: { position: 'relative', background: '#fff', borderRadius: 28, padding: '40px', width: '100%', maxWidth: 460, boxShadow: '0 10px 40px rgba(0,0,0,0.02), 0 20px 80px rgba(132,177,121,0.08), inset 0 0 0 1px rgb(199,234,187)', zIndex: 1 },
  
  backBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24, padding: 0 },
  
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 },
  logoIcon: { width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, rgb(132,177,121), rgb(80,140,70))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(132,177,121,0.3)' },
  heading: { fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
  subheading: { fontSize: 14, color: '#64748b', margin: '2px 0 0', fontWeight: 600 },
  
  errorBanner: { display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: '12px 16px', color: '#dc2626', fontSize: 13, fontWeight: 700, marginBottom: 24 },
  
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  fieldWrap: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, fontWeight: 800, color: '#374151', transition: 'color 0.2s' },
  optionalTag: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' },
  
  inputBox: { display: 'flex', alignItems: 'center', gap: 12, border: '2px solid rgb(220,232,218)', borderRadius: 14, padding: '12px 16px', transition: 'all 0.25s' },
  input: { flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#1e293b', background: 'transparent' },
  eyeBtn: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' },
  
  fieldError: { fontSize: 12, color: '#ef4444', fontWeight: 700, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 },
  
  strengthContainer: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 },
  strengthTrack: { flex: 1, height: 5, background: 'rgb(241, 248, 222)', borderRadius: 10, overflow: 'hidden' },
  strengthFill: { height: '100%', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' },
  
  termsText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5, fontWeight: 600, margin: '4px 0' },
  legalLink: { color: 'rgb(80,140,70)', fontWeight: 800, cursor: 'pointer' },
  
  submitBtn: { display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, rgb(132,177,121), rgb(80,140,70))', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s', marginTop: 10 },
  
  googleDivider: { display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 800, letterSpacing: '1px' },
  googleDividerLine: { flex: 1, height: 1, background: 'rgb(241, 248, 222)' },
  googleWrap: { display: 'flex', justifyContent: 'center' },
  
  loader: { width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  
  footer: { marginTop: 28 },
  divider: { height: 1, background: 'rgb(241, 248, 222)', marginBottom: 20 },
  loginText: { textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#475569', margin: 0 },
  loginLink: { color: 'rgb(132,177,121)', fontWeight: 900, textDecoration: 'none', marginLeft: 4 }
}