import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRows, getScriptUrl } from '../lib/api';

// ── Market data helpers ───────────────────────────────────────────────────────

interface MarketQuote { price: number; change: number; changePct: number; }
interface Rates {
  nifty50: MarketQuote | null; bankNifty: MarketQuote | null;
  nasdaq: MarketQuote | null;  sp500: MarketQuote | null;
  shanghai: MarketQuote | null; hangSeng: MarketQuote | null;
  nikkei: MarketQuote | null;  kospi: MarketQuote | null;
  usdInr: MarketQuote | null;  qarInr: MarketQuote | null;
  goldInr: MarketQuote | null; goldQar: MarketQuote | null;
}
const EMPTY_RATES: Rates = {
  nifty50: null, bankNifty: null, nasdaq: null, sp500: null,
  shanghai: null, hangSeng: null, nikkei: null, kospi: null,
  usdInr: null, qarInr: null, goldInr: null, goldQar: null,
};

async function fetchRates(): Promise<Rates> {
  // Always try Netlify function first (works in both local + Sheets mode)
  try {
    const r = await fetch('/api/market-rates', { signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const json = await r.json();
      const data = json.data || {};
      // Check we got real data (not all-null)
      if (Object.values(data).some(v => v !== null)) {
        return { ...EMPTY_RATES, ...data };
      }
    }
  } catch { /* fall through to Apps Script */ }

  // Fallback — Apps Script (Google Sheets mode)
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) return EMPTY_RATES;
  try {
    const r = await fetch(`${scriptUrl}?action=readMarket`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return EMPTY_RATES;
    const json = await r.json();
    return { ...EMPTY_RATES, ...(json.data || {}) };
  } catch { return EMPTY_RATES; }
}

const INDICES = [
  { key: 'nifty50'  as const, label: 'Nifty 50'   },
  { key: 'bankNifty'as const, label: 'Bank Nifty' },
  { key: 'nasdaq'   as const, label: 'Nasdaq 100' },
  { key: 'sp500'    as const, label: 'S&P 500'    },
  { key: 'shanghai' as const, label: 'SSE'         },
  { key: 'hangSeng' as const, label: 'Hang Seng'  },
  { key: 'nikkei'   as const, label: 'Nikkei 225' },
  { key: 'kospi'    as const, label: 'KOSPI'       },
];
const FX_GOLD = [
  { key: 'usdInr'  as const, label: 'USD/INR',     prefix: '₹'   },
  { key: 'qarInr'  as const, label: 'QAR/INR',     prefix: '₹'   },
  { key: 'goldInr' as const, label: 'Gold ₹/1g',  prefix: '₹'   },
  { key: 'goldQar' as const, label: 'Gold QAR/1g', prefix: 'QAR ' },
];

function TickerCell({ label, quote, prefix = '' }: { label: string; quote: MarketQuote | null; prefix?: string }) {
  const fmtN = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return (
    <div className="flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-w-[110px]">
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>
      {quote ? (
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{prefix}{fmtN(quote.price)}</span>
          <span className={`text-[10px] font-semibold whitespace-nowrap ${quote.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {quote.change >= 0 ? '+' : ''}{quote.changePct.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-xs text-slate-300 dark:text-slate-600 mt-0.5 block">—</span>
      )}
    </div>
  );
}
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, LineChart, Line,
} from 'recharts';

const PIE_COLORS = [
  '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#6366f1',
];
const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', QAR: 'QAR', USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR' };
const currSym = (code: string) => CURRENCY_SYMBOLS[code] ?? code;
const normCur = (t: any): string => (t.currency && String(t.currency).trim()) || 'QAR';
const fmt = (n: number, currency = 'INR') =>
  `${currSym(currency)} ${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildMonthly(txns: any[], period: number = 1, currency?: string) {
  const months: Record<string, { income: number; expense: number }> = {};
  const now = new Date();
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { income: 0, expense: 0 };
  }
  txns.forEach(t => {
    if (!t.date) return;
    // Only include transactions matching the selected currency (if specified)
    if (currency && normCur(t) !== currency) return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!(key in months)) return;
    if (t.type === 'income') months[key].income += Number(t.amount) || 0;
    else months[key].expense += Number(t.amount) || 0;
  });
  return Object.entries(months).map(([key, v]) => ({
    label: new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short', ...(period > 6 ? { year: '2-digit' } : {}) }),
    ...v,
  }));
}

function buildDaily(txns: any[], period: number = 1, currency?: string) {
  const days: Record<string, { income: number; expense: number }> = {};
  const now = new Date();
  const totalDays = period * 30;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days[key] = { income: 0, expense: 0 };
  }
  txns.forEach(t => {
    if (!t.date) return;
    if (currency && normCur(t) !== currency) return;
    const raw = String(t.date).split('T')[0];
    if (!(raw in days)) return;
    if (t.type === 'income') days[raw].income += Number(t.amount) || 0;
    else days[raw].expense += Number(t.amount) || 0;
  });
  return Object.entries(days).map(([key, v]) => {
    const [y, m, day] = key.split('-');
    const label = new Date(Number(y), Number(m) - 1, Number(day))
      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { label, ...v };
  });
}

function BarChartIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function StatCard({ label, value, sub, color, iconBg, icon }: {
  label: string; value: string; sub?: string; color: string; iconBg: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${iconBg}`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function buildMonthOptions() {
  const opts: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 24; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    opts.push({ key, label });
    d.setMonth(d.getMonth() - 1);
  }
  return opts;
}
const MONTH_OPTIONS = buildMonthOptions();

export default function Dashboard() {
  const [txns, setTxns] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const initMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(initMonth);
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [chartPeriod, setChartPeriod] = useState<1 | 3 | 6 | 12>(1);
  // Currency filter for the chart & savings-rate badge. `null` = not yet initialised
  // (will be set to the dominant currency once transactions load).
  const [chartCurrency, setChartCurrency] = useState<string | null>(null);

  // Market data
  const [rates, setRates]               = useState<Rates>(EMPTY_RATES);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketTime, setMarketTime]       = useState('');

  useEffect(() => {
    Promise.all([
      getRows('transactions'),
      getRows('investments'),
      getRows('insurance'),
      getRows('subscriptions'),
    ]).then(([t, inv, ins, subs]) => {
      setTxns(t); setInvestments(inv); setInsurance(ins); setSubscriptions(subs); setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    fetchRates().then(r => {
      setRates(r);
      setMarketTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setMarketLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      {/* Ticker skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 h-16" />
      {/* Heading skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-700 rounded-lg" />
          <div className="h-7 w-52 bg-slate-200 dark:bg-slate-600 rounded-lg" />
        </div>
        <div className="h-9 w-40 bg-slate-100 dark:bg-slate-700 rounded-xl" />
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700 rounded" />
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-600 rounded" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 h-72" />
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 h-72" />
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6">
      <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">⚠️ Cannot load data</p>
      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">{error}</p>
      <p className="text-sm text-amber-600 dark:text-amber-400">
        Go to <Link to="/settings" className="font-semibold underline">Settings</Link> and configure your Google Sheets URL first.
      </p>
    </div>
  );

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTxns = txns.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
  });

  // Per-currency totals for the selected month (mirrors Transactions page)
  const byCurrency = monthTxns.reduce((acc: Record<string, { income: number; expense: number }>, t) => {
    const cur = normCur(t);
    if (!acc[cur]) acc[cur] = { income: 0, expense: 0 };
    if (t.type === 'income') acc[cur].income += Number(t.amount) || 0;
    else acc[cur].expense += Number(t.amount) || 0;
    return acc;
  }, {});
  const dashSummaryRows = Object.entries(byCurrency).map(([cur, v]) => ({ cur, ...v }));

  // Dominant currency & list of currencies actually used in transactions (stable, sorted)
  const currencyCounts = txns.reduce((acc: Record<string, number>, t) => {
    const cur = normCur(t); acc[cur] = (acc[cur] || 0) + 1; return acc;
  }, {});
  const dominantCurrency = txns.length > 0
    ? (Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'QAR')
    : 'QAR';
  const availableCurrencies = Object.keys(currencyCounts).sort((a, b) =>
    (currencyCounts[b] - currencyCounts[a]) || a.localeCompare(b)
  );
  // Resolve the active chart currency — default to dominant, fall back to QAR
  const activeChartCurrency = chartCurrency && availableCurrencies.includes(chartCurrency)
    ? chartCurrency
    : dominantCurrency;

  // Savings-rate badge + chart/pie should always be scoped to a single currency,
  // otherwise mixing QAR + INR + USD produces a meaningless number.
  const currencyMonthTxns = monthTxns.filter(t => normCur(t) === activeChartCurrency);
  const totalIncome = currencyMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = currencyMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const netSavings = totalIncome - totalExpense;
  const totalInvested = investments.reduce((s, i) => s + Number(i.amountInvested || 0), 0);
  const currentPortfolio = investments.reduce((s, i) => s + Number(i.currentValue || 0), 0);
  const portfolioGain = currentPortfolio - totalInvested;
  const activePolicies = insurance.filter(i => String(i.status).toLowerCase() === 'active').length;
  // Annualised premium, per-currency. Raw `premium` values can be monthly / quarterly /
  // yearly / custom — summing them naively produces a meaningless number. We annualise
  // each premium to yearly, then group by currency so mixed-currency portfolios don't
  // get silently added together.
  const annualPremiumByCurrency = insurance.reduce((acc: Record<string, number>, i) => {
    const cur = (i.currency && String(i.currency).trim()) || 'INR';
    const freq = (i.frequency || 'yearly') as string;
    const cm = Math.max(1, Number(i.customMonths) || 1);
    const cu = (i.customUnit || 'months') as 'months' | 'days';
    const mult: Record<string, number> = { monthly: 12, quarterly: 4, 'half-yearly': 2, yearly: 1 };
    let annual = 0;
    const prem = Number(i.premium) || 0;
    if (freq === 'custom') {
      annual = cu === 'days'
        ? (cm > 0 ? prem * (365 / cm) : 0)
        : (cm > 0 ? prem * (12 / cm) : 0);
    } else {
      annual = prem * (mult[freq] ?? 1);
    }
    acc[cur] = (acc[cur] || 0) + annual;
    return acc;
  }, {});
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const gainPct = totalInvested > 0 ? `${portfolioGain >= 0 ? '+' : ''}${((portfolioGain / totalInvested) * 100).toFixed(1)}%` : '—';
  const monthly = buildMonthly(txns, chartPeriod, activeChartCurrency);
  const daily   = buildDaily(txns, chartPeriod, activeChartCurrency);
  const dailyInterval = Math.max(0, Math.floor(daily.length / 6) - 1);
  const recent = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  // Pie chart — expenses by category, scoped to the active chart currency so that
  // mixing currencies doesn't distort category sizes.
  const pieData = Object.entries(
    currencyMonthTxns.filter(t => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0); return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // skip tiny slices
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.65;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Market ticker ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {marketLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
            Fetching live market data…
          </div>
        ) : (
          <>
            {/* Row 1 — Indices */}
            <div className="flex items-center overflow-x-auto scrollbar-none border-b border-slate-50 px-2 py-1">
              <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2 flex-shrink-0">Indices</span>
              <div className="w-px h-6 bg-slate-100 dark:bg-slate-700 mx-1 flex-shrink-0" />
              {INDICES.map(item => (
                <TickerCell key={item.key} label={item.label} quote={rates[item.key]} />
              ))}
            </div>
            {/* Row 2 — FX & Gold */}
            <div className="flex items-center overflow-x-auto scrollbar-none px-2 py-1">
              <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2 flex-shrink-0">FX & Gold</span>
              <div className="w-px h-6 bg-slate-100 dark:bg-slate-700 mx-1 flex-shrink-0" />
              {FX_GOLD.map(item => (
                <TickerCell key={item.key} label={item.label} quote={rates[item.key]} prefix={item.prefix} />
              ))}
              <div className="ml-auto pl-4 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 pr-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live · {marketTime}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 dark:text-slate-500">{getGreeting()} 👋</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">Financial Overview</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Month picker */}
          <button
            onClick={() => {
              const idx = MONTH_OPTIONS.findIndex(o => o.key === selectedMonth);
              if (idx < MONTH_OPTIONS.length - 1) setSelectedMonth(MONTH_OPTIONS[idx + 1].key);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30"
            disabled={MONTH_OPTIONS.findIndex(o => o.key === selectedMonth) >= MONTH_OPTIONS.length - 1}
          >‹</button>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700"
          >
            {MONTH_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const idx = MONTH_OPTIONS.findIndex(o => o.key === selectedMonth);
              if (idx > 0) setSelectedMonth(MONTH_OPTIONS[idx - 1].key);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30"
            disabled={MONTH_OPTIONS.findIndex(o => o.key === selectedMonth) <= 0}
          >›</button>
          {selectedMonth !== currentMonthKey && (
            <button
              onClick={() => setSelectedMonth(currentMonthKey)}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium px-2 py-1 rounded-lg border border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:bg-violet-900/20"
            >Today</button>
          )}
          {totalIncome > 0 && (
            <div
              title={`Savings rate for ${activeChartCurrency} this month`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                savingsRate >= 20 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700'
                : savingsRate >= 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 text-rose-600'
              }`}
            >
              <span className="text-xs font-medium opacity-70 hidden sm:inline">Savings {availableCurrencies.length > 1 ? `(${activeChartCurrency})` : ''}</span>
              <span>{savingsRate}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashSummaryRows.length === 0 ? (
          <div className="col-span-full sm:col-span-2 lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm min-h-[96px]">
            No transactions this month
          </div>
        ) : dashSummaryRows.map(({ cur, income, expense }) => (
          <div key={cur} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-3">{cur}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><span className="text-emerald-500 text-xs">↑</span> Income</span>
                <span className="font-semibold text-emerald-600">{fmt(income, cur)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><span className="text-rose-400 text-xs">↓</span> Expenses</span>
                <span className="font-semibold text-rose-500">{fmt(expense, cur)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-slate-50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Net</span>
                <span className={`font-bold ${income - expense >= 0 ? 'text-violet-600' : 'text-rose-500'}`}>
                  {fmt(income - expense, cur)}
                </span>
              </div>
            </div>
          </div>
        ))}
        <StatCard label="Portfolio" value={fmt(currentPortfolio)} sub={`${gainPct} gain/loss`} color="text-blue-600" iconBg="bg-blue-100" icon={<BarChartIcon />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex flex-wrap items-start gap-2 mb-3">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Cash Flow</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">{chartPeriod === 1 ? 'Current month' : `Last ${chartPeriod} months`} · {activeChartCurrency}</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Currency selector — only shown when the user actually has multiple currencies */}
              {availableCurrencies.length > 1 && (
                <select
                  value={activeChartCurrency}
                  onChange={e => setChartCurrency(e.target.value)}
                  title="Chart currency"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700"
                >
                  {availableCurrencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
              {/* Period toggle */}
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs">
                {([1, 3, 6, 12] as const).map(p => (
                  <button key={p} onClick={() => setChartPeriod(p)}
                    className={`px-2.5 py-1 font-medium transition-colors ${chartPeriod === p ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {p === 1 ? '1M' : `${p}M`}
                  </button>
                ))}
              </div>
              {/* Chart type toggle */}
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs">
                {(['area', 'line', 'bar'] as const).map(ct => (
                  <button key={ct} onClick={() => setChartType(ct)}
                    className={`px-2.5 py-1 font-medium capitalize transition-colors ${chartType === ct ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {ct}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-violet-500" />Income</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-rose-400" />Expense</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {chartType === 'bar' ? (
              <BarChart data={monthly} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [fmt(v, activeChartCurrency), '']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="income" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [fmt(v, activeChartCurrency), '']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="income" stroke="#7c3aed" strokeWidth={2.5} name="Income" dot={{ r: 3, fill: '#7c3aed' }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} name="Expense" dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
              </LineChart>
            ) : (
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={dailyInterval} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [fmt(v, activeChartCurrency), '']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="income" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gi)" name="Income" dot={false} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#ge)" name="Expense" dot={false} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Expenses by Category</h2>
            {availableCurrencies.length > 1 && (
              <select
                value={activeChartCurrency}
                onChange={e => setChartCurrency(e.target.value)}
                title="Pie currency"
                className="text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700"
              >
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{MONTH_OPTIONS.find(o => o.key === selectedMonth)?.label ?? 'This month'} · {activeChartCurrency}</p>
          {pieData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
              <p className="text-3xl mb-2">📊</p><p className="text-sm">No expenses yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={40}
                  outerRadius={68}
                  dataKey="value"
                  paddingAngle={3}
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [
                    `${fmt(v, activeChartCurrency)} (${pieTotal > 0 ? ((v / pieTotal) * 100).toFixed(1) : 0}%)`,
                    ''
                  ]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={7} formatter={(v) => <span className="text-xs text-slate-600 dark:text-slate-300">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-violet-600 hover:text-violet-700 font-medium">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">💳</p><p className="text-sm text-slate-400 dark:text-slate-500">No transactions yet</p>
              <Link to="/transactions" className="text-xs text-violet-600 hover:underline mt-1 inline-block">Add your first →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-700/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{t.type === 'income' ? '↑' : '↓'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.category}</p>
                      {t.description && <p className="text-xs text-slate-400 dark:text-slate-500">{t.description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount), normCur(t))}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Investments</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${portfolioGain >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{gainPct}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-slate-400 dark:text-slate-500">Invested</span><span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(totalInvested)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400 dark:text-slate-500">Current Value</span><span className="font-semibold text-blue-600">{fmt(currentPortfolio)}</span></div>
              <div className={`flex justify-between text-sm font-semibold ${portfolioGain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                <span>P&L</span><span>{portfolioGain >= 0 ? '+' : ''}{fmt(portfolioGain)}</span>
              </div>
            </div>
            <Link to="/investments" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">View portfolio →</Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Insurance</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-slate-400 dark:text-slate-500">Active Policies</span><span className="font-semibold text-slate-700 dark:text-slate-200">{activePolicies}</span></div>
              {Object.keys(annualPremiumByCurrency).length === 0 ? (
                <div className="flex justify-between text-sm"><span className="text-slate-400 dark:text-slate-500">Annual Premium</span><span className="font-semibold text-amber-600">—</span></div>
              ) : (
                Object.entries(annualPremiumByCurrency).map(([cur, amt]) => (
                  <div key={cur} className="flex justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500">Annual Premium <span className="text-[10px] font-semibold text-slate-300">({cur})</span></span>
                    <span className="font-semibold text-amber-600">{fmt(amt as number, cur)}</span>
                  </div>
                ))
              )}
            </div>
            <Link to="/insurance" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">Manage policies →</Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Subscriptions</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500">Active</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{subscriptions.filter(s => s.status === 'active').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500">Total</span>
                <span className="font-semibold text-violet-600">{subscriptions.length} services</span>
              </div>
            </div>
            <Link to="/subscriptions" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">Manage subscriptions →</Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Password Vault</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500">Securely store and manage your credentials.</p>
            <Link to="/vault" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">Open vault →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
