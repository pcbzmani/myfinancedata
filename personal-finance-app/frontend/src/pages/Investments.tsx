import { useEffect, useState } from 'react';
import { getRows, addRow, deleteRow, getMarketPrice } from '../lib/api';

const TYPES = ['stocks', 'mutual_fund', 'crypto', 'fd', 'ppf', 'other'];
const MARKET_TYPES = ['stocks', 'mutual_fund']; // auto-fetch price
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  stocks:      { label: 'Stocks',       color: 'text-blue-700',    bg: 'bg-blue-100' },
  mutual_fund: { label: 'Mutual Fund',  color: 'text-violet-700',  bg: 'bg-violet-100' },
  crypto:      { label: 'Crypto',       color: 'text-amber-700',   bg: 'bg-amber-100' },
  fd:          { label: 'FD',           color: 'text-emerald-700', bg: 'bg-emerald-100' },
  ppf:         { label: 'PPF',          color: 'text-teal-700',    bg: 'bg-teal-100' },
  other:       { label: 'Other',        color: 'text-slate-600',   bg: 'bg-slate-100' },
};
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY = { type: 'stocks', name: '', symbol: '', units: '', buyPrice: '', currentValue: '' };

export default function Investments() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // price fetch state
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(null);
  const [fetchedName, setFetchedName] = useState('');
  const [priceError, setPriceError] = useState('');

  const load = () => getRows('investments').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const isMarketType = MARKET_TYPES.includes(form.type);
  const computedInvested = (Number(form.units) || 0) * (Number(form.buyPrice) || 0);
  const computedCurrentValue = isMarketType && fetchedPrice !== null
    ? (Number(form.units) || 0) * fetchedPrice
    : null;

  const handleTypeChange = (type: string) => {
    setForm({ ...EMPTY, type });
    setFetchedPrice(null);
    setFetchedName('');
    setPriceError('');
  };

  const handleFetchPrice = async () => {
    if (!form.symbol.trim()) { setPriceError('Enter a symbol first'); return; }
    setFetchingPrice(true);
    setPriceError('');
    setFetchedPrice(null);
    try {
      const data = await getMarketPrice(form.symbol.trim());
      setFetchedPrice(data.price);
      setFetchedName(data.name);
    } catch (e: any) {
      setPriceError(e.message);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMarketType && fetchedPrice === null) {
      setPriceError('Fetch the current price before saving');
      return;
    }
    setSaving(true);
    try {
      const currentValue = isMarketType ? computedCurrentValue! : Number(form.currentValue);
      await addRow('investments', {
        id: crypto.randomUUID(),
        type: form.type,
        name: form.name || (isMarketType && fetchedName ? fetchedName : form.symbol),
        symbol: form.symbol,
        units: Number(form.units),
        buyPrice: Number(form.buyPrice),
        amountInvested: computedInvested,
        currentValue,
      });
      setShowForm(false);
      setForm(EMPTY);
      setFetchedPrice(null);
      setFetchedName('');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteRow('investments', id); load(); }
    catch (e: any) { setError(e.message); }
  };

  const totalInvested = items.reduce((s, i) => s + Number(i.amountInvested || 0), 0);
  const totalCurrent = items.reduce((s, i) => s + Number(i.currentValue || 0), 0);
  const gain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((gain / totalInvested) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Investments</h1>
          <p className="text-sm text-slate-400 mt-0.5">Stocks, mutual funds, crypto &amp; more</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFetchedPrice(null); setPriceError(''); }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Add
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
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
          <div className="px-4 md:px-6 py-4 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-semibold text-slate-700">Add Investment</h3>
          </div>
          <form onSubmit={handleAdd} className="p-4 md:p-6 space-y-4">

            {/* Type selector */}
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TYPES.map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                      form.type === t
                        ? `${TYPE_META[t].bg} ${TYPE_META[t].color} border-transparent`
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {isMarketType ? 'Display Name (optional)' : 'Name'}
                </label>
                <input
                  placeholder={isMarketType ? 'Auto-filled from symbol' : 'e.g. HDFC Fixed Deposit'}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required={!isMarketType}
                  className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Symbol — only for stocks/MF */}
              {isMarketType && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Yahoo Finance Symbol *
                  </label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      placeholder={form.type === 'stocks' ? 'e.g. RELIANCE.NS' : 'e.g. 0P0001ISIZ.BO'}
                      value={form.symbol}
                      onChange={e => { setForm({ ...form, symbol: e.target.value }); setFetchedPrice(null); setPriceError(''); }}
                      required
                      className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      type="button"
                      onClick={handleFetchPrice}
                      disabled={fetchingPrice || !form.symbol.trim()}
                      className="flex-shrink-0 px-3 py-2 bg-slate-700 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {fetchingPrice ? '…' : 'Fetch Price'}
                    </button>
                  </div>
                  {/* Hint */}
                  <p className="text-xs text-slate-400 mt-1">
                    NSE stocks: <span className="font-mono">SYMBOL.NS</span> · BSE: <span className="font-mono">SYMBOL.BO</span>
                  </p>
                  {/* Price result */}
                  {fetchedPrice !== null && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-emerald-600 text-xs font-semibold">✓</span>
                      <span className="text-xs text-emerald-700 font-medium">
                        {fetchedName && <span className="mr-1">{fetchedName} —</span>}
                        Current price: <strong>₹{fetchedPrice.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  )}
                  {priceError && (
                    <p className="mt-1.5 text-xs text-rose-500">{priceError}</p>
                  )}
                </div>
              )}

              {/* Qty */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity / Units *</label>
                <input
                  type="number" min="0" step="any" placeholder="0"
                  value={form.units}
                  onChange={e => setForm({ ...form, units: e.target.value })}
                  required
                  className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Avg Buy Price */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Buy Price (₹) *</label>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.buyPrice}
                  onChange={e => setForm({ ...form, buyPrice: e.target.value })}
                  required
                  className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Amount Invested — always computed, shown read-only */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount Invested (computed)</label>
                <div className="mt-1.5 border border-slate-100 bg-slate-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700">
                  {computedInvested > 0 ? fmt(computedInvested) : <span className="text-slate-400 font-normal">Qty × Avg Price</span>}
                </div>
              </div>

              {/* Current Value — auto for stocks/MF, manual for others */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Current Value {isMarketType ? '(auto from market price)' : '*'}
                </label>
                {isMarketType ? (
                  <div className="mt-1.5 border border-slate-100 bg-slate-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700">
                    {computedCurrentValue !== null && computedCurrentValue > 0
                      ? fmt(computedCurrentValue)
                      : <span className="text-slate-400 font-normal">Fetch price above</span>
                    }
                  </div>
                ) : (
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.currentValue}
                    onChange={e => setForm({ ...form, currentValue: e.target.value })}
                    required
                    className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); setFetchedPrice(null); setPriceError(''); }}
                className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button type="submit" disabled={saving || (isMarketType && fetchedPrice === null)}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
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
          <p className="text-sm text-slate-400 mt-1">Click "Add" to track your portfolio</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(inv => {
            const invested = Number(inv.amountInvested) || (Number(inv.units || 0) * Number(inv.buyPrice || 0));
            const current = Number(inv.currentValue) || 0;
            const g = current - invested;
            const gPct = invested > 0 ? ((g / invested) * 100).toFixed(1) : '0.0';
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

                <p className="font-semibold text-slate-800 text-base mb-0.5">
                  {inv.name || inv.symbol || '—'}
                </p>
                {inv.symbol && inv.name && inv.symbol !== inv.name && (
                  <p className="text-xs text-slate-400 font-mono mb-3">{inv.symbol}</p>
                )}
                {!inv.name && !inv.symbol && <div className="mb-3" />}
                {inv.symbol && (!inv.name || inv.symbol === inv.name) && <div className="mb-3" />}

                {/* Units & avg price */}
                {inv.units > 0 && (
                  <p className="text-xs text-slate-400 mb-3">
                    {Number(inv.units).toLocaleString('en-IN')} units
                    {inv.buyPrice > 0 && ` @ ₹${Number(inv.buyPrice).toLocaleString('en-IN')} avg`}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-slate-400">Invested</p>
                    <p className="font-semibold text-slate-700 mt-0.5">{fmt(invested)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Current</p>
                    <p className="font-semibold text-blue-600 mt-0.5">{fmt(current)}</p>
                  </div>
                </div>
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${g >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                  <span>{g >= 0 ? '▲' : '▼'} P&amp;L</span>
                  <span>{g >= 0 ? '+' : ''}{fmt(g)} ({gPct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
