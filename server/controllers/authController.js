const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendOTPEmail } = require('../utils/email');
const { z } = require('zod');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── SIGNUP ───────────────────────────────────────────────
const signup = async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().min(1),
    school_name: z.string().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { email, password, full_name, school_name } = result.data;

  try {
    // Find unverified users
    const unverified = await pool.query(
      'SELECT id FROM public.users WHERE email = $1 AND is_email_verified = false',
      [email]
    );

    // Delete related data in correct order
    for (const row of unverified.rows) {
      const uid = row.id;
      await pool.query(
        `DELETE FROM public.submissions WHERE session_id IN (
          SELECT id FROM public.sessions WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE owner_user_id = $1
          )
        )`,
        [uid]
      );
      await pool.query(
        `DELETE FROM public.sessions WHERE workspace_id IN (
          SELECT id FROM public.workspaces WHERE owner_user_id = $1
        )`,
        [uid]
      );
      await pool.query(`DELETE FROM public.workspaces WHERE owner_user_id = $1`, [uid]);
      await pool.query(`DELETE FROM public.users WHERE id = $1`, [uid]);
    }

    // Check if verified user exists
    const existing = await pool.query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);

    const userResult = await pool.query(
      `INSERT INTO public.users (email, password_hash, full_name, otp_code, otp_expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name`,
      [email, password_hash, full_name, otp, otp_expires]
    );
    const user = userResult.rows[0];

    const workspaceName = school_name || `${full_name}'s Workspace`;
    const workspaceResult = await pool.query(
      `INSERT INTO public.workspaces (owner_user_id, name) VALUES ($1, $2) RETURNING id, name`,
      [user.id, workspaceName]
    );
    const workspace = workspaceResult.rows[0];

    // Send OTP email safely (ignore self-signed certificate warning)
    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.warn('OTP email warning:', emailErr.message);
    }

    console.log(`🔑 OTP for ${email}: ${otp}`);

    const access_token = generateAccessToken(user.id);
    const refresh_token = generateRefreshToken(user.id);

    res.status(201).json({ data: { user, workspace, access_token, refresh_token } });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
};

// ─── VERIFY EMAIL ─────────────────────────────────────────
const verifyEmail = async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { email, otp } = result.data;

  try {
    const userResult = await pool.query(
      'SELECT id, otp_code, otp_expires_at FROM public.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (user.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    await pool.query(
      'UPDATE public.users SET is_email_verified = true, otp_code = null, otp_expires_at = null WHERE id = $1',
      [user.id]
    );

    res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Verify email error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ─── RESEND OTP ───────────────────────────────────────────
const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required.' });

  try {
    const userResult = await pool.query(
      'SELECT id FROM public.users WHERE email = $1 AND is_email_verified = false',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already verified.' });
    }

    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'UPDATE public.users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3',
      [otp, otp_expires, email]
    );

    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.warn('OTP email warning:', emailErr.message);
    }

    console.log(`🔑 OTP for ${email}: ${otp}`);
    res.json({ message: 'OTP resent successfully.' });
  } catch (err) {
    console.error('Resend OTP error:', err.message);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
};

// ─── LOGIN ────────────────────────────────────────────────
const login = async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { email, password } = result.data;

  try {
    const userResult = await pool.query('SELECT * FROM public.users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_email_verified) {
      return res.status(401).json({ error: 'Please verify your email first.' });
    }

    const access_token = generateAccessToken(user.id);
    const refresh_token = generateRefreshToken(user.id);

    res.json({
      data: {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          plan: user.plan,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────
const refresh = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token required.' });

  try {
    const decoded = verifyRefreshToken(refresh_token);
    const access_token = generateAccessToken(decoded.userId);
    res.json({ data: { access_token } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────
const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully.' });
};

const googleAuth = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Google token is required.' });
  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const payload = await googleRes.json();
    if (payload.error || payload.error_description) {
      return res.status(401).json({ error: 'Invalid Google token.' });
    }
    if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Token audience mismatch.' });
    }
    if (payload.email_verified === 'false' || payload.email_verified === false) {
      return res.status(401).json({ error: 'Email not verified with Google.' });
    }

    const email = payload.email;
    const fullName = payload.name || email.split('@')[0];

    let userResult = await pool.query('SELECT * FROM public.users WHERE email = $1', [email]);
    let user;
    if (userResult.rows.length === 0) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      const newUser = await pool.query(
        `INSERT INTO public.users (email, password_hash, full_name, is_email_verified)
         VALUES ($1, $2, $3, true) RETURNING id, email, full_name, is_email_verified, plan`,
        [email, passwordHash, fullName]
      );
      user = newUser.rows[0];
      await pool.query(
        `INSERT INTO public.workspaces (owner_user_id, name) VALUES ($1, $2)`,
        [user.id, `${fullName}'s Workspace`]
      );
    } else {
      user = userResult.rows[0];
      if (!user.is_email_verified) {
        await pool.query('UPDATE public.users SET is_email_verified = true WHERE id = $1', [user.id]);
        user.is_email_verified = true;
      }
    }

    const access_token = generateAccessToken(user.id);
    const refresh_token = generateRefreshToken(user.id);
    res.json({
      data: {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          is_email_verified: user.is_email_verified,
          plan: user.plan,
        },
      },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ error: err.message || 'Google authentication failed.' });
  }
};

module.exports = { signup, verifyEmail, login, refresh, logout, resendOtp, googleAuth };