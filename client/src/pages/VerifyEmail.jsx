import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'
import { ArrowLeft, Mail, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [mounted, setMounted] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    setMounted(true)
    setTimeout(() => inputRefs.current[0]?.focus(), 500)
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleChange = (index, e) => {
    const value = e.target.value.replace(/\D/g, '')
    if (!value) {
      const newOtp = [...otp]
      newOtp[index] = ''
      setOtp(newOtp)
      return
    }
    if (value.length === 6) {
      setOtp(value.split(''))
      inputRefs.current[5].focus()
      return
    }
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (index < 5) inputRefs.current[index + 1].focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp]
      if (otp[index]) {
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        newOtp[index - 1] = ''
        setOtp(newOtp)
        inputRefs.current[index - 1].focus()
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length) {
      setOtp(pasted.split(''))
      inputRefs.current[Math.min(pasted.length - 1, 5)].focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length !== 6) return setError('Please enter the complete 6-digit code')
    setLoading(true)
    setError('')
    try {
      await authAPI.verifyEmail({ email, otp: otpString })
      setSuccess('Identity verified! Accessing portal...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.message || 'Verification failed. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await authAPI.resendOtp({ email })
      setCountdown(60)
      setSuccess('A fresh code has been sent to your inbox.')
      setError('')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0].focus()
    } catch {
      setError('Unable to resend code. Please try again later.')
    }
  }

  const filled = otp.filter(d => d !== '').length

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring { 0% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 0.2; transform: scale(1.1); } 100% { opacity: 0.4; transform: scale(0.9); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .otp-input:focus { border-color: rgb(162,203,139) !important; box-shadow: 0 0 20px rgba(132,177,121,0.3) !important; background: rgba(132,177,121,0.15) !important; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(132,177,121,0.4) !important; filter: brightness(1.1); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .resend-link:hover { opacity: 0.8; text-decoration: underline; }
      `}</style>

      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.grid} />

      <button style={s.backBtn} onClick={() => navigate('/signup')}>
        <ArrowLeft size={16} /> <span>Return to Registration</span>
      </button>

      <div style={{
        ...s.card,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(30px)',
      }}>
        <div style={s.iconArea}>
          <div style={s.iconRing} />
          <div style={s.iconInner}>
            <Mail size={32} color="rgb(132,177,121)" strokeWidth={1.5} />
          </div>
        </div>

        <h1 style={s.title}>Verify your email</h1>
        <p style={s.subtitle}>Enter the security code sent to</p>
        <div style={s.emailBadge}>{email || 'your-email@example.com'}</div>

        <div style={s.progressRow}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressFill, width: `${(filled / 6) * 100}%` }} />
          </div>
          <span style={s.progressText}>{filled} of 6 digits</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={s.otpRow}>
            {otp.map((digit, idx) => (
              <div key={idx} style={s.otpCell}>
                <input
                  className="otp-input"
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(idx, e)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  style={{
                    ...s.otpInput,
                    borderColor: digit ? 'rgb(132,177,121)' : 'rgba(132,177,121,0.2)',
                    color: digit ? '#fff' : 'rgba(255,255,255,0.2)',
                    backgroundColor: digit ? 'rgba(132,177,121,0.1)' : 'rgba(255,255,255,0.02)',
                    transform: digit ? 'scale(1.05)' : 'scale(1)',
                  }}
                />
              </div>
            ))}
          </div>

          {error && (
            <div style={s.alertBox} className="error">
              <AlertCircle size={16} color="#f87171" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={s.alertBox} className="success">
              <ShieldCheck size={16} color="rgb(132,177,121)" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || filled < 6}
            style={{ ...s.submitBtn, opacity: (loading || filled < 6) ? 0.6 : 1 }}
          >
            {loading ? (
              <div style={s.loaderContent}><div style={s.spinner} /> Securely Verifying...</div>
            ) : (
              'Confirm Code & Continue'
            )}
          </button>
        </form>

        <div style={s.footerActions}>
          {countdown > 0 ? (
            <p style={s.timerText}>
              Expecting a code? Resend available in <span style={s.timeFocus}>{countdown}s</span>
            </p>
          ) : (
            <button onClick={handleResend} style={s.resendBtn} className="resend-link">
              <RefreshCw size={14} /> Didn't get it? <b>Resend Code</b>
            </button>
          )}
          <p style={s.spamNote}>Be sure to check your junk or promotion folders.</p>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Nunito', sans-serif", background: '#0a1628', padding: '24px', position: 'relative', overflow: 'hidden' },
  blob1: { position: 'absolute', top: -100, right: -100, width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(132,177,121,0.15) 0%, transparent 70%)', pointerEvents: 'none' },
  blob2: { position: 'absolute', bottom: -120, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(199,234,187,0.1) 0%, transparent 70%)', pointerEvents: 'none' },
  grid: { position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(rgba(132,177,121,0.05) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(132,177,121,0.05) 1.5px, transparent 1.5px)`, backgroundSize: '40px 40px' },
  
  backBtn: { position: 'absolute', top: 32, left: 32, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(132,177,121,0.2)', borderRadius: 12, color: 'rgb(132,177,121)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, padding: '10px 18px', transition: 'all 0.2s', zIndex: 10 },
  
  card: { background: 'rgba(15, 30, 50, 0.8)', backdropFilter: 'blur(16px)', borderRadius: 32, padding: '48px 40px', maxWidth: 460, width: '100%', border: '1px solid rgba(132,177,121,0.2)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 1, textAlign: 'center', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' },
  
  iconArea: { position: 'relative', width: 88, height: 88, margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconRing: { position: 'absolute', inset: 0, borderRadius: '50%', border: '2px dashed rgba(132,177,121,0.3)', animation: 'pulse-ring 4s linear infinite' },
  iconInner: { width: 68, height: 68, borderRadius: '50%', background: 'rgba(132,177,121,0.12)', border: '1px solid rgba(132,177,121,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(132,177,121,0.15)' },
  
  title: { color: '#fff', fontSize: 28, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' },
  subtitle: { color: 'rgba(199,234,187,0.6)', fontSize: 15, margin: 0, fontWeight: 600 },
  emailBadge: { color: 'rgb(132,177,121)', fontSize: 15, fontWeight: 800, margin: '8px 0 32px', display: 'inline-block', background: 'rgba(132,177,121,0.08)', padding: '4px 12px', borderRadius: 8 },
  
  progressRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  progressTrack: { flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, rgb(132,177,121), rgb(199,234,187))', borderRadius: 10, transition: 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  progressText: { fontSize: 11, fontWeight: 800, color: 'rgba(132,177,121,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  
  otpRow: { display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 },
  otpCell: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  otpInput: { width: 52, height: 64, textAlign: 'center', fontSize: 26, fontWeight: 900, borderRadius: 16, border: '2.5px solid', outline: 'none', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', fontFamily: "'Nunito', sans-serif" },
  
  alertBox: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 16, fontSize: 14, fontWeight: 700, margin: '-8px 0 24px', textAlign: 'left', animation: 'fadeIn 0.3s ease-out' },
  
  submitBtn: { width: '100%', background: 'linear-gradient(135deg, rgb(132,177,121), rgb(162,203,139))', color: '#0a1628', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 10px 25px rgba(132,177,121,0.2)', marginBottom: 24 },
  loaderContent: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  spinner: { width: 18, height: 18, border: '3px solid rgba(10,22,40,0.2)', borderTopColor: '#0a1628', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  
  footerActions: { display: 'flex', flexDirection: 'column', gap: 12 },
  timerText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, margin: 0 },
  timeFocus: { color: 'rgb(132,177,121)', fontWeight: 800 },
  resendBtn: { background: 'none', border: 'none', color: 'rgba(199,234,187,0.8)', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 0 },
  spamNote: { fontSize: 12, color: 'rgba(132,177,121,0.3)', margin: 0, fontWeight: 500 }
}