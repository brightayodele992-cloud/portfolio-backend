const express = require('express');
const rateLimit = require('express-rate-limit');
const { insertMessage } = require('../lib/db');
const { sendContactNotification } = require('../lib/mailer');

const router = express.Router();

// Limit abuse: 5 submissions per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent from this device. Please try again later.' }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBody(body) {
  const errors = [];
  const { name, email, subject, message } = body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('A valid email address is required.');
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length < 2) {
    errors.push('Subject must be at least 2 characters.');
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters.');
  }
  // simple length caps to keep the DB and emails sane
  if (name && name.length > 150) errors.push('Name is too long.');
  if (subject && subject.length > 200) errors.push('Subject is too long.');
  if (message && message.length > 5000) errors.push('Message is too long (max 5000 characters).');

  return errors;
}

router.post('/', contactLimiter, async (req, res) => {
  const errors = validateBody(req.body);
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const name = req.body.name.trim();
  const email = req.body.email.trim();
  const subject = req.body.subject.trim();
  const message = req.body.message.trim();

  // Honeypot field: if a hidden field named "company" got filled, silently drop it (likely a bot)
  if (req.body.company) {
    return res.status(200).json({ success: true });
  }

  try {
    const saved = await insertMessage({ name, email, subject, message });

    try {
      await sendContactNotification({ name, email, subject, message });
    } catch (mailErr) {
      // The message is safely stored even if email delivery fails —
      // log it so you can debug the SMTP setup without losing the message.
      console.error('[contact] email notification failed:', mailErr.message);
    }

    return res.status(201).json({
      success: true,
      id: saved.id,
      message: "Thanks — your message has been received. I'll get back to you soon."
    });
  } catch (err) {
    console.error('[contact] failed to save message:', err.message);
    return res.status(500).json({ error: 'Something went wrong on our end. Please try again shortly.' });
  }
});

module.exports = router;
