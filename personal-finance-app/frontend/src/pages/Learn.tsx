import { useState } from 'react';

interface Topic {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  content: string;
  tags: string[];
}

interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  topics: Topic[];
}

const CATEGORIES: Category[] = [
  {
    id: 'trading',
    label: 'Trading & Charts',
    emoji: '📊',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700',
    topics: [
      {
        id: 'candlestick',
        title: 'Candlestick Patterns',
        emoji: '🕯️',
        summary: 'Read price action through candle shapes — the language of the market.',
        tags: ['Charts', 'Technical Analysis'],
        content: `## What is a Candlestick?
Each candle represents price movement over a time period (1 min, 1 day, 1 week, etc.).

**Parts of a candle:**
- **Body** — range between Open and Close price
- **Wick (shadow)** — the High and Low tails extending from the body
- 🟢 **Green/White** = Close > Open (bullish)
- 🔴 **Red/Black** = Close < Open (bearish)

---

## Key Patterns

### 🌟 Bullish Patterns (potential upward reversal)

**Hammer** 🔨
Small body at the top, long lower wick (2–3× the body). Shows sellers pushed price down but buyers recovered it. Strong reversal signal at the bottom of a downtrend.

**Bullish Engulfing**
A large green candle completely "engulfs" the previous red candle. Strong buying pressure overpowering sellers.

**Morning Star** ⭐
Three-candle pattern: big red → small doji/star → big green. Indicates a bottom reversal.

**Doji at Support**
Almost equal open and close — indecision. At a support level, often precedes a bounce.

---

### 🔻 Bearish Patterns (potential downward reversal)

**Shooting Star** 🌠
Small body at the bottom, long upper wick. Buyers pushed price up but sellers rejected it. Appears at tops.

**Bearish Engulfing**
A large red candle swallows the previous green candle. Sellers overpowering buyers.

**Evening Star**
Three-candle pattern: big green → small star → big red. Indicates a top reversal.

**Hanging Man**
Same shape as Hammer but appears at a top — bearish warning signal.

---

## 💡 Golden Rules
1. **Always look for confirmation** — one candle is never enough. Wait for the next candle to confirm.
2. **Context matters** — patterns at key support/resistance levels are far more reliable.
3. **Volume confirms** — a breakout candle with high volume is much stronger than without.
4. **Timeframe matters** — a pattern on a weekly chart is stronger than on a 5-minute chart.`,
      },
      {
        id: 'support-resistance',
        title: 'Support & Resistance',
        emoji: '🧱',
        summary: 'Price levels where buyers and sellers consistently clash.',
        tags: ['Charts', 'Technical Analysis'],
        content: `## What Are Support & Resistance?

**Support** is a price level where demand is strong enough to stop a falling price.
**Resistance** is a price level where supply is strong enough to stop a rising price.

Think of it as a floor (support) and a ceiling (resistance).

---

## How to Identify Them
- **Previous highs and lows** — price tends to remember these levels
- **Round numbers** — ₹1000, ₹500, $50, $100 act as psychological levels
- **Moving averages** — the 50-day or 200-day MA often act as dynamic support/resistance
- **Volume profile** — heavy trading activity at certain prices creates strong levels

---

## Role Reversal
Once broken, **resistance becomes support** and vice versa. This is called a "flip". A breakout above resistance with high volume that then holds as support is a very bullish sign.

---

## 💡 Tips
- **More touches = stronger level.** A level tested 4 times is stronger than one tested once.
- **Wider time-frame, more important.** Weekly chart levels > Daily > Hourly.
- **Don't be too precise.** Support/resistance is a zone, not an exact price.`,
      },
      {
        id: 'moving-averages',
        title: 'Moving Averages',
        emoji: '📈',
        summary: 'Smooth out noise and identify the trend direction easily.',
        tags: ['Charts', 'Technical Analysis', 'Indicators'],
        content: `## What is a Moving Average?
A moving average (MA) averages price over N periods to smooth out short-term noise and reveal the underlying trend.

---

## Types

**Simple Moving Average (SMA)**
Plain average of the last N closing prices. Slower to react.
- 50-day SMA — medium-term trend
- 200-day SMA — long-term trend

**Exponential Moving Average (EMA)**
Gives more weight to recent prices, so it reacts faster to price changes. Popular choices: 9 EMA, 20 EMA.

---

## Golden Cross & Death Cross

🌟 **Golden Cross** — The 50-day SMA crosses *above* the 200-day SMA.
Historically a bullish signal that a long-term uptrend may be starting.

💀 **Death Cross** — The 50-day SMA crosses *below* the 200-day SMA.
Historically a bearish signal.

---

## How Traders Use MAs
- **Price above MA** = uptrend; buy the dips toward the MA.
- **Price below MA** = downtrend; sell rallies toward the MA.
- **MA acts as dynamic support/resistance.**
- **MA crossovers** signal potential trend changes.

---

## 💡 Limitation
Moving averages are *lagging* — they confirm trends, not predict them. Best used alongside other indicators.`,
      },
    ],
  },
  {
    id: 'investing',
    label: 'Investing Basics',
    emoji: '💰',
    color: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-700',
    topics: [
      {
        id: 'sip',
        title: 'SIP vs Lump Sum',
        emoji: '💸',
        summary: 'When to invest all at once vs spread it out monthly.',
        tags: ['Mutual Funds', 'Strategy'],
        content: `## SIP (Systematic Investment Plan)
Invest a fixed amount every month, regardless of market level.

**Pros:**
- Removes emotion — you invest automatically
- Rupee Cost Averaging — you buy more units when markets are cheap, fewer when expensive
- No need to "time the market"
- Great for salaried investors with monthly income

**Cons:**
- If markets consistently rise, lump sum may beat SIP
- Returns can be lower in a steadily rising market

---

## Lump Sum
Invest a large amount all at once.

**Pros:**
- Maximum time in the market if invested at a low point
- Simple — one decision

**Cons:**
- High risk if markets fall immediately after investment
- Requires timing skill or luck

---

## Which to Choose?

| Situation | Recommended |
|-----------|-------------|
| Regular monthly salary | SIP |
| Received a bonus/inheritance | Lump sum + continue SIP |
| Markets crashed significantly | Lump sum (once-in-a-while opportunity) |
| Unsure about timing | SIP always wins on peace of mind |

---

## 💡 The Rule
**"Time in the market beats timing the market."**

SIP for 20 years in a diversified equity mutual fund has historically delivered 12–15% CAGR in India.`,
      },
      {
        id: 'pe-ratio',
        title: 'P/E Ratio & Valuation',
        emoji: '🔢',
        summary: 'Know if a stock is expensive or cheap relative to earnings.',
        tags: ['Fundamental Analysis', 'Stocks'],
        content: `## What is P/E Ratio?
**Price-to-Earnings Ratio = Market Price per Share ÷ Earnings per Share (EPS)**

It tells you how much investors are willing to pay for every ₹1 of a company's earnings.

---

## Example
If Infosys trades at ₹1,500 and earned ₹60 per share last year:
**P/E = 1500 / 60 = 25**

This means investors pay ₹25 for every ₹1 of Infosys's earnings.

---

## How to Use It

| P/E Level | Interpretation |
|-----------|---------------|
| < 10 | Potentially undervalued (or in trouble) |
| 10–20 | Fairly valued (for stable companies) |
| 20–40 | Moderate growth premium |
| > 40 | High growth expected — or overvalued |

**Always compare P/E within the same industry.** IT companies trade at higher P/Es than PSU banks.

---

## Other Ratios to Know

**P/B (Price to Book)** — compares market price to book value. Banks are often valued this way.

**EV/EBITDA** — useful for capital-intensive industries.

**PEG Ratio** = P/E ÷ Growth Rate. PEG < 1 can indicate undervaluation relative to growth.

---

## 💡 Warning
A low P/E can be a value trap — the business may be declining. Always pair valuation with business quality analysis.`,
      },
      {
        id: 'diversification',
        title: 'Diversification & Asset Allocation',
        emoji: '🥧',
        summary: 'Don\'t put all your eggs in one basket — the science behind it.',
        tags: ['Portfolio', 'Strategy'],
        content: `## What is Diversification?
Spreading your investments across different assets, sectors, and geographies so that no single loss wipes out your portfolio.

---

## Asset Classes

| Asset | Risk | Return | Liquidity |
|-------|------|--------|-----------|
| Equity (Stocks/MF) | High | High (12–15% long term) | High |
| Debt (Bonds/FD) | Low | Low-Medium (6–8%) | Medium |
| Gold | Medium | Medium (8–10%) | High |
| Real Estate | Medium | Medium | Low |
| Cash (Savings) | None | Very Low (3–4%) | High |

---

## The 100-minus-age Rule
A rough thumb rule: **% in equity = 100 − your age**

- At 25 → 75% equity, 25% debt
- At 50 → 50% equity, 50% debt
- At 70 → 30% equity, 70% debt

Younger investors can take more risk because they have more time to recover.

---

## Within Equity — Diversify Further
- **Large cap** (stable, lower return) + **Mid cap** (growth) + **Small cap** (high risk/reward)
- **Sectors**: Don't put 100% in IT or 100% in finance
- **Geography**: Some international exposure (US index funds) reduces rupee risk

---

## 💡 The Correlation Concept
Assets that don't move together reduce portfolio volatility. When stocks fall, gold often rises — this is why gold is called a hedge.`,
      },
    ],
  },
  {
    id: 'fixed-income',
    label: 'Fixed Income',
    emoji: '🏦',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-700',
    topics: [
      {
        id: 'fd-rd-ppf',
        title: 'FD vs RD vs PPF',
        emoji: '🏛️',
        summary: 'Three safe savings options — understand the differences.',
        tags: ['Savings', 'Fixed Income'],
        content: `## Fixed Deposit (FD)
Deposit a lump sum with a bank/NBFC for a fixed period at a guaranteed interest rate.

- **Duration**: 7 days to 10 years
- **Interest**: 6–8% p.a. (2024 rates)
- **Tax**: Interest is fully taxable as per income slab. TDS deducted if interest > ₹40,000/year.
- **Premature withdrawal**: Allowed with a penalty (usually 0.5–1%)
- **Best for**: Parking emergency fund, short-to-medium term goals

---

## Recurring Deposit (RD)
Deposit a fixed amount every month for a chosen duration.

- **Duration**: 6 months to 10 years
- **Interest**: Similar to FD for same tenure
- **Tax**: Same as FD — fully taxable
- **Best for**: Building a corpus through monthly savings

**FD vs RD**: If you have a lump sum, FD earns more (interest compounds from day 1). If you're saving monthly, RD is the way.

---

## PPF (Public Provident Fund)
Government-backed savings scheme with one of the best risk-free returns.

- **Duration**: 15 years (extendable in 5-year blocks)
- **Interest**: ~7.1% p.a. (government-set, revised quarterly)
- **Tax**: **EEE** — Exempt on investment, Exempt on interest, Exempt on maturity. Best tax benefit available.
- **Limit**: ₹500 to ₹1.5 lakh per year
- **Partial withdrawal**: Allowed from Year 7 onwards
- **Best for**: Long-term wealth with zero tax — retirement, children's education

---

## Quick Comparison

| Feature | FD | RD | PPF |
|---------|----|----|-----|
| Investment | Lump sum | Monthly | Both |
| Returns | 6–8% | 6–8% | ~7.1% |
| Tax on interest | Taxable | Taxable | Tax-Free |
| Lock-in | Flexible | Fixed | 15 years |
| Risk | Very Low | Very Low | None (Sovereign) |`,
      },
      {
        id: 'bonds',
        title: 'Bonds & Debentures',
        emoji: '📜',
        summary: 'Lending money to governments or companies in exchange for interest.',
        tags: ['Bonds', 'Fixed Income'],
        content: `## What is a Bond?
When you buy a bond, you are **lending money** to the issuer (government or company). In return, they pay you:
- **Coupon** — periodic interest payments (usually half-yearly or yearly)
- **Face Value** — the principal returned at maturity

---

## Types of Bonds

**Government Securities (G-Secs)**
Issued by RBI on behalf of the government. Virtually zero default risk. Yield: 7–7.5% (2024).

**State Development Loans (SDLs)**
Issued by state governments. Slightly higher yield than G-Secs.

**Corporate Bonds**
Issued by companies. Higher yield than government bonds, but with credit risk.

**Tax-Free Bonds**
Issued by government enterprises (NHAI, IRFC). Interest income is fully tax-free.

**Sovereign Gold Bond (SGB)**
Government bonds denominated in grams of gold. Pay 2.5% annual interest + gain from gold price appreciation.

---

## Key Terms

**Yield to Maturity (YTM)** — the total return if you hold the bond until it matures. This is what matters, not just the coupon rate.

**Credit Rating** — AAA is the safest, D is default. Always check the rating before buying corporate bonds.

**Inverse Relationship** — When interest rates rise, bond prices fall (and vice versa). A bond bought at ₹1000 with 7% coupon becomes less attractive if new bonds offer 8%.

---

## 💡 How Indians Can Invest in Bonds
- **RBI Retail Direct** (rbiretaildirect.org.in) — buy G-Secs directly
- **Bond platforms** — GoldenPi, Wint Wealth, Groww Bonds
- **Debt mutual funds** — easier than individual bonds`,
      },
    ],
  },
  {
    id: 'taxes',
    label: 'Taxes & Planning',
    emoji: '🧾',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-700',
    topics: [
      {
        id: 'capital-gains',
        title: 'LTCG & STCG on Stocks',
        emoji: '📑',
        summary: 'How your investment profits are taxed — what you keep vs what you give.',
        tags: ['Tax', 'Stocks', 'Mutual Funds'],
        content: `## Capital Gains Tax in India (2024)

When you sell an investment at a profit, the gain is taxed. The rate depends on **how long you held it**.

---

## Equity (Stocks & Equity Mutual Funds)

| Holding Period | Type | Tax Rate |
|----------------|------|----------|
| < 12 months | Short-Term Capital Gain (STCG) | 20% |
| ≥ 12 months | Long-Term Capital Gain (LTCG) | 12.5% on gains above ₹1.25 lakh |

**LTCG Exemption**: The first ₹1.25 lakh of LTCG in a financial year is tax-free. Only gains above this are taxed at 12.5%.

---

## Debt Mutual Funds & FDs

After 2023 amendment, debt mutual funds are now taxed at your **income slab rate** regardless of holding period.

FD interest is also added to your income and taxed at slab rate.

---

## Tax Harvesting Strategy
At year end, if your LTCG is below ₹1.25 lakh, consider selling and rebuying to **reset your cost basis**. This locks in gains tax-free and lowers future tax liability.

Example:
- You hold ₹10L of equity MF with ₹1L unrealised gain
- Sell everything in March → ₹1L LTCG → tax-free (below ₹1.25L limit)
- Repurchase immediately → your new cost basis is ₹11L → lower future tax

---

## Section 80C Investments (save up to ₹46,800/year in tax)
- ELSS mutual funds (3-year lock-in, equity returns)
- PPF, NPS (Tier 1)
- Life insurance premiums
- EPF (employee contribution)
- NSC, Tax-saving FDs (5-year lock-in)`,
      },
      {
        id: '80c',
        title: 'Section 80C & Tax Saving',
        emoji: '🛡️',
        summary: 'Legally reduce your income tax by up to ₹1.5 lakh each year.',
        tags: ['Tax', 'Planning', '80C'],
        content: `## What is Section 80C?
Under Section 80C of the Income Tax Act, you can **deduct up to ₹1.5 lakh** from your taxable income by investing in specified instruments.

If you're in the 30% tax bracket: ₹1.5L × 30% = **₹46,800 saved per year.**

---

## Best 80C Options

| Instrument | Lock-in | Returns | Risk |
|-----------|---------|---------|------|
| ELSS Mutual Fund | 3 years | 12–15% | Market risk |
| PPF | 15 years | ~7.1% | None |
| NPS (Tier 1) | Till 60 | 10–12% | Low-medium |
| EPF | Till retirement | ~8.1% | None |
| Tax-saving FD | 5 years | 6–7% | None |
| NSC | 5 years | 7.7% | None |
| Life Insurance | Policy term | Varies | Low |

---

## Additional Deductions Beyond 80C

**Section 80D** — Health insurance premiums
- Self + family: up to ₹25,000 (or ₹50,000 if senior citizen)
- Parents: additional ₹25,000–₹50,000

**Section 80CCD(1B)** — NPS additional contribution
- Extra ₹50,000 deduction beyond 80C limit
- Total savings potential: ₹2 lakh

**Section 24(b)** — Home loan interest
- Up to ₹2 lakh deduction on interest for self-occupied property

**HRA** — House Rent Allowance exemption for salaried employees living in rented accommodation.

---

## New Tax Regime (2024)
The new regime has lower rates but **no deductions** (no 80C, 80D etc.).
Generally beneficial for: income < ₹7 lakh OR those with minimal investments.
Old regime better for: high 80C investments + 80D + home loan.`,
      },
    ],
  },
  {
    id: 'insurance-learn',
    label: 'Insurance',
    emoji: '🛡️',
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-700',
    topics: [
      {
        id: 'term-vs-whole',
        title: 'Term vs Whole Life Insurance',
        emoji: '💙',
        summary: 'What you actually need — and what\'s often oversold.',
        tags: ['Insurance', 'Life'],
        content: `## Term Insurance
Pure life cover for a fixed period. If you die during the term, your family gets the sum assured. No maturity benefit.

**Why it's the best for most people:**
- Very low premium (₹500–1000/month for ₹1 crore cover)
- Maximum protection for minimum cost
- Buy early (25–30 years old) for the lowest premium
- Choose 30–35 year term to cover until retirement

**How much cover?** A common rule: **10–15× your annual income.**
If you earn ₹12 lakh/year → get ₹1.5–2 crore cover.

---

## Whole Life / Endowment / Money-Back (ULIP)
Combined insurance + investment products.

**Problems:**
- Very high premiums for low cover
- Returns are poor (4–6%) — well below inflation
- High agent commissions (Year 1 premium often goes entirely to commission)
- Lock-in of 5–10 years with surrender charges

**The better approach:**
**"Buy term + invest the rest"** — buy a cheap term plan and invest the saved premium in mutual funds. You'll have more cover AND more wealth.

---

## Health Insurance
Absolutely essential — don't skip it.

- **Minimum cover**: ₹5–10 lakh for individuals; ₹15–25 lakh family floater
- **Critical illness rider**: Covers cancer, heart attack — pays a lump sum regardless of hospital bills
- Get a policy **before** you develop any conditions (pre-existing conditions may be excluded for 2–4 years)

---

## 💡 Insurance Rules
1. Insurance is for protection, not investment.
2. Never mix insurance and investment.
3. More cover is always better than less.`,
      },
    ],
  },
  {
    id: 'user-guide',
    label: 'User Guide',
    emoji: '📖',
    color: 'text-indigo-700 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-700',
    topics: [
      {
        id: 'guide-intro',
        title: 'What is PanamKasu?',
        emoji: '🪙',
        summary: 'Free, privacy-first personal finance app for Indians at home and abroad.',
        tags: ['Overview', 'User Guide'],
        content: `## Overview
**PanamKasu** (Tamil: பணம் கஸு — "money coin") is a free, privacy-first personal finance app. Everything is free — no subscriptions, no paid plans, no ads.

Your data stays in your own Google Sheets spreadsheet (or your device's local storage). The developer never sees it.

---

## What You Can Do
- Track income and expenses across multiple currencies (QAR, INR, USD, EUR, AED + custom)
- Monitor investments — stocks, mutual funds, FDs, crypto, gold, and more
- Manage insurance policies with renewal reminders and calendar exports
- Track subscriptions and see your monthly burn rate
- Store passwords securely in a PIN-encrypted vault
- Split group expenses with friends via SplitIt
- Get AI-powered financial health reports (2 free per day)
- File your ITR with the built-in tax assistant

---

## App URL
**https://panamkasu.netlify.app** — works on any browser. Install as a PWA:
- **Android (Chrome):** tap ⋮ → Add to Home Screen
- **iOS (Safari):** tap Share → Add to Home Screen`,
      },
      {
        id: 'guide-setup',
        title: 'First-Time Setup',
        emoji: '🚀',
        summary: 'Connect your Google Sheet in 3 steps — or skip it and use local mode.',
        tags: ['Setup', 'Google Sheets', 'User Guide'],
        content: `## Step 1: Open the App
Go to **https://panamkasu.netlify.app** on any browser — mobile or desktop.

---

## Step 2: Create Your Google Sheet (Optional)
1. Open sheets.google.com → create a new blank spreadsheet
2. Go to **Extensions → Apps Script**
3. Delete any existing code and paste the script from **Settings → Copy Code**
4. Click **Deploy → New Deployment → Web App**
5. Set **Execute as:** Me · **Who has access:** Anyone
6. Click Deploy and copy the Web App URL

**Mobile tip:** Open sheets.google.com in Chrome → tap ⋮ → Desktop site. The Extensions menu only appears in desktop mode.

---

## Step 3: Connect
1. In PanamKasu go to **Settings**
2. Paste the Web App URL in the Apps Script URL field
3. Click **Test Connection** — a green message means you're ready!

---

## No Google Sheet?
PanamKasu works fully offline using your browser's local storage — just skip the Google Sheets setup. Your data stays on your device. You can download a backup anytime from Settings.`,
      },
      {
        id: 'guide-dashboard',
        title: 'Dashboard',
        emoji: '📊',
        summary: 'Live market ticker, monthly cash flow, savings rate, and quick links.',
        tags: ['Dashboard', 'User Guide'],
        content: `## Live Market Ticker
Two scrolling rows at the top show live data updated every few minutes:
- **Row 1:** Nifty 50, Bank Nifty, Nasdaq 100, S&P 500, SSE, Hang Seng, Nikkei 225, KOSPI
- **Row 2:** USD/INR, QAR/INR, Gold (₹/g), Gold (QAR/g)

---

## Month Picker
Use the **← →** arrows to navigate between months. Tap **Today** to jump back. You can go back up to 24 months.

---

## Summary Cards
For each currency you've used, you see Income, Expenses, and Net Savings. A **Savings Rate badge** shows your percentage:
- 🟢 **≥ 20%** — great!
- 🟡 **0–19%** — room to improve
- 🔴 **Negative** — spending more than earning

---

## Cash Flow Chart
Choose your view:
- **Period:** 1M, 3M, 6M, or 12M
- **Type:** Area (cumulative), Line (monthly trend), or Bar (month-by-month)
- **Currency:** single currency or view all

---

## Other Dashboard Features
- **Expense Pie Chart** — spending breakdown by category for the selected month
- **Recent Transactions** — last 6 entries with a View All link
- **Quick Links** — shortcuts to Investments, Insurance, Subscriptions, Vault
- **Carry-Forward Banner** — if you had a surplus last month, tap Add Carry-Forward to log it as opening income this month`,
      },
      {
        id: 'guide-transactions',
        title: 'Transactions',
        emoji: '💸',
        summary: 'Log income and expenses in any currency, filter, edit, and convert.',
        tags: ['Transactions', 'User Guide'],
        content: `## Adding a Transaction
Tap **+ Add** and fill in:

| Field | Details |
|-------|---------|
| Type | Income ↑ or Expense ↓ |
| Category | Choose from the list or type a new one |
| Amount | The transaction amount |
| Currency | QAR, INR, USD, EUR, GBP, AED, SAR, or custom |
| Date | Defaults to today |
| Description | Optional note |

---

## Filtering
- **Date range:** This Month, Last Month, This Year, Custom
- **Type:** All / Income / Expense
- **Currency tabs:** click to see only that currency's transactions
- **Search bar:** filter by category or description

---

## Editing & Deleting
- **✎ Pencil icon** — edit all fields inline
- **Currency badge** on a row — click it to quickly change just the currency
- **🗑 Trash icon** — delete the transaction

---

## Custom Categories
Type a new category name while adding a transaction — it saves automatically and appears in the dropdown next time.

---

## Currency Conversion View
If you have transactions in multiple currencies, a **Convert** toggle appears. Switch between original currencies or convert all to QAR, INR, or USD using live FX rates.`,
      },
      {
        id: 'guide-investments',
        title: 'Investments',
        emoji: '📈',
        summary: 'Track your full portfolio — stocks, MF, FD, crypto, gold, land, and more.',
        tags: ['Investments', 'Portfolio', 'User Guide'],
        content: `## Investment Types Supported

| Type | Notes |
|------|-------|
| Stocks | NSE/BSE listed; autocomplete for 50+ popular symbols |
| Mutual Funds | SIP or lump sum; autocomplete available |
| Crypto | Manual entry |
| Fixed Deposit (FD) | Maturity date + interest rate tracking |
| Recurring Deposit (RD) | Monthly contribution tracking |
| Bonds | Coupon rate + maturity |
| PPF / EPF | Long-term provident funds |
| Gold | By weight (grams) |
| Land | Custom property fields |
| Other | Anything else |

---

## Portfolio View
Each investment card shows:
- **Current value** vs **Amount invested**
- **P&L** in absolute amount and percentage
- **Green / Red** coloring for gain / loss
- **Maturity badge** for time-bound instruments (FD, RD, bonds)

---

## Portfolio Summary
At the top: total invested, total current value, overall P&L, and a breakdown by investment type.

---

## Live Prices
For stocks and mutual funds with a symbol, current value is pulled via GOOGLEFINANCE formulas in your spreadsheet — updated automatically by Google.`,
      },
      {
        id: 'guide-insurance',
        title: 'Insurance',
        emoji: '🛡️',
        summary: 'Manage policies, auto-calculate due dates, and export .ics reminders.',
        tags: ['Insurance', 'User Guide'],
        content: `## Adding a Policy
Tap **+ Add Policy** and fill in:

| Field | Options |
|-------|---------|
| Type | 🏥 Health, 💙 Life, 🚗 Vehicle, 🏠 Home, 📋 Term |
| Provider | e.g. LIC, HDFC ERGO, Star Health |
| Premium | Amount paid per period |
| Frequency | Monthly, Quarterly, Half-Yearly, Yearly, or Custom |
| Sum Assured | Coverage amount |
| Start Date | When coverage began |
| End Date | When policy expires |
| Status | Active, Expired, or Lapsed |

---

## Policy Cards
Each card shows:
- Next payment due date (auto-calculated from start date + frequency)
- Annual premium equivalent so you can compare across frequencies
- Days until next payment

---

## Calendar Reminders
Tap **📅 Download Calendar** on any policy to get a **.ics** file with:
- A reminder on the payment due date
- A 7-day advance alert
- A 3-day advance alert

Import into Google Calendar, Apple Calendar, or Outlook — never miss a renewal again.

---

## Upcoming Payments Banner
A banner at the top shows any policies due within the next 7 days.

---

## Frequency Filter
Use the tabs (All / Monthly / Quarterly / Yearly) to view policies grouped by payment frequency.`,
      },
      {
        id: 'guide-subscriptions',
        title: 'Subscriptions',
        emoji: '🔁',
        summary: 'Track recurring services, see your monthly burn rate, and pause instead of delete.',
        tags: ['Subscriptions', 'User Guide'],
        content: `## Adding a Subscription

| Field | Notes |
|-------|-------|
| Name | e.g. Netflix, GitHub Copilot, Notion |
| Category | ⚡ Productivity, 🎬 Entertainment, 🔧 Tools, ☁️ Cloud, 🤖 AI, 📦 Other |
| Cost | Per-period amount |
| Frequency | Monthly, Quarterly, Half-Yearly, Yearly, Custom, One-Time |
| Currency | QAR, INR, USD, EUR, GBP |
| Start Date | When subscription began |
| Status | Active, Paused, or Cancelled |

---

## Subscription Cards
Each card shows:
- Monthly cost equivalent (a ₹2,000/year plan shows as ₹167/month)
- Next renewal date
- Status pill — green = Active, amber = Paused, red = Cancelled

---

## Summary
- Total active subscriptions count
- Combined monthly cost across all active subscriptions
- Annual forecast

---

## Tip: Pause, Don't Delete
Pause a subscription instead of deleting it. When you resume a seasonal service, your full history stays intact.`,
      },
      {
        id: 'guide-vault',
        title: 'Vault (Password Manager)',
        emoji: '🔐',
        summary: 'PIN-protected, client-side encrypted vault — passwords never leave your device.',
        tags: ['Vault', 'Security', 'User Guide'],
        content: `## First-Time Setup
1. Click **Vault** in the sidebar
2. Create a PIN (minimum 4 characters — longer is safer)
3. Confirm the PIN

Your PIN is hashed with SHA-256 locally. The hash — not the PIN itself — is what gets stored. The developer never sees your PIN or passwords.

---

## Unlocking
Enter your PIN on the lock screen. The vault stays unlocked for **12 hours**, then auto-locks.

---

## Adding a Credential

| Field | Notes |
|-------|-------|
| Category | 🏦 Banking, 💬 Social, 💼 Work, 🛒 Shopping, 🎬 Entertainment, ✉️ Email, 🔑 Other |
| Account Name | e.g. "HDFC Bank Savings", "Gmail - Work" |
| Username | Login ID or email |
| Password | Hidden by default; click 👁 to reveal |
| 2FA Type | Authenticator, SMS, or Email |
| Notes | Security questions, extra info, etc. |

---

## Password Generator
Click **Generate Password** to open the generator:
- Slide to set **length** (8–32 characters)
- Toggle **Uppercase**, **Numbers**, **Symbols**
- Click **Copy** to use it immediately

---

## Finding Credentials
- Use the **search bar** to find by name
- Use **category tabs** to filter
- Click the **👁 eye** to reveal a password
- Click **📋 copy** icons to copy username, password, or URL to clipboard`,
      },
      {
        id: 'guide-splitit',
        title: 'SplitIt — Group Expenses',
        emoji: '👥',
        summary: 'Split bills with friends, settle up, and auto-push expenses to Transactions.',
        tags: ['SplitIt', 'Group Expenses', 'User Guide'],
        content: `## Setting Up SplitIt
SplitIt uses its own separate Google Sheet. Set it up once in **Settings → SplitIt Apps Script**:
1. Create a new Google Sheet (separate from your main finance sheet)
2. Open Apps Script, paste the SplitIt script, deploy as Web App
3. Paste the Web App URL inside the SplitIt settings

---

## Creating a Group
1. Go to **Split** in the sidebar
2. Click **+ New Group**
3. Add members — include yourself using the exact same name you set in Settings → Your Name in SplitIt
4. Save

---

## Adding an Expense
1. Select a group → click **+ Add Expense**
2. Fill in: description, amount, currency, category, who paid, how to split
3. Split modes: **Equal**, **By percentage**, or **Custom amounts**
4. Save

---

## Settling Up
The **Balances** tab shows who owes whom. Mark debts as settled when someone pays you back.

---

## Auto-Import to Transactions
When you're marked as the payer in a split expense, it's automatically added to your main Transactions as an expense. Your personal cash flow stays accurate with no double-entry needed.`,
      },
      {
        id: 'guide-ai',
        title: 'AI Finance Analyst',
        emoji: '🤖',
        summary: 'Get a personalized financial health report — 2 free analyses per day.',
        tags: ['AI', 'Report', 'User Guide'],
        content: `## Free Tier
You get **2 free AI analyses per day** — no account or API key needed. Resets at midnight.

---

## Running a Report
1. Go to **AI** in the sidebar
2. Click **Analyze My Finances**
3. Wait 10–20 seconds — the AI reads your actual data and generates a personalized report

---

## What the Report Covers
- **Spending Analysis** — top expense categories, where your money actually goes
- **Savings Rate** — how you're doing vs the 20% benchmark
- **Investment Portfolio** — allocation, concentration risks, diversification check
- **Insurance Coverage** — gaps and adequacy
- **Top 5 Recommendations** — personalized, actionable next steps

---

## Custom Questions
Switch to the **Ask a Question** tab and type any finance-related question:
- "Am I saving enough for retirement?"
- "Which subscriptions should I cancel?"
- "How much emergency fund should I have?"

The AI only answers finance-related questions.

---

## When the Daily Limit is Reached
The count resets at midnight. You can support the app via UPI donation to help keep AI credits funded.`,
      },
      {
        id: 'guide-tax',
        title: 'Income Tax Assistant',
        emoji: '🧾',
        summary: 'Old vs New regime comparison, ITR form recommender, and document checklist.',
        tags: ['Tax', 'ITR', 'User Guide'],
        content: `## What It Does
- **Old vs New regime comparison** — calculates tax under both, recommends the better one
- **ITR form recommender** — tells you whether you need ITR-1, 2, 3, or 4
- **Document checklist** — personalized list of documents to gather before filing
- **Deduction calculator** — computes 80C, 80D, HRA, LTA, and other deductions

---

## Getting Started
1. Click **Tax** in the sidebar
2. Choose how to start:
   - **Upload AIS** — upload your Annual Information Statement from incometax.gov.in to auto-fill income details
   - **Guided Questions** — step-by-step questions about your income
   - **Q&A** — ask general tax questions

---

## What You'll Be Asked
- Employment type (salaried, business, freelance)
- Gross salary or business income
- Other income (rent, interest, capital gains, dividends)
- HRA details (rent paid, city)
- Deductions (80C investments, health insurance premium, home loan interest)
- Capital gains from stocks or mutual funds

---

## Key Filing Dates (FY 2025-26)

| Return Type | Due Date |
|-------------|----------|
| Non-audit individuals | 31 July 2026 |
| Tax audit cases | 31 October 2026 |
| Belated or revised | 31 December 2026 |
| Updated (ITR-U) | 31 March 2030 |

**IT Helpline:** 1800 103 0025`,
      },
      {
        id: 'guide-calculators',
        title: 'Financial Calculators',
        emoji: '🧮',
        summary: 'SIP, compound interest, loan EMI, and retirement corpus — all real-time.',
        tags: ['Calculators', 'User Guide'],
        content: `## SIP Calculator
Plan your mutual fund SIP:
- Enter **Monthly Investment**, **Expected Annual Return (%)**, and **Time Period (years)**
- See: Total invested, Estimated maturity value, Total gains

---

## Compound Interest Calculator
- Enter **Principal**, **Rate of Interest (%)**, **Time Period**, and **Compounding Frequency**
- See: Maturity amount and total interest earned

---

## Loan EMI Calculator
- Enter **Loan Amount**, **Interest Rate (%)**, and **Tenure (months)**
- See: Monthly EMI and total interest payable

---

## Retirement Calculator
- Enter **Current Age**, **Retirement Age**, **Current Savings**, **Monthly Contribution**, and **Expected Return**
- See: Projected retirement corpus and whether you're on track

All calculations update in real-time as you type.`,
      },
      {
        id: 'guide-settings',
        title: 'Settings',
        emoji: '⚙️',
        summary: 'Configure Google Sheets, SplitIt, notifications, backups, and CSV exports.',
        tags: ['Settings', 'Configuration', 'User Guide'],
        content: `## Google Sheets Connection
- **Apps Script URL** — paste your deployment URL here
- **Test Connection** — verify the link works before relying on it
- **Local mode** — if no URL is set, data is stored in IndexedDB in your browser

---

## SplitIt Configuration
- **SplitIt Apps Script Code** — copy it to set up your group expense sheet (separate Google Sheet)
- **Your Name in SplitIt** — must match exactly how you appear as a member in groups; used to auto-push expenses to Transactions

---

## Data Storage & Backup
- **Download Backup** — save a JSON backup of your local data to your device
- **Restore from Backup** — re-import a previously downloaded JSON backup

---

## CSV Export
Download your data as CSV files for tax filing, spreadsheets, or record-keeping:
- Transactions → CSV
- Investments → CSV
- Insurance → CSV (includes computed annual premium column)

---

## Notifications
Enable browser push notifications to get a reminder every 4 hours on days you haven't logged any entries.

---

## Privacy & Legal
Privacy Policy, Donation Policy, and support links are at the bottom of the Settings page — all written in plain English.`,
      },
      {
        id: 'guide-tips',
        title: 'Tips & Tricks',
        emoji: '💡',
        summary: 'Get more out of PanamKasu — carry-forward, calendar hack, PWA install, and more.',
        tags: ['Tips', 'Tricks', 'User Guide'],
        content: `## Multi-Currency Tip
Select the right currency when logging a transaction — the dashboard groups and converts automatically. Great for expats tracking QAR spending vs INR savings separately.

---

## Use Carry-Forward
At the start of each month, if you had a surplus last month, tap the **Add Carry-Forward** banner on the Dashboard. It logs the surplus as opening income so your monthly net stays accurate.

---

## Insurance Calendar Hack
Download **.ics** files for all your policies and import them into Google Calendar in one go. Set reminders to vibrate on your phone — you'll never miss a renewal.

---

## Create Custom Categories
Type a new category name while adding a transaction (e.g. "EMI", "School Fees", "Medical"). It persists automatically and appears in the dropdown every time.

---

## AI Report Before Investing
Run the AI Finance Analyst before making a major investment decision. It flags concentration risks and suggests diversification based on your actual current portfolio.

---

## Vault for OTP Seeds
Use the Vault's **Notes** field to store your authenticator OTP secret keys. If you ever lose your phone, you can recover 2FA from here.

---

## Install as PWA
- **Android (Chrome):** tap ⋮ → Add to Home Screen
- **iOS (Safari):** tap Share → Add to Home Screen

Gives you an app icon, offline access, and push notification support.`,
      },
      {
        id: 'guide-privacy',
        title: 'Privacy & Security',
        emoji: '🔒',
        summary: 'No analytics, no ads, no servers — your data stays yours.',
        tags: ['Privacy', 'Security', 'User Guide'],
        content: `## Your Financial Data
- Stored in your own Google Sheets spreadsheet — the developer has zero access
- The Apps Script runs under your Google account and executes as you
- Revoke access anytime via Google Apps Script → Deployments → Delete
- Never share your Apps Script URL — anyone with it can read your sheet

---

## Vault Passwords
- Encrypted using a SHA-256 PIN hash client-side
- Never transmitted from your device in plain text
- The developer cannot see or recover your vault contents

---

## AI Analysis
- Sends a financial summary (category totals, not individual transactions) to Claude AI
- No names, no account numbers, no raw transaction data is sent
- Your AI API key is held in browser memory only for the session — never stored anywhere

---

## Tracking & Ads
- **No analytics** — no Google Analytics, Facebook Pixel, or tracking scripts
- **No ads** — ever
- **No accounts required** — no email, no sign-up needed

---

## Deleting Everything
Clear your browser's localStorage and delete your Google Sheet — zero trace left anywhere.`,
      },
      {
        id: 'guide-support',
        title: 'Support & Feedback',
        emoji: '🆘',
        summary: 'Found a bug? Have a suggestion? Here\'s how to reach us.',
        tags: ['Support', 'Feedback', 'User Guide'],
        content: `## Found a Bug or Have a Suggestion?
- **GitHub Issues:** github.com/pcbzmani/myfinancedata/issues
- **Email:** pcbzmani@gmail.com

---

## Want to Support the App?
PanamKasu is free forever. If it saves you time and money, consider a small UPI donation (zero fees) from the **Support** section in Settings or the AI Report page. Works with GPay, PhonePe, and Paytm.

---

## About PanamKasu
- **Current version:** v2.4.0
- **Free forever, private by design**
- **Open source** — all code on GitHub at github.com/pcbzmani/myfinancedata

Built by an expat, for expats and Indians managing finances across borders.`,
      },
    ],
  },
];

