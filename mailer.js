const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[mailer] SMTP env vars are incomplete — emails will fail to send.');
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/25
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return transporter;
}

async function sendContactNotification({ name, email, subject, message }) {
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER;

  if (!to) {
    throw new Error('CONTACT_TO_EMAIL is not set — cannot send notification email.');
  }

  const text = `New portfolio contact message

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#0f2038;">
      <h2 style="margin-bottom:4px;">New portfolio contact message</h2>
      <p style="color:#5b6b85; margin-top:0;">Sent from your portfolio contact form</p>
      <table style="border-collapse:collapse; margin:16px 0;">
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Name</td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Email</td><td>${escapeHtml(email)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Subject</td><td>${escapeHtml(subject)}</td></tr>
      </table>
      <p style="white-space:pre-wrap; border-left:3px solid #1a3a8f; padding-left:12px;">${escapeHtml(message)}</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"Portfolio Contact Form" <${from}>`,
    to,
    replyTo: email,
    subject: `New message: ${subject}`,
    text,
    html
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { sendContactNotification };
