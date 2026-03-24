# Personal Finance App

## Project Overview
A full-stack personal finance application to track finances, investments, and insurance products.
All data is stored in **Google Sheets** via a Google Apps Script web app — no SQL database.

## Role
You are a full-stack developer building and deploying this app on GitHub.

## Tech Stack

### Frontend
- Framework: React 18 + TypeScript (Vite)
- Styling: Tailwind CSS
- State: local `useState` per page (Zustand installed but not used yet)
- HTTP: fetch via `frontend/src/lib/api.ts` → backend → Google Sheets

### Backend
- Runtime: Node.js + Express + TypeScript
- Data: Google Sheets via Apps Script (see `backend/src/sheets.ts`)
- Security: Helmet, express-rate-limit, Zod validation
- AI: Anthropic SDK (`@anthropic-ai/sdk`) + Groq fallback

### DevOps
- Frontend: Netlify (auto-deploy on push to `main`)
- Backend: Railway (auto-deploy on push to `main`)
- CI/CD: `.github/workflows/ci.yml`
- Env vars: `personal-finance-app/backend/.env` (never commit)

---

## Repository Structure (source of truth)

```
personal-finance-app/
├── apps-script.gs              ← Google Apps Script (deploy to Google Sheets)
├── frontend/
│   ├── index.html
│   ├── vite.config.ts          ← port 3000, proxy /api → localhost:5000
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx            ← React entry point
│       ├── App.tsx             ← Router (5 routes)
│       ├── index.css           ← Tailwind base + custom styles
│       ├── lib/
│       │   └── api.ts          ← ALL Sheets API calls; scriptUrl in localStorage
│       ├── components/
│       │   ├── Layout.tsx      ← Sidebar nav + responsive drawer
│       │   ├── AIChat.tsx      ← STUB (returns null) — not yet wired to backend
│       │   └── ExportButtons.tsx ← STUB (returns null) — not yet wired to backend
│       └── pages/
│           ├── Dashboard.tsx   ← Market ticker, stats cards, cash flow + pie charts
│           ├── Transactions.tsx← Income/expense CRUD, multi-currency, inline edit
│           ├── Investments.tsx ← Stocks/MF/Crypto/FD portfolio, live NSE prices
│           ├── Insurance.tsx   ← Policies, annual premium, freq filter, .ics reminders
│           └── Settings.tsx    ← Apps Script URL setup + embedded code guide
└── backend/
    └── src/
        ├── index.ts            ← Express setup, CORS, Helmet, rate-limit, route mounts
        ├── sheets.ts           ← Google Apps Script proxy (config.json for scriptUrl)
        └── routes/
            ├── transactions.ts ← GET / POST / DELETE /:id
            ├── investments.ts  ← GET / POST / PUT /:id / DELETE /:id
            ├── insurance.ts    ← GET / POST / DELETE /:id
            ├── dashboard.ts    ← GET / (aggregated stats + 6-month trends)
            ├── settings.ts     ← GET / PUT / (scriptUrl) + GET /test (ping)
            ├── market.ts       ← GET /price?symbol= / GET /rates (Yahoo Finance)
            ├── ai.ts           ← POST /chat (reads Sheets data, calls Anthropic/Groq)
            └── export.ts       ← GET /transactions.csv /investments.csv /insurance.csv /all
```

---

## Frontend Routes

| Path | Page file | Description |
|------|-----------|-------------|
| `/` | `Dashboard.tsx` | Live market ticker, summary stats, charts |
| `/transactions` | `Transactions.tsx` | Income/expense table, inline edit, currency filter |
| `/investments` | `Investments.tsx` | Portfolio with live NSE/BSE prices |
| `/insurance` | `Insurance.tsx` | Policy cards, annual view, calendar reminders |
| `/settings` | `Settings.tsx` | Apps Script URL config + embedded guide |
| `*` | redirect → `/` | |

---

## Backend API Routes

| Method | Endpoint | File | Notes |
|--------|----------|------|-------|
| GET | `/health` | `index.ts` | Health check |
| GET | `/api/v1/transactions` | `routes/transactions.ts` | |
| POST | `/api/v1/transactions` | `routes/transactions.ts` | |
| DELETE | `/api/v1/transactions/:id` | `routes/transactions.ts` | |
| GET | `/api/v1/investments` | `routes/investments.ts` | |
| POST | `/api/v1/investments` | `routes/investments.ts` | |
| PUT | `/api/v1/investments/:id` | `routes/investments.ts` | |
| DELETE | `/api/v1/investments/:id` | `routes/investments.ts` | |
| GET | `/api/v1/insurance` | `routes/insurance.ts` | |
| POST | `/api/v1/insurance` | `routes/insurance.ts` | |
| DELETE | `/api/v1/insurance/:id` | `routes/insurance.ts` | |
| GET | `/api/v1/dashboard` | `routes/dashboard.ts` | Stats + 6-month trends |
| GET | `/api/v1/settings` | `routes/settings.ts` | |
| PUT | `/api/v1/settings` | `routes/settings.ts` | Saves scriptUrl to config.json |
| GET | `/api/v1/settings/test` | `routes/settings.ts` | Pings Apps Script |
| POST | `/api/v1/ai/chat` | `routes/ai.ts` | Body: `{ message, apiKey?, provider?, model? }` |
| GET | `/api/v1/market/price` | `routes/market.ts` | Query: `?symbol=INFY.NS` |
| GET | `/api/v1/market/rates` | `routes/market.ts` | Indices + FX + Gold |
| GET | `/api/v1/export/transactions.csv` | `routes/export.ts` | |
| GET | `/api/v1/export/investments.csv` | `routes/export.ts` | |
| GET | `/api/v1/export/insurance.csv` | `routes/export.ts` | Includes annual premium column |
| GET | `/api/v1/export/all` | `routes/export.ts` | JSON with all 3 datasets |

