
> A full-stack, production-grade trading journal application built for active traders. Track trades, analyze performance, enforce discipline through a rules engine, and surface actionable patterns — all in a polished, responsive interface with full dark and light theme support.

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://quantario-frontend.vercel.app)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://render.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-orange)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)

---

## Overview

Quantario solves a real problem most retail traders face: they trade without data. They repeat the same mistakes, don't know which sessions they perform best in, and have no structured way to review their behavior.

This application gives traders a professional-grade toolset previously only available in expensive institutional platforms — built as a lean, fast, single-page web app with a Node.js/PostgreSQL backend and a vanilla JS frontend deployed on Vercel and Render.

---

## Features

### 📊 Dashboard
- **4 stat cards** with embedded sparkline charts (last 30 days of daily P&L per metric)
- **Win/Loss streak tracker** — highlights current momentum
- **Rule violation alerts** — surfaces breaches directly on the dashboard
- **Weekly email summary** button — sends a digest of the week's performance

### 🌍 Sessions Panel
- Live **London / New York / Asia / Outside** session cards with real-time local clocks
- Per-session profit %, total trades, and win rate calculated from actual trade data
- Active session highlighted with an accent border

### 📅 Weekly P&L Calendar
- Month view broken into **weekly blocks** (1st–5th Week), color-coded green/red
- Daily grid with individual cell P&L and trade count
- Month navigation with trading day stats (trading days, win rate, avg daily P&L)

### 📈 Analytics
- **Equity curve** — SVG-rendered cumulative P&L over time
- **Day-of-week performance** — bar chart showing best/worst trading days
- **Time-of-session analysis** — performance breakdown by Pre-Market / AM / Midday / PM
- Strategy breakdown, asset distribution, win/loss donut

### 🛡️ Rules Engine
- Define personal trading rules (max daily loss, max trades per day, min R:R)
- Add unlimited custom free-text rules
- **Automatic violation detection** — scans trade history and flags breaches in real time
- Toggle rules on/off with a persistent local state

### 📓 Journal
- **Quick Entry** mode for fast daily notes
- **Structured Entry** mode with dedicated sections: Setup & Plan, Execution, Emotions, Psychology, Lessons Learned
- Trade notes attached per trade, surfaced in the journal view
- AI-powered journal draft from today's trades (Premium)

### ⚡ Quick Add Trade
- Fast trade logging modal accessible from the FAB on mobile
- Fills only the essential fields — symbol, P&L, direction, asset type, date

### 🎯 Goals
- Set daily, weekly, and monthly P&L targets
- Progress bars calculated against actual performance
- Persisted in localStorage for instant access

### 🤖 AI Features (Premium)
- **Trade Debrief** — per-trade AI analysis streamed in real time
- **Pattern Detection** — scans full trade history for behavioral patterns
- **Journal Draft** — generates a journal entry from the day's trades

### 🔐 Authentication
- Email/password with JWT
- Google OAuth (configurable)
- Password reset flow with email verification
- Premium plan support

