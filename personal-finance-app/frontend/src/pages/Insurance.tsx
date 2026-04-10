import { useEffect, useRef, useState } from 'react';
import { getRows, addRow, deleteRow, updateRow } from '../lib/api';

const TYPES = ['health', 'life', 'vehicle', 'home', 'term'];
const TYPE_META: Record<string, { emoji: string; color: string; darkColor: string; border: string; darkBorder: string; bg: string; darkBg: string }> = {
  health:  { emoji: '🏥', color: 'text-emerald-700', darkColor: 'dark:text-emerald-400', border: 'border-emerald-200', darkBorder: 'dark:border-emerald-700', bg: 'bg-emerald-50',  darkBg: 'dark:bg-emerald-900/20' },
  life:    { emoji: '💙', color: 'text-blue-700',    darkColor: 'dark:text-blue-400',    border: 'border-blue-200',    darkBorder: 'dark:border-blue-700',    bg: 'bg-blue-50',    darkBg: 'dark:bg-blue-900/20' },
  vehicle: { emoji: '🚗', color: 'text-amber-700',   darkColor: 'dark:text-amber-400',   border: 'border-amber-200',   darkBorder: 'dark:border-amber-700',   bg: 'bg-amber-50',   darkBg: 'dark:bg-amber-900/20' },
  home:    { emoji: '🏠', color: 'text-purple-700',  darkColor: 'dark:text-purple-400',  border: 'border-purple-200',  darkBorder: 'dark:border-purple-700',  bg: 'bg-purple-50',  darkBg: 'dark:bg-purple-900/20' },
  term:    { emoji: '📋', color: 'text-rose-700',    darkColor: 'dark:text-rose-400',    border: 'border-rose-200',    darkBorder: 'dark:border-rose-700',    bg: 'bg-rose-50',    darkBg: 'dark:bg-rose-900/20' },
};

