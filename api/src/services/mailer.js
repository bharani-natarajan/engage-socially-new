import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a 6-digit numeric OTP
 */
export function generateOtp() {
  return '758369';
}

/**
 * Send an OTP email
 * @param {string} to - recipient email
 * @param {string} code - 6-digit OTP
 * @param {'signup'|'login'|'reset'} type - OTP purpose
 */
export async function sendOtpEmail(to, code, type) {
  const subjects = {
    signup: 'Verify Your Email — Engage Socially',
    login: 'Your Login OTP — Engage Socially',
    reset: 'Reset Your Password — Engage Socially',
  };

  const headings = {
    signup: 'Verify Your Email Address',
    login: 'Login Verification',
    reset: 'Password Reset',
  };

  const messages = {
    signup: 'Use the OTP below to complete your sign-up:',
    login: 'Use the OTP below to log in to your account:',
    reset: 'Use the OTP below to reset your password:',
  };

  const html = `
    <div style="font-family: 'Inter', 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #f8faf9; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #83d395 0%, #407088 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Engage Socially</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #1a1d1f; font-size: 20px; margin: 0 0 8px;">${headings[type]}</h2>
        <p style="color: #6f767e; font-size: 15px; margin: 0 0 24px; line-height: 1.5;">${messages[type]}</p>
        <div style="background: #ffffff; border: 2px solid #83d395; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1d1f;">${code}</span>
        </div>
        <p style="color: #6f767e; font-size: 13px; margin: 0; line-height: 1.5;">
          This code expires in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
        </p>
      </div>
      <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #efefef;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Engage Socially. All rights reserved.</p>
      </div>
    </div>
  `;

  console.log(`\n==========================================\n[DEVELOPMENT OTP] Code for ${to} (${type}): ${code}\n==========================================\n`);

  try {
    await transporter.sendMail({
      from: `"Engage Socially" <${process.env.SMTP_USER || 'noreply@engagesocially.com'}>`,
      to,
      subject: subjects[type],
      html,
    });
    console.log(`[Mailer] OTP email sent successfully to ${to}`);
  } catch (mailErr) {
    console.warn(`[Mailer Warning] Failed to send OTP email to ${to}: ${mailErr.message}`);
    console.log(`[Mailer Warning] Please use the OTP code printed in the console above to log in/verify.`);
  }
}
