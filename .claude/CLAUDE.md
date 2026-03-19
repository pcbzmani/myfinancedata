# Personal Finance App

## Project Overview
A full-stack personal finance application where users can track and manage their finances, investments, and insurance products — all in one place.

## Role
You are a full-stack developer building and deploying this app on GitHub.

## Features
- User authentication (sign up / login)
- Dashboard with financial summary
- Finance tracker (income, expenses, budgets)
- Investment portfolio (stocks, mutual funds, crypto, etc.)
- Insurance management (health, life, vehicle, home, etc.)
- Reports and analytics

## Tech Stack

### Frontend
- Framework: React (or replace with Vue/Next.js)
- Styling: Tailwind CSS
- State management: Redux / Zustand

### Backend
- Runtime: Node.js with Express (or replace with Python/FastAPI)
- Database: PostgreSQL (or MongoDB)
- ORM: Prisma (or SQLAlchemy)
- Auth: JWT / OAuth2

### DevOps
- Hosting: GitHub Pages / Vercel / Railway
- CI/CD: GitHub Actions
- Environment variables via `.env` (never commit this file)

## Environment Variables
Store in `.env` at project root:
```
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## Repository Structure
```
/
├── frontend/        # React app
├── backend/         # API server
├── docs/            # Documentation
├── .github/         # GitHub Actions workflows
├── .env             # Local secrets (gitignored)
└── CLAUDE.md        # This file
```

## Coding Guidelines
- Use TypeScript where possible
- REST API with versioning: `/api/v1/...`
- Validate all user inputs on both frontend and backend
- Never expose secrets in client-side code
- Write tests for all API endpoints

## API Preferences
**Always prefer free and open APIs over paid ones.**

Preferred free options:
- **AI/LLM**: Groq (free tier), Ollama (local/free), Google Gemini free tier — avoid paid APIs unless no free alternative exists
- **Finance data**: Alpha Vantage (free tier), Yahoo Finance (unofficial), Open Exchange Rates (free tier)
- **Auth**: Auth0 free tier, Supabase Auth (free), or self-hosted JWT
- **Database hosting**: Supabase (free tier), PlanetScale (free), Railway (free tier)
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
- Push to `dev` → runs CI tests
- Merge to `main` → auto-deploys via GitHub Actions

## Notes
- Add project-specific decisions or constraints here
- Example: "Insurance module supports Indian market products (LIC, term plans, ULIPs)"
