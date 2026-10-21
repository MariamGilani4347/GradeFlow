import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { BookOpen, UserCheck, Zap, Upload, FileBarChart, Star, ArrowRight, CheckCircle, Sparkles } from 'lucide-react'

const injectFont = () => {
  if (!document.getElementById('plus-jakarta-font')) {
    const link = document.createElement('link')
    link.id = 'plus-jakarta-font'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap'
    document.head.appendChild(link)
  }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [hoveredPortal, setHoveredPortal] = useState(null)

  const featuresRef = useRef(null)
  const howItWorksRef = useRef(null)
  const pricingRef = useRef(null)

  const scrollTo = (ref) => {
    if (ref.current) {
      const top = ref.current.getBoundingClientRect().top + window.scrollY - 70
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    injectFont()
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2.2 + 0.8, opacity: Math.random() * 0.35 + 0.08,
    }))

    let animId
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(132,177,121,${p.opacity})`; ctx.fill()
      })
      particles.forEach((a, i) => particles.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(162,203,139,${0.1 * (1 - d / 100)})`
          ctx.lineWidth = 0.7; ctx.stroke()
        }
      }))
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('scroll', handleScroll); window.removeEventListener('resize', resize) }
  }, [])

  const navLinks = [
    { label: 'Features', ref: featuresRef },
    { label: 'How it Works', ref: howItWorksRef },
    { label: 'Pricing', ref: pricingRef },
  ]

  const portalCards = [
    { id: 'teacher', icon: BookOpen, label: 'TEACHER', title: 'Teacher Portal', desc: 'Access your dashboard, sessions & AI-graded assessments', path: '/login', accent: 'rgb(99,148,89)' },
  ]

  const features = [
    { icon: Zap, title: 'AI Grading Engine', desc: 'Upload answer sheets and receive detailed, rubric-aligned grades in minutes — powered by advanced LLMs.', highlights: ['Groq LLM powered', 'Rubric-based scoring', 'Instant feedback'], color: '#f59e0b', bg: '#fef9c3' },
    { icon: Upload, title: 'Batch Uploads', desc: 'Upload entire class sets at once. PDF, JPG, PNG — drag, drop, done. No manual entry ever again.', highlights: ['PDF & image support', 'Drag & drop UI', 'Parallel processing'], color: '#0ea5e9', bg: '#e0f2fe' },
    { icon: FileBarChart, title: 'Instant Reports', desc: 'Generate detailed session reports with score distributions, trends and per-student breakdowns.', highlights: ['CSV & PDF exports', 'Score analytics', 'Class insights'], color: 'rgb(99,148,89)', bg: 'rgb(220,252,231)' },
  ]

  const stats = [
    { value: '10×', label: 'Faster grading' },
    { value: '98%', label: 'Accuracy rate' },
    { value: '500+', label: 'Teachers using' },
    { value: '<2min', label: 'Per submission' },
  ]

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Perfect for trying out AI grading.',
      highlights: ['5 sessions/month', '30 submissions/session', 'CSV export', 'Email support'],
      cta: 'Get Started',
      accent: '#64748b',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'per month',
      desc: 'For teachers who grade regularly.',
      highlights: ['Unlimited sessions', 'Unlimited submissions', 'PDF & CSV exports', 'Priority support', 'Analytics dashboard'],
      cta: 'Start Free Trial',
      accent: 'rgb(80,130,70)',
      featured: true,
    },
    {
      name: 'School',
      price: '$79',
      period: 'per month',
      desc: 'For entire departments or schools.',
      highlights: ['Everything in Pro', 'Up to 20 teachers', 'Admin portal access', 'Custom rubrics', 'Dedicated support'],
      cta: 'Contact Us',
      accent: '#6366f1',
      featured: false,
    },
  ]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", background: '#fff', color: '#0f172a', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-up { animation: fadeUp 0.65s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-1 { animation-delay: 0.08s; }
        .fade-up-2 { animation-delay: 0.18s; }
        .fade-up-3 { animation-delay: 0.28s; }
        .fade-up-4 { animation-delay: 0.38s; }
        .hero-badge { animation: fadeIn 0.5s ease both; }
        .feature-card { transition: all 0.26s cubic-bezier(.22,1,.36,1); cursor: default; }
        .feature-card:hover { transform: translateY(-7px); box-shadow: 0 20px 48px rgba(132,177,121,0.16) !important; border-color: rgb(162,203,139) !important; }
        .portal-card { transition: all 0.22s cubic-bezier(.22,1,.36,1); cursor: pointer; }
        .portal-card:hover { transform: translateX(5px); }
        .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(132,177,121,0.15) !important; }
        .nav-link { transition: color 0.18s; cursor: pointer; position: relative; }
        .nav-link::after { content: ''; position: absolute; bottom: -3px; left: 0; right: 0; height: 2px; background: rgb(99,148,89); border-radius: 2px; transform: scaleX(0); transition: transform 0.2s cubic-bezier(.22,1,.36,1); transform-origin: center; }
        .nav-link:hover { color: rgb(99,148,89) !important; }
        .nav-link:hover::after { transform: scaleX(1); }
        .cta-primary { transition: all 0.22s; }
        .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(132,177,121,0.5) !important; }
        .cta-secondary { transition: all 0.2s; }
        .cta-secondary:hover { background: rgb(232,245,189) !important; }
        .step-circle { transition: transform 0.2s, box-shadow 0.2s; }
        .step-circle:hover { transform: scale(1.06); }
        .pricing-card { transition: all 0.26s cubic-bezier(.22,1,.36,1); }
        .pricing-card:hover { transform: translateY(-6px); box-shadow: 0 24px 56px rgba(0,0,0,0.10) !important; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgb(225,242,218)' : '1px solid transparent',
        transition: 'all 0.3s ease', padding: '0 48px',
        height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: scrolled ? '0 2px 16px rgba(132,177,121,0.08)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, rgb(132,177,121), rgb(80,130,70))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(132,177,121,0.38)' }}>
            <UserCheck size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', letterSpacing: '-0.3px' }}>GradeFlow</div>
            <div style={{ fontSize: 9.5, color: 'rgb(99,148,89)', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Assessment Platform</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {navLinks.map(({ label, ref }) => (
            <span
              key={label}
              className="nav-link"
              onClick={() => scrollTo(ref)}
              style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}
            >
              {label}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="cta-secondary" onClick={() => navigate('/login')} style={{ padding: '9px 22px', borderRadius: 11, border: '1.5px solid rgb(199,234,187)', background: 'transparent', color: 'rgb(80,130,70)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Login</button>
          <button className="cta-primary" onClick={() => navigate('/signup')} style={{ padding: '9px 22px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg, rgb(132,177,121), rgb(80,130,70))', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(132,177,121,0.38)' }}>Sign Up Free</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', background: 'linear-gradient(155deg, rgb(248,253,246) 0%, rgb(232,245,189) 45%, rgb(199,234,187) 100%)' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -130, right: -100, width: 520, height: 520, borderRadius: '50%', background: 'rgba(132,177,121,0.1)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'rgba(199,234,187,0.18)', pointerEvents: 'none', filter: 'blur(30px)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1220, margin: '0 auto', padding: '128px 48px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', width: '100%' }}>
          <div>
            <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(132,177,121,0.14)', border: '1.5px solid rgba(132,177,121,0.32)', borderRadius: 999, padding: '5px 15px', marginBottom: 26 }}>
              <Sparkles size={12} color="rgb(80,130,70)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgb(55,105,45)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>AI-Powered Grading</span>
            </div>
            <h1 className="fade-up fade-up-1" style={{ fontSize: 54, fontWeight: 900, color: '#0f172a', lineHeight: 1.08, margin: '0 0 20px', letterSpacing: '-2px' }}>
              Grade Smarter,<br />
              <span style={{ background: 'linear-gradient(135deg, rgb(80,130,70), rgb(132,177,121))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Not Harder.</span>
            </h1>
            <p className="fade-up fade-up-2" style={{ fontSize: 17, color: '#475569', lineHeight: 1.72, margin: '0 0 38px', maxWidth: 470, fontWeight: 500 }}>
              AI-powered grading for teachers — upload answer sheets, get detailed results in minutes. No more late nights marking.
            </p>
            <div className="fade-up fade-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <button className="cta-primary" onClick={() => navigate('/signup')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 30px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, rgb(132,177,121), rgb(70,120,60))', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(132,177,121,0.42)' }}>
                Start Free Trial <ArrowRight size={16} />
              </button>
              <button className="cta-secondary" onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 14, border: '2px solid rgb(199,234,187)', background: '#fff', color: 'rgb(60,110,50)', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                Login to Dashboard
              </button>
            </div>
            <div className="fade-up fade-up-4" style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              {['No credit card required', 'Free forever plan', 'Setup in 2 minutes'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#64748b' }}>
                  <CheckCircle size={14} color="rgb(99,148,89)" />{t}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgb(99,148,89)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 2 }}>Choose your portal</div>
            {portalCards.map(card => {
              const Icon = card.icon
              const hov = hoveredPortal === card.id
              return (
                <div key={card.id} className="portal-card"
                  onClick={() => navigate(card.path)}
                  onMouseEnter={() => setHoveredPortal(card.id)}
                  onMouseLeave={() => setHoveredPortal(null)}
                  style={{ background: hov ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.85)', border: `2px solid ${hov ? 'rgb(132,177,121)' : 'rgb(199,234,187)'}`, borderRadius: 20, padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 18, backdropFilter: 'blur(10px)', boxShadow: hov ? '0 14px 40px rgba(132,177,121,0.2)' : '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: hov ? 'rgb(232,245,189)' : 'rgb(245,252,244)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.22s' }}>
                    <Icon size={24} color={hov ? card.accent : 'rgb(162,203,139)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', color: 'rgb(132,177,121)', marginBottom: 3 }}>{card.label}</div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.2px' }}>{card.title}</div>
                    <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>{card.desc}</div>
                  </div>
                  <div style={{ color: hov ? 'rgb(132,177,121)' : '#cbd5e1', fontSize: 20, transition: 'all 0.22s', transform: hov ? 'translateX(4px)' : 'none' }}>→</div>
                </div>
              )
            })}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 6 }}>
              {stats.map((s, i) => (
                <div key={i} className="stat-card" style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 16, padding: '16px 10px', textAlign: 'center', border: '1.5px solid rgb(225,242,218)', backdropFilter: 'blur(8px)' }}>
                  <div style={{ fontSize: 21, fontWeight: 900, color: 'rgb(55,105,45)', letterSpacing: '-0.5px' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section ref={featuresRef} style={{ background: '#fff', padding: '108px 48px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 68 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgb(232,245,189)', border: '1px solid rgb(199,234,187)', borderRadius: 999, padding: '5px 16px', marginBottom: 16 }}>
              <Star size={12} color="rgb(80,130,70)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgb(55,105,45)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Everything you need</span>
            </div>
            <h2 style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', margin: '0 0 14px', letterSpacing: '-1.5px' }}>Built for modern teachers</h2>
            <p style={{ fontSize: 16.5, color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.72, fontWeight: 500 }}>From upload to report — our AI handles the heavy lifting so you can focus on teaching.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="feature-card" style={{ background: '#fafcff', borderRadius: 22, padding: '34px 30px', border: '1.5px solid #f0f4f8', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, border: `1px solid ${f.color}22` }}>
                    <Icon size={25} color={f.color} strokeWidth={2} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.3px' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.72, margin: '0 0 22px', fontWeight: 500 }}>{f.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {f.highlights.map((h, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 700, color: 'rgb(55,105,45)' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgb(132,177,121)', flexShrink: 0 }} />{h}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section ref={howItWorksRef} style={{ background: 'linear-gradient(155deg, rgb(248,253,246), rgb(232,245,189))', padding: '108px 48px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid rgb(199,234,187)', borderRadius: 999, padding: '5px 16px', marginBottom: 16 }}>
            <CheckCircle size={12} color="rgb(80,130,70)" />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgb(55,105,45)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>How it works</span>
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: '#0f172a', margin: '0 0 60px', letterSpacing: '-1.5px' }}>Three steps to zero marking</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 38, left: '18%', right: '18%', height: 2, background: 'linear-gradient(90deg, rgb(199,234,187), rgb(132,177,121), rgb(199,234,187))', zIndex: 0 }} />
            {[
              { step: '01', title: 'Create a Session', desc: 'Set up your grading session with a rubric and total marks.' },
              { step: '02', title: 'Upload Answer Sheets', desc: 'Drag & drop PDF or image files for your entire class.' },
              { step: '03', title: 'Get AI Results', desc: 'Review AI-generated scores, feedback and export reports.' },
            ].map((s, i) => (
              <div key={i} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px' }}>
                <div className="step-circle" style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg, rgb(132,177,121), rgb(70,120,60))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: '0 6px 22px rgba(132,177,121,0.38)', border: '5px solid #fff' }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{s.step}</span>
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 800, color: '#0f172a', margin: '0 0 9px', letterSpacing: '-0.2px' }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65, fontWeight: 500, maxWidth: 210 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section ref={pricingRef} style={{ background: '#fff', padding: '108px 48px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgb(232,245,189)', border: '1px solid rgb(199,234,187)', borderRadius: 999, padding: '5px 16px', marginBottom: 16 }}>
              <Star size={12} color="rgb(80,130,70)" />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgb(55,105,45)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Pricing</span>
            </div>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: '#0f172a', margin: '0 0 14px', letterSpacing: '-1.5px' }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 16, color: '#64748b', maxWidth: 440, margin: '0 auto', lineHeight: 1.72, fontWeight: 500 }}>Start free. Upgrade when you need more. No hidden fees.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, alignItems: 'start' }}>
            {pricingPlans.map((plan, i) => (
              <div key={i} className="pricing-card" style={{
                background: plan.featured ? 'linear-gradient(155deg, rgb(248,253,246), rgb(232,245,189))' : '#fafcff',
                borderRadius: 24,
                padding: '36px 30px',
                border: plan.featured ? '2px solid rgb(132,177,121)' : '1.5px solid #f0f4f8',
                boxShadow: plan.featured ? '0 12px 40px rgba(132,177,121,0.18)' : '0 2px 12px rgba(0,0,0,0.04)',
                position: 'relative',
              }}>
                {plan.featured && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, rgb(132,177,121), rgb(70,120,60))', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '4px 16px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 800, color: plan.accent, letterSpacing: '0.5px', marginBottom: 10 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', letterSpacing: '-2px' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/{plan.period}</span>
                </div>
                <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6, margin: '0 0 26px', fontWeight: 500 }}>{plan.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 30 }}>
                  {plan.highlights.map((h, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 600, color: '#374151' }}>
                      <CheckCircle size={15} color="rgb(99,148,89)" strokeWidth={2.5} />{h}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate(plan.name === 'School' ? '/contact' : '/signup')}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 12, border: plan.featured ? 'none' : '1.5px solid rgb(199,234,187)',
                    background: plan.featured ? 'linear-gradient(135deg, rgb(132,177,121), rgb(70,120,60))' : 'transparent',
                    color: plan.featured ? '#fff' : 'rgb(80,130,70)', fontWeight: 700, fontSize: 14,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: plan.featured ? '0 4px 16px rgba(132,177,121,0.35)' : 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.opacity = '0.92' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.opacity = '1' }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, rgb(70,120,60), rgb(40,90,35))', padding: '88px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 620, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: '4px 14px', marginBottom: 20 }}>
            <Sparkles size={11} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '1px', textTransform: 'uppercase' }}>Join 500+ Teachers</span>
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-1px' }}>Ready to grade smarter?</h2>
          <p style={{ fontSize: 16.5, color: 'rgba(255,255,255,0.7)', margin: '0 0 38px', lineHeight: 1.68, fontWeight: 500 }}>Join hundreds of teachers saving hours every week with AI grading.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/signup')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 30px', borderRadius: 14, border: 'none', background: '#fff', color: 'rgb(55,105,45)', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 22px rgba(0,0,0,0.18)', transition: 'all 0.22s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              Start Free Trial <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/login')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 14, border: '2px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Login
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0a0f1e', padding: '52px 48px 32px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 36, marginBottom: 44 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgb(132,177,121), rgb(80,130,70))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={19} color="white" />
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.2px' }}>GradeFlow</div>
              </div>
              <p style={{ fontSize: 13, color: '#475569', maxWidth: 230, lineHeight: 1.68, margin: 0, fontWeight: 500 }}>AI-powered grading and assessment management for modern teachers.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'How it Works', 'Pricing', 'Changelog'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
            ].map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'rgb(132,177,121)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>{col.title}</div>
                {col.links.map(l => (
                  <div key={l} style={{ fontSize: 13.5, color: '#475569', marginBottom: 10, cursor: 'pointer', fontWeight: 500, transition: 'color 0.18s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1a2236', paddingTop: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>© {new Date().getFullYear()} GradeFlow. All rights reserved.</div>
            <div style={{ display: 'flex', gap: 7 }}>
              {['AI Grading', 'Azure OCR', 'Groq LLM'].map(t => (
                <span key={t} style={{ fontSize: 11, fontWeight: 700, padding: '3px 11px', borderRadius: 999, background: 'rgba(132,177,121,0.14)', color: 'rgb(162,203,139)', border: '1px solid rgba(132,177,121,0.2)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}