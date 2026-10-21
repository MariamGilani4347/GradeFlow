# GradeFlow — Teacher Assessment CRM

> AI-powered grading and assessment platform for teachers. GradeFlow lets educators create grading sessions, accept student submissions (PDF/images), automatically extract and grade answers using LLMs (Groq), run plagiarism checks, and email completion reports — all from a single React + Express application deployed on Vercel.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Database & Migrations](#database--migrations)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Grading Pipeline](#grading-pipeline)
- [Deployment (Vercel)](#deployment-vercel)
- [Known Limitations](#known-limitations)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Email/password authentication** with OTP email verification, password reset (forgot-password flow), and JWT access + refresh tokens.
- **Google OAuth login** (redirect flow) with automatic account provisioning and workspace creation.
- **Grading sessions** — create sessions with a rubric, total marks, and attached students.
- **Submission ingestion** — upload answer scripts (PDF/images) stored in Supabase; text is extracted via Azure Computer Vision OCR.
- **AI grading** — answers are graded by Groq (LLM) against the rubric; AI score + feedback are stored.
- **Plagiarism / similarity check** — Jaccard n-gram similarity across submissions in a session; high matches are flagged.
- **Rubric management** — full CRUD for grading rubrics.
- **Analytics & dashboards** — per-session and per-teacher stats, CSV/PDF export of session reports.
- **Admin panel** — platform-wide stats, user/plan management, session/submission reprocessing, and a failed-job queue.
- **Email notifications** — session completion summaries sent via Resend.

---

## Tech Stack

| Layer        | Technology                                                                 |
|--------------|----------------------------------------------------------------------------|
| Frontend     | React 19, Vite 7, React Router 7, Tailwind CSS 3, Recharts, lucide-react  |
| Backend      | Node.js, Express 5                                                         |
| Database     | PostgreSQL (hosted on Supabase / Neon) via `pg`                            |
| Auth         | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, Google OAuth (manual flow)   |
| AI Grading   | Groq SDK                                                                   |
| OCR          | Azure Computer Vision (`axios` REST)                                       |
| File Storage | Supabase Storage                                                           |
| Email        | Nodemailer (Gmail SMTP) for OTPs, Resend for completion reports            |
| PDF Export   | Puppeteer + `@sparticuz/chromium` (local only — not on serverless)         |
| Hosting      | Vercel (static frontend + serverless API functions)                        |

---

## Architecture

GradeFlow is a monorepo with two deployable pieces that are served from a single Vercel project:

1. **Static frontend** — the React app in `client/` is built by Vite and served as static assets from `client/dist`.
2. **Serverless API** — the Express app in `server/` is bundled into Vercel **Node functions** under `api/`. Every `/api/*` request is forwarded to the Express app, which mounts the route groups (`/auth`, `/sessions`, `/submissions`, `/admin`, `/rubrics`).

On Vercel, the SPA is served for all non-API routes (the `vercel.json` rewrite sends everything except `/api/*` to `index.html`), while `/api/*` is handled by the serverless function.

> **Why `/api` is implemented as chained dynamic route files**
> Vercel's `api` directory for non-Next.js projects does **not** support catch-all route files (e.g. `api/[[catchAll]].js`). Only single dynamic segments are supported. GradeFlow therefore uses a chain of dynamic-segment functions — `api/[a].js`, `api/[a]/[b].js`, … up to `api/[a]/[b]/[c]/[d]/[e]/[f].js` — so that any `/api/<seg1>/<seg2>/…` path is routed to the Express app, which then does its own internal routing.

---

## Project Structure

```
Teacher-crm/  (repo root)
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── services/api.js # same-origin API client
│   │   ├── context/AuthContext.jsx
│   │   └── …               # components, pages, hooks
│   ├── index.html
│   └── vite.config.js
├── server/                 # Express backend
│   ├── index.js            # Express app entry (exported for serverless)
│   ├── migrate.js          # DB migrations runner (runs at build time)
│   ├── db/db.js            # pg Pool
│   ├── routes/
│   │   ├── auth.js         # /auth
│   │   ├── sessions.js     # /sessions + /submissions
│   │   ├── admin.js        # /admin
│   │   └── Rubrics.js      # /rubrics
│   ├── controllers/        # request handlers
│   ├── utils/              # groq, azure (OCR), supabase, email, jwt, grader
│   └── migrations/         # SQL migration files
├── api/                    # Vercel serverless function entry points
│   ├── [a].js
│   ├── [a]/[b].js
│   ├── [a]/[b]/[c].js
│   ├── [a]/[b]/[c]/[d].js
│   ├── [a]/[b]/[c]/[d]/[e].js
│   └── [a]/[b]/[c]/[d]/[e]/[f].js
├── vercel.json             # build + rewrite configuration
├── package.json            # root deps + build script
└── README.md
```

---

## Prerequisites

- **Node.js** v18 or newer (Node 22 recommended for Vercel).
- **PostgreSQL** database — a free Supabase or Neon project works well. You need the connection string (`DATABASE_URL`).
- A **Google Cloud OAuth** web client (for Google login).
- API keys for **Groq** (grading) and **Azure Computer Vision** (OCR).
- A **Supabase** project (storage bucket for submissions) and a **Resend** account (completion emails).
- A **Vercel** account (for deployment).

---

## Environment Variables

Copy `server/.env.example` to `server/.env` for local development and fill in the values. On Vercel, set these in **Settings → Environment Variables** (Production).

| Variable                | Required | Description                                                                 |
|-------------------------|----------|-----------------------------------------------------------------------------|
| `PORT`                  | No       | Local server port (default `3001`).                                         |
| `DATABASE_URL`          | **Yes**  | PostgreSQL connection string (Supabase/Neon). Used by migrations + runtime.|
| `JWT_SECRET`            | **Yes**  | Secret for signing access tokens.                                           |
| `JWT_REFRESH_SECRET`    | **Yes**  | Secret for signing refresh tokens.                                          |
| `GOOGLE_CLIENT_ID`      | Yes*     | Google OAuth web client ID (must match the frontend's `VITE_GOOGLE_CLIENT_ID`). |
| `GOOGLE_CLIENT_SECRET`  | Yes*     | Google OAuth client secret.                                                 |
| `EMAIL_USER`            | Yes*     | Gmail address used to send OTP / verification emails (Nodemailer).         |
| `EMAIL_PASS`            | Yes*     | Gmail app password for `EMAIL_USER`.                                        |
| `GMAIL_USER`            | Yes*     | Gmail address used by `utils/email.js` notifications.                       |
| `GMAIL_PASS`            | Yes*     | Gmail app password for `GMAIL_USER`.                                        |
| `GROQ_API_KEY`          | Yes*     | Groq API key for AI grading.                                                |
| `AZURE_CV_ENDPOINT`     | Yes*     | Azure Computer Vision endpoint for OCR.                                     |
| `AZURE_CV_KEY`          | Yes*     | Azure Computer Vision key.                                                  |
| `SUPABASE_URL`          | Yes*     | Supabase project URL (storage).                                             |
| `SUPABASE_SERVICE_KEY`  | Yes*     | Supabase service-role key (storage admin).                                  |
| `SUPABASE_BUCKET`       | Yes*     | Supabase storage bucket name for submissions.                               |
| `RESEND_API_KEY`        | Yes*     | Resend API key for completion emails.                                       |
| `RESEND_FROM_EMAIL`     | No       | Verified sender for Resend (default `onboarding@resend.dev`).               |
| `ADMIN_USERNAME`        | No       | Admin panel username (default `admin`).                                     |
| `ADMIN_PASSWORD`        | No       | Admin panel password (default `admin123`).                                  |
| `ADMIN_SECRET`          | No       | Secret for admin JWT (default `supersecretadminjwt`).                      |
| `BASE_URL`              | No       | Optional override for the public origin (otherwise derived from the request). |
| `CHROMIUM_PKG`          | No       | Package providing Chromium for local PDF export (default `@sparticuz/chromium`). |
| `PUPPETEER_PKG`         | No       | Puppeteer package for local PDF export (default `puppeteer-core`).          |
| `NODE_ENV` / `VERCEL`   | Auto     | Set automatically by the environment.                                       |

\* Required for the corresponding feature to work in production. Auth (email + Google) only needs `GOOGLE_*`, `JWT_*`, and `DATABASE_URL`.

---

## Local Development Setup

### 1. Clone

```bash
git clone <repo-url>
cd Teacher-crm
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env      # then fill in your values
node index.js             # starts on http://localhost:3001
```

The backend automatically runs migrations on first connect and exposes the Express app for the serverless wrapper.

### 3. Frontend

```bash
cd ../client
npm install --legacy-peer-deps
npm run dev               # starts on http://localhost:5173
```

The frontend talks to the backend **same-origin** (the API client uses relative `/api/...` URLs), so in production the Vercel rewrite handles routing. For purely local two-terminal development, run both `node index.js` (port 3001) and `npm run dev` (5173) and point the frontend at `http://localhost:3001` if needed.

---

## Database & Migrations

Migrations live in `server/migrations/` and are applied automatically:

- **At build time on Vercel** — `vercel.json`'s `buildCommand` runs `node server/migrate.js` before the client build. (This step is intentionally non-fatal: if the database is unreachable during the build, the build still continues so the frontend and API functions deploy.)
- **At runtime** — `server/db/db.js` runs a `SELECT 1` health check on boot.

Migrations are tracked in a `migrations_log` table and are **idempotent** (`CREATE TABLE IF NOT EXISTS` + per-file dedupe), so they are safe to re-run.

To run migrations manually:

```bash
cd server
node migrate.js
```

---

## Running the App

| Component | URL                       |
|-----------|---------------------------|
| Frontend  | http://localhost:5173     |
| Backend   | http://localhost:3001     |
| Health    | `GET http://localhost:3001/` → `{ message: 'Teacher Assessment CRM API is running' }` |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <access_token>` header (the `protect` middleware attaches `req.userId`).

### Auth — `/api/auth`

| Method | Path                     | Auth | Description                                      |
|--------|--------------------------|------|--------------------------------------------------|
| POST   | `/signup`                | —    | Create account (email + password).               |
| POST   | `/verify-email`          | —    | Verify email with OTP.                           |
| POST   | `/login`                 | —    | Email/password login (rate-limited).             |
| POST   | `/resend-otp`            | —    | Resend verification OTP.                         |
| POST   | `/google`                | —    | Begin Google OAuth (302 redirect to Google).     |
| GET    | `/google/callback`        | —    | Google OAuth callback (302 to `/auth/callback`). |
| POST   | `/refresh`               | —    | Exchange refresh token for new access token.     |
| POST   | `/logout`                | —    | Invalidate session.                              |
| POST   | `/forgot-password`       | —    | Send password-reset OTP (rate-limited).          |
| POST   | `/verify-reset-otp`      | —    | Verify reset OTP.                                |
| POST   | `/reset-password`        | —    | Set a new password.                              |

### Sessions — `/api/sessions`

| Method | Path                                | Auth | Description                          |
|--------|-------------------------------------|------|--------------------------------------|
| GET    | `/analytics`                        | Yes  | Teacher analytics.                   |
| GET    | `/dashboard-stats`                  | Yes  | Dashboard summary stats.             |
| POST   | `/`                                 | Yes  | Create a session.                    |
| GET    | `/`                                 | Yes  | List sessions for the user.          |
| GET    | `/:id`                             | Yes  | Get a session by id.                 |
| GET    | `/:id/analytics`                   | Yes  | Per-session analytics.               |
| POST   | `/:id/submissions`                 | Yes  | Create a submission (upload file).   |
| GET    | `/:id/report`                      | Yes  | HTML session report.                 |
| GET    | `/:id/export-csv`                  | Yes  | Export submissions as CSV.           |
| GET    | `/:id/export-pdf`                  | Yes  | Export report as PDF (local only).   |
| POST   | `/:id/submissions/:subId/reprocess`| Yes  | Re-run grading for a submission.     |
| POST   | `/:id/presign`                     | Yes  | Get a storage upload pre-signature.  |
| DELETE | `/:id`                             | Yes  | Delete a session.                    |

### Submissions — `/api/submissions`

Submitted via the session routes above; reprocessing and retrieval are exposed through the session endpoints.

### Rubrics — `/api/rubrics`

| Method | Path           | Auth | Description           |
|--------|----------------|------|-----------------------|
| GET    | `/`            | Yes  | List rubrics.         |
| POST   | `/`            | Yes  | Create a rubric.      |
| PUT    | `/:id`         | Yes  | Update a rubric.      |
| DELETE | `/:id`         | Yes  | Delete a rubric.      |

### Admin — `/api/admin`

| Method | Path                                  | Auth            | Description                         |
|--------|---------------------------------------|-----------------|-------------------------------------|
| POST   | `/login`                              | —               | Admin login.                        |
| GET    | `/stats`                              | Admin           | Platform stats.                    |
| GET    | `/users`                              | Admin           | List users.                        |
| PUT    | `/users/:id/plan`                     | Admin           | Update a user's plan.               |
| GET    | `/users/:userId/sessions`             | Admin           | Sessions for a user.               |
| DELETE | `/users/:id`                          | Admin           | Delete a user.                     |
| GET    | `/sessions`                          | Admin           | All sessions.                      |
| GET    | `/sessions/:sessionId`               | Admin           | Session detail.                    |
| POST   | `/sessions/:sessionId/reprocess`     | Admin           | Reprocess a whole session.         |
| DELETE | `/sessions/:sessionId`               | Admin           | Delete a session.                  |
| POST   | `/submissions/:submissionId/reprocess`| Admin          | Reprocess a submission.            |
| DELETE | `/submissions/:submissionId`         | Admin           | Delete a submission.               |
| GET    | `/queue/stats`                       | Admin           | Failed-job queue stats.            |
| GET    | `/queue/failed`                      | Admin           | List failed jobs.                  |
| POST   | `/queue/failed/retry-all`            | Admin           | Retry all failed jobs.             |
| POST   | `/queue/failed/:jobId/retry`         | Admin           | Retry one failed job.              |
| DELETE | `/queue/failed`                      | Admin           | Clear failed jobs.                 |
| DELETE | `/queue/failed/:jobId`              | Admin           | Delete one failed job.             |

---

## Authentication

### Email / Password

1. `POST /api/auth/signup` creates the user (password hashed with `bcryptjs`) and emails a verification OTP.
2. `POST /api/auth/verify-email` verifies the OTP.
3. `POST /api/auth/login` returns access + refresh tokens (rate-limited to 10 attempts / 15 min).
4. `POST /api/auth/refresh` issues a new access token from a refresh token.
5. `forgot-password` → `verify-reset-otp` → `reset-password` implements the reset flow.

> Tokens are sent to the frontend, which stores them and includes the access token as a Bearer header on protected requests.

### Google OAuth

GradeFlow implements the Google redirect flow manually (no `passport` dependency):

1. `GET /api/auth/google` redirects the browser to Google's consent screen. The `redirect_uri` is built from the **request's own origin** (`getBaseUrl(req)`), so it always points back to the deployment that received the request — this avoids the classic "Google redirects to a stale domain" 404.
2. Google redirects back to `/api/auth/google/callback` with a `code`.
3. The callback exchanges the code for tokens, fetches the user profile, upserts the user (creating a workspace on first login), and redirects to `/auth/callback?access_token=...&refresh_token=...&user=...`.

**Google Cloud Console setup:** add `https://<your-domain>/api/auth/google/callback` as an **Authorized Redirect URI** for your OAuth web client.

---

## Grading Pipeline

When a submission is created, `server/utils/grader.js` runs inline (no background worker — designed for serverless):

1. Download the submission file from Supabase storage (`utils/supabase.js`).
2. Extract text via Azure Computer Vision OCR (`utils/azure.js`).
3. Clean the extracted text and (best-effort) extract the student ID.
4. Grade the answer with Groq against the session's rubric / total marks (`utils/groq.js`).
5. Persist `ai_score` + `ai_feedback`, mark the submission `review_required`.
6. Run a **similarity check** (Jaccard n-gram) against other submissions in the session; flag potential plagiarism (>80% match).
7. When the session's last submission finishes, mark the session `completed` and email a completion report via Resend.

Grades can be re-run via the reprocessing endpoints (user or admin).

---

## Deployment (Vercel)

GradeFlow is designed to deploy as a single Vercel project:

1. **Import** the repository into Vercel.
2. **Framework preset:** Other / Node.js. The `vercel.json` controls the build:
   - `buildCommand`: runs DB migrations, then installs client deps and builds the frontend.
   - `outputDirectory`: `client/dist`.
3. **Add the Environment Variables** from the table above (at least `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and the ones for the features you enable).
4. **Deploy.** The `api/` directory is auto-detected as serverless Node functions; `vercel.json` rewrites `/sessions`, `/submissions`, `/admin`, `/rubrics` to their `/api/...` equivalents and serves the SPA for everything else.

### Notes for a successful Vercel build

- **Keep Chromium in the root dependencies.** `sessionController.js` dynamically requires `@sparticuz/chromium` / `puppeteer-core` for local PDF export. Even though PDF export is disabled on serverless (`isServerless` → 501), Vercel's function bundler (nft) resolves that `require`, so the packages must remain installed or the function build fails.
- **API functions use chained dynamic segments** (see Architecture) because Vercel's `api` dir does not support catch-all routes for non-Next.js projects.
- **Migrations are non-fatal at build time** so a transient DB issue doesn't block the entire deployment.
- **PDF export is unavailable on Vercel** by design (Chromium isn't launched in the `production`/`VERCEL` environment); the endpoint returns `501` there.

---

## Known Limitations

- **In-memory OTP store.** Verification/reset OTPs live in a process memory map (`otpStore`). This is fine for a single instance / serverless warm path but does not persist across cold starts or scale across instances. Replace with Redis or a DB table for production-grade OTP handling.
- **PDF export only works locally** (requires Chromium). On Vercel it returns `501`.
- **No background job worker.** Grading runs synchronously within the request; very large files may approach serverless time limits. The admin "failed queue" lets you reprocess.
- **Email OTPs use Gmail SMTP** credentials (`EMAIL_USER`/`EMAIL_PASS` or `GMAIL_USER`/`GMAIL_PASS`). For production, consider a transactional provider.

---

## Scripts

Root (`package.json`):

```bash
npm run build   # builds the client (cd client && npm install && npm run build)
```

Server (`server/`):

```bash
npm start       # node index.js
npm run dev     # nodemon index.js
node migrate.js # apply DB migrations
```

Client (`client/`):

```bash
npm run dev     # vite
npm run build   # vite build
npm run lint    # eslint
npm run preview # vite preview
```

---

## Contributing

1. Fork the repository and create a feature branch.
2. Install dependencies for `server/` and `client/`.
3. Add your `.env` (copy from `.env.example`).
4. Submit a pull request with a clear description of the change.

---

## License

This project is provided as-is for educational/demo purposes. Add a license file as appropriate for your use case.
