import { useState } from 'react';

interface Subscriber {
  email: string;
  plan: string;
  paymentId: string;
  subscribedAt: string;
  expiresAt: string | null;
  amount: number;
  active: boolean;
  daysLeft: number | null;
}

interface TokenMonth {
  inputTokens: number;
  outputTokens: number;
  calls: number;
  updatedAt: string;
}

interface AdminData {
  totalSubscribers: number;
  activeSubscribers: number;
  subscribers: Subscriber[];
  tokenUsage: Record<string, TokenMonth>;
  creditAlert: { alert: boolean; message?: string; alertedAt?: string };
}

export default function Admin() {
  const [secret, setSecret]   = useState('');
  const [data,   setData]     = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function load() {
    if (!secret.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-subscribers', {
        headers: { 'x-admin-secret': secret },
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed'); setData(null); }
      else setData(json);
    } catch (e: any) {
      setError(e.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const totalTokens = (m: TokenMonth) => (m.inputTokens + m.outputTokens).toLocaleString('en-IN');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-violet-400">MyFinance Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Subscriber dashboard & API usage</p>
        </div>

        {/* Auth */}
        {!data && (
          <div className="bg-slate-800 rounded-2xl p-6 space-y-4 max-w-md">
            <p className="text-sm text-slate-400">Enter the admin secret to view data</p>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="Admin secret…"
              className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={load}
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Loading…' : 'View Dashboard'}
            </button>
          </div>
        )}

        {data && (
          <>
            {/* Reload */}
            <div className="flex gap-3 items-center">
              <button
                onClick={load}
                disabled={loading}
                className="text-xs text-slate-400 hover:text-violet-400 transition-colors"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => { setData(null); setSecret(''); }}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                Sign out
              </button>
            </div>

            {/* Credit alert banner */}
            {data.creditAlert?.alert && (
              <div className="bg-red-900/40 border border-red-500 rounded-2xl p-4 flex gap-3 items-start">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-red-300">Anthropic API Credits Depleted</p>
                  <p className="text-sm text-red-400 mt-1">{data.creditAlert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Alerted at {fmt(data.creditAlert.alertedAt ?? null)} — renew at{' '}
                    <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
                      className="text-violet-400 underline">console.anthropic.com</a>
                  </p>
                </div>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Subscribers', value: data.totalSubscribers },
                { label: 'Active Now',         value: data.activeSubscribers },
                {
                  label: 'This Month Calls',
                  value: (() => {
                    const key = new Date().toISOString().slice(0, 7);
                    return data.tokenUsage[key]?.calls ?? 0;
                  })(),
                },
                {
                  label: 'This Month Tokens',
                  value: (() => {
                    const key = new Date().toISOString().slice(0, 7);
                    const m   = data.tokenUsage[key];
                    return m ? ((m.inputTokens + m.outputTokens) / 1000).toFixed(1) + 'K' : '0';
                  })(),
                },
              ].map(c => (
                <div key={c.label} className="bg-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-violet-400">{c.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{c.label}</p>
                </div>
              ))}
            </div>

            {/* Subscribers table */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="font-semibold">Subscribers</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left px-6 py-3">Email</th>
                      <th className="text-left px-6 py-3">Plan</th>
                      <th className="text-left px-6 py-3">Amount</th>
                      <th className="text-left px-6 py-3">Subscribed</th>
                      <th className="text-left px-6 py-3">Expires</th>
                      <th className="text-left px-6 py-3">Days Left</th>
                      <th className="text-left px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500">No subscribers yet</td>
                      </tr>
                    ) : (
                      data.subscribers.map(s => (
                        <tr key={s.paymentId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-3 text-slate-200">{s.email || '—'}</td>
                          <td className="px-6 py-3 text-slate-400 capitalize">{s.plan}</td>
                          <td className="px-6 py-3">₹{s.amount}</td>
                          <td className="px-6 py-3 text-slate-400">{fmt(s.subscribedAt)}</td>
                          <td className="px-6 py-3 text-slate-400">{fmt(s.expiresAt)}</td>
                          <td className="px-6 py-3">
                            {s.daysLeft !== null
                              ? <span className={s.daysLeft < 30 ? 'text-orange-400' : 'text-slate-300'}>{s.daysLeft}d</span>
                              : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                            }`}>
                              {s.active ? 'Active' : 'Expired'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Token usage by month */}
            <div className="bg-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="font-semibold">API Token Usage by Month</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700">
                      <th className="text-left px-6 py-3">Month</th>
                      <th className="text-left px-6 py-3">AI Calls</th>
                      <th className="text-left px-6 py-3">Input Tokens</th>
                      <th className="text-left px-6 py-3">Output Tokens</th>
                      <th className="text-left px-6 py-3">Total Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(data.tokenUsage).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500">No usage recorded yet</td>
                      </tr>
                    ) : (
                      Object.entries(data.tokenUsage)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([month, m]) => (
                          <tr key={month} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-3 font-medium">{month}</td>
                            <td className="px-6 py-3 text-slate-300">{m.calls.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-3 text-slate-400">{m.inputTokens.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-3 text-slate-400">{m.outputTokens.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-3 text-violet-400 font-medium">{totalTokens(m)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
