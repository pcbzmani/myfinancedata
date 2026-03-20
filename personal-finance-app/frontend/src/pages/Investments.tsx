import { useEffect, useRef, useState } from 'react';
import { getRows, addRow, deleteRow, updateRow } from '../lib/api';

const TYPES = ['stocks', 'mutual_fund', 'crypto', 'fd', 'ppf', 'other'];
const MARKET_TYPES = ['stocks', 'mutual_fund'];
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  stocks:      { label: 'Stocks',      color: 'text-blue-700',    bg: 'bg-blue-100' },
  mutual_fund: { label: 'Mutual Fund', color: 'text-violet-700',  bg: 'bg-violet-100' },
  crypto:      { label: 'Crypto',      color: 'text-amber-700',   bg: 'bg-amber-100' },
  fd:          { label: 'FD',          color: 'text-emerald-700', bg: 'bg-emerald-100' },
  ppf:         { label: 'PPF',         color: 'text-teal-700',    bg: 'bg-teal-100' },
  other:       { label: 'Other',       color: 'text-slate-600',   bg: 'bg-slate-100' },
};

// Popular NSE stocks — user picks from this list instead of typing tickers
const POPULAR_STOCKS = [
  { name: 'Infosys',               symbol: 'INFY.NS' },
  { name: 'TCS',                   symbol: 'TCS.NS' },
  { name: 'Reliance Industries',   symbol: 'RELIANCE.NS' },
  { name: 'HDFC Bank',             symbol: 'HDFCBANK.NS' },
  { name: 'ICICI Bank',            symbol: 'ICICIBANK.NS' },
  { name: 'Wipro',                 symbol: 'WIPRO.NS' },
  { name: 'HCL Technologies',      symbol: 'HCLTECH.NS' },
  { name: 'Bajaj Finance',         symbol: 'BAJFINANCE.NS' },
  { name: 'Kotak Mahindra Bank',   symbol: 'KOTAKBANK.NS' },
  { name: 'Axis Bank',             symbol: 'AXISBANK.NS' },
  { name: 'State Bank of India',   symbol: 'SBIN.NS' },
  { name: 'Maruti Suzuki',         symbol: 'MARUTI.NS' },
  { name: 'Asian Paints',          symbol: 'ASIANPAINT.NS' },
  { name: 'Titan Company',         symbol: 'TITAN.NS' },
  { name: 'Nestle India',          symbol: 'NESTLEIND.NS' },
  { name: 'Hindustan Unilever',    symbol: 'HINDUNILVR.NS' },
  { name: 'ITC',                   symbol: 'ITC.NS' },
  { name: 'Bharti Airtel',         symbol: 'BHARTIARTL.NS' },
  { name: 'Adani Enterprises',     symbol: 'ADANIENT.NS' },
  { name: 'Larsen & Toubro',       symbol: 'LT.NS' },
  { name: 'Sun Pharma',            symbol: 'SUNPHARMA.NS' },
  { name: "Dr. Reddy's Labs",      symbol: 'DRREDDY.NS' },
  { name: 'Tata Motors',           symbol: 'TATAMOTORS.NS' },
  { name: 'Tata Steel',            symbol: 'TATASTEEL.NS' },
  { name: 'Power Grid Corp',       symbol: 'POWERGRID.NS' },
  { name: 'NTPC',                  symbol: 'NTPC.NS' },
  { name: 'ONGC',                  symbol: 'ONGC.NS' },
  { name: 'UltraTech Cement',      symbol: 'ULTRACEMCO.NS' },
  { name: 'Bajaj Auto',            symbol: 'BAJAJ-AUTO.NS' },
  { name: 'Hero MotoCorp',         symbol: 'HEROMOTOCO.NS' },
  { name: 'Tech Mahindra',         symbol: 'TECHM.NS' },
  { name: 'IndusInd Bank',         symbol: 'INDUSINDBK.NS' },
  { name: 'Adani Ports',           symbol: 'ADANIPORTS.NS' },
  { name: 'Cipla',                 symbol: 'CIPLA.NS' },
  { name: 'Eicher Motors',         symbol: 'EICHERMOT.NS' },
  { name: 'JSW Steel',             symbol: 'JSWSTEEL.NS' },
  { name: 'Mahindra & Mahindra',   symbol: 'M&M.NS' },
  { name: 'Tata Consumer Products',symbol: 'TATACONSUM.NS' },
  { name: 'Divis Laboratories',    symbol: 'DIVISLAB.NS' },
  { name: 'Bajaj Finserv',         symbol: 'BAJAJFINSV.NS' },
  { name: 'Coal India',            symbol: 'COALINDIA.NS' },
  { name: 'Zomato',                symbol: 'ZOMATO.NS' },
  { name: 'Paytm (One97 Comm.)',   symbol: 'PAYTM.NS' },
  { name: 'Nykaa (FSN E-Commerce)',symbol: 'NYKAA.NS' },
];

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY = { type: 'stocks', name: '', symbol: '', units: '', buyPrice: '', currentValue: '' };