---

## Data Flow

```
Browser (React)
  └── frontend/src/lib/api.ts          (localStorage: scriptUrl)
        └── GET /api/v1/<resource>
              └── backend/src/sheets.ts (config.json: scriptUrl)
                    └── Google Apps Script web app URL
                          └── Google Sheets tabs:
                                transactions | investments | insurance | market_rates
```

**Apps Script URL** is set by the user in Settings page → stored in:
- Frontend: `localStorage` key `apps_script_url`
- Backend: `personal-finance-app/config.json` (gitignored)

---

## Google Sheets Tabs

| Tab name | Created by | Key columns |
|----------|-----------|-------------|
| `transactions` | auto on first add | id, type, category, currency, amount, description, date |
| `investments` | auto on first add | id, name, type, symbol, units, buyPrice, amountInvested, currentValue, date |
| `insurance` | auto on first add | id, type, provider, policyNumber, premium, frequency, sumAssured, startDate, endDate, status |
| `market_rates` | `setupMarket` action | key, price, change, changePct |

Investments with type `stocks` or `mutual_fund` get a live `GOOGLEFINANCE` formula in `currentValue`.

---

## Environment Variables

`personal-finance-app/backend/.env`:
```
JWT_SECRET=your-random-secret-key
NODE_ENV=development
CLIENT_URL=http://localhost:5173
PORT=5000
ANTHROPIC_API_KEY=sk-ant-...     # optional — can also pass per-request in POST /ai/chat
```

Set same vars in Railway dashboard for production. No DATABASE_URL needed.

---

## Key Implementation Notes

### Insurance page (`Insurance.tsx`)
- `toAnnual(premium, frequency)` — converts monthly (×12) / quarterly (×4) to yearly
- `nextDueDate(policy)` — calculates next payment date by stepping from startDate
- `downloadICS(policy)` — generates `.ics` calendar file with 7-day + 3-day VALARM alerts
- Frequency filter tabs: All / Monthly / Quarterly / Yearly
- Upcoming payments banner shows policies due within 7 days

### Transactions page (`Transactions.tsx`)
- `normCur(t)` — falls back to `'QAR'` for rows with missing currency
- Edit form uses `editFormRef` + `scrollIntoView` so it scrolls into view on open
- Inline currency edit (click currency badge) separate from full row edit (✎ button)

### Investments page (`Investments.tsx`)
- NSE stock picker with live price lookup via `/api/v1/market/price`
- `buildFormula()` in `apps-script.gs` stamps `GOOGLEFINANCE` formulas for stocks/MF
- `fixAllFormulas()` in Apps Script fixes all existing rows; also runs `onOpen`

### Dashboard (`Dashboard.tsx`)
- Market ticker polls `/api/v1/market/rates` (Google Finance via Apps Script)
- 6-month cash flow chart uses Recharts `BarChart`
- Expense breakdown uses Recharts `PieChart`

### AI Chat (`routes/ai.ts`)
- Reads live data from Google Sheets via `getRows()`
- API key: pass `apiKey` in request body OR set `ANTHROPIC_API_KEY` env var
- Supports `provider: 'anthropic'` (default) or `provider: 'groq'`
- Frontend `AIChat.tsx` component exists but currently returns null — needs wiring up

### Export (`routes/export.ts`)
- All 4 endpoints read from Google Sheets via `getRows()`
- Insurance CSV includes computed `Annual Premium` column
- Frontend `ExportButtons.tsx` exists but currently returns null — needs wiring up

---

## Disabled / TODO Features

| Feature | Status | What's needed |
|---------|--------|---------------|
| AI Chat UI | `AIChat.tsx` returns null | Wire up to `POST /api/v1/ai/chat`; add API key input to Settings |
| Export buttons UI | `ExportButtons.tsx` returns null | Wire up to `/api/v1/export/*.csv` endpoints |
| Splitwise / Split expenses | Not started | New `splits` Google Sheet tab; share sheet with friends |
| User auth (JWT) | Deps installed, not implemented | `bcryptjs`, `jsonwebtoken` in package.json |

---

## Coding Guidelines
- TypeScript only — no `.js` files in `src/`
- REST versioning: `/api/v1/...`
- Validate all inputs: Zod on backend, HTML `required` + type on frontend
- Never expose secrets in client-side code
- Always prefer free APIs (Yahoo Finance, Groq free tier, etc.)

## Privacy
- No third-party analytics (no GA, no Mixpanel)
- Sensitive fields (policy numbers, etc.) stored only in user's own Google Sheet
- No third-party tracking scripts

## Deployment
- `main` branch → auto-deploy (Netlify + Railway)
- `dev` branch → CI build/test only
- Never commit `.env`, `config.json`, or `*.db`

## Notes
- Insurance module targets Indian market (LIC, HDFC ERGO, Star Health, etc.)
- Apps Script URL must be configured by user in Settings on first run
- `node-fetch` v2 (CommonJS) used in `sheets.ts` — do not upgrade to v3 (ESM only)
