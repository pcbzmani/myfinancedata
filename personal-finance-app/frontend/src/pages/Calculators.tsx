import { useState } from 'react';

/* ─── Helpers ────────────────────────────────────────────────────────── */
function fmt(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
function num(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return isNaN(v) ? 0 : v;
}

/* ─── Input component ────────────────────────────────────────────────── */
function Field({
  label, value, onChange, prefix, suffix, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
        {prefix && <span className="px-3 text-sm text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-full flex items-center py-2.5">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-transparent outline-none min-w-0"
          min="0"
          step="any"
        />
        {suffix && <span className="px-3 text-sm text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-full flex items-center py-2.5">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

/* ─── Result row ─────────────────────────────────────────────────────── */
function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${highlight ? 'bg-violet-600 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200'}`}>
      <span className={`text-sm ${highlight ? 'font-semibold text-violet-100' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{value}</span>
    </div>
  );
}

/* ─── Card wrapper ───────────────────────────────────────────────────── */
function CalcCard({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className={`px-5 py-4 flex items-center gap-3 ${color}`}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">{icon}</div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* SIP Calculator                                                         */
/* ══════════════════════════════════════════════════════════════════════ */
function SIPCalculator() {
  const [monthly, setMonthly] = useState('5000');
  const [rate, setRate]       = useState('12');
  const [years, setYears]     = useState('10');

  const r  = num(rate) / 100 / 12;
  const n  = num(years) * 12;
  const P  = num(monthly);
  const invested = P * n;
  const maturity = r > 0 ? P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : invested;
  const gains    = maturity - invested;

  return (
    <CalcCard
      title="SIP Calculator"
      color="bg-gradient-to-r from-violet-600 to-indigo-600"
      icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
    >
      <Field label="Monthly Investment" value={monthly} onChange={setMonthly} prefix="₹" hint="Amount you invest each month" />
      <Field label="Expected Annual Return" value={rate} onChange={setRate} suffix="%" hint="Typically 10–15% for equity mutual funds" />
      <Field label="Investment Period" value={years} onChange={setYears} suffix="Yrs" hint="How many years you plan to invest" />

      <div className="space-y-2 pt-2">
        <ResultRow label="Amount Invested" value={fmt(invested)} />
        <ResultRow label="Estimated Returns" value={fmt(gains)} />
        <ResultRow label="Maturity Value" value={fmt(maturity)} highlight />
      </div>

      {num(years) > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Wealth ratio: <strong className="text-violet-600 dark:text-violet-400">{(maturity / invested).toFixed(2)}×</strong> your investment
        </p>
      )}
    </CalcCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* Loan EMI Calculator                                                    */
/* ══════════════════════════════════════════════════════════════════════ */
function EMICalculator() {
  const [principal, setPrincipal] = useState('1000000');
  const [rate, setRate]           = useState('8.5');
  const [years, setYears]         = useState('20');

  const r   = num(rate) / 100 / 12;
  const n   = num(years) * 12;
  const P   = num(principal);
  const emi = r > 0 && n > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / (n || 1);
  const total    = emi * n;
  const interest = total - P;

  return (
    <CalcCard
      title="Loan EMI Calculator"
      color="bg-gradient-to-r from-rose-500 to-pink-600"
      icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
    >
      <Field label="Loan Amount" value={principal} onChange={setPrincipal} prefix="₹" hint="Principal (home, car, personal loan)" />
      <Field label="Annual Interest Rate" value={rate} onChange={setRate} suffix="%" hint="e.g. 8.5% for home loan" />
      <Field label="Loan Tenure" value={years} onChange={setYears} suffix="Yrs" />

      <div className="space-y-2 pt-2">
        <ResultRow label="Monthly EMI" value={fmt(emi)} highlight />
        <ResultRow label="Principal" value={fmt(P)} />
        <ResultRow label="Total Interest" value={fmt(interest)} />
        <ResultRow label="Total Payment" value={fmt(total)} />
      </div>

      {P > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Interest is <strong className="text-rose-500">{((interest / P) * 100).toFixed(1)}%</strong> of principal over {years} years
        </p>
      )}
    </CalcCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* Average Stock Price Calculator                                         */
/* ══════════════════════════════════════════════════════════════════════ */
function AvgStockCalculator() {
  const [qty1, setQty1]       = useState('100');
  const [price1, setPrice1]   = useState('250');
  const [qty2, setQty2]       = useState('50');
  const [price2, setPrice2]   = useState('200');

  const totalQty   = num(qty1) + num(qty2);
  const totalCost  = num(qty1) * num(price1) + num(qty2) * num(price2);
  const avgPrice   = totalQty > 0 ? totalCost / totalQty : 0;
  const prevAvg    = num(qty1) > 0 ? num(price1) : 0;
  const change     = avgPrice - prevAvg;

  return (
    <CalcCard
      title="Avg Stock Price Calculator"
      color="bg-gradient-to-r from-emerald-500 to-teal-600"
      icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 -mb-2">Current holding</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Shares held" value={qty1} onChange={setQty1} suffix="Qty" />
        <Field label="Avg buy price" value={price1} onChange={setPrice1} prefix="₹" />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 -mb-2">New purchase</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Shares buying" value={qty2} onChange={setQty2} suffix="Qty" />
        <Field label="Buy price" value={price2} onChange={setPrice2} prefix="₹" />
      </div>

      <div className="space-y-2 pt-2">
        <ResultRow label="Total Shares" value={`${totalQty.toLocaleString('en-IN')} shares`} />
        <ResultRow label="Total Cost" value={fmt(totalCost)} />
        <ResultRow label="New Avg Price" value={fmt(avgPrice)} highlight />
      </div>

      {prevAvg > 0 && avgPrice > 0 && (
        <p className={`text-xs text-center font-medium ${change <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
          Avg price {change <= 0 ? '▼ reduced by' : '▲ increased by'} {fmt(Math.abs(change))} per share
        </p>
      )}
    </CalcCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* Gold Making Charge Calculator                                          */
/* ══════════════════════════════════════════════════════════════════════ */
function GoldCalculator() {
  const [grams, setGrams]           = useState('10');
  const [goldRate, setGoldRate]     = useState('7200');
  const [making, setMaking]         = useState('12');
  const [gst, setGst]               = useState('3');

  const goldVal   = num(grams) * num(goldRate);
  const makingAmt = goldVal * (num(making) / 100);
  const subtotal  = goldVal + makingAmt;
  const gstAmt    = subtotal * (num(gst) / 100);
  const total     = subtotal + gstAmt;

  return (
    <CalcCard
      title="Gold Making Charge Calculator"
      color="bg-gradient-to-r from-amber-500 to-yellow-500"
      icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gold weight" value={grams} onChange={setGrams} suffix="g" hint="Weight in grams" />
        <Field label="Gold rate (22K)" value={goldRate} onChange={setGoldRate} prefix="₹" hint="Per gram today" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Making charge" value={making} onChange={setMaking} suffix="%" hint="Typically 8–20%" />
        <Field label="GST" value={gst} onChange={setGst} suffix="%" hint="Standard 3% on jewellery" />
      </div>

      <div className="space-y-2 pt-2">
        <ResultRow label={`Gold value (${grams}g)`} value={fmt(goldVal)} />
        <ResultRow label={`Making charge (${making}%)`} value={fmt(makingAmt)} />
        <ResultRow label={`GST (${gst}%)`} value={fmt(gstAmt)} />
        <ResultRow label="Total Cost" value={fmt(total)} highlight />
      </div>

      {num(grams) > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Effective rate: <strong className="text-amber-600 dark:text-amber-400">{fmt(total / num(grams))}/g</strong> (all-inclusive)
        </p>
      )}
    </CalcCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* FD Maturity Calculator                                                 */
/* ══════════════════════════════════════════════════════════════════════ */
function FDCalculator() {
  const [principal, setPrincipal] = useState('100000');
  const [rate, setRate]           = useState('7');
  const [years, setYears]         = useState('5');
  const [compound, setCompound]   = useState('4'); // quarterly

  const P  = num(principal);
  const r  = num(rate) / 100;
  const t  = num(years);
  const n  = num(compound);
  const maturity = P * Math.pow(1 + r / n, n * t);
  const interest = maturity - P;

  const compoundOptions = [
    { value: '1', label: 'Annually' },
    { value: '2', label: 'Half-yearly' },
    { value: '4', label: 'Quarterly' },
    { value: '12', label: 'Monthly' },
  ];

  return (
    <CalcCard
      title="FD Maturity Calculator"
      color="bg-gradient-to-r from-sky-500 to-blue-600"
      icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
    >
      <Field label="Principal Amount" value={principal} onChange={setPrincipal} prefix="₹" />
      <Field label="Annual Interest Rate" value={rate} onChange={setRate} suffix="%" hint="e.g. 7% for SBI / HDFC FD" />
      <Field label="Tenure" value={years} onChange={setYears} suffix="Yrs" />

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Compounding Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {compoundOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setCompound(o.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${compound === o.value ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <ResultRow label="Principal" value={fmt(P)} />
        <ResultRow label="Interest Earned" value={fmt(interest)} />
        <ResultRow label="Maturity Amount" value={fmt(maturity)} highlight />
      </div>

      {P > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          Effective yield: <strong className="text-sky-600 dark:text-sky-400">{((interest / P) * 100).toFixed(2)}%</strong> over {years} years
        </p>
      )}
    </CalcCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* Main page                                                              */
/* ══════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'sip',   label: 'SIP',       short: 'SIP' },
  { id: 'emi',   label: 'Loan EMI',  short: 'EMI' },
  { id: 'stock', label: 'Avg Stock', short: 'Stock' },
  { id: 'gold',  label: 'Gold',      short: 'Gold' },
  { id: 'fd',    label: 'FD',        short: 'FD' },
];

export default function Calculators() {
  const [tab, setTab] = useState('sip');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Finance Calculators</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Plan your investments, loans, and purchases with precision.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.short}</span>
          </button>
        ))}
      </div>

      {/* Calculator panels */}
      {tab === 'sip'   && <SIPCalculator />}
      {tab === 'emi'   && <EMICalculator />}
      {tab === 'stock' && <AvgStockCalculator />}
      {tab === 'gold'  && <GoldCalculator />}
      {tab === 'fd'    && <FDCalculator />}

      <p className="text-xs text-center text-slate-400 dark:text-slate-500 pb-4">
        Results are estimates for planning purposes only. Consult a financial advisor for investment decisions.
      </p>
    </div>
  );
}
