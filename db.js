const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set. The app will crash on first database query.');
}

// Render's managed Postgres requires SSL, but its certificate chain isn't in
// Node's default trust store, so we disable strict verification. This is the
// standard approach for Render/Heroku-style managed Postgres.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[db] messages table ready');
}

async function insertMessage({ name, email, subject, message }) {
  const result = await pool.query(
    `INSERT INTO messages (name, email, subject, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at;`,
    [name, email, subject, message]
  );
  return result.rows[0];
}

async function listMessages({ limit = 50, offset = 0 } = {}) {
  const result = await pool.query(
    `SELECT id, name, email, subject, message, created_at
     FROM messages
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2;`,
    [limit, offset]
  );
  return result.rows;
}

module.exports = { pool, initDb, insertMessage, listMessages };