### 📱 Progressive Web App
- Installable on iOS and Android
- Service worker with cache-first strategy for offline resilience
- Add-to-home-screen prompt

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JS (ES2020), CSS custom properties, SVG charts |
| **Backend** | Node.js 18, Express.js |
| **Database** | PostgreSQL via [Neon](https://neon.tech) (serverless) |
| **Auth** | JWT, bcrypt, Google OAuth 2.0 |
| **Email** | Nodemailer (weekly summaries, password reset) |
| **AI** | Anthropic Claude API (streaming) |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Render |
| **Fonts** | Plus Jakarta Sans, JetBrains Mono |

No frontend framework was used by design — the entire UI is a single-file vanilla JS SPA with a hand-rolled reactive render loop. This keeps the bundle size minimal, load times fast, and avoids framework lock-in.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│  app.html → config.js → api.js → app.js             │
│  Service Worker (cache-first for static assets)     │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS / REST
┌────────────────────▼────────────────────────────────┐
│               Express.js Backend (Render)            │
│                                                     │
│  /api/auth        — login, register, Google OAuth   │
│  /api/trades      — CRUD for trade records          │
│  /api/journal     — journal entries                 │
│  /api/brokers     — broker account management       │
│  /api/ai          — Claude API proxy (streaming)    │
│  /api/email       — weekly summaries, password reset│
└────────────────────┬────────────────────────────────┘
                     │ TLS / pg driver
┌────────────────────▼────────────────────────────────┐
│         PostgreSQL on Neon (serverless)              │
│  users · trades · journal_entries · brokers         │
└─────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- A [Render](https://render.com) account for backend hosting
- A [Vercel](https://vercel.com) account for frontend hosting

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/quantario.git
cd quantario
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_jwt_secret_here
ANTHROPIC_API_KEY=your_anthropic_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
FRONTEND_URL=https://your-vercel-url.vercel.app
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Run database migrations:

```bash
npm run migrate
```

Start the development server:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
```

Edit `js/config.js` and update the `API_BASE` URL to point to your backend, and set your `GOOGLE_CLIENT_ID` if using Google Sign In.

For local development, serve the frontend with any static server:

```bash
npx serve .
```

### 4. Deploy

**Frontend → Vercel:**
Drag and drop the `frontend/` folder into the Vercel dashboard, or use the Vercel CLI:

```bash
cd frontend
vercel --prod
```

**Backend → Render:**
Connect your GitHub repo to Render, set the root directory to `backend/`, add all environment variables from your `.env`, and deploy.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT signing (min 32 chars) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key for AI features |
| `EMAIL_HOST` | ✅ | SMTP host for outgoing email |
| `EMAIL_PORT` | ✅ | SMTP port (587 for TLS) |
| `EMAIL_USER` | ✅ | SMTP username / email address |
| `EMAIL_PASS` | ✅ | SMTP password / app password |
| `FRONTEND_URL` | ✅ | Your Vercel frontend URL (for CORS) |
| `GOOGLE_CLIENT_ID` | ⬜ | Google OAuth client ID (optional) |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require a `Bearer` token in the `Authorization` header.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Login and receive JWT |
| `POST` | `/auth/google` | Google OAuth login |
| `POST` | `/auth/forgot-password` | Send password reset email |
| `POST` | `/auth/reset-password` | Reset password with token |

### Trades

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/trades` | Get all trades for authenticated user |
| `POST` | `/trades` | Create a new trade |
| `PUT` | `/trades/:id` | Update a trade |
| `DELETE` | `/trades/:id` | Delete a trade |

### Journal

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/journal` | Get all journal entries |
| `POST` | `/journal` | Create a journal entry |
| `DELETE` | `/journal/:id` | Delete an entry |

### AI (Premium)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/debrief` | Stream trade debrief |
| `POST` | `/ai/patterns` | Stream pattern analysis |
| `POST` | `/ai/journal-draft` | Stream journal draft |

### Email

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/email/weekly-summary` | Send weekly performance digest |

---

## Project Structure

```
quantario/
├── backend/
│   ├── db/
│   │   └── migrations/         # SQL schema files
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── trades.js           # Trade CRUD
│   │   ├── journal.js          # Journal entries
│   │   ├── brokers.js          # Broker accounts
│   │   ├── ai.js               # Claude API proxy
│   │   └── email.js            # Email sending
│   ├── services/
│   │   └── email.js            # Email service (Nodemailer)
│   ├── server.js               # Express app entry point
│   └── package.json
│
└── frontend/
    ├── css/
    │   └── styles.css          # ~1600 lines — full design system
    ├── js/
    │   ├── config.js           # API base URL, Google client ID
    │   ├── api.js              # All API calls + auth token handling
    │   └── app.js              # ~3100 lines — entire SPA
    ├── app.html                # Authenticated app shell
    ├── auth.html               # Login / register page
    ├── index.html              # Landing / redirect
    ├── manifest.json           # PWA manifest
    ├── sw.js                   # Service worker
    └── vercel.json             # Vercel routing + CSP headers
```

---

## Roadmap

- [ ] Mobile app (React Native) with the same backend
- [ ] CSV import from major brokers (Interactive Brokers, TD Ameritrade, Webull)
- [ ] Webhooks for automatic trade ingestion from broker APIs
- [ ] Community leaderboard with opt-in anonymized performance sharing
- [ ] Advanced position sizing calculator with Kelly Criterion
- [ ] Multi-account support (track multiple broker accounts separately)
- [ ] Backtesting module — replay historical setups against a strategy

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

*Built by [Jpeg](https://github.com/Jpeg-create)*

<p align="center">Built with focus and discipline — the same way good trades are made.</p>
