# Portfolio Contact Backend

Express backend for Ayodele Micheal's portfolio. Handles the contact form:
validates input, stores every message in Postgres, and emails a notification
via Nodemailer. Serves the portfolio's `index.html` directly, so this one
service is the whole site.

## Project structure

```
portfolio-backend/
├── server.js          # Express app entry point
├── routes/
│   └── contact.js     # POST /api/contact — validation, rate limiting
├── lib/
│   ├── db.js           # Postgres connection + queries
│   └── mailer.js       # Nodemailer transporter + email template
├── public/
│   └── index.html      # Your portfolio frontend (served as static files)
├── render.yaml          # Render Blueprint (optional one-click deploy)
├── .env.example
└── package.json
```

## 1. Local setup

```bash
npm install
cp .env.example .env
# fill in .env with real values (see below)
npm run dev
```

Visit `http://localhost:5000` — the portfolio loads and the contact form
posts to `http://localhost:5000/api/contact`.

You'll need a Postgres database for local testing. The easiest options are a
free [Neon](https://neon.tech) or [Supabase](https://supabase.com) database,
or Docker: `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`.

## 2. Environment variables

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (Render sets this automatically) |
| `DATABASE_URL` | Postgres connection string |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API. Leave blank if the frontend is served from this same app |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Your SMTP provider's settings |
| `SMTP_USER` / `SMTP_PASS` | SMTP login credentials (for Gmail, use an [App Password](https://myaccount.google.com/apppasswords), not your normal password) |
| `CONTACT_TO_EMAIL` | Where contact form notifications are sent (your inbox) |
| `CONTACT_FROM_EMAIL` | The "from" address on outgoing emails (usually same as `SMTP_USER`) |

## 3. Deploy to Render

### Option A — Blueprint (one click)

1. Push this folder to a GitHub repo.
2. In Render: **New > Blueprint**, connect the repo. Render reads `render.yaml`
   and creates both the web service and a free Postgres database automatically.
3. After it's created, go to the web service's **Environment** tab and fill in
   the values marked `sync: false` in `render.yaml`: `SMTP_HOST`, `SMTP_USER`,
   `SMTP_PASS`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.
4. Deploy. Render will run `npm install` then `npm start`.

### Option B — Manual

1. **New > PostgreSQL** on Render. Copy the "Internal Database URL" once it's ready.
2. **New > Web Service**, connect your repo.
   - Build command: `npm install`
   - Start command: `npm start`
3. Under **Environment**, add all variables from `.env.example`, using the
   database URL from step 1 for `DATABASE_URL`.
4. Deploy.

The free Render Postgres plan expires after 90 days — you'll get an email
warning beforehand, at which point you either upgrade or spin up a new one.

## 4. Test it

```bash
curl -X POST https://your-app.onrender.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","subject":"Hello","message":"Just checking this works."}'
```

Check `CONTACT_TO_EMAIL`'s inbox for the notification, and query the database
to confirm the row was saved.

## Notes on the design

- **Rate limiting**: 5 submissions per 15 minutes per IP, to curb spam.
- **Honeypot field**: a hidden `company` field in the form — real visitors
  never fill it in, so any submission with it populated is silently dropped.
- **Resilient email**: if SMTP fails, the message is still saved to the
  database and the visitor still gets a success response — you won't lose a
  message because of an email misconfiguration, and you can check the DB directly.
- **CORS**: defaults to allowing all origins so the API is easy to test.
  Once your frontend has a fixed domain, set `ALLOWED_ORIGINS` to lock it down.
