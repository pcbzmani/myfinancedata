import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TYPES = ['health', 'life', 'vehicle', 'home', 'term'];
const TYPE_META: Record<string, { emoji: string; color: string; border: string; bg: string }> = {
  health:  { emoji: '🏥', color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  life:    { emoji: '💙', color: 'text-blue-700',    border: 'border-blue-200',    bg: 'bg-blue-50' },
  vehicle: { emoji: '🚗', color: 'text-amber-700',   border: 'border-amber-200',   bg: 'bg-amber-50' },
  home:    { emoji: '🏠', color: 'text-purple-700',  border: 'border-purple-200',  bg: 'bg-purple-50' },
  term:    { emoji: '📋', color: 'text-rose-700',    border: 'border-rose-200',    bg: 'bg-rose-50' },
};
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY = { type: 'health', provider: '', policyNumber: '', premium: '', frequency: 'yearly', sumAssured: '', startDate: '', endDate: '' };

export default function Insurance() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get<any[]>('/insurance').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/insurance', { ...form, premium: Number(form.premium), sumAssured: Number(form.sumAssured) });
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/insurance/${id}`); load(); }
    catch (e: any) { setError(e.message); }
  };

  const totalPremium = items.reduce((s, p) => s + Number(p.premium), 0);
  const expiringSoon = items.filter(p => {
    const days = (new Date(p.endDate).getTime() - Date.now()) / 86400000;
    return days <= 90 && days > 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insurance</h1>
          <p className="text-sm text-slate-400 mt-0.5">All your policies in one place</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Add Policy
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
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Policies</p>
          <p className="text-2xl font-bold text-slate-700 mt-1.5">{items.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Annual Premium</p>
          <p className="text-2xl font-bold text-amber-600 mt-1.5">{fmt(totalPremium)}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-5 ${expiringSoon.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Expiring Soon</p>
          <p className={`text-2xl font-bold mt-1.5 ${expiringSoon.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {expiringSoon.length} {expiringSoon.length > 0 ? '⚠️' : '✓'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Within 90 days</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Add Insurance Policy</h3>
          </div>
          <form onSubmit={handleAdd} className="p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].emoji} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Provider</label>
              <input
                placeholder="e.g. LIC, HDFC ERGO, Star Health"
                value={form.provider}
                onChange={e => setForm({ ...form, provider: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Premium (₹)</label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.premium}
                onChange={e => setForm({ ...form, premium: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Frequency</label>
              <select
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sum Assured (₹)</label>
              <input
                type="number" min="0" step="1" placeholder="0"
                value={form.sumAssured}
                onChange={e => setForm({ ...form, sumAssured: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Policy Number (optional)</label>
              <input
                placeholder="e.g. LIC/2024/001234"
                value={form.policyNumber}
                onChange={e => setForm({ ...form, policyNumber: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">End / Renewal Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); }} className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Policy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policy Cards */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="text-slate-500 font-medium">No policies yet</p>
          <p className="text-sm text-slate-400 mt-1">Click "Add Policy" to track your insurance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(p => {
            const daysLeft = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);
            const meta = TYPE_META[p.type] || TYPE_META.health;
            return (
              <div key={p.id} className={`rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow group ${meta.bg} ${meta.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <p className={`font-semibold text-sm ${meta.color}`}>{p.provider}</p>
                      <p className="text-xs text-slate-500 capitalize">{p.type} insurance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 transition-all text-lg font-bold"
                  >×</button>
                </div>

                <div className="space-y-2 text-sm mt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Premium</span>
                    <span className="font-semibold text-slate-800">{fmt(Number(p.premium))} / {p.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sum Assured</span>
                    <span className="font-semibold text-slate-800">{fmt(Number(p.sumAssured))}</span>
                  </div>
                  {p.policyNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Policy #</span>
                      <span className="font-medium text-xs text-slate-600">{p.policyNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-black/5">
                    <span className="text-slate-500">Expires</span>
                    <span className={`font-medium text-xs ${daysLeft <= 90 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                      {new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {daysLeft <= 90 && daysLeft > 0 && <span className="ml-1 text-amber-600">({daysLeft}d left)</span>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
