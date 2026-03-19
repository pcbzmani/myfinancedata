import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
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

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>('/dashboard'),
      api.get<any[]>('/transactions'),
    ]).then(([dash, txns]) => {
      setSummary(dash.summary);
      setMonthly(dash.monthly);
      const sorted = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecent(sorted.slice(0, 6));
      const groups: Record<string, number> = {};
      txns.filter((t: any) => t.type === 'expense').forEach((t: any) => {
        groups[t.category] = (groups[t.category] || 0) + Number(t.amount);
      });
      setPieData(Object.entries(groups).map(([name, value]) => ({ name, value })));
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
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
        Please go to <Link to="/settings" className="font-semibold underline">Settings</Link> and configure your Google Sheets URL first.
      </p>
    </div>
  );

  const gainPct = summary.totalInvested > 0
    ? `${summary.portfolioGain >= 0 ? '+' : ''}${((summary.portfolioGain / summary.totalInvested) * 100).toFixed(1)}%`
    : '—';
  const savingsRate = summary.totalIncome > 0
    ? Math.round((summary.netSavings / summary.totalIncome) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{getGreeting()} 👋</p>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5">Financial Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {summary.totalIncome > 0 && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${
            savingsRate >= 20
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : savingsRate >= 0
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-rose-50 border-rose-200 text-rose-600'
          }`}>
            <span className="text-xs font-medium opacity-70">Savings Rate</span>
            <span>{savingsRate}%</span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Income" value={fmt(summary.totalIncome)}
          color="text-emerald-600" iconBg="bg-emerald-100" icon={<ArrowUpIcon />}
        />
        <StatCard
          label="Total Expenses" value={fmt(summary.totalExpense)}
          color="text-rose-500" iconBg="bg-rose-100" icon={<ArrowDownIcon />}
        />
        <StatCard
          label="Net Savings" value={fmt(summary.netSavings)}
          sub={summary.netSavings >= 0 ? 'Surplus' : 'Deficit'}
          color={summary.netSavings >= 0 ? 'text-violet-600' : 'text-rose-500'}
          iconBg={summary.netSavings >= 0 ? 'bg-violet-100' : 'bg-rose-100'}
          icon={<WalletIcon />}
        />
        <StatCard
          label="Portfolio" value={fmt(summary.currentPortfolio)}
          sub={`${gainPct} gain/loss`}
          color="text-blue-600" iconBg="bg-blue-100" icon={<BarChartIcon />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Cash Flow */}
        <div className="col-span-3 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-5">
            <div>
              <h2 className="font-semibold text-slate-800">Cash Flow</h2>
              <p className="text-xs text-slate-400">Last 6 months</p>
            </div>
            <div className="ml-auto flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-violet-500" />Income</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-rose-400" />Expense</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [fmt(v), '']}
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Area type="monotone" dataKey="income" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gi)" name="Income" dot={false} />
              <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#ge)" name="Expense" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-semibold text-slate-800 mb-1">Expenses by Category</h2>
          <p className="text-xs text-slate-400 mb-3">All time</p>
          {pieData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-300">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm">No expenses yet</p>
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

      {/* Bottom Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Recent Transactions */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-violet-600 hover:text-violet-700 font-medium">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">💳</p>
              <p className="text-sm text-slate-400">No transactions yet</p>
              <Link to="/transactions" className="text-xs text-violet-600 hover:underline mt-1 inline-block">Add your first →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '↑' : '↓'}
                      </span>
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
                    <p className="text-xs text-slate-400">
                      {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side stats */}
        <div className="col-span-2 space-y-4">
          {/* Investments */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Investments</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${summary.portfolioGain >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                {gainPct}
              </span>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invested</span>
                <span className="font-semibold text-slate-700">{fmt(summary.totalInvested)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current Value</span>
                <span className="font-semibold text-blue-600">{fmt(summary.currentPortfolio)}</span>
              </div>
              <div className={`flex justify-between text-sm font-semibold ${summary.portfolioGain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                <span>P&L</span>
                <span>{summary.portfolioGain >= 0 ? '+' : ''}{fmt(summary.portfolioGain)}</span>
              </div>
            </div>
            <Link to="/investments" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">View portfolio →</Link>
          </div>

          {/* Insurance */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Insurance</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Active Policies</span>
                <span className="font-semibold text-slate-700">{summary.activePolicies}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Annual Premium</span>
                <span className="font-semibold text-amber-600">{fmt(summary.totalPremium)}</span>
              </div>
            </div>
            <Link to="/insurance" className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block">Manage policies →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
