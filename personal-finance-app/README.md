# PanamKasu — Personal Finance Tracker for India & NRI

> Free, privacy-first personal finance app for Indians at home and abroad.  
> Track expenses, investments, insurance, subscriptions, and more — all in your own Google Sheet.

[![Play Store](https://img.shields.io/badge/Android-Play%20Store-brightgreen?logo=google-play)](https://play.google.com/store/apps/details?id=app.netlify.pcbzmani.twa)
[![Live App](https://img.shields.io/badge/Web%20App-Live-violet)](https://app.netlify.pcbzmani.netlify.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What is PanamKasu?

**PanamKasu** (பணம் காசு — Tamil for "money") is a free, open-source personal finance tracker built for Indians living in India and abroad (NRI / expats in Qatar, UAE, Saudi Arabia, USA, UK, etc.).

It is the **only personal finance app** where your data lives entirely in **your own Google Sheet** — not on any third-party server. No account required, no subscription, no ads.

---

## Key Features

### 💸 Multi-Currency Expense & Income Tracker
- Log income and expenses in QAR, INR, USD, EUR, AED, GBP, and custom currencies
- Filter by currency, category, and date range
- Monthly cash flow chart and category breakdown
- Carry-forward balance across months

### 📈 Investment Portfolio Tracker
- Track stocks (NSE/BSE), mutual funds, crypto, FD, RD, PPF, EPF, gold, land, and bonds
- Live prices via GOOGLEFINANCE — no API key needed
- Unrealised P&L, portfolio allocation chart
- NSE/BSE stock picker with symbol search

### 🛡 Insurance Policy Manager
- Track LIC, HDFC ERGO, Star Health, and all insurance policies
- Annual premium view, frequency filter (monthly / quarterly / yearly)
- Download `.ics` calendar reminders with 7-day and 3-day alerts
- Upcoming renewal banner (due within 7 days)

### 🔁 Subscription Tracker
- Monthly burn rate across all recurring services
- Next renewal date with smart cycle calculation
- Pause / resume subscriptions
- Renewal alert when due within 7 days

### 🤖 AI Finance Analyst (Free)
- 2 free AI reports per day — no API key needed
- Full portfolio health report: spending analysis, savings rate, investment allocation, insurance gaps
- Top 5 personalised recommendations powered by Claude AI
- Free-form Q&A for finance questions
- Download report as PDF

### 🧮 Financial Calculators
- SIP return calculator
- Compound interest calculator
- Loan EMI calculator
- Retirement corpus calculator

### 🇮🇳 NRI Income Tax Assistant
- Guided ITR filing assistant (Old vs New regime comparison)
- AIS PDF upload to auto-fill income details from incometax.gov.in
- Live tax estimate sidebar with 80C, HRA, DTAA, NRI rules
- Personalised document checklist (IT Portal, Bank, Broker, Qatar DTAA, Identity, Property)
- PDF download of checklist

### 👥 SplitIt — Group Expense Splitter
- Split bills equally, by percentage, or custom amounts
- Auto-push paid expenses to your MyFinance transactions
- Syncs to a separate Google Sheet for group history

### 🔐 Password Vault
- PIN-protected local password manager (SHA-256, never leaves your device)
- 7 categories, strong password generator, 2FA type tracking

### 📚 Financial Literacy Hub
- Candlestick patterns guide
- SIP, mutual funds, and tax explainers
- Insurance basics

### 🔔 Smart Reminders
- Daily entry reminder push notifications (every 4 hours if no entries logged)
- Insurance and subscription renewal alerts

---

## Privacy First

| What | Where it's stored |
|------|------------------|
| Transactions, investments, insurance | Your own Google Sheet |
| Vault passwords | Your device's localStorage (SHA-256 encrypted) |
| SplitIt group data | Your own Google Sheet + localStorage |
| AI API key | Browser memory only (cleared on page close) |
| Analytics / tracking | None — zero third-party trackers |

No data is stored on PanamKasu servers. The backend acts only as a relay to Yahoo Finance (for live prices) and the AI provider (Anthropic/Groq). Your financial data never touches it.

---

## Screenshots

| Dashboard | Investments | Insurance | AI Analyst |
|-----------|-------------|-----------|------------|
| Live market ticker, cash flow chart, expense pie | Portfolio with live NSE prices | Policy cards, renewal alerts | Free daily report |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript (Railway) |
| Data | Google Sheets via Apps Script |
| AI | Anthropic Claude (Haiku) + Groq fallback |
| Deployment | Netlify (frontend) + Railway (backend) |
| Android | TWA (Trusted Web Activity) — Play Store |

---

## Quick Start

### Option A — No setup (Local Mode)
Open the app, start adding transactions. Data is saved on your device with IndexedDB.

### Option B — Google Sheets (recommended for multi-device sync)

1. Open [sheets.google.com](https://sheets.google.com) → create a new spreadsheet
2. Go to **Extensions → Apps Script**
3. Paste the script from `apps-script.gs` in this repo, click **Save**
4. Click **Deploy → New Deployment → Web App**
   - Execute as: **Me** · Who has access: **Anyone**
5. Copy the Web App URL
6. Open PanamKasu → **Settings** → paste the URL → Save

---

## Play Store Description (copy-paste ready)

> **PanamKasu — Personal Finance Tracker for India & NRI**
>
> Free personal finance tracker and expense manager for Indians at home and abroad. Track income and expenses in QAR, INR, USD, AED and 10+ currencies. Manage your investment portfolio (stocks, mutual funds, FD, crypto, gold) with live NSE/BSE prices. Track insurance policies with renewal reminders. Manage subscriptions and see your monthly burn rate. Built for NRIs in Qatar, UAE, Saudi Arabia, USA, UK and beyond.
>
> **Key features:**
> - Multi-currency expense tracker — QAR, INR, USD, AED, EUR, GBP and more
> - Investment portfolio tracker with live NSE/BSE/NASDAQ prices
> - Insurance policy manager with .ics calendar reminders
> - Subscription tracker with renewal alerts
> - Free AI Finance Analyst — 2 daily reports, no API key needed
> - NRI Income Tax Assistant — ITR guide, Old vs New regime, AIS upload
> - Group expense splitter (SplitIt) with auto sync
> - Financial calculators — SIP, EMI, compound interest, retirement corpus
> - PIN-protected local password vault
> - Personal finance education hub
>
> **Your data, your control:** All financial data is stored in your own Google Sheet — this app never stores your data on any server. No account required, no subscription, no ads, no tracking.
>
> **Keywords:** personal finance tracker India, expense manager NRI, investment portfolio tracker, budget tracker app, multi-currency expense tracker, QAR INR expense tracker, mutual fund tracker India, insurance manager app, subscription tracker, AI financial advisor free, income tax calculator India, NRI finance app, Google Sheets finance app, privacy-first finance tracker, free budget planner India

---

## Repository Structure

```
personal-finance-app/
├── apps-script.gs              ← Google Apps Script (deploy to Google Sheets)
├── frontend/
│   └── src/
│       ├── pages/              ← Dashboard, Transactions, Investments, Insurance,
│       │                          Subscriptions, Vault, Split, Settings, AIReport,
│       │                          Calculators, IncomeTax, Learn
│       ├── components/         ← Layout, AIChat, ExportButtons, WelcomeModal, ...
│       └── lib/                ← api.ts, idb.ts, notifications.ts
└── backend/
    └── src/
        ├── index.ts
        └── routes/             ← transactions, investments, insurance, dashboard,
                                   settings, market, ai, export
```

---

## Contributing

Issues and PRs welcome. Please open an issue first to discuss major changes.

---

## License

MIT — free to use, modify, and distribute.

---

*PanamKasu is built and maintained by [@pcbzmani](https://github.com/pcbzmani). Download on [Google Play](https://play.google.com/store/apps/details?id=app.netlify.pcbzmani.twa).*
