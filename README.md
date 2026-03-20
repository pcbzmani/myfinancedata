# MyFinance — Personal Finance App

A mobile-friendly personal finance app to track income, expenses, investments, and insurance — all powered by Google Sheets as the database. No paid database or hosting required.

## Features

- **Dashboard** — Financial summary with cash flow chart and expense breakdown
- **Transactions** — Track income and expenses by category
- **Investment Portfolio** — Stocks, mutual funds, crypto, FD, PPF with live market prices (NSE/BSE/US)
- **Insurance Manager** — Health, life, vehicle, home, term policies
- **Mobile-ready** — Bottom tab bar on phones, sidebar on desktop

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | Google Sheets (via Google Apps Script) |
| Market Prices | Yahoo Finance (via corsproxy.io — no API key needed) |
| Frontend Hosting | **Netlify** |
| Backend Hosting | **Railway** (optional — only needed if you extend the AI features) |
| CI/CD | GitHub Actions |

## How It Works

```
Browser  →  Netlify (React app)  →  Google Apps Script  →  Google Sheets
                    ↓
             corsproxy.io  →  Yahoo Finance  (live stock/MF prices)
```

Your Google Sheet is the database. No external database service is needed.

---

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Set up Google Sheets

1. Create a new Google Sheet
2. Go to **Extensions → Apps Script**
3. Paste the contents of `personal-finance-app/apps-script.gs`
4. Click **Deploy → New Deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the **Web App URL** — you'll paste it in the app's Settings page

### 3. Run the frontend

```bash
cd personal-finance-app/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. (Optional) Run the backend

Only needed if you use the AI assistant or extend server-side features.

```bash
cd personal-finance-app/backend
npm install
npm run dev
```

Backend runs at `http://localhost:5000`. The Vite dev server already proxies `/api` to it.

### 5. Connect your Google Sheet

Open the app → go to **Settings** → paste your Apps Script Web App URL → Save.

---

## Deploying to Netlify

### Step 1 — Push your code to GitHub

Make sure your code is on GitHub (the `main` branch is what Netlify deploys).

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### Step 2 — Create a Netlify site

1. Go to [netlify.com](https://netlify.com) and log in
2. Click **Add new site → Import an existing project**
3. Choose **GitHub** and select your repository

### Step 3 — Configure build settings

In the Netlify site setup screen, set:

| Setting | Value |
|---|---|
| Base directory | `personal-finance-app/frontend` |
| Build command | `npm run build` |
| Publish directory | `personal-finance-app/frontend/dist` |

### Step 4 — Deploy

Click **Deploy site**. Netlify will build and deploy automatically.

Once deployed, open your live URL → go to **Settings** → paste your Google Apps Script Web App URL → Save.

That's it. The app is fully working — no backend deployment needed for core features.

---

## Setting Up Live Stock & Mutual Fund Prices

No setup required. When you add a stock or mutual fund in the **Investments** tab, enter the **Yahoo Finance symbol** and click **Fetch Price**.

| Market | Symbol format | Example |
|---|---|---|
| NSE (India) | `SYMBOL.NS` | `RELIANCE.NS`, `TCS.NS`, `INFY.NS` |
| BSE (India) | `SYMBOL.BO` | `500325.BO` |
| US stocks | `SYMBOL` | `AAPL`, `MSFT`, `TSLA` |
| Indian MFs | Yahoo MF code | Search on finance.yahoo.com |

The app fetches prices via **corsproxy.io → Yahoo Finance** directly in the browser. No API key or backend needed.

---

## Continuous Deployment (GitHub Actions)

The included CI/CD pipeline (`.github/workflows/ci.yml`) runs on every push:

- **`dev` branch** — runs build and type-check only
- **`main` branch** — runs build, then Netlify deploys automatically via its GitHub integration

No extra GitHub secrets are needed for Netlify if you connect via the Netlify GitHub integration (recommended). Netlify detects pushes to `main` and redeploys automatically.

---

## Project Structure

```
/
├── personal-finance-app/
│   ├── frontend/              # React + Vite app
│   │   └── src/
│   │       ├── components/    # Layout, navigation
│   │       ├── pages/         # Dashboard, Transactions, Investments, Insurance, Settings
│   │       └── lib/api.ts     # Google Sheets + Yahoo Finance API calls
│   ├── backend/               # Express API (optional — for AI features)
│   │   └── src/
│   │       ├── routes/        # transactions, investments, insurance, market, ai
│   │       └── sheets.ts      # Google Sheets client
│   └── apps-script.gs         # Google Apps Script (deploy this to your Sheet)
├── .github/
│   └── workflows/
│       └── ci.yml
└── README.md
```

## Privacy

- No third-party analytics or tracking scripts
- All financial data stays in **your own** Google Sheet
- Passwords hashed with bcrypt (if auth is enabled)
- Market price lookups go through corsproxy.io (only the stock symbol is sent — no personal data)

## License

MIT
