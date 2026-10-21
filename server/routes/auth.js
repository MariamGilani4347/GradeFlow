const express    = require('express')
const router     = express.Router()
const rateLimit  = require('express-rate-limit')
const nodemailer = require('nodemailer')
const crypto     = require('crypto')
const bcrypt     = require('bcrypt')
const { signup, verifyEmail, login, refresh, logout, resendOtp, googleAuth } = require('../controllers/authController')

// ── Rate limiters ──────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
})

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP requests. Try again in 15 minutes.' },
})

// ── In-memory OTP store { email: { otp, expiresAt } } ─────────────────────
// For production, replace with Redis or a DB table
const otpStore = {}

// ── Email transporter ──────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
})

// ── Existing auth routes ───────────────────────────────────────────────────
router.post('/signup',       signup)
router.post('/verify-email', verifyEmail)
router.post('/login',        loginLimiter, login)
router.post('/resend-otp',   resendOtp)
router.post('/google',       googleAuth)
router.post('/refresh',      refresh)
router.post('/logout',       logout)

// ── Forgot Password — Step 1: Send OTP ────────────────────────────────────
router.post('/forgot-password', otpLimiter, async (req, res) => {
  const { email } = req.body
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' })

  try {
    const result = await req.db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )

    // Always return success — don't reveal if email exists
    if (!result.rows.length) {
      return res.json({ message: 'If this email exists, an OTP has been sent' })
    }

    const otp       = crypto.randomInt(100000, 999999).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    otpStore[email.toLowerCase()] = { otp, expiresAt }

    await transporter.sendMail({
      from: `"GradeFlow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8faf7;border-radius:16px;">
          <h2 style="color:#0f172a;margin:0 0 8px;text-align:center;">Password Reset</h2>
          <p style="color:#64748b;font-size:14px;text-align:center;margin:0 0 24px;">Use this code to reset your GradeFlow password</p>
          <div style="background:rgb(232,245,189);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
            <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:rgb(80,130,70);">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
            This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
          </p>
        </div>
      `,
    })

    res.json({ message: 'If this email exists, an OTP has been sent' })
  } catch (err) {
    console.error('forgot-password error:', err.message)
    res.status(500).json({ error: 'Failed to send OTP. Try again.' })
  }
})

// ── Forgot Password — Step 2: Verify OTP ──────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' })

  const record = otpStore[email.toLowerCase()]

  if (!record)                       return res.status(400).json({ error: 'OTP not found. Request a new one.' })
  if (Date.now() > record.expiresAt) return res.status(400).json({ error: 'OTP has expired. Request a new one.' })
  if (record.otp !== otp.toString()) return res.status(400).json({ error: 'Incorrect OTP. Try again.' })

  res.json({ message: 'OTP verified' })
})

// ── Forgot Password — Step 3: Reset Password ──────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, otp, new_password } = req.body
  if (!email || !otp || !new_password) return res.status(400).json({ error: 'All fields are required' })
  if (new_password.length < 8)         return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const record = otpStore[email.toLowerCase()]

  if (!record)                       return res.status(400).json({ error: 'OTP not found. Request a new one.' })
  if (Date.now() > record.expiresAt) return res.status(400).json({ error: 'OTP has expired. Request a new one.' })
  if (record.otp !== otp.toString()) return res.status(400).json({ error: 'Invalid OTP.' })

  try {
    const password_hash = await bcrypt.hash(new_password, 10)

    await req.db.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [password_hash, email.toLowerCase().trim()]
    )

    // Clear OTP after successful reset
    delete otpStore[email.toLowerCase()]

    res.json({ message: 'Password reset successfully' })
  } catch (err) {
    console.error('reset-password error:', err.message)
    res.status(500).json({ error: 'Failed to reset password. Try again.' })
  }
})

module.exports = router