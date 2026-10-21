import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Mail, KeyRound, Lock, ArrowLeft, CheckCircle, Loader } from 'lucide-react'

const G = {
  green:      'rgb(132,177,121)',
  greenDark:  'rgb(99,148,89)',
  greenBg:    'rgb(232,245,189)',
  greenBorder:'rgb(199,234,187)',
}

function inputStyle(hasError) {
  return {
    width: '100%', padding: '11px 14px 11px 42px',
    borderRadius: 12, fontSize: 13, color: '#0f172a',
    border: `1.5px solid ${hasError ? '#ef4444' : G.greenBorder}`,
    outline: 'none', background: '#f8fafc', boxSizing: 'border-box',
    fontFamily: "'Segoe UI', sans-serif",
  }
}

function InputWrapper({ icon: Icon, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={15} color={G.green} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      {children}
    </div>
  )
}

// ── Step 1: Enter email ────────────────────────────────────────────────────
function StepEmail({ onNext }) {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email.trim()) return setError('Email is required')
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Enter a valid email')
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to send OTP')
      onNext(email.trim())
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: G.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Mail size={24} color={G.green} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Forgot Password?</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Enter your email and we'll send you a 6-digit OTP</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 16, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Email Address</label>
        <InputWrapper icon={Mail}>
          <input
            type="email" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle(!!error)}
          />
        </InputWrapper>
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <><Loader size={15} /> Sending OTP...</> : 'Send OTP'}
      </button>
    </>
  )
}

// ── Step 2: Enter OTP ──────────────────────────────────────────────────────
function StepOTP({ email, onNext, onBack }) {
  const [otp, setOtp]             = useState(['', '', '', '', '', ''])
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent]       = useState(false)

  function handleChange(val, i) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
  }

  function handleKeyDown(e, i) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus()
    }
  }

  async function handleVerify() {
    const code = otp.join('')
    if (code.length < 6) return setError('Enter the complete 6-digit OTP')
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Invalid OTP')
      onNext(code)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true); setResent(false)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResent(true)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => setResent(false), 4000)
    } catch {}
    finally { setResending(false) }
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: G.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <KeyRound size={24} color={G.green} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Check your email</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>We sent a 6-digit code to</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>{email}</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 16, fontWeight: 500 }}>
          {error}
        </div>
      )}
      {resent && (
        <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 16, fontWeight: 500 }}>
          ✓ New OTP sent to your email
        </div>
      )}

      {/* OTP boxes */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
        {otp.map((digit, i) => (
          <input
            key={i} id={`otp-${i}`}
            type="text" inputMode="numeric" maxLength={1}
            value={digit}
            onChange={e => handleChange(e.target.value, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            style={{
              width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
              borderRadius: 12, border: `2px solid ${digit ? G.green : G.greenBorder}`,
              background: digit ? G.greenBg : '#f8fafc', color: '#0f172a',
              outline: 'none', transition: 'all 0.15s', fontFamily: "'Segoe UI', sans-serif",
            }}
            onFocus={e => e.target.style.borderColor = G.green}
            onBlur={e => e.target.style.borderColor = digit ? G.green : G.greenBorder}
          />
        ))}
      </div>

      <button onClick={handleVerify} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
        {loading ? <><Loader size={15} /> Verifying...</> : 'Verify OTP'}
      </button>

      <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
        Didn't receive it?{' '}
        <button onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', color: G.greenDark, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          {resending ? 'Resending...' : 'Resend OTP'}
        </button>
      </div>
    </>
  )
}

// ── Step 3: New password ───────────────────────────────────────────────────
function StepNewPassword({ email, otp, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit() {
    if (!password) return setError('Password is required')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: password }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Failed to reset password')
      onDone()
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: G.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Lock size={24} color={G.green} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Set New Password</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Choose a strong password for your account</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#ef4444', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 16, fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>New Password</label>
        <InputWrapper icon={Lock}>
          <input type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle(!!error)} />
        </InputWrapper>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Confirm Password</label>
        <InputWrapper icon={Lock}>
          <input type="password" placeholder="Repeat your password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={inputStyle(!!error)} />
        </InputWrapper>
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <><Loader size={15} /> Saving...</> : 'Reset Password'}
      </button>
    </>
  )
}

// ── Step 4: Success ────────────────────────────────────────────────────────
function StepSuccess() {
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <CheckCircle size={32} color="#16a34a" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Password Reset!</h2>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 28px' }}>Your password has been updated successfully. You can now log in.</p>
      <Link to="/login" style={{ display: 'block', width: '100%', padding: '12px', borderRadius: 12, background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
        Go to Login
      </Link>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [step, setStep]   = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp]     = useState('')

  const stepLabels = ['Email', 'Verify', 'Reset']

  return (
    <div style={{ minHeight: '100vh', background: G.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(135deg, ${G.green}, ${G.greenDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(132,177,121,0.45)' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>GradeFlow</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Assessment Platform</div>
          </div>
        </div>

        {/* Progress steps */}
        {step < 4 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            {stepLabels.map((label, i) => {
              const stepNum = i + 1
              const done    = step > stepNum
              const active  = step === stepNum
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: done || active ? G.green : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                      {done
                        ? <CheckCircle size={16} color="white" />
                        : <span style={{ fontSize: 13, fontWeight: 700, color: active ? 'white' : '#94a3b8' }}>{stepNum}</span>
                      }
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: active ? G.greenDark : '#94a3b8' }}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div style={{ width: 60, height: 2, background: step > stepNum ? G.green : '#e2e8f0', margin: '0 4px 18px', transition: 'background 0.3s' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: `1px solid ${G.greenBorder}` }}>
          {step === 1 && <StepEmail onNext={email => { setEmail(email); setStep(2) }} />}
          {step === 2 && <StepOTP email={email} onNext={otp => { setOtp(otp); setStep(3) }} onBack={() => setStep(1)} />}
          {step === 3 && <StepNewPassword email={email} otp={otp} onDone={() => setStep(4)} />}
          {step === 4 && <StepSuccess />}
        </div>

        {/* Back to login */}
        {step < 4 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
              <ArrowLeft size={13} /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}