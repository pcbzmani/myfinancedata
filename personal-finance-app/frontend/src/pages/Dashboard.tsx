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
  { key: 'goldInr' as const, label: 'Gold ₹/10g',  prefix: '₹'   },
  { key: 'goldQar' as const, label: 'Gold QAR/10g', prefix: 'QAR ' },
];

function TickerCell({ label, quote, prefix = '' }: { label: string; quote: MarketQuote | null; prefix?: string }) {
  const fmtN = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return (
    <div className="flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors min-w-[110px]">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      {quote ? (
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-sm font-bold text-slate-800 whitespace-nowrap">{prefix}{fmtN(quote.price)}</span>
          <span className={`text-[10px] font-semibold whitespace-nowrap ${quote.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {quote.change >= 0 ? '+' : ''}{quote.changePct.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-xs text-slate-300 mt-0.5 block">—</span>
      )}
    </div>
  );
}
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildMonthly(txns: any[]) {
  const months: Record<string, { income: number; expense: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { income: 0, expense: 0 };
  }
  txns.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!(key in months)) return;
    if (t.type === 'income') months[key].income += Number(t.amount) || 0;
    else months[key].expense += Number(t.amount) || 0;
  });
  return Object.entries(months).map(([key, v]) => ({
    label: new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short' }),
    ...v,
  }));
}

function ArrowUpIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
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
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${iconBg}`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const initMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(initMonth);

  // Market data
  const [rates, setRates]               = useState<Rates>(EMPTY_RATES);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketTime, setMarketTime]       = useState('');

  useEffect(() => {
    Promise.all([
      getRows('transactions'),
      getRows('investments'),
      getRows('insurance'),
    ]).then(([t, inv, ins]) => {
      setTxns(t); setInvestments(inv); setInsurance(ins); setLoading(false);
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
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
      <p className="font-semibold text-amber-800 mb-1">⚠️ Cannot load data</p>
      <p className="text-sm text-amber-700 mb-3">{error}</p>
      <p className="text-sm text-amber-600">
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

  const totalIncome = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const netSavings = totalIncome - totalExpense;
  const totalInvested = investments.reduce((s, i) => s + Number(i.amountInvested || 0), 0);
  const currentPortfolio = investments.reduce((s, i) => s + Number(i.currentValue || 0), 0);
  const portfolioGain = currentPortfolio - totalInvested;
  const activePolicies = insurance.filter(i => String(i.status).toLowerCase() === 'active').length;
  const totalPremium = insurance.reduce((s, i) => s + Number(i.premium || 0), 0);
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const gainPct = totalInvested > 0 ? `${portfolioGain >= 0 ? '+' : ''}${((portfolioGain / totalInvested) * 100).toFixed(1)}%` : '—';
  const monthly = buildMonthly(txns);
  const recent = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  const pieData = Object.entries(
    monthTxns.filter(t => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0); return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">

      {/* ── Market ticker ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {marketLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
            Fetching live market data…
          </div>
        ) : (
          <>
            {/* Row 1 — Indices */}
            <div className="flex items-center overflow-x-auto scrollbar-none border-b border-slate-50 px-2 py-1">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2 flex-shrink-0">Indices</span>
              <div className="w-px h-6 bg-slate-100 mx-1 flex-shrink-0" />
              {INDICES.map(item => (
                <TickerCell key={item.key} label={item.label} quote={rates[item.key]} />
              ))}
            </div>
            {/* Row 2 — FX & Gold */}
            <div className="flex items-center overflow-x-auto scrollbar-none px-2 py-1">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2 flex-shrink-0">FX & Gold</span>
              <div className="w-px h-6 bg-slate-100 mx-1 flex-shrink-0" />
              {FX_GOLD.map(item => (
                <TickerCell key={item.key} label={item.label} quote={rates[item.key]} prefix={item.prefix} />
              ))}
              <div className="ml-auto pl-4 flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0 pr-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live · {marketTime}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{getGreeting()} 👋</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5">Financial Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
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
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
            disabled={MONTH_OPTIONS.findIndex(o => o.key === selectedMonth) >= MONTH_OPTIONS.length - 1}
          >‹</button>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm font-medium text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
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
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
            disabled={MONTH_OPTIONS.findIndex(o => o.key === selectedMonth) <= 0}
          >›</button>
          {selectedMonth !== currentMonthKey && (
            <button
              onClick={() => setSelectedMonth(currentMonthKey)}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium px-2 py-1 rounded-lg border border-violet-200 hover:bg-violet-50"
            >Today</button>
          )}
          {totalIncome > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border ${
              savingsRate >= 20 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : savingsRate >= 0 ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}>
              <span className="text-xs font-medium opacity-70 hidden sm:inline">Savings</span>
              <span>{savingsRate}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Income" value={fmt(totalIncome)} color="text-emerald-600" iconBg="bg-emerald-100" icon={<ArrowUpIcon />} />
        <StatCard label="Expenses" value={fmt(totalExpense)} color="text-rose-500" iconBg="bg-rose-100" icon={<ArrowDownIcon />} />
        <StatCard label="Net Savings" value={fmt(netSavings)} sub={netSavings >= 0 ? 'Surplus' : 'Deficit'}
          color={netSavings >= 0 ? 'text-violet-600' : 'text-rose-500'} iconBg={netSavings >= 0 ? 'bg-violet-100' : 'bg-rose-100'} icon={<WalletIcon />} />
        <StatCard label="Portfolio" value={fmt(currentPortfolio)} sub={`${gainPct} gain/loss`} color="text-blue-600" iconBg="bg-blue-100" icon={<BarChartIcon />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-5">
            <div><h2 className="font-semibold text-slate-800">Cash Flow</h2><p className="text-xs text-slate-400">Last 6 months</p></div>
            <div className="ml-auto flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-violet-500" />Income</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-rose-400" />Expense</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient>
                <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="income" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gi)" name="Income" dot={false} />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#ge)" name="Expense" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-slate-800 mb-1">Expenses by Category</h2>
          <p className="text-xs text-slate-400 mb-3">{MONTH_OPTIONS.find(o => o.key === selectedMonth)?.label ?? 'This month'}</p>
          {pieData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-300">
              <p className="text-3xl mb-2">📊</p><p className="text-sm">No expenses yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={7} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-violet-600 hover:text-violet-700 font-medium">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">💳</p><p className="text-sm text-slate-400">No transactions yet</p>
              <Link to="/transactions" className="text-xs text-violet-600 hover:underline mt-1 inline-block">Add your first →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{t.type === 'income' ? '↑' : '↓'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{t.category}</p>
                      {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Investments</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${portfolioGain >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>{gainPct}</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Invested</span><span className="font-semibold text-slate-700">{fmt(totalInvested)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Current Value</span><span className="font-semibold text-blue-600">{fmt(currentPortfolio)}</span></div>
              <div className={`flex justify-between text-sm font-semibold ${portfolioGain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                <span>P&L</span><span>{portfolioGain >= 0 ? '+' : ''}{fmt(portfolioGain)}</span>
              </div>
            </div>
            <Link to="/investments" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">View portfolio →</Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Insurance</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Active Policies</span><span className="font-semibold text-slate-700">{activePolicies}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Annual Premium</span><span className="font-semibold text-amber-600">{fmt(totalPremium)}</span></div>
            </div>
            <Link to="/insurance" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">Manage policies →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
