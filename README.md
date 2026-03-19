# MyFinance — Personal Finance App

A full-stack personal finance application to track income, expenses, investments, and insurance — all in one place, powered by Google Sheets as the database.

## Features

- **Authentication** — Secure sign up / login with JWT
- **Dashboard** — Financial summary at a glance
- **Finance Tracker** — Track income, expenses, and budgets
- **Investment Portfolio** — Stocks, mutual funds, crypto, and more
- **Insurance Manager** — Health, life, vehicle, home policies
- **Reports & Analytics** — Charts and insights on your finances

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Backend | Node.js + Express + TypeScript |
| Auth | JWT |
| Database | Google Sheets (via Google Apps Script) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| CI/CD | GitHub Actions |

## Project Structure

```
/
├── personal-finance-app/
│   ├── frontend/        # React app (Vite + Tailwind)
│   ├── backend/         # Express API server
│   └── apps-script.gs   # Google Apps Script (Sheets backend)
├── .github/
│   └── workflows/
│       └── ci.yml       # CI/CD pipeline
└── README.md
```

## How It Works

```
Mobile Browser → Vercel (React) → Render (Express) → Google Apps Script → Google Sheets
```

Your Google Sheet acts as the database. No external database service required.

## Getting Started

### 1. Set Up Google Sheets

1. Create a new Google Sheet
2. Go to **Extensions → Apps Script**
3. Paste the contents of `personal-finance-app/apps-script.gs`
4. Click **Deploy → New Deployment**
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
5. Copy the **Web App URL**

### 2. Configure Environment Variables

Create a `.env` file in `personal-finance-app/backend/`:

```env
JWT_SECRET=your-random-secret-key
NODE_ENV=development
```

### 3. Run Locally

```bash
# Backend
cd personal-finance-app/backend
npm install
npm run dev

# Frontend (new terminal)
cd personal-finance-app/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:3000`.

### 4. Connect Google Sheets

Open the app → go to **Settings** → paste your Apps Script Web App URL.

## Deployment

Push to `dev` → CI builds and tests only.
Push to `main` → CI builds, then auto-deploys to Vercel + Render.

### Required GitHub Secrets

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VITE_API_URL          # your Render backend URL
RENDER_DEPLOY_HOOK_URL
```

## Privacy

- Passwords hashed with bcrypt
- JWT-based authentication
- No third-party analytics or tracking
- All financial data stays in your own Google Sheet

## License

MIT
