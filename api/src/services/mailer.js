import AWS from 'aws-sdk';

const ses = new AWS.SES({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

/**
 * Generate a 6-digit numeric OTP
 */
export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Utility function to parse email addresses from environment variables
export function parseDevEmails(devEmailString) {
  if (!devEmailString) return [];
  
  let emails = [];
  
  if (devEmailString.includes(',')) {
    emails = devEmailString.split(',').map(email => email.trim());
  } else if (devEmailString.startsWith('[') && devEmailString.endsWith(']')) {
    try {
      emails = JSON.parse(devEmailString);
    } catch (err) {
      emails = [devEmailString];
    }
  } else {
    emails = [devEmailString];
  }
  
  return emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

// Get development email addresses as array
export function getDevEmails() {
  let devEmailString = process.env.DEV_TEST_EMAIL || '';
  
  if (devEmailString.startsWith('"') && devEmailString.endsWith('"')) {
    devEmailString = devEmailString.slice(1, -1);
  }
  if (devEmailString.startsWith("'") && devEmailString.endsWith("'")) {
    devEmailString = devEmailString.slice(1, -1);
  }
  
  return parseDevEmails(devEmailString);
}

/**
 * Send an OTP email via AWS SES
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

  // Redirect recipient in development mode
  let recipients = [to];
  if (process.env.NODE_ENV === 'DEV') {
    const devEmails = getDevEmails();
    if (devEmails.length > 0) {
      recipients = devEmails;
    }
  }

  const fromAddress = process.env.EMAIL_FROM || '"Engage Socially" <info@virpanix.com>';

  const emailParams = {
    Destination: {
      ToAddresses: recipients,
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subjects[type],
      },
    },
    Source: fromAddress,
  };

  try {
    const data = await ses.sendEmail(emailParams).promise();
    console.log(`[Mailer] OTP email sent successfully to ${recipients.join(', ')}. Message ID: ${data.MessageId}`);
  } catch (mailErr) {
    console.warn(`[Mailer Warning] Failed to send OTP email via SES to ${recipients.join(', ')}: ${mailErr.message}`);
    console.log(`[Mailer Warning] Please use the OTP code printed in the console above to log in/verify.`);
  }
}