function renderContent(text: string) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let key = 0;

  const flushTable = () => {
    if (tableRows.length < 2) return;
    const headers = tableRows[0];
    const body = tableRows.slice(2); // skip separator row
    elements.push(
      <div key={key++} style={{ overflowX: 'auto', margin: '16px 0', borderRadius: '10px', border: '1px solid #e2e8f0' }} className="dark-table-wrap">
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontWeight: 600,
                  borderBottom: '2px solid #e2e8f0',
                  background: 'transparent',
                  whiteSpace: 'nowrap',
                }} className="learn-th">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '10px 14px',
                    borderBottom: ri < body.length - 1 ? '1px solid #e2e8f0' : 'none',
                  }} className="learn-td">{cell.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith('|')) {
      inTable = true;
      tableRows.push(line.split('|').filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1));
      continue;
    }
    if (inTable) {
      flushTable();
    }

    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-base font-bold text-slate-900 dark:text-white mt-5 mb-2 first:mt-0">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key++} className="border-slate-200 dark:border-slate-600 my-3" />);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const txt = line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-white font-semibold">$1</strong>');
      elements.push(
        <li key={key++} className="text-sm text-slate-700 dark:text-slate-200 ml-4 mb-1 list-disc leading-relaxed"
          dangerouslySetInnerHTML={{ __html: txt }} />
      );
    } else {
      const html = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-white font-semibold">$1</strong>');
      elements.push(
        <p key={key++} className="text-sm text-slate-700 dark:text-slate-200 mb-1 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }} />
      );
    }
  }
  if (inTable) flushTable();
  return elements;
}

