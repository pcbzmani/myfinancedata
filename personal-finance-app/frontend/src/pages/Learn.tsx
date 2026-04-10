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
      <div key={key++} className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-600">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left font-semibold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-600 first:rounded-tl-xl last:rounded-tr-xl">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/60'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-slate-800 dark:text-slate-100 border-t border-slate-100 dark:border-slate-700">{cell.trim()}</td>
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Finance Learning</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Understand markets, investing & money — at your own pace</p>
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
