# Personal Finance App

## Project Overview
A full-stack personal finance application where users can track and manage their finances, investments, and insurance products — all in one place.

## Role
You are a full-stack developer building and deploying this app on GitHub.

## Features
- User authentication (sign up / login with JWT)
- Dashboard with financial summary
- Finance tracker (income, expenses, budgets)
- Investment portfolio (stocks, mutual funds, crypto, etc.)
- Insurance management (health, life, vehicle, home, etc.)
- Reports and analytics
- AI assistant (via Anthropic SDK)

## Tech Stack

### Frontend
- Framework: React 18 + TypeScript
- Build tool: Vite
- Styling: Tailwind CSS
- State management: Zustand
- HTTP client: Axios

### Backend
- Runtime: Node.js with Express + TypeScript
- Database: **Google Sheets** (via Google Apps Script web app — no SQL DB)
- Auth: JWT (jsonwebtoken + bcryptjs)
- Security: Helmet, express-rate-limit, Zod validation
- AI: Anthropic SDK (`@anthropic-ai/sdk`)

### DevOps
- Frontend hosting: **Netlify** (free)
- Backend hosting: **Railway** (free tier)
- CI/CD: GitHub Actions
- Environment variables via `.env` (never commit this file)

## Environment Variables
Store in `personal-finance-app/backend/.env`:
```
JWT_SECRET=your-random-secret-key
NODE_ENV=development
CLIENT_URL=http://localhost:5173
PORT=5000
```

For production, set these in Railway dashboard. No `DATABASE_URL` needed — data lives in Google Sheets.

## Repository Structure
```
/
├── personal-finance-app/
│   ├── frontend/        # React + Vite app
│   │   └── src/
│   ├── backend/         # Express API server
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── sheets.ts    # Google Sheets client
│   │   │   └── index.ts
│   │   └── render.yaml      # legacy (now using Railway)
│   └── apps-script.gs   # Google Apps Script (Sheets backend)
├── .github/
│   └── workflows/
│       └── ci.yml       # CI/CD pipeline
├── .env                 # Local secrets (gitignored)
└── README.md
```

## Google Sheets Architecture
All data is stored in Google Sheets. The backend communicates with Sheets via a Google Apps Script web app deployed as an HTTP endpoint.

```
Express API → sheets.ts → Apps Script URL → Google Sheets
```

The Apps Script URL is configured by the user in the app's Settings page at runtime (stored in `config.json`).

## Coding Guidelines
- Use TypeScript where possible
- REST API with versioning: `/api/v1/...`
- Validate all user inputs on both frontend and backend (Zod on backend)
- Never expose secrets in client-side code
- Write tests for all API endpoints

## API Preferences
**Always prefer free and open APIs over paid ones.**

Preferred free options:
- **AI/LLM**: Anthropic SDK (already integrated) — use Groq or Google Gemini free tier as fallback
- **Finance data**: Alpha Vantage (free tier), Yahoo Finance (unofficial), Open Exchange Rates (free tier)
- **Auth**: Self-hosted JWT (already implemented — no third-party auth service needed)
- **Database**: Google Sheets via Apps Script (already implemented — no DB hosting needed)
- **Maps/location**: OpenStreetMap / Leaflet — never Google Maps (paid)

## Privacy First
**User financial data is sensitive — privacy is non-negotiable.**

- Never send user financial data to third-party analytics (no Google Analytics, no Mixpanel)
- Store passwords hashed (bcrypt), never plain text
- Encrypt sensitive fields (account numbers, PAN, SSN) at rest
- No third-party tracking scripts on any page
- Collect only the minimum data needed (data minimization)
- Give users the ability to export and delete their data
- Log access to sensitive data for audit trails
- Use HTTPS everywhere, even in development (use mkcert locally)

## Deployment
- Branch strategy: `main` (production), `dev` (development)
- Push to `dev` → runs CI build/test only
- Merge to `main` → auto-deploys frontend to Netlify, backend to Railway

## Notes
- Insurance module can be extended for Indian market products (LIC, term plans, ULIPs)
- Apps Script URL must be set by the user in Settings after first deploy