export default function Investments() {
  const [items, setItems]       = useState<any[]>([]);
  const [form, setForm]         = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Stock search combobox
  const [stockSearch, setStockSearch]           = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Edit modal
  const [editItem, setEditItem]   = useState<any>(null);
  const [editForm, setEditForm]   = useState<any>(null);
  const [updating, setUpdating]   = useState(false);

  const load = () => getRows('investments').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  // Close stock dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowStockDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isMarketType       = MARKET_TYPES.includes(form.type);
  const computedInvested   = (Number(form.units) || 0) * (Number(form.buyPrice) || 0);
  const editIsMarket       = editItem ? MARKET_TYPES.includes(editItem.type) : false;
  const editComputedInvested = editForm
    ? (Number(editForm.units) || 0) * (Number(editForm.buyPrice) || 0)
    : 0;

  const filteredStocks = stockSearch
    ? POPULAR_STOCKS.filter(s =>
        s.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        s.symbol.toLowerCase().includes(stockSearch.toLowerCase()))
    : POPULAR_STOCKS;

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleTypeChange = (type: string) => {
    setForm({ ...EMPTY, type });
    setStockSearch('');
    setShowStockDropdown(false);
  };

  const handleSelectStock = (stock: { name: string; symbol: string }) => {
    setForm({ ...form, symbol: stock.symbol, name: stock.name });
    setStockSearch(stock.name);
    setShowStockDropdown(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMarketType && !form.symbol) { setError('Please select a stock or enter a ticker'); return; }
    setSaving(true);
    try {
      await addRow('investments', {
        id: crypto.randomUUID(),
        type: form.type,
        name: form.name.trim() || form.symbol,
        symbol: form.symbol.trim(),
        units: Number(form.units),
        buyPrice: Number(form.buyPrice),
        amountInvested: computedInvested,
        currentValue: isMarketType ? 0 : Number(form.currentValue),
      });
      setShowForm(false);
      setForm(EMPTY);
      setStockSearch('');
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this investment?')) return;
    try { await deleteRow('investments', id); load(); }
    catch (e: any) { setError(e.message); }
  };

  const openEdit = (inv: any) => {
    setEditItem(inv);
    setEditForm({
      name: inv.name || '',
      units: String(inv.units || ''),
      buyPrice: String(inv.buyPrice || ''),
      currentValue: String(inv.currentValue || ''),
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editForm) return;
    setUpdating(true);
    try {
      const updates: any = {
        name: editForm.name.trim() || editItem.symbol,
        units: Number(editForm.units),
        buyPrice: Number(editForm.buyPrice),
        amountInvested: editComputedInvested,
      };
      if (!editIsMarket) updates.currentValue = Number(editForm.currentValue);
      await updateRow('investments', editItem.id, updates);
      setEditItem(null);
      setEditForm(null);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setUpdating(false); }
  };

  // ── totals ───────────────────────────────────────────────────────────────────

  const totalInvested = items.reduce((s, i) => s + Number(i.amountInvested || 0), 0);
  const totalCurrent  = items.reduce((s, i) => s + Number(i.currentValue  || 0), 0);
  const gain    = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? ((gain / totalInvested) * 100).toFixed(1) : '0.0';

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Investments</h1>
          <p className="text-sm text-slate-400 mt-0.5">Stocks, mutual funds, crypto &amp; more</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >+ Add</button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 ml-4">✕</button>
        </div>
      )}

      {/* Summary cards */}
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

      {/* ── Add Form ─────────────────────────────────────────────────────────── */}
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
                  <button key={t} type="button" onClick={() => handleTypeChange(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                      form.type === t
                        ? `${TYPE_META[t].bg} ${TYPE_META[t].color} border-transparent`
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >{TYPE_META[t].label}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Stock search combobox ── */}
              {form.type === 'stocks' && (
                <div className="sm:col-span-2" ref={dropdownRef}>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Search Stock *
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      placeholder="Type to search — e.g. Infosys, TCS, Reliance…"
                      value={stockSearch}
                      onChange={e => {
                        setStockSearch(e.target.value);
                        setShowStockDropdown(true);
                        if (!e.target.value) setForm({ ...form, symbol: '', name: '' });
                      }}
                      onFocus={() => setShowStockDropdown(true)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />

                    {showStockDropdown && (
                      <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto">
                        {filteredStocks.slice(0, 20).map(s => (
                          <button key={s.symbol} type="button"
                            onMouseDown={() => handleSelectStock(s)}
                            className="w-full text-left px-4 py-2.5 hover:bg-violet-50 flex items-center justify-between group"
                          >
                            <span className="text-sm font-medium text-slate-700 group-hover:text-violet-700">{s.name}</span>
                            <span className="text-xs font-mono text-slate-400 group-hover:text-violet-500">{s.symbol}</span>
                          </button>
                        ))}
                        {/* Custom ticker option when search doesn't match list */}
                        {stockSearch && !filteredStocks.find(s => s.name.toLowerCase() === stockSearch.toLowerCase()) && (
                          <button type="button"
                            onMouseDown={() => {
                              const sym = stockSearch.toUpperCase().includes('.')
                                ? stockSearch.toUpperCase()
                                : stockSearch.toUpperCase() + '.NS';
                              setForm({ ...form, symbol: sym, name: form.name || sym });
                              setShowStockDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-t border-slate-100 flex items-center justify-between"
                          >
                            <span className="text-sm text-amber-700 font-medium">Use as custom NSE ticker</span>
                            <span className="text-xs font-mono text-amber-500">
                              {stockSearch.toUpperCase().includes('.') ? stockSearch.toUpperCase() : stockSearch.toUpperCase() + '.NS'}
                            </span>
                          </button>
                        )}
                        {filteredStocks.length === 0 && !stockSearch && (
                          <p className="px-4 py-3 text-sm text-slate-400">Start typing to search…</p>
                        )}
                      </div>
                    )}
                  </div>

                  {form.symbol && (
                    <p className="text-xs mt-1.5 font-medium text-violet-600">
                      ✓ Ticker: <span className="font-mono">{form.symbol}</span>
                      <span className="text-emerald-600 ml-2">· Live price auto-updated by Google Sheets</span>
                    </p>
                  )}
                </div>
              )}

              {/* Mutual fund ticker (manual entry) */}
              {form.type === 'mutual_fund' && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Google Finance Ticker *
                  </label>
                  <input
                    placeholder="e.g. 0P0001ISIZ.BO  (search on google.com/finance)"
                    value={form.symbol}
                    onChange={e => setForm({ ...form, symbol: e.target.value })}
                    required
                    className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Find it at <span className="font-mono">google.com/finance</span>
                    <span className="ml-2 text-emerald-600 font-medium">· Live NAV auto-updated</span>
                  </p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {isMarketType ? 'Display Name (optional)' : 'Name *'}
                </label>
                <input
                  placeholder={isMarketType ? 'e.g. Infosys' : 'e.g. HDFC Fixed Deposit'}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required={!isMarketType}
                  className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Units */}
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

              {/* Amount Invested (computed) */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount Invested</label>
                <div className="mt-1.5 border border-slate-100 bg-slate-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700">
                  {computedInvested > 0 ? fmt(computedInvested) : <span className="text-slate-400 font-normal">Qty × Avg Buy Price</span>}
                </div>
              </div>

              {/* Current Value */}
              {isMarketType ? (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Value</label>
                  <div className="mt-1.5 border border-emerald-100 bg-emerald-50 rounded-lg px-3 py-2.5 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                    <span>✦</span> Auto-updated via GOOGLEFINANCE in your Sheet
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Value (₹) *</label>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.currentValue}
                    onChange={e => setForm({ ...form, currentValue: e.target.value })}
                    required
                    className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
              <button type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY); setStockSearch(''); }}
                className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Investment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      {editItem && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Edit Investment</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editItem.name || editItem.symbol}
                  {editItem.symbol && editItem.name !== editItem.symbol &&
                    <span className="font-mono ml-1">({editItem.symbol})</span>}
                </p>
              </div>
              <button onClick={() => { setEditItem(null); setEditForm(null); }}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">

                {/* Name */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Display Name</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {/* Units */}
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Units</label>
                  <input
                    type="number" min="0" step="any" required
                    value={editForm.units}
                    onChange={e => setEditForm({ ...editForm, units: e.target.value })}
                    className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {/* Avg Buy Price */}
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Buy Price (₹)</label>
                  <input
                    type="number" min="0" step="0.01" required
                    value={editForm.buyPrice}
                    onChange={e => setEditForm({ ...editForm, buyPrice: e.target.value })}
                    className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {/* Amount Invested (computed) */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Amount Invested</label>
                  <div className="mt-1.5 border border-slate-100 bg-slate-50 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700">
                    {editComputedInvested > 0 ? fmt(editComputedInvested) : '—'}
                  </div>
                </div>

                {/* Current Value — manual only for non-market types */}
                {!editIsMarket ? (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Value (₹)</label>
                    <input
                      type="number" min="0" step="0.01" required
                      value={editForm.currentValue}
                      onChange={e => setEditForm({ ...editForm, currentValue: e.target.value })}
                      className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <div className="border border-emerald-100 bg-emerald-50 rounded-lg px-3 py-2.5 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                      <span>✦</span> Current value is auto-updated via GOOGLEFINANCE · Changing units will refresh the formula
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                <button type="button"
                  onClick={() => { setEditItem(null); setEditForm(null); }}
                  className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                <button type="submit" disabled={updating}
                  className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {updating ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Investment Cards ─────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-slate-500 font-medium">No investments yet</p>
          <p className="text-sm text-slate-400 mt-1">Click "+ Add" to track your portfolio</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(inv => {
            const invested = Number(inv.amountInvested) || (Number(inv.units || 0) * Number(inv.buyPrice || 0));
            const current  = Number(inv.currentValue) || 0;
            const g        = current - invested;
            const gPct     = invested > 0 ? ((g / invested) * 100).toFixed(1) : '0.0';
            const meta     = TYPE_META[inv.type] || TYPE_META.other;
            const isMarket = MARKET_TYPES.includes(inv.type);
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    {isMarket && <span className="text-xs text-emerald-500 font-medium" title="Live price from Google Sheets">● Live</span>}
                  </div>
                  <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(inv)}
                      title="Edit"
                      className="text-slate-300 hover:text-violet-500 transition-colors text-base leading-none">✎</button>
                    <button onClick={() => handleDelete(inv.id)}
                      title="Delete"
                      className="text-slate-300 hover:text-rose-400 transition-colors text-xl font-bold leading-none">×</button>
                  </div>
                </div>

                <p className="font-semibold text-slate-800 text-base mb-0.5">
                  {inv.name && inv.name !== inv.symbol ? inv.name : (inv.symbol || '—')}
                </p>
                {inv.symbol && inv.name && inv.name !== inv.symbol && (
                  <p className="text-xs text-slate-400 font-mono mb-1">{inv.symbol}</p>
                )}
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
