const nodemailer = require('nodemailer');
require('dotenv').config();

const isDev = process.env.NODE_ENV !== 'production';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: isDev
    ? { rejectUnauthorized: false } // allow self-signed cert in dev
    : undefined,
});

const sendOTPEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: `"GradeFlow" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify your email — GradeFlow',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
          <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 40px;">📧</div>
              <h2 style="color: #0f172a; font-size: 20px; margin: 12px 0 4px;">Verify Your Email</h2>
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">Enter this code to complete your signup</p>
            </div>
            <div style="text-align: center; background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
              <div style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #1E3A5F;">${otp}</div>
            </div>
            <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0;">
              This code expires in <strong>10 minutes</strong>.<br/>
              If you didn't request this, ignore this email.
            </p>
          </div>
        </div>
      `,
    });
    console.log(`📧 OTP sent to ${email}: ${otp}`);
  } catch (err) {
    console.error(`❌ Failed to send OTP to ${email}:`, err.message);
    throw new Error('Failed to send OTP email.');
  }
};

module.exports = { sendOTPEmail };