const LEARN_TABLE_STYLES = `
  .dark .dark-table-wrap { border-color: #334155 !important; }
  .dark .learn-th { color: #f8fafc !important; border-bottom-color: #475569 !important; }
  .dark .learn-td { color: #e2e8f0 !important; border-bottom-color: #334155 !important; }
  .dark .dark-table-wrap tr:hover td { background: #1e293b; }
  .learn-th { color: #0f172a; }
  .learn-td { color: #1e293b; }
`;

export default function Learn() {
  const [activeCat, setActiveCat] = useState<string>('trading');
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const category = CATEGORIES.find(c => c.id === activeCat) ?? CATEGORIES[0];

  const q = search.toLowerCase();
  const filteredTopics = q
    ? CATEGORIES.flatMap(c => c.topics.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      ))
    : category.topics;

  const activeCatForTopic = (topicId: string) =>
    CATEGORIES.find(c => c.topics.some(t => t.id === topicId));

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: LEARN_TABLE_STYLES }} />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Finance Learning</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Understand markets, investing & money — or browse the 📖 User Guide tab for app help</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics — e.g. candlestick, SIP, tax…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none">✕</button>
        )}
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => { setActiveCat(c.id); setOpenTopic(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                activeCat === c.id
                  ? `${c.bg} ${c.color} ${c.border}`
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
              }`}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Topic cards */}
      <div className="space-y-3">
        {search && filteredTopics.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 py-12 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No topics found for "{search}"</p>
          </div>
        )}

        {filteredTopics.map(topic => {
          const cat = search ? activeCatForTopic(topic.id) : category;
          const isOpen = openTopic === topic.id;
          return (
            <div
              key={topic.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden transition-all ${
                isOpen
                  ? `${cat?.border ?? 'border-slate-200 dark:border-slate-700'} shadow-md`
                  : 'border-slate-100 dark:border-slate-700 hover:shadow-md'
              }`}
            >
              {/* Topic header — clickable */}
              <button
                onClick={() => setOpenTopic(isOpen ? null : topic.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{topic.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{topic.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 truncate">{topic.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {topic.tags.map(tag => (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Content */}
              {isOpen && (
                <div className={`border-t ${cat?.border ?? 'border-slate-100 dark:border-slate-700'} px-5 py-5 bg-white dark:bg-slate-800`}>
                  <div className="max-w-none">
                    {renderContent(topic.content)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          📚 Content is for educational purposes only — not financial advice. Always do your own research or consult a SEBI-registered advisor before investing.
        </p>
      </div>
    </div>
  );
}
