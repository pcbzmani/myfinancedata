import { useEffect, useState } from 'react';
import { getRows, addRow, deleteRow, updateRow } from '../lib/api';

const CATEGORIES = ['Salary', 'Freelance', 'Food', 'Transport', 'Shopping', 'Rent', 'Medical', 'Entertainment', 'Utilities', 'Other'];
const PRESET_CURRENCIES = ['QAR', 'INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', QAR: 'QAR', USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR' };

const currSym = (code: string) => CURRENCY_SYMBOLS[code] ?? code;
const fmt = (n: number, currency = 'QAR') =>
  `${currSym(currency)} ${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const normCur = (t: any): string => (t.currency && String(t.currency).trim()) || 'QAR';

const EMPTY_FORM = { type: 'expense', category: 'Food', amount: '', description: '', date: '', currency: 'QAR' };

export default function Transactions() {
  const [items, setItems]               = useState<any[]>([]);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [customCurrency, setCustomCurrency] = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [fixing, setFixing]             = useState(false);
  const [error, setError]               = useState('');
  const [typeFilter, setTypeFilter]     = useState<'all' | 'income' | 'expense'>('all');
  const [curFilter, setCurFilter]       = useState('all');
  const [editCurId, setEditCurId]       = useState<string | null>(null);
  const [editCurVal, setEditCurVal]     = useState('');
  const [editCurCustom, setEditCurCustom] = useState('');

  const load = () => getRows('transactions').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  // ── helpers ────────────────────────────────────────────────────────────────
  const missingCur = items.filter(t => !t.currency || !String(t.currency).trim());

  const handleFixMissing = async () => {
    setFixing(true);
    try {
      for (const t of missingCur) {
        await updateRow('transactions', t.id, { currency: 'QAR' });
      }
      load();
    } catch (e: any) { setError(e.message); }
    finally { setFixing(false); }
  };

  // ── add ────────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const currency = form.currency === '__custom__'
      ? (customCurrency.toUpperCase().trim() || 'QAR')
      : form.currency;
    try {
      await addRow('transactions', {
        id: crypto.randomUUID(),
        ...form,
        currency,
        amount: Number(form.amount),
        date: form.date || new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setCustomCurrency('');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try { await deleteRow('transactions', id); load(); }
    catch (e: any) { setError(e.message); }
  };

  // ── edit currency ──────────────────────────────────────────────────────────
  const startEditCur = (t: any) => {
    const cur = normCur(t);
    setEditCurId(t.id);
    setEditCurVal(PRESET_CURRENCIES.includes(cur) ? cur : '__custom__');
    setEditCurCustom(PRESET_CURRENCIES.includes(cur) ? '' : cur);
  };

  const saveEditCur = async (id: string) => {
    const currency = editCurVal === '__custom__'
      ? (editCurCustom.toUpperCase().trim() || 'QAR')
      : editCurVal;
    try {
      await updateRow('transactions', id, { currency });
      setEditCurId(null);
      load();
    } catch (e: any) { setError(e.message); }
  };

  // ── derived data ───────────────────────────────────────────────────────────
  const availableCurs = ['all', ...Array.from(new Set(items.map(normCur))).sort()];

  const filtered = items
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => curFilter === 'all' || normCur(t) === curFilter);

  // totals grouped by currency
  const byCurrency = items.reduce((acc: Record<string, { income: number; expense: number }>, t) => {
    const cur = normCur(t);
    if (!acc[cur]) acc[cur] = { income: 0, expense: 0 };
    if (t.type === 'income') acc[cur].income += Number(t.amount) || 0;
    else acc[cur].expense += Number(t.amount) || 0;
    return acc;
  }, {});

  const summaryRows = curFilter === 'all'
    ? Object.entries(byCurrency).map(([cur, v]) => ({ cur, ...v }))
    : [{ cur: curFilter, ...(byCurrency[curFilter] || { income: 0, expense: 0 }) }];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track your income and expenses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {missingCur.length > 0 && (
            <button onClick={handleFixMissing} disabled={fixing}
              className="text-xs px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors">
              {fixing ? 'Fixing…' : `Fix ${missingCur.length} missing currency → QAR`}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm">
            + Add Transaction
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* Currency tabs (only show when >1 currency in data) */}
      {availableCurs.length > 2 && (
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit overflow-x-auto">
          {availableCurs.map(c => (
            <button key={c} onClick={() => setCurFilter(c)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${curFilter === c ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {c === 'all' ? 'All currencies' : c}
            </button>
          ))}
        </div>
      )}

      {/* Totals — grouped by currency */}
      <div className={`grid gap-3 md:gap-4 ${summaryRows.length === 1 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
        {summaryRows.map(({ cur, income, expense }) => (
          <div key={cur} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-3">{cur}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Income</span>
                <span className="font-semibold text-emerald-600">{fmt(income, cur)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Expenses</span>
                <span className="font-semibold text-rose-500">{fmt(expense, cur)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-slate-50">
                <span className="text-slate-500 font-medium">Net</span>
                <span className={`font-bold ${income - expense >= 0 ? 'text-violet-600' : 'text-rose-500'}`}>
                  {fmt(income - expense, cur)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">New Transaction</h3>
          </div>
          <form onSubmit={handleAdd} className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</label>
              <div className="flex gap-2 mt-1.5">
                {['income', 'expense'].map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      form.type === t
                        ? t === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-400 bg-rose-50 text-rose-600'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Currency</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                {PRESET_CURRENCIES.map(c => <option key={c} value={c}>{currSym(c)} {c}</option>)}
                <option value="__custom__">Other (custom)…</option>
              </select>
              {form.currency === '__custom__' && (
                <input
                  placeholder="e.g. CHF, KWD, BHD"
                  value={customCurrency}
                  onChange={e => setCustomCurrency(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-full mt-2 border border-violet-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Amount ({form.currency === '__custom__' ? (customCurrency || '?') : form.currency})
              </label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Note (optional)</label>
              <input placeholder="What was this for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setCustomCurrency(''); }}
                className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <p className="text-sm text-slate-500">{filtered.length} records</p>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['all', 'income', 'expense'] as const).map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${typeFilter === f ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-slate-500 font-medium">No transactions yet</p>
            <p className="text-sm text-slate-400 mt-1">Click "Add Transaction" to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Note</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Currency</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                        <span className="font-medium text-slate-700">{t.category}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{t.type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs max-w-xs truncate">{t.description || '—'}</td>
                    <td className="px-5 py-3.5">
                      {editCurId === t.id ? (
                        <div className="flex items-center gap-1">
                          <select value={editCurVal} onChange={e => setEditCurVal(e.target.value)}
                            className="border border-slate-200 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
                            {PRESET_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="__custom__">Other…</option>
                          </select>
                          {editCurVal === '__custom__' && (
                            <input value={editCurCustom} onChange={e => setEditCurCustom(e.target.value.toUpperCase())}
                              maxLength={5} placeholder="CODE"
                              className="w-16 border border-violet-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
                          )}
                          <button onClick={() => saveEditCur(t.id)} className="text-violet-600 hover:text-violet-800 text-xs font-bold px-1">✓</button>
                          <button onClick={() => setEditCurId(null)} className="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => startEditCur(t)}
                          className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700 transition-colors">
                          {normCur(t)}
                        </button>
                      )}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount), normCur(t))}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleDelete(t.id)}
                        className="text-slate-200 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-base font-bold">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-slate-50">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{t.type === 'income' ? '↑' : '↓'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-700 truncate">{t.category}</p>
                        <button onClick={() => startEditCur(t)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-violet-100 hover:text-violet-600 flex-shrink-0">
                          {normCur(t)}
                        </button>
                      </div>
                      {editCurId === t.id && (
                        <div className="flex items-center gap-1 mt-1">
                          <select value={editCurVal} onChange={e => setEditCurVal(e.target.value)}
                            className="border border-slate-200 rounded px-1.5 py-1 text-xs bg-white">
                            {PRESET_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="__custom__">Other…</option>
                          </select>
                          {editCurVal === '__custom__' && (
                            <input value={editCurCustom} onChange={e => setEditCurCustom(e.target.value.toUpperCase())}
                              maxLength={5} placeholder="CODE"
                              className="w-14 border border-violet-300 rounded px-1.5 py-1 text-xs" />
                          )}
                          <button onClick={() => saveEditCur(t.id)} className="text-violet-600 text-xs font-bold">✓</button>
                          <button onClick={() => setEditCurId(null)} className="text-slate-400 text-xs">✕</button>
                        </div>
                      )}
                      <p className="text-xs text-slate-400">{t.description || new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount), normCur(t))}
                    </p>
                    <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-400 transition-colors text-lg font-bold px-1">×</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
