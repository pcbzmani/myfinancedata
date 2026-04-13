import { useEffect, useRef, useState } from 'react';
import { getRows, addRow, deleteRow, updateRow, getMarketRates } from '../lib/api';

const FREQUENCIES = ['monthly', 'quarterly', 'half-yearly', 'yearly', 'custom', 'one-time'] as const;
const CATEGORIES = ['productivity', 'entertainment', 'tools', 'cloud', 'ai', 'other'] as const;
const CURRENCIES = ['QAR', 'INR', 'USD', 'EUR', 'GBP'];
const STATUSES = ['active', 'paused', 'cancelled'] as const;

type Frequency = typeof FREQUENCIES[number];
type Category = typeof CATEGORIES[number];
type Status = typeof STATUSES[number];
type CustomUnit = 'months' | 'days';

const FREQ_LABEL: Record<Frequency, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', 'half-yearly': 'Half-Yearly', yearly: 'Yearly', custom: 'Custom', 'one-time': 'One-Time',
};
// Payments per year (custom & one-time handled separately)
const FREQ_PER_YEAR: Record<Frequency, number> = { monthly: 12, quarterly: 4, 'half-yearly': 2, yearly: 1, custom: 0, 'one-time': 0 };

const toMonthly = (cost: number, freq: Frequency, customMonths = 1): number => {
  if (freq === 'monthly') return cost;
  if (freq === 'quarterly') return cost / 3;
  if (freq === 'half-yearly') return cost / 6;
  if (freq === 'custom') return customMonths > 0 ? cost / customMonths : 0;
  if (freq === 'one-time') return 0;
  return cost / 12;
};
const toAnnual = (cost: number, freq: Frequency, customMonths = 1): number => {
  if (freq === 'custom') return customMonths > 0 ? cost * (12 / customMonths) : 0;
  if (freq === 'one-time') return cost;
  return cost * FREQ_PER_YEAR[freq];
};

