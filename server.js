require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initDb } = require('./lib/db');
const contactRouter = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false // keep this off unless you tune it for the fonts/inline styles used in public/index.html
}));

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (no Origin header) and any configured origins.
    // If ALLOWED_ORIGINS is left empty, allow all origins (fine for a public contact form).
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '100kb' }));

// Serve the portfolio frontend as static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/contact', contactRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Fallback to the portfolio's index.html for any non-API route (simple SPA-style fallback)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler (e.g. CORS rejection)
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
