import { useEffect, useState, useRef } from 'react';
import { getRows, addRow, deleteRow, updateRow, getMarketRates } from '../lib/api';
import { markEntryMadeToday } from '../lib/notifications';

const DEFAULT_CATEGORIES = ['Salary', 'Freelance', 'Food', 'Grocery', 'Transport', 'Shopping', 'Rent', 'Medical', 'Entertainment', 'Utilities', 'Other'];
const PRESET_CURRENCIES = ['QAR', 'INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', QAR: 'QAR', USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR' };

const currSym = (code: string) => CURRENCY_SYMBOLS[code] ?? code;
const fmt = (n: number, currency = 'QAR') =>
  `${currSym(currency)} ${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const normCur = (t: any): string => (t.currency && String(t.currency).trim()) || 'QAR';

const emptyForm = () => ({ type: 'expense', category: 'Food', amount: '', description: '', date: new Date().toISOString().split('T')[0], currency: 'QAR' });

/** Normalize any date value (Date object, locale string, ISO string) to YYYY-MM-DD for <input type="date"> */
const toDateInput = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date) return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const p = new Date(s);
  return isNaN(p.getTime()) ? '' : p.toISOString().split('T')[0];
};

export default function Transactions() {
  const [items, setItems]               = useState<any[]>([]);
  const [form, setForm]                 = useState(emptyForm);
  const [customCurrency, setCustomCurrency] = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [typeFilter, setTypeFilter]     = useState<'all' | 'income' | 'expense'>('all');
  const [curFilter, setCurFilter]       = useState('all');
  const [editCurId, setEditCurId]       = useState<string | null>(null);
  const [editCurVal, setEditCurVal]     = useState('');
  const [editCurCustom, setEditCurCustom] = useState('');
  const [editId, setEditId]             = useState<string | null>(null);
  const [editForm, setEditForm]         = useState(emptyForm);
  const [editCustomCurrency, setEditCustomCurrency] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<'original' | 'QAR' | 'INR' | 'USD'>('original');
  const [fxRates, setFxRates]           = useState<{ qarInr: number; usdInr: number } | null>(null);
  const [dateFilter, setDateFilter]     = useState<'month' | 'lastMonth' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo, setCustomTo]         = useState('');
  const [carryForward, setCarryForward] = useState<{ cur: string; net: number }[]>([]);
  const [search, setSearch] = useState('');
  const [customCats, setCustomCats] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('custom_categories') || '[]'); } catch { return []; }
  });
  const [addingCatFor, setAddingCatFor] = useState<'add' | 'edit' | null>(null);
  const [newCatInput, setNewCatInput] = useState('');
  const editFormRef = useRef<HTMLDivElement>(null);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCats.filter(c => !DEFAULT_CATEGORIES.includes(c))];

  const confirmNewCat = (forForm: 'add' | 'edit') => {
    const cat = newCatInput.trim();
    if (!cat) { setAddingCatFor(null); return; }
    if (!DEFAULT_CATEGORIES.includes(cat) && !customCats.includes(cat)) {
      const updated = [...customCats, cat];
      setCustomCats(updated);
      localStorage.setItem('custom_categories', JSON.stringify(updated));
    }
    if (forForm === 'add') setForm(f => ({ ...f, category: cat }));
    else setEditForm(f => ({ ...f, category: cat }));
    setNewCatInput('');
    setAddingCatFor(null);
  };

  function computeCarryForward(allItems: any[]) {
    const now = new Date();
    const cfKey = `cf_dismissed_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (localStorage.getItem(cfKey)) return;

    const lmYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lmMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

    const lmItems = allItems.filter(t => {
      if (!t.date) return false;
      const d = new Date(String(t.date));
      return d.getFullYear() === lmYear && d.getMonth() === lmMonth;
    });
    if (lmItems.length === 0) return;

    // Skip if carry-forward already exists for this month
    const alreadyDone = allItems.some(t => {
      if (!t.date) return false;
      const d = new Date(String(t.date));
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        && String(t.description || '').startsWith('Carry Forward from');
    });
    if (alreadyDone) return;

    const byCur: Record<string, number> = {};
    for (const t of lmItems) {
      const cur = normCur(t);
      if (!byCur[cur]) byCur[cur] = 0;
      if (t.type === 'income') byCur[cur] += Number(t.amount) || 0;
      else byCur[cur] -= Number(t.amount) || 0;
    }
    const candidates = Object.entries(byCur)
      .filter(([, net]) => net > 0.01)
      .map(([cur, net]) => ({ cur, net }));
    setCarryForward(candidates);
  }

  const load = () => getRows('transactions').then(data => {
    setItems(data);
    computeCarryForward(data);
  }).catch(e => setError(e.message));

  useEffect(() => {
    load();
    // Fetch live exchange rates via Google Finance (Apps Script)
    getMarketRates()
      .then(d => {
        if (d.qarInr?.price && d.usdInr?.price) {
          setFxRates({ qarInr: d.qarInr.price, usdInr: d.usdInr.price });
        }
      })
      .catch(() => {}); // silently fail — toggle just won't appear
  }, []);

  // ── helpers ────────────────────────────────────────────────────────────────

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
      markEntryMadeToday();
      setShowForm(false);
      setForm(emptyForm());
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

  // ── edit transaction ───────────────────────────────────────────────────────
  const startEdit = (t: any) => {
    const cur = normCur(t);
    const isCustom = !PRESET_CURRENCIES.includes(cur);
    setEditId(t.id);
    setEditForm({
      type: t.type || 'expense',
      category: allCategories.includes(t.category) ? t.category : (t.category || 'Other'),
      amount: String(t.amount || ''),
      description: t.description || '',
      date: toDateInput(t.date),
      currency: isCustom ? '__custom__' : cur,
    });
    setEditCustomCurrency(isCustom ? cur : '');
    setShowForm(false);
    setTimeout(() => editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    const currency = editForm.currency === '__custom__'
      ? (editCustomCurrency.toUpperCase().trim() || 'QAR')
      : editForm.currency;
    try {
      await updateRow('transactions', editId, {
        type: editForm.type,
        category: editForm.category,
        amount: Number(editForm.amount),
        description: editForm.description,
        date: editForm.date,
        currency,
      });
      setEditId(null);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
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

  // ── carry forward ──────────────────────────────────────────────────────────
  const handleCarryForward = async (cur: string, net: number) => {
    const now = new Date();
    const lmYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lmMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lmName  = new Date(lmYear, lmMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    try {
      await addRow('transactions', {
        id: crypto.randomUUID(),
        type: 'income',
        category: 'Other',
        amount: net,
        currency: cur,
        description: `Carry Forward from ${lmName}`,
        date: firstOfMonth,
      });
      setCarryForward(prev => prev.filter(c => c.cur !== cur));
      load();
    } catch (e: any) { setError(e.message); }
  };

  const dismissCarryForward = () => {
    const now = new Date();
    localStorage.setItem(`cf_dismissed_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, '1');
    setCarryForward([]);
  };

  // ── derived data ───────────────────────────────────────────────────────────
  const availableCurs = ['all', ...Array.from(new Set(items.map(normCur))).sort()];

  // date filter
  const now = new Date();
  const dateFiltered = items.filter(t => {
    if (!t.date) return true;
    const d = new Date(String(t.date));
    if (isNaN(d.getTime())) return true;
    if (dateFilter === 'month')
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (dateFilter === 'lastMonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    }
    if (dateFilter === 'year')
      return d.getFullYear() === now.getFullYear();
    if (dateFilter === 'custom') {
      if (customFrom && d < new Date(customFrom)) return false;
      if (customTo   && d > new Date(customTo))   return false;
    }
    return true;
  });

  const tq = search.toLowerCase();
  const filtered = dateFiltered
    .filter(t => typeFilter === 'all' || t.type === typeFilter)
    .filter(t => curFilter === 'all' || normCur(t) === curFilter)
    .filter(t => !tq || `${t.description} ${t.category}`.toLowerCase().includes(tq));

  // totals grouped by currency (respects date filter)
  const byCurrency = dateFiltered.reduce((acc: Record<string, { income: number; expense: number }>, t) => {
    const cur = normCur(t);
    if (!acc[cur]) acc[cur] = { income: 0, expense: 0 };
    if (t.type === 'income') acc[cur].income += Number(t.amount) || 0;
    else acc[cur].expense += Number(t.amount) || 0;
    return acc;
  }, {});

  const summaryRows = curFilter === 'all'
    ? Object.entries(byCurrency).map(([cur, v]) => ({ cur, ...v }))
    : [{ cur: curFilter, ...(byCurrency[curFilter] || { income: 0, expense: 0 }) }];

  // ── currency conversion ─────────────────────────────────────────────────────
  function convertAmount(amount: number, fromCur: string, toCur: string): number | null {
    if (!fxRates || fromCur === toCur) return null;
    // Pivot through INR
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

  const fmtConverted = (amount: number, fromCur: string): string | null => {
    if (displayCurrency === 'original' || displayCurrency === fromCur) return null;
    const v = convertAmount(amount, fromCur, displayCurrency);
    if (v === null) return null;
    return `≈ ${fmt(v, displayCurrency)}`;
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Transactions</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Track your income and expenses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm">
            + Add Transaction
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search transactions…"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* Carry-forward banner */}
      {carryForward.length > 0 && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-violet-800 dark:text-violet-300 mb-2">📅 Last month surplus — carry forward?</p>
              <div className="space-y-2">
                {carryForward.map(({ cur, net }) => (
                  <div key={cur} className="flex flex-wrap items-center gap-3">
                    <span className="text-slate-600 dark:text-slate-300">
                      Net surplus ({cur}): <span className="font-semibold text-emerald-600">{fmt(net, cur)}</span>
                    </span>
                    <button
                      onClick={() => handleCarryForward(cur, net)}
                      className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors">
                      + Add as income for this month
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={dismissCarryForward} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0 text-base">✕</button>
          </div>
        </div>
      )}

      {/* Currency tabs (only show when >1 currency in data) */}
      {availableCurs.length > 2 && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-fit overflow-x-auto">
          {availableCurs.map(c => (
            <button key={c} onClick={() => setCurFilter(c)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${curFilter === c ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              {c === 'all' ? 'All currencies' : c}
            </button>
          ))}
        </div>
      )}

      {/* Date filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          {([
            { key: 'month',     label: 'This Month' },
            { key: 'lastMonth', label: 'Last Month' },
            { key: 'year',      label: 'This Year'  },
            { key: 'custom',    label: 'Custom'      },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setDateFilter(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${dateFilter === key ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        )}
      </div>

      {/* Totals — grouped by currency */}
      <div className={`grid gap-3 md:gap-4 ${summaryRows.length === 1 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
        {summaryRows.map(({ cur, income, expense }) => (
          <div key={cur} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-3">{cur}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500">Income</span>
                <span className="font-semibold text-emerald-600">{fmt(income, cur)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 dark:text-slate-500">Expenses</span>
                <span className="font-semibold text-rose-500">{fmt(expense, cur)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-slate-50 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Net</span>
                <span className={`font-bold ${income - expense >= 0 ? 'text-violet-600' : 'text-rose-500'}`}>
                  {fmt(income - expense, cur)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Consolidated total card — shown when a display currency is chosen and fxRates are available */}
        {displayCurrency !== 'original' && fxRates && summaryRows.length > 1 && (() => {
          const totals = summaryRows.reduce(
            (acc, { cur, income, expense }) => {
              const inc = convertAmount(income, cur, displayCurrency) ?? 0;
              const exp = convertAmount(expense, cur, displayCurrency) ?? 0;
              return { income: acc.income + inc, expense: acc.expense + exp };
            },
            { income: 0, expense: 0 }
          );
          const net = totals.income - totals.expense;
          return (
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-5 border border-violet-200 dark:border-violet-700 shadow-sm">
              <p className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-1">All → {displayCurrency}</p>
              <p className="text-[10px] text-violet-400 dark:text-violet-500 mb-3">Consolidated at live rates</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 dark:text-slate-500">Income</span>
                  <span className="font-semibold text-emerald-600">{fmt(totals.income, displayCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 dark:text-slate-500">Expenses</span>
                  <span className="font-semibold text-rose-500">{fmt(totals.expense, displayCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5 border-t border-violet-100 dark:border-violet-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Net</span>
                  <span className={`font-bold ${net >= 0 ? 'text-violet-600' : 'text-rose-500'}`}>
                    {fmt(net, displayCurrency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 dark:bg-slate-700/30">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">New Transaction</h3>
          </div>
          <form onSubmit={handleAdd} className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</label>
              <div className="flex gap-2 mt-1.5">
                {['income', 'expense'].map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      form.type === t
                        ? t === 'income' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}>
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</label>
              <select
                value={form.category}
                onChange={e => {
                  if (e.target.value === '__add_custom__') { setAddingCatFor('add'); setNewCatInput(''); }
                  else setForm({ ...form, category: e.target.value });
                }}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400">
                {allCategories.map(c => <option key={c}>{c}</option>)}
                <option value="__add_custom__">+ Add custom category…</option>
              </select>
              {addingCatFor === 'add' && (
                <div className="flex gap-2 mt-1.5">
                  <input
                    autoFocus
                    value={newCatInput}
                    onChange={e => setNewCatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCat('add'); } if (e.key === 'Escape') setAddingCatFor(null); }}
                    placeholder="Category name"
                    className="flex-1 text-sm border border-violet-300 dark:border-violet-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-700 dark:text-slate-100"
                  />
                  <button type="button" onClick={() => confirmNewCat('add')} className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">Add</button>
                  <button type="button" onClick={() => setAddingCatFor(null)} className="px-3 py-1.5 text-slate-500 text-sm rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">✕</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400">
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
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Amount ({form.currency === '__custom__' ? (customCurrency || '?') : form.currency})
              </label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Note (optional)</label>
              <input placeholder="What was this for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm()); setCustomCurrency(''); }}
                className="px-5 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit form */}
      {editId && (
        <div ref={editFormRef} className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-violet-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-violet-50/50 dark:bg-violet-900/20 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Edit Transaction</h3>
            <button onClick={() => setEditId(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none">✕</button>
          </div>
          <form onSubmit={saveEdit} className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</label>
              <div className="flex gap-2 mt-1.5">
                {['income', 'expense'].map(t => (
                  <button key={t} type="button" onClick={() => setEditForm({ ...editForm, type: t })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      editForm.type === t
                        ? t === 'income' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}>
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</label>
              <select
                value={editForm.category}
                onChange={e => {
                  if (e.target.value === '__add_custom__') { setAddingCatFor('edit'); setNewCatInput(''); }
                  else setEditForm({ ...editForm, category: e.target.value });
                }}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400">
                {allCategories.map(c => <option key={c}>{c}</option>)}
                <option value="__add_custom__">+ Add custom category…</option>
              </select>
              {addingCatFor === 'edit' && (
                <div className="flex gap-2 mt-1.5">
                  <input
                    autoFocus
                    value={newCatInput}
                    onChange={e => setNewCatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCat('edit'); } if (e.key === 'Escape') setAddingCatFor(null); }}
                    placeholder="Category name"
                    className="flex-1 text-sm border border-violet-300 dark:border-violet-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-slate-700 dark:text-slate-100"
                  />
                  <button type="button" onClick={() => confirmNewCat('edit')} className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">Add</button>
                  <button type="button" onClick={() => setAddingCatFor(null)} className="px-3 py-1.5 text-slate-500 text-sm rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">✕</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency</label>
              <select value={editForm.currency} onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400">
                {PRESET_CURRENCIES.map(c => <option key={c} value={c}>{currSym(c)} {c}</option>)}
                <option value="__custom__">Other (custom)…</option>
              </select>
              {editForm.currency === '__custom__' && (
                <input
                  placeholder="e.g. CHF, KWD, BHD"
                  value={editCustomCurrency}
                  onChange={e => setEditCustomCurrency(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-full mt-2 border border-violet-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Amount ({editForm.currency === '__custom__' ? (editCustomCurrency || '?') : editForm.currency})
              </label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={editForm.amount}
                onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</label>
              <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Note (optional)</label>
              <input placeholder="What was this for?" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full mt-1.5 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => setEditId(null)}
                className="px-5 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Update Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-slate-50 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} records</p>
          <div className="flex flex-wrap items-center gap-2">
            {/* View-in currency toggle */}
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
            {/* Type filter */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              {(['all', 'income', 'expense'] as const).map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${typeFilter === f ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No transactions yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Click "Add Transaction" to get started</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Note</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Currency</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {filtered.map(t => (
                  <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group ${editId === t.id ? 'bg-violet-50/40 dark:bg-violet-900/20' : ''}`}>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{t.category}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{t.type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs max-w-xs truncate">{t.description || '—'}</td>
                    <td className="px-5 py-3.5">
                      {editCurId === t.id ? (
                        <div className="flex items-center gap-1">
                          <select value={editCurVal} onChange={e => setEditCurVal(e.target.value)}
                            className="border border-slate-200 dark:border-slate-600 rounded px-1.5 py-1 text-xs bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-400">
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
                          className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-400 transition-colors">
                          {normCur(t)}
                        </button>
                      )}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount), normCur(t))}
                      {(() => { const c = fmtConverted(Number(t.amount), normCur(t)); return c ? <div className="text-xs font-normal text-slate-400 dark:text-slate-500 mt-0.5">{c}</div> : null; })()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => editId === t.id ? setEditId(null) : startEdit(t)}
                          className={`transition-colors opacity-0 group-hover:opacity-100 text-sm px-1 ${editId === t.id ? 'text-violet-500 opacity-100' : 'text-slate-300 hover:text-violet-500'}`}
                          title="Edit">✎</button>
                        <button onClick={() => handleDelete(t.id)}
                          className="text-slate-200 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-base font-bold" title="Delete">×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-slate-50 dark:divide-slate-700">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-700/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>{t.type === 'income' ? '↑' : '↓'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.category}</p>
                        <button onClick={() => startEditCur(t)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 flex-shrink-0">
                          {normCur(t)}
                        </button>
                      </div>
                      {editCurId === t.id && (
                        <div className="flex items-center gap-1 mt-1">
                          <select value={editCurVal} onChange={e => setEditCurVal(e.target.value)}
                            className="border border-slate-200 dark:border-slate-600 rounded px-1.5 py-1 text-xs bg-white dark:bg-slate-700 dark:text-slate-100">
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
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.description || new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount), normCur(t))}
                      </p>
                      {(() => { const c = fmtConverted(Number(t.amount), normCur(t)); return c ? <p className="text-[10px] text-slate-400 dark:text-slate-500">{c}</p> : null; })()}
                    </div>
                    <button onClick={() => editId === t.id ? setEditId(null) : startEdit(t)}
                      className={`text-base px-1 transition-colors ${editId === t.id ? 'text-violet-500' : 'text-slate-300 hover:text-violet-500'}`} title="Edit">✎</button>
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