const PRESET_CURRENCIES = ['INR', 'QAR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', QAR: 'QAR ', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', SAR: 'SAR ' };
const currSym = (c: string) => CURRENCY_SYMBOLS[c] ?? `${c} `;
const normCur = (p: any): string => (p.currency && String(p.currency).trim()) || 'INR';
const fmt = (n: number, currency = 'INR') =>
  `${currSym(currency)}${Math.abs(n).toLocaleString('en-IN')}`;

const EMPTY = { type: 'health', provider: '', policyNumber: '', premium: '', currency: 'INR', frequency: 'yearly', customMonths: '1', sumAssured: '', startDate: '', endDate: '' };

const FREQ_MULTIPLIER: Record<string, number> = { monthly: 12, quarterly: 4, 'half-yearly': 2, yearly: 1 };
const FREQ_LABEL: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', 'half-yearly': 'Half-Yearly', yearly: 'Yearly', custom: 'Custom' };
const toAnnual = (premium: number, frequency: string, customMonths = 1): number => {
  if (frequency === 'custom') return customMonths > 0 ? premium * (12 / customMonths) : 0;
  return premium * (FREQ_MULTIPLIER[frequency] ?? 1);
};

/** Normalise any date value to YYYY-MM-DD for <input type="date"> */
const toDateInput = (d: any): string => {
  if (!d) return '';
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const p = new Date(s);
  return isNaN(p.getTime()) ? '' : p.toISOString().split('T')[0];
};

/** Returns the next payment due date, or null if policy has expired */
function nextDueDate(p: any): Date | null {
  if (!p.startDate || !p.endDate) return null;
  const start = new Date(p.startDate + 'T00:00:00');
  const end   = new Date(p.endDate   + 'T00:00:00');
  const now   = new Date(); now.setHours(0, 0, 0, 0);
  if (now >= end) return null;

  const freq = p.frequency || 'yearly';
  const cm = Math.max(1, Number(p.customMonths) || 1);
  let next = new Date(start);
  while (next <= now) {
    if (freq === 'monthly')           next.setMonth(next.getMonth() + 1);
    else if (freq === 'quarterly')    next.setMonth(next.getMonth() + 3);
    else if (freq === 'half-yearly')  next.setMonth(next.getMonth() + 6);
    else if (freq === 'custom')       next.setMonth(next.getMonth() + cm);
    else                              next.setFullYear(next.getFullYear() + 1);
  }
  return next <= end ? next : null;
}

/** Downloads a .ics calendar file with 7-day and 3-day reminders */
function downloadICS(p: any) {
  const next = nextDueDate(p);
  if (!next) return;

  const cur = normCur(p);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dtDate = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
  const uid = `${p.id || Date.now()}@personal-finance-app`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PersonalFinanceApp//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${dtDate}`,
    `DTEND;VALUE=DATE:${dtDate}`,
    `SUMMARY:Insurance Payment: ${p.provider} (${p.type})`,
    `DESCRIPTION:Premium: ${fmt(Number(p.premium), cur)}/${p.frequency}\\nAnnual: ${fmt(toAnnual(Number(p.premium), p.frequency), cur)}\\nPolicy#: ${p.policyNumber || 'N/A'}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-P7D',
    `DESCRIPTION:7 days until ${p.provider} insurance payment`,
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-P3D',
    `DESCRIPTION:3 days until ${p.provider} insurance payment`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${p.provider.replace(/\s+/g, '-')}-reminder.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a Google Calendar "create event" page pre-filled with the payment details */
function openGoogleCalendar(p: any) {
  const next = nextDueDate(p);
  if (!next) return;
  const cur = normCur(p);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
  const title = encodeURIComponent(`Insurance Payment: ${p.provider} (${p.type})`);
  const details = encodeURIComponent(
    `Premium: ${fmt(Number(p.premium), cur)}/${p.frequency}\nAnnual: ${fmt(toAnnual(Number(p.premium), p.frequency), cur)}\nPolicy#: ${p.policyNumber || 'N/A'}`
  );
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}&crm=AVAILABLE`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Returns days until next due date, or null */
function daysUntilDue(p: any): number | null {
  const next = nextDueDate(p);
  if (!next) return null;
  return Math.ceil((next.getTime() - Date.now()) / 86400000);
}

type FreqFilter = 'all' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'custom';

export default function Insurance() {
  const [items, setItems]       = useState<any[]>([]);
  const [form, setForm]         = useState(EMPTY);
  const [customCurrency, setCustomCurrency] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [freqFilter, setFreqFilter]   = useState<FreqFilter>('all');
  const [curFilter, setCurFilter]     = useState('all');
  const [search, setSearch]           = useState('');
  const [editId, setEditId]           = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const load = () => getRows('insurance').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const scrollToForm = () => setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const currency = form.currency === '__custom__'
      ? (customCurrency.toUpperCase().trim() || 'INR')
      : form.currency;
    try {
      await addRow('insurance', {
        id: crypto.randomUUID(),
        ...form,
        currency,
        premium: Number(form.premium),
        customMonths: form.frequency === 'custom' ? Number(form.customMonths) || 1 : undefined,
        sumAssured: Number(form.sumAssured),
        status: 'active',
      });
      setShowForm(false);
      setForm(EMPTY);
      setCustomCurrency('');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    const currency = form.currency === '__custom__'
      ? (customCurrency.toUpperCase().trim() || 'INR')
      : form.currency;
    try {
      const updates = {
        type: form.type, provider: form.provider, policyNumber: form.policyNumber,
        premium: Number(form.premium), currency, frequency: form.frequency,
        customMonths: form.frequency === 'custom' ? Number(form.customMonths) || 1 : undefined,
        sumAssured: Number(form.sumAssured), startDate: form.startDate, endDate: form.endDate,
      };
      await updateRow('insurance', editId, updates);
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...updates } : i));
      setEditId(null); setForm(EMPTY); setCustomCurrency(''); setShowForm(false); setError('');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (p: any) => {
    const cur = normCur(p);
    const isCustom = !PRESET_CURRENCIES.includes(cur);
    setEditId(p.id);
    setForm({
      type: p.type || 'health',
      provider: p.provider || '',
      policyNumber: p.policyNumber || '',
      premium: String(p.premium || ''),
      currency: isCustom ? '__custom__' : cur,
      frequency: p.frequency || 'yearly',
      customMonths: String(p.customMonths || '1'),
      sumAssured: String(p.sumAssured || ''),
      startDate: toDateInput(p.startDate),
      endDate: toDateInput(p.endDate),
    });
    setCustomCurrency(isCustom ? cur : '');
    setShowForm(true);
    scrollToForm();
  };

  const handleDelete = async (id: string) => {
    try { await deleteRow('insurance', id); load(); }
    catch (e: any) { setError(e.message); }
  };

  // Available currencies in the data (for filter tabs)
  const availableCurs = ['all', ...Array.from(new Set(items.map(normCur))).sort()];

  // Per-currency annual premium totals (active policies only)
  const annualByCurrency = items.reduce((acc: Record<string, number>, p) => {
    const cur = normCur(p);
    acc[cur] = (acc[cur] || 0) + toAnnual(Number(p.premium), p.frequency, Number(p.customMonths) || 1);
    return acc;
  }, {});

  const expiringSoon = items.filter(p => {
    const days = (new Date(p.endDate).getTime() - Date.now()) / 86400000;
    return days <= 90 && days > 0;
  });

  const upcomingPayments = items
    .map(p => ({ p, next: nextDueDate(p) }))
    .filter(({ next }) => next !== null && (next!.getTime() - Date.now()) / 86400000 <= 7)
    .sort((a, b) => a.next!.getTime() - b.next!.getTime());

  const urgentPayments = upcomingPayments.filter(({ next }) =>
    next !== null && Math.ceil((next!.getTime() - Date.now()) / 86400000) <= 2
  );

  const q = search.toLowerCase();
  const filtered = items
    .filter(p => freqFilter === 'all' || p.frequency === freqFilter)
    .filter(p => curFilter === 'all' || normCur(p) === curFilter)
    .filter(p => !q || `${p.provider} ${p.type} ${p.policyNumber}`.toLowerCase().includes(q));

  const formCur = form.currency === '__custom__' ? (customCurrency || '?') : form.currency;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Insurance</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">All your policies in one place</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(EMPTY); setCustomCurrency(''); setShowForm(true); scrollToForm(); }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Add Policy
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* 2-day urgent reminder banner */}
      {urgentPayments.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-600 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔔</span>
            <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
              Urgent: {urgentPayments.length} insurance payment{urgentPayments.length > 1 ? 's' : ''} due within 2 days!
            </p>
          </div>
          <div className="space-y-2">
            {urgentPayments.map(({ p, next }) => {
              const daysUntil = Math.ceil((next!.getTime() - Date.now()) / 86400000);
              const cur = normCur(p);
              return (
                <div key={p.id} className="flex items-center justify-between bg-white/60 dark:bg-rose-900/30 rounded-xl px-3 py-2">
                  <div>
                    <span className="text-sm font-semibold text-rose-800 dark:text-rose-100">
                      {TYPE_META[p.type]?.emoji} {p.provider}
                    </span>
                    <span className="text-xs text-rose-600 dark:text-rose-300 ml-2">
                      {fmt(Number(p.premium), cur)} / {p.frequency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-800/50 px-2 py-0.5 rounded-full">
                      {daysUntil === 0 ? 'Due Today!' : daysUntil === 1 ? 'Due Tomorrow!' : `${daysUntil}d left`}
                    </span>
                    <button
                      onClick={() => openGoogleCalendar(p)}
                      className="text-xs px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-rose-300 dark:border-rose-500 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors font-medium"
                    >
                      📅 Remind me
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming payments alert */}
      {upcomingPayments.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">Payments due this week</p>
          <div className="space-y-1.5">
            {upcomingPayments.map(({ p, next }) => {
              const daysUntil = Math.ceil((next!.getTime() - Date.now()) / 86400000);
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-300">
                    {TYPE_META[p.type]?.emoji} <strong>{p.provider}</strong> — {fmt(Number(p.premium), normCur(p))}/{p.frequency}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Policies</p>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1.5">{items.length}</p>
        </div>

        {/* Annual premium per currency */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Annual Premium</p>
          {Object.keys(annualByCurrency).length === 0 ? (
            <p className="text-2xl font-bold text-amber-600 mt-1.5">—</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(annualByCurrency).map(([cur, total]) => (
                <div key={cur} className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-violet-500 uppercase">{cur}</span>
                  <span className="font-bold text-amber-600">{fmt(total, cur)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All converted to yearly</p>
        </div>

        <div className={`rounded-2xl border shadow-sm p-5 ${expiringSoon.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expiring Soon</p>
          <p className={`text-2xl font-bold mt-1.5 ${expiringSoon.length > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}`}>
            {expiringSoon.length} {expiringSoon.length > 0 ? '⚠️' : '✓'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Within 90 days</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search policies…"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Frequency filter */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            {(['all', 'monthly', 'quarterly', 'half-yearly', 'yearly', 'custom'] as FreqFilter[]).map(f => (
              <button key={f} onClick={() => setFreqFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${freqFilter === f ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                {f === 'all' ? 'All' : FREQ_LABEL[f]}
                {f !== 'all' && (
                  <span className="ml-1 text-slate-400 dark:text-slate-500">
                    ({items.filter(p => p.frequency === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Currency filter — only shown when multiple currencies exist */}
          {availableCurs.length > 2 && (
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              {availableCurs.map(c => (
                <button key={c} onClick={() => setCurFilter(c)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${curFilter === c ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  {c === 'all' ? 'All Currencies' : c}
                  {c !== 'all' && (
                    <span className="ml-1 text-slate-400 dark:text-slate-500">
                      ({items.filter(p => normCur(p) === c).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div ref={formRef} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 dark:bg-slate-700/30 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">{editId ? 'Edit Policy' : 'Add Insurance Policy'}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none">✕</button>
          </div>
          <form onSubmit={editId ? handleUpdate : handleAdd} className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].emoji} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Provider</label>
              <input
                placeholder="e.g. LIC, HDFC ERGO, Star Health"
                value={form.provider}
                onChange={e => setForm({ ...form, provider: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Frequency</label>
              <select
                value={form.frequency}
                onChange={e => setForm({ ...form, frequency: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {(['monthly', 'quarterly', 'half-yearly', 'yearly', 'custom'] as const).map(f => (
                  <option key={f} value={f}>{FREQ_LABEL[f]}</option>
                ))}
              </select>
              {form.frequency === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Every</label>
                  <input type="number" min="1" max="24" value={form.customMonths}
                    onChange={e => setForm({ ...form, customMonths: e.target.value })}
                    className="w-16 px-2 py-1.5 rounded-lg border border-violet-300 dark:border-violet-600 dark:bg-slate-700 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  <label className="text-xs text-slate-500 dark:text-slate-400">month(s)</label>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {PRESET_CURRENCIES.map(c => <option key={c} value={c}>{currSym(c).trim()} {c}</option>)}
                <option value="__custom__">Other (custom)…</option>
              </select>
              {form.currency === '__custom__' && (
                <input
                  placeholder="e.g. CHF, KWD, BHD"
                  value={customCurrency}
                  onChange={e => setCustomCurrency(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-full mt-2 border border-violet-300 dark:border-violet-600 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Premium ({formCur} per {
                  form.frequency === 'monthly' ? 'month' :
                  form.frequency === 'quarterly' ? 'quarter' :
                  form.frequency === 'half-yearly' ? '6 months' :
                  form.frequency === 'custom' ? `${form.customMonths || 1} month(s)` : 'year'
                })
              </label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.premium}
                onChange={e => setForm({ ...form, premium: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
              {form.premium && form.frequency !== 'yearly' && (
                <p className="text-xs text-violet-600 mt-1">
                  = {fmt(toAnnual(Number(form.premium), form.frequency), formCur === '?' ? 'INR' : formCur)} / year
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sum Assured ({formCur})</label>
              <input
                type="number" min="0" step="1" placeholder="0"
                value={form.sumAssured}
                onChange={e => setForm({ ...form, sumAssured: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Policy Number (optional)</label>
              <input
                placeholder="e.g. LIC/2024/001234"
                value={form.policyNumber}
                onChange={e => setForm({ ...form, policyNumber: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">End / Renewal Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); setCustomCurrency(''); }} className="px-5 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : editId ? 'Update Policy' : 'Save Policy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policy Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm py-16 text-center">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {items.length === 0 ? 'No policies yet' : `No ${curFilter !== 'all' ? curFilter + ' ' : ''}${freqFilter !== 'all' ? freqFilter : ''} policies`}
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {items.length === 0 ? 'Click "Add Policy" to track your insurance' : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const cur = normCur(p);
            const daysLeft = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);
            const meta = TYPE_META[p.type] || TYPE_META.health;
            const annual = toAnnual(Number(p.premium), p.frequency, Number(p.customMonths) || 1);
            const next = nextDueDate(p);
            const daysUntilNext = next ? Math.ceil((next.getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={p.id} className={`rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow group ${meta.bg} ${meta.darkBg} ${meta.border} ${meta.darkBorder}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <p className={`font-semibold text-sm ${meta.color} ${meta.darkColor}`}>{p.provider}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{p.type} insurance</p>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">{cur}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startEdit(p)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Edit">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 rounded-lg text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700 hover:text-rose-400 transition-colors text-lg font-bold leading-none"
                      title="Delete"
                    >×</button>
                  </div>
                </div>

                <div className="space-y-2 text-sm mt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Premium</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{fmt(Number(p.premium), cur)} / {p.frequency}</span>
                  </div>
                  {p.frequency !== 'yearly' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Annual equivalent</span>
                      <span className="font-medium text-violet-700 dark:text-violet-400 text-xs">{fmt(annual, cur)} / yr</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Sum Assured</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{fmt(Number(p.sumAssured), cur)}</span>
                  </div>
                  {p.policyNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Policy #</span>
                      <span className="font-medium text-xs text-slate-600 dark:text-slate-300">{p.policyNumber}</span>
                    </div>
                  )}
                  {next && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Next payment</span>
                      <span className={`font-medium text-xs ${daysUntilNext !== null && daysUntilNext <= 7 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
                        {next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {daysUntilNext !== null && daysUntilNext <= 7 && (
                          <span className="ml-1">({daysUntilNext === 0 ? 'today' : `${daysUntilNext}d`})</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-black/5 dark:border-white/10">
                    <span className="text-slate-500 dark:text-slate-400">Expires</span>
                    <span className={`font-medium text-xs ${daysLeft <= 90 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
                      {new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {daysLeft <= 90 && daysLeft > 0 && <span className="ml-1 text-amber-600">({daysLeft}d left)</span>}
                    </span>
                  </div>
                </div>

                {next && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openGoogleCalendar(p)}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 transition-colors font-medium flex items-center justify-center gap-1"
                      title="Add to Google Calendar"
                    >
                      🗓 Google Cal
                    </button>
                    <button
                      onClick={() => downloadICS(p)}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-medium flex items-center justify-center gap-1"
                      title="Download .ics for Apple / Outlook calendar"
                    >
                      📥 .ics File
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
