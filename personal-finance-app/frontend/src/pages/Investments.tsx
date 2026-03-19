import { useEffect, useState } from 'react';
import { getRows, addRow, deleteRow } from '../lib/api';

const TYPES = ['stocks', 'mutual_fund', 'crypto', 'fd', 'ppf', 'other'];
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  stocks:      { label: 'Stocks',       color: 'text-blue-700',   bg: 'bg-blue-100' },
  mutual_fund: { label: 'Mutual Fund',  color: 'text-violet-700', bg: 'bg-violet-100' },
  crypto:      { label: 'Crypto',       color: 'text-amber-700',  bg: 'bg-amber-100' },
  fd:          { label: 'FD',           color: 'text-emerald-700',bg: 'bg-emerald-100' },
  ppf:         { label: 'PPF',          color: 'text-teal-700',   bg: 'bg-teal-100' },
  other:       { label: 'Other',        color: 'text-slate-600',  bg: 'bg-slate-100' },
};
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY = { type: 'stocks', name: '', amountInvested: '', currentValue: '', units: '', buyPrice: '' };

export default function Investments() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => getRows('investments').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addRow('investments', {
        id: crypto.randomUUID(),
        ...form,
        amountInvested: Number(form.amountInvested),
        currentValue: Number(form.currentValue),
        units: form.units ? Number(form.units) : '',
        buyPrice: form.buyPrice ? Number(form.buyPrice) : '',
      });
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteRow('investments', id); load(); }
    catch (e: any) { setError(e.message); }
  };

  const totalInvested = items.reduce((s, i) => s + Number(i.amountInvested), 0);
  const totalCurrent = items.reduce((s, i) => s + Number(i.currentValue), 0);
  const gain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((gain / totalInvested) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Investments</h1>
          <p className="text-sm text-slate-400 mt-0.5">Stocks, mutual funds, crypto &amp; more</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Add Investment
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Invested</p>
          <p className="text-2xl font-bold text-slate-700 mt-1.5">{fmt(totalInvested)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current Value</p>
          <p className="text-2xl font-bold text-blue-600 mt-1.5">{fmt(totalCurrent)}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-5 ${gain >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total P&amp;L</p>
          <p className={`text-2xl font-bold mt-1.5 ${gain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {gain >= 0 ? '+' : ''}{fmt(gain)}
          </p>
          <p className={`text-xs mt-1 ${gain >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{gainPct}% return</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Add Investment</h3>
          </div>
          <form onSubmit={handleAdd} className="p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Name</label>
              <input
                placeholder="e.g. HDFC Mid Cap Fund"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount Invested (₹)</label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amountInvested}
                onChange={e => setForm({ ...form, amountInvested: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Value (₹)</label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.currentValue}
                onChange={e => setForm({ ...form, currentValue: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Units (optional)</label>
              <input
                type="number" min="0" step="any" placeholder="—"
                value={form.units}
                onChange={e => setForm({ ...form, units: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Buy Price per Unit (optional)</label>
              <input
                type="number" min="0" step="0.01" placeholder="—"
                value={form.buyPrice}
                onChange={e => setForm({ ...form, buyPrice: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); }} className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Investment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cards */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-slate-500 font-medium">No investments yet</p>
          <p className="text-sm text-slate-400 mt-1">Click "Add Investment" to track your portfolio</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(inv => {
            const g = Number(inv.currentValue) - Number(inv.amountInvested);
            const gPct = Number(inv.amountInvested) > 0 ? ((g / Number(inv.amountInvested)) * 100).toFixed(1) : '0.0';
            const meta = TYPE_META[inv.type] || TYPE_META.other;
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                  <button
                    onClick={() => handleDelete(inv.id)}
                    className="text-slate-200 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-lg font-bold"
                  >×</button>
                </div>
                <p className="font-semibold text-slate-800 text-base mb-4">{inv.name}</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-400">Invested</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{fmt(Number(inv.amountInvested))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Current</p>
                    <p className="font-semibold text-blue-600 mt-0.5">{fmt(Number(inv.currentValue))}</p>
                  </div>
                </div>
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${g >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                  <span>{g >= 0 ? '▲' : '▼'} P&amp;L</span>
                  <span>{g >= 0 ? '+' : ''}{fmt(g)} ({gPct}%)</span>
                </div>
                {inv.units && (
                  <p className="text-xs text-slate-400 mt-2">{inv.units} units {inv.buyPrice ? `@ ₹${Number(inv.buyPrice).toLocaleString('en-IN')}` : ''}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
