import { useEffect, useRef, useState } from 'react';
import { getRows, addRow, deleteRow, updateRow } from '../lib/api';

/* ─── Constants ─── */
const CATEGORIES = ['banking', 'social', 'work', 'shopping', 'entertainment', 'email', 'other'] as const;
type Category = typeof CATEGORIES[number];

const PIN_HASH_KEY  = 'vault_pin_hash';
const SESSION_KEY   = 'vault_unlocked';
const SALT          = 'myfinance_vault_v1_salt';

const CAT_META: Record<Category, { emoji: string; color: string; bg: string; border: string }> = {
  banking:       { emoji: '🏦', color: 'text-emerald-700 dark:text-emerald-400',  bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-200 dark:border-emerald-700' },
  social:        { emoji: '💬', color: 'text-blue-700 dark:text-blue-400',         bg: 'bg-blue-50 dark:bg-blue-900/20',         border: 'border-blue-200 dark:border-blue-700' },
  work:          { emoji: '💼', color: 'text-violet-700 dark:text-violet-400',     bg: 'bg-violet-50 dark:bg-violet-900/20',     border: 'border-violet-200 dark:border-violet-700' },
  shopping:      { emoji: '🛒', color: 'text-amber-700 dark:text-amber-400',       bg: 'bg-amber-50 dark:bg-amber-900/20',       border: 'border-amber-200 dark:border-amber-700' },
  entertainment: { emoji: '🎬', color: 'text-purple-700 dark:text-purple-400',     bg: 'bg-purple-50 dark:bg-purple-900/20',     border: 'border-purple-200 dark:border-purple-700' },
  email:         { emoji: '✉️',  color: 'text-rose-700 dark:text-rose-400',         bg: 'bg-rose-50 dark:bg-rose-900/20',         border: 'border-rose-200 dark:border-rose-700' },
  other:         { emoji: '🔑', color: 'text-slate-700 dark:text-slate-300',       bg: 'bg-slate-50 dark:bg-slate-800',          border: 'border-slate-200 dark:border-slate-600' },
};

/* ─── Crypto helpers ─── */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + SALT);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generatePassword(opts: { length: number; upper: boolean; numbers: boolean; symbols: boolean }): string {
  const lower   = 'abcdefghijkmnopqrstuvwxyz';
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums    = '23456789';
  const syms    = '!@#$%&*_+-=?';
  let chars = lower;
  if (opts.upper)   chars += upper;
  if (opts.numbers) chars += nums;
  if (opts.symbols) chars += syms;
  const arr = new Uint8Array(opts.length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

/* ─── Pin lock screen ─── */
function PinScreen({ mode, onSubmit }: { mode: 'setup' | 'enter'; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) { setErr('PIN must be at least 4 characters.'); return; }
    if (mode === 'setup' && pin !== confirm) { setErr('PINs do not match.'); return; }
    setErr('');
    onSubmit(pin);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-lg w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {mode === 'setup' ? 'Create Vault PIN' : 'Unlock Vault'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'setup'
              ? 'Set a PIN to protect your passwords. You\'ll need this each session.'
              : 'Enter your PIN to access stored passwords.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {mode === 'setup' ? 'Create PIN' : 'Enter PIN'}
            </label>
            <input
              ref={inputRef}
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN (min 4 characters)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              autoComplete="off"
            />
          </div>
          {mode === 'setup' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Confirm PIN</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter PIN"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                autoComplete="off"
              />
            </div>
          )}
          {err && <p className="text-sm text-rose-600 dark:text-rose-400">{err}</p>}
          <button type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
            {mode === 'setup' ? 'Create PIN & Open Vault' : 'Unlock'}
          </button>
        </form>

        {mode === 'enter' && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
            Forgot your PIN?{' '}
            <button
              onClick={() => { if (confirm('This will erase your saved PIN (but NOT your stored passwords). Continue?')) { localStorage.removeItem(PIN_HASH_KEY); window.location.reload(); } }}
              className="text-violet-500 hover:underline">
              Reset PIN
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Password generator panel ─── */
function PasswordGenerator({ onUse }: { onUse?: (pw: string) => void }) {
  const [opts, setOpts] = useState({ length: 16, upper: true, numbers: true, symbols: true });
  const [pw, setPw] = useState('');
  const [copied, setCopied] = useState(false);

  function generate() {
    setPw(generatePassword(opts));
    setCopied(false);
  }

  function copy() {
    if (!pw) return;
    navigator.clipboard.writeText(pw).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Password Generator</p>
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-600 dark:text-slate-400 w-16">Length: {opts.length}</label>
        <input type="range" min={8} max={32} value={opts.length}
          onChange={e => setOpts(p => ({ ...p, length: Number(e.target.value) }))}
          className="flex-1 accent-violet-600" />
      </div>
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'upper',   label: 'Uppercase' },
          { key: 'numbers', label: 'Numbers' },
          { key: 'symbols', label: 'Symbols' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={(opts as any)[key]}
              onChange={e => setOpts(p => ({ ...p, [key]: e.target.checked }))}
              className="accent-violet-600 w-3.5 h-3.5" />
            {label}
          </label>
        ))}
      </div>
      {pw && (
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-800 dark:text-slate-200 truncate">
            {pw}
          </code>
          <button onClick={copy} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors" title="Copy">
            {copied
              ? <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            }
          </button>
          {onUse && (
            <button onClick={() => onUse(pw)} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors">
              Use
            </button>
          )}
        </div>
      )}
      <button onClick={generate}
        className="w-full py-1.5 rounded-lg border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 text-xs font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
        Generate Password
      </button>
    </div>
  );
}

/* ─── Main Vault component ─── */
const EMPTY_FORM = { siteName: '', siteUrl: '', category: 'other' as Category, username: '', email: '', password: '', notes: '' };

export default function Vault() {
  const [unlocked, setUnlocked]     = useState(false);
  const [pinMode, setPinMode]       = useState<'setup' | 'enter'>('enter');
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [catFilter, setCatFilter]   = useState<'all' | Category>('all');
  const [revealed, setRevealed]     = useState<Set<string>>(new Set());
  const [copied, setCopied]         = useState<string | null>(null);
  const [editId, setEditId]         = useState<string | null>(null);
  const [showGen, setShowGen]       = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  /* Check session on mount */
  useEffect(() => {
    const pinHash = localStorage.getItem(PIN_HASH_KEY);
    if (!pinHash) {
      setPinMode('setup');
    } else {
      const sessionOk = sessionStorage.getItem(SESSION_KEY) === 'true';
      if (sessionOk) {
        setUnlocked(true);
        loadItems();
      } else {
        setPinMode('enter');
      }
    }
  }, []);

  async function handlePinSubmit(pin: string) {
    const hash = await hashPin(pin);
    if (pinMode === 'setup') {
      localStorage.setItem(PIN_HASH_KEY, hash);
      sessionStorage.setItem(SESSION_KEY, 'true');
      setUnlocked(true);
      loadItems();
    } else {
      const stored = localStorage.getItem(PIN_HASH_KEY);
      if (hash === stored) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        setUnlocked(true);
        loadItems();
      } else {
        alert('Incorrect PIN. Please try again.');
      }
    }
  }

  function handleLock() {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setItems([]);
    setRevealed(new Set());
    setPinMode('enter');
  }

  async function loadItems() {
    setLoading(true);
    try {
      setItems(await getRows('vault'));
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.siteName.trim() || !form.password) { setError('Site name and password are required.'); return; }
    setSaving(true);
    try {
      const row = {
        id: Date.now().toString(),
        siteName: form.siteName.trim(),
        siteUrl: form.siteUrl,
        category: form.category,
        username: form.username,
        email: form.email,
        password: form.password,
        notes: form.notes,
        createdAt: new Date().toISOString(),
      };
      await addRow('vault', row);
      setItems(prev => [row, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry permanently?')) return;
    try {
      await deleteRow('vault', id);
      setItems(prev => prev.filter(i => i.id !== id));
      setRevealed(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch (e: any) {
      setError(e.message);
    }
  }

  function toggleReveal(id: string) {
    setRevealed(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function startEdit(item: any) {
    setEditId(item.id);
    setForm({ siteName: item.siteName, siteUrl: item.siteUrl || '', category: item.category, username: item.username || '', email: item.email || '', password: item.password, notes: item.notes || '' });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.siteName.trim() || !form.password) { setError('Site name and password are required.'); return; }
    setSaving(true);
    try {
      const updates = { siteName: form.siteName.trim(), siteUrl: form.siteUrl, category: form.category, username: form.username, email: form.email, password: form.password, notes: form.notes };
      await updateRow('vault', editId!, updates);
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...updates } : i));
      setEditId(null);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  /* ─── Not unlocked: show PIN screen ─── */
  if (!unlocked) return <PinScreen mode={pinMode} onSubmit={handlePinSubmit} />;

  const filtered = catFilter === 'all' ? items : items.filter(i => i.category === catFilter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Password Vault</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Securely stored in your private Google Sheet</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGen(p => !p)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            Generator
          </button>
          <button
            onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); setError(''); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Entry
          </button>
          <button onClick={handleLock}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            title="Lock vault">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-2">
          <span>⚠️</span> {error}
          <button onClick={() => setError('')} className="ml-auto text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {/* Password generator panel */}
      {showGen && (
        <div className="mb-5">
          <PasswordGenerator onUse={pw => { setForm(p => ({ ...p, password: pw })); setShowGen(false); if (!showForm) { setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); } }} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {([...CATEGORIES] as Category[]).map(cat => {
          const count = items.filter(i => i.category === cat).length;
          if (count === 0) return null;
          const m = CAT_META[cat];
          return (
            <button key={cat} onClick={() => setCatFilter(p => p === cat ? 'all' : cat)}
              className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${catFilter === cat ? `${m.bg} ${m.border}` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}>
              <p className="text-lg">{m.emoji}</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize mt-0.5">{cat}</p>
              <p className={`text-xl font-bold ${m.color}`}>{count}</p>
            </button>
          );
        })}
        <button onClick={() => setCatFilter('all')}
          className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${catFilter === 'all' ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
          <p className="text-lg">🔐</p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">All</p>
          <p className="text-xl font-bold text-violet-700 dark:text-violet-400">{items.length}</p>
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {([['all', '🔐', 'All']] as [string, string, string][]).concat(CATEGORIES.map(c => [c, CAT_META[c as Category].emoji, c.charAt(0).toUpperCase() + c.slice(1)] as [string, string, string])).map(([val, emoji, label]) => (
          <button key={val} onClick={() => setCatFilter(val as any)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${catFilter === val ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div ref={formRef} className="mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{editId ? 'Edit Entry' : 'New Entry'}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setError(''); }} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
          </div>
          <form onSubmit={editId ? handleUpdate : handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Site / App Name *</label>
                <input value={form.siteName} onChange={e => setForm(p => ({ ...p, siteName: e.target.value }))}
                  placeholder="e.g. Gmail, GitHub, Netflix"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as Category }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_META[c].emoji} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Website URL <span className="text-slate-400">(optional)</span></label>
                <input type="url" value={form.siteUrl} onChange={e => setForm(p => ({ ...p, siteUrl: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Username <span className="text-slate-400">(optional)</span></label>
                <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="your_username"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email <span className="text-slate-400">(optional)</span></label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Password *</label>
                <div className="flex gap-2">
                  <input type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Enter or generate a password"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                    required autoComplete="off" />
                  <button type="button" onClick={() => setForm(p => ({ ...p, password: generatePassword({ length: 16, upper: true, numbers: true, symbols: true }) }))}
                    className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-violet-600 hover:border-violet-300 text-xs transition-colors" title="Generate">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes <span className="text-slate-400">(optional)</span></label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. 2FA enabled, recovery email stored in..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white py-2 rounded-xl text-sm font-medium transition-colors">
                {saving ? 'Saving…' : editId ? 'Update Entry' : 'Save Entry'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
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
          <p className="text-sm">Loading vault…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔐</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">Vault is empty</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add your first password entry above</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Site / App</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Username / Email</th>
                <th className="text-left px-4 py-3">Password</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(item => {
                const cat = CAT_META[item.category as Category] || CAT_META.other;
                const isRevealed = revealed.has(item.id);
                const isCopied = copied === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cat.bg} border ${cat.border} flex items-center justify-center text-base flex-shrink-0`}>
                          {cat.emoji}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100">{item.siteName}</p>
                          {item.siteUrl && (
                            <a href={item.siteUrl} target="_blank" rel="noopener noreferrer"
                              className={`text-xs ${cat.color} hover:underline`}>
                              {(() => { try { return new URL(item.siteUrl).hostname; } catch { return item.siteUrl; } })()}
                            </a>
                          )}
                          {item.notes && <p className="text-xs text-slate-400 dark:text-slate-500 italic truncate max-w-[160px]">{item.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {item.username && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400 dark:text-slate-500 w-12">user:</span>
                            <span className="text-slate-700 dark:text-slate-300 text-xs">{item.username}</span>
                            <button onClick={() => copyToClipboard(item.username, `u-${item.id}`)} className="text-slate-300 hover:text-violet-500 transition-colors ml-1">
                              {copied === `u-${item.id}` ? '✓' : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
                            </button>
                          </div>
                        )}
                        {item.email && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400 dark:text-slate-500 w-12">email:</span>
                            <span className="text-slate-700 dark:text-slate-300 text-xs">{item.email}</span>
                            <button onClick={() => copyToClipboard(item.email, `e-${item.id}`)} className="text-slate-300 hover:text-violet-500 transition-colors ml-1">
                              {copied === `e-${item.id}` ? '✓' : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2v1" /></svg>}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded max-w-[120px] truncate">
                          {isRevealed ? item.password : '••••••••••'}
                        </code>
                        <button onClick={() => toggleReveal(item.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
                          title={isRevealed ? 'Hide' : 'Show'}>
                          {isRevealed
                            ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          }
                        </button>
                        <button onClick={() => copyToClipboard(item.password, item.id)}
                          className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex-shrink-0"
                          title="Copy password">
                          {isCopied
                            ? <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          }
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          title="Edit">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors"
                          title="Delete">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Security notice */}
      <div className="mt-6 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Passwords are stored in your own private Google Sheet (not visible to anyone else). The vault locks automatically when you close or refresh the browser tab. PIN is never transmitted — only stored locally as a SHA-256 hash.</span>
      </div>
    </div>
  );
}
