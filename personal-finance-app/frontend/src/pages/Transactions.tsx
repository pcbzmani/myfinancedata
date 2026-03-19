import { useEffect, useState } from 'react';
import { getRows, addRow, deleteRow } from '../lib/api';

const CATEGORIES = ['Salary', 'Freelance', 'Food', 'Transport', 'Shopping', 'Rent', 'Medical', 'Entertainment', 'Utilities', 'Other'];
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY_FORM = { type: 'expense', category: 'Food', amount: '', description: '', date: '' };

export default function Transactions() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const load = () => getRows('transactions').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addRow('transactions', {
        id: crypto.randomUUID(),
        ...form,
        amount: Number(form.amount),
        date: form.date || new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteRow('transactions', id); load(); }
    catch (e: any) { setError(e.message); }
  };

  const filtered = filter === 'all' ? items : items.filter(t => t.type === filter);
  const totalIn = items.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = items.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track your income and expenses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Add Transaction
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Income', value: totalIn, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Total Expenses', value: totalOut, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100' },
          { label: 'Net Balance', value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? 'text-violet-600' : 'text-rose-500', bg: 'bg-white border-slate-100' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl p-5 border shadow-sm ${bg}`}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1.5 ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">New Transaction</h3>
          </div>
          <form onSubmit={handleAdd} className="p-6 grid grid-cols-2 gap-4">
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
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount (₹)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Note (optional)</label>
              <input placeholder="What was this for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <p className="text-sm text-slate-500">{filtered.length} records</p>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['all', 'income', 'expense'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Note</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                      <span className="font-medium text-slate-700">{t.category}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{t.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-400 text-xs max-w-xs truncate">{t.description || '—'}</td>
                  <td className={`px-6 py-3.5 text-right font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={() => handleDelete(t.id)}
                      className="text-slate-200 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-base font-bold">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