/** Auto-calculate end date from start date + frequency */
function calcEndDate(startDate: string, frequency: Frequency, customMonths = 1, customUnit: CustomUnit = 'months'): string {
  if (!startDate) return '';
  if (frequency === 'one-time') return startDate; // one-time ends on same day
  const d = new Date(startDate + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (frequency === 'half-yearly') d.setMonth(d.getMonth() + 6);
  else if (frequency === 'custom') {
    if (customUnit === 'days') d.setDate(d.getDate() + Math.max(1, customMonths));
    else d.setMonth(d.getMonth() + Math.max(1, customMonths));
  }
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

/** Local timezone YYYY-MM-DD */
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getEmpty = () => {
  const sd = localToday();
  return { name: '', category: 'productivity' as Category, cost: '', currency: 'QAR', frequency: 'monthly' as Frequency, customMonths: '1', customUnit: 'months' as CustomUnit, startDate: sd, endDate: calcEndDate(sd, 'monthly'), website: '', notes: '' };
};

const CAT_META: Record<Category, { emoji: string; color: string; bg: string; border: string }> = {
  productivity: { emoji: '⚡', color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700' },
  entertainment: { emoji: '🎬', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700' },
  tools:         { emoji: '🔧', color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-700' },
  cloud:         { emoji: '☁️', color: 'text-cyan-700 dark:text-cyan-400',    bg: 'bg-cyan-50 dark:bg-cyan-900/20',    border: 'border-cyan-200 dark:border-cyan-700' },
  ai:            { emoji: '🤖', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-700' },
  other:         { emoji: '📦', color: 'text-slate-700 dark:text-slate-300',  bg: 'bg-slate-50 dark:bg-slate-800',     border: 'border-slate-200 dark:border-slate-600' },
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  paused:    { label: 'Paused',    color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/30' },
  cancelled: { label: 'Cancelled', color: 'text-rose-700 dark:text-rose-400',       bg: 'bg-rose-50 dark:bg-rose-900/30' },
};

function advanceByFreq(d: Date, freq: Frequency, customMonths: number, customUnit: CustomUnit = 'months') {
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (freq === 'half-yearly') d.setMonth(d.getMonth() + 6);
  else if (freq === 'custom') {
    if (customUnit === 'days') d.setDate(d.getDate() + Math.max(1, customMonths));
    else d.setMonth(d.getMonth() + Math.max(1, customMonths));
  }
  else if (freq !== 'one-time') d.setFullYear(d.getFullYear() + 1);
}

function nextRenewal(sub: any): Date | null {
  if (!sub.startDate) return null;
  if (sub.frequency === 'one-time') return null; // no future renewal
  const start = new Date(sub.startDate + 'T00:00:00');
  const end = sub.endDate ? new Date(sub.endDate + 'T00:00:00') : null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (end && now >= end) return null;

  const freq: Frequency = sub.frequency || 'monthly';
  const cm = Number(sub.customMonths) || 1;
  const cu: CustomUnit = sub.customUnit || 'months';
  let next = new Date(start);
  while (next <= now) advanceByFreq(next, freq, cm, cu);
  return (!end || next <= end) ? next : null;
}

const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const diffDays = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86400000);


export default function Subscriptions() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(getEmpty());
  const [customCurrency, setCustomCurrency] = useState('');
  const [freqFilter, setFreqFilter] = useState<'all' | Frequency>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [fxRates, setFxRates] = useState<{ qarInr: number; usdInr: number } | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<'original' | 'QAR' | 'INR' | 'USD'>('original');
  const [search, setSearch] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadItems();
    getMarketRates().then(d => {
      if (d.qarInr?.price && d.usdInr?.price)
        setFxRates({ qarInr: d.qarInr.price, usdInr: d.usdInr.price });
    }).catch(() => {});
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      setItems(await getRows('subscriptions'));
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.cost || !form.startDate) {
      setError('Name, cost and start date are required.'); return;
    }
    setSaving(true);
    const currency = form.currency === '__custom__'
      ? (customCurrency.toUpperCase().trim() || 'QAR')
      : form.currency;
    try {
      const row = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        category: form.category,
        cost: parseFloat(form.cost),
        currency,
        frequency: form.frequency,
        customMonths: form.frequency === 'custom' ? Number(form.customMonths) || 1 : undefined,
        customUnit: form.frequency === 'custom' ? ((form as any).customUnit || 'months') : undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        website: form.website,
        notes: form.notes,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      await addRow('subscriptions', row);
      // Mirror subscription start as an expense transaction
      await addRow('transactions', {
        id: crypto.randomUUID(),
        type: 'expense',
        category: 'Other',
        amount: row.cost,
        currency: row.currency,
        description: `Subscription: ${row.name}`,
        date: row.startDate,
      });
      setItems(prev => [row, ...prev]);
      setForm(getEmpty());
      setCustomCurrency('');
      setShowForm(false);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: any) {
    const cur = String(item.currency || 'QAR');
    const isCustom = !CURRENCIES.includes(cur);
    setEditId(item.id);
    setForm({
      name: item.name || '',
      category: (CATEGORIES.includes(item.category) ? item.category : 'other') as Category,
      cost: String(item.cost || ''),
      currency: isCustom ? '__custom__' : cur,
      frequency: (FREQUENCIES.includes(item.frequency) ? item.frequency : 'monthly') as Frequency,
      customMonths: String(item.customMonths || '1'),
      customUnit: (item.customUnit || 'months') as CustomUnit,
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      website: item.website || '',
      notes: item.notes || '',
    });
    setCustomCurrency(isCustom ? cur : '');
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.cost || !form.startDate) {
      setError('Name, cost and start date are required.'); return;
    }
    setSaving(true);
    const currency = form.currency === '__custom__'
      ? (customCurrency.toUpperCase().trim() || 'QAR')
      : form.currency;
    try {
      const updates = {
        name: form.name.trim(), category: form.category,
        cost: parseFloat(form.cost), currency,
        frequency: form.frequency,
        customMonths: form.frequency === 'custom' ? Number(form.customMonths) || 1 : undefined,
        customUnit: form.frequency === 'custom' ? ((form as any).customUnit || 'months') : undefined,
        startDate: form.startDate,
        endDate: form.endDate, website: form.website, notes: form.notes,
      };
      await updateRow('subscriptions', editId!, updates);
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...updates } : i));
      setEditId(null); setForm(getEmpty()); setCustomCurrency(''); setShowForm(false); setError('');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleStatusChange(id: string, status: Status) {
    try {
      await updateRow('subscriptions', id, { status });
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this subscription?')) return;
    try {
      await deleteRow('subscriptions', id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  const activeItems = items.filter(i => i.status === 'active');
  const q = search.toLowerCase();
  const filtered = items.filter(i => {
    if (freqFilter !== 'all' && i.frequency !== freqFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (q && !`${i.name} ${i.category} ${i.notes}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const upcoming = activeItems.filter(i => { const d = nextRenewal(i); return d && diffDays(d) <= 7; });

  // Per-currency breakdown for active subscriptions
  const byCurrencyStats = activeItems.reduce((acc: Record<string, { monthly: number; annual: number }>, i) => {
    const cur = String(i.currency || 'QAR');
    const cm = Number(i.customMonths) || 1;
    if (!acc[cur]) acc[cur] = { monthly: 0, annual: 0 };
    acc[cur].monthly += toMonthly(Number(i.cost) || 0, i.frequency, cm);
    acc[cur].annual  += toAnnual(Number(i.cost) || 0, i.frequency, cm);
    return acc;
  }, {});

  // Currency conversion (pivot through INR)
  function convertAmount(amount: number, fromCur: string, toCur: string): number | null {
    if (!fxRates || fromCur === toCur) return amount;
    let inr: number;
    if (fromCur === 'INR')      inr = amount;
    else if (fromCur === 'QAR') inr = amount * fxRates.qarInr;
    else if (fromCur === 'USD') inr = amount * fxRates.usdInr;
    else return null;
    if (toCur === 'INR') return inr;
    if (toCur === 'QAR') return inr / fxRates.qarInr;
    if (toCur === 'USD') return inr / fxRates.usdInr;
    return null;
  }

  // Consolidated totals (only meaningful when displayCurrency != 'original')
  const consolidatedStats = displayCurrency !== 'original' && fxRates
    ? Object.entries(byCurrencyStats).reduce(
        (acc, [cur, v]) => ({
          monthly: acc.monthly + (convertAmount(v.monthly, cur, displayCurrency) ?? 0),
          annual:  acc.annual  + (convertAmount(v.annual,  cur, displayCurrency) ?? 0),
        }),
        { monthly: 0, annual: 0 }
      )
    : null;

  const curSym: Record<string, string> = { QAR: 'QR', INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const fmtCost = (cost: number, currency: string) => `${curSym[currency] || currency}${cost.toLocaleString()}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Subscriptions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track your recurring services & memberships</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(getEmpty()); setCustomCurrency(''); setShowForm(true); setError(''); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Subscription
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search subscriptions…"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-2">
          <span className="mt-0.5">⚠️</span> {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {/* Upcoming renewals banner */}
      {upcoming.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm">
          <p className="font-semibold mb-1">⏰ Upcoming renewals (within 7 days)</p>
          <ul className="space-y-0.5">
            {upcoming.map(i => {
              const d = nextRenewal(i)!;
              const days = diffDays(d);
              return (
                <li key={i.id} className="flex items-center gap-2">
                  <span className="font-medium">{i.name}</span>
                  <span className="text-amber-600 dark:text-amber-400">{fmtCost(Number(i.cost), i.currency)}/{i.frequency}</span>
                  <span className="text-amber-500 text-xs">— {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`} ({fmtDate(d)})</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 space-y-3">
        {/* Header row: active count + View-in toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeItems.length}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">of {items.length} total</p>
          </div>
          {fxRates && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">View in:</span>
              {(['original', 'QAR', 'INR', 'USD'] as const).map(c => (
                <button key={c} onClick={() => setDisplayCurrency(c)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    displayCurrency === c
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}>
                  {c === 'original' ? 'Original' : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Per-currency breakdown */}
        <div className={`grid gap-3 ${Object.keys(byCurrencyStats).length === 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
          {Object.entries(byCurrencyStats).map(([cur, { monthly, annual }]) => (
            <div key={cur} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-4 shadow-sm">
              <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">{cur}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 dark:text-slate-500">Monthly</span>
                  <span className="font-semibold text-violet-600 dark:text-violet-400">{curSym[cur] || cur} {monthly.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5 border-t border-slate-50 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500">Annual</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{curSym[cur] || cur} {annual.toFixed(0)}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Consolidated card */}
          {consolidatedStats && Object.keys(byCurrencyStats).length > 1 && (
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl px-4 py-4 shadow-sm">
              <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">All → {displayCurrency}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Monthly</span>
                  <span className="font-semibold text-violet-600 dark:text-violet-400">{curSym[displayCurrency] || displayCurrency} {consolidatedStats.monthly.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5 border-t border-violet-100 dark:border-violet-800">
                  <span className="text-slate-500 dark:text-slate-400">Annual</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{curSym[displayCurrency] || displayCurrency} {consolidatedStats.annual.toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {(['all', ...FREQUENCIES] as const).map(f => (
            <button key={f} onClick={() => setFreqFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${freqFilter === f ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              {f === 'all' ? 'All' : FREQ_LABEL[f as Frequency]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {(['all', ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div ref={formRef} className="mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{editId ? 'Edit Subscription' : 'New Subscription'}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none">✕</button>
          </div>
          <form onSubmit={editId ? handleUpdate : handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Service Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Netlify, ChatGPT, Claude"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as Category }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{CAT_META[c].emoji} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cost *</label>
                <input type="number" min="0.01" step="0.01" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                  placeholder="0.00" required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Currency</label>
                <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  <option value="__custom__">Other (custom)…</option>
                </select>
                {form.currency === '__custom__' && (
                  <input
                    placeholder="e.g. AED, SAR, CHF"
                    value={customCurrency}
                    onChange={e => setCustomCurrency(e.target.value.toUpperCase())}
                    maxLength={5}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Billing Frequency *</label>
              <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value as Frequency, endDate: calcEndDate(p.startDate, e.target.value as Frequency, Number(p.customMonths) || 1) }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                {FREQUENCIES.map(f => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
              </select>
              {form.frequency === 'custom' && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Every</label>
                  <input type="number" min="1" max="365" value={form.customMonths}
                    onChange={e => setForm(p => ({ ...p, customMonths: e.target.value, endDate: calcEndDate(p.startDate, 'custom', Number(e.target.value) || 1, (p as any).customUnit || 'months') }))}
                    className="w-16 px-2 py-1.5 rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  <select value={(form as any).customUnit || 'months'}
                    onChange={e => setForm(p => ({ ...p, customUnit: e.target.value as CustomUnit, endDate: calcEndDate(p.startDate, 'custom', Number(p.customMonths) || 1, e.target.value as CustomUnit) }))}
                    className="px-2 py-1.5 rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    <option value="months">Month(s)</option>
                    <option value="days">Day(s)</option>
                  </select>
                </div>
              )}
              {form.frequency === 'one-time' && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Single payment — no recurring renewal</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value, endDate: calcEndDate(e.target.value, p.frequency, Number(p.customMonths) || 1) }))} required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Date <span className="text-slate-400">(optional)</span></label>
              <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Website <span className="text-slate-400">(optional)</span></label>
              <input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                placeholder="https://example.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes <span className="text-slate-400">(optional)</span></label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Pro plan, team account"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white py-2 rounded-xl text-sm font-medium transition-colors">
                {saving ? 'Saving…' : editId ? 'Update Subscription' : 'Add Subscription'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setCustomCurrency(''); setError(''); }}
                className="px-6 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <div className="inline-block w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">Loading subscriptions…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔄</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">No subscriptions yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Track services like Netlify, ChatGPT, Claude Pro…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => {
            const cat = CAT_META[item.category as Category] || CAT_META.other;
            const statusMeta = STATUS_META[item.status as Status] || STATUS_META.active;
            const renewal = nextRenewal(item);
            const days = renewal ? diffDays(renewal) : null;
            const annCost = toAnnual(Number(item.cost) || 0, item.frequency);

            return (
              <div key={item.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border ${cat.border} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
                {/* Card header */}
                <div className={`${cat.bg} px-4 pt-4 pb-3`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-xl shadow-sm border border-white/60">
                        {cat.emoji}
                      </div>
                      <div>
                        <p className={`font-bold text-base ${cat.color}`}>{item.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${cat.color}`}>{item.currency} {Number(item.cost).toLocaleString()}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">/ {item.frequency}</p>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Annual</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.currency} {annCost.toLocaleString()}</span>
                  </div>
                  {renewal && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Next renewal</span>
                      <span className={`font-semibold ${days !== null && days <= 3 ? 'text-rose-600 dark:text-rose-400' : days !== null && days <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {fmtDate(renewal)} {days !== null && days <= 7 ? `(${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${days}d`})` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Started</span>
                    <span>{item.startDate}</span>
                  </div>
                  {item.endDate && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Ends</span>
                      <span>{item.endDate}</span>
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic truncate">{item.notes}</p>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-4 pb-3 pt-1 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700">
                  {item.website && (
                    <a href={item.website} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline truncate flex-1">
                      🔗 {new URL(item.website).hostname}
                    </a>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    {/* Edit button */}
                    <button onClick={() => startEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Edit">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {/* Status toggle */}
                    <select value={item.status}
                      onChange={e => handleStatusChange(item.id, e.target.value as Status)}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 focus:outline-none">
                      {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                    <button onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors"
                      title="Delete">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
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
