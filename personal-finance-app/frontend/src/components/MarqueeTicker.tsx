/**
 * MarqueeTicker — drop-in replacement for the existing market-ticker card
 * inside pages/Dashboard.tsx. Two rows (Indices / FX & Gold), seamless
 * marquee scroll, pauses on hover, keeps the original live-dot + time
 * indicator. The list is rendered twice back-to-back so the translateX(-50%)
 * keyframe in motion.css loops without a visible jump.
 *
 * Drop into src/components/MarqueeTicker.tsx and import where the original
 * ticker JSX lives:
 *
 *   import MarqueeTicker from '../components/MarqueeTicker';
 *   <MarqueeTicker rates={rates} marketLoading={marketLoading} marketTime={marketTime} />
 */

interface MarketQuote { price: number; change: number; changePct: number; }
interface Rates {
  nifty50: MarketQuote | null; bankNifty: MarketQuote | null;
  nasdaq: MarketQuote | null;  sp500: MarketQuote | null;
  shanghai: MarketQuote | null; hangSeng: MarketQuote | null;
  nikkei: MarketQuote | null;  kospi: MarketQuote | null;
  usdInr: MarketQuote | null;  qarInr: MarketQuote | null;
  goldInr: MarketQuote | null; goldQar: MarketQuote | null;
}

const INDICES: { key: keyof Rates; label: string }[] = [
  { key: 'nifty50',   label: 'Nifty 50' },
  { key: 'bankNifty', label: 'Bank Nifty' },
  { key: 'nasdaq',    label: 'Nasdaq 100' },
  { key: 'sp500',     label: 'S&P 500' },
  { key: 'shanghai',  label: 'SSE' },
  { key: 'hangSeng',  label: 'Hang Seng' },
  { key: 'nikkei',    label: 'Nikkei 225' },
  { key: 'kospi',     label: 'KOSPI' },
];
const FX_GOLD: { key: keyof Rates; label: string; prefix: string }[] = [
  { key: 'usdInr',  label: 'USD/INR',     prefix: '₹' },
  { key: 'qarInr',  label: 'QAR/INR',     prefix: '₹' },
  { key: 'goldInr', label: 'Gold ₹/1g',   prefix: '₹' },
  { key: 'goldQar', label: 'Gold QAR/1g', prefix: 'QAR ' },
];

function TickerCell({ label, quote, prefix = '' }: { label: string; quote: MarketQuote | null; prefix?: string }) {
  const fmtN = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return (
    <div className="flex-shrink-0 px-3 py-1.5 min-w-[110px]">
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>
      {quote ? (
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{prefix}{fmtN(quote.price)}</span>
          <span className={`text-[10px] font-semibold whitespace-nowrap ${quote.change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {quote.change >= 0 ? '+' : ''}{quote.changePct.toFixed(2)}%
          </span>
        </div>
      ) : (
        <span className="text-xs text-slate-300 dark:text-slate-600 mt-0.5 block">—</span>
      )}
    </div>
  );
}

interface Props { rates: Rates; marketLoading: boolean; marketTime: string; }

export default function MarqueeTicker({ rates, marketLoading, marketTime }: Props) {
  if (marketLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
          Fetching live market data…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Row 1 — Indices */}
      <div className="flex items-center border-b border-slate-50 dark:border-slate-700 px-2 py-1 min-w-0">
        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2 flex-shrink-0">Indices</span>
        <div className="w-px h-6 bg-slate-100 dark:bg-slate-700 mx-1 flex-shrink-0" />
        <div className="pk-marquee">
          <div className="pk-marquee-track">
            {[...INDICES, ...INDICES].map((item, i) => (
              <TickerCell key={`${item.key}-${i}`} label={item.label} quote={rates[item.key] as MarketQuote | null} />
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 — FX & Gold + live time */}
      <div className="flex items-center px-2 py-1 min-w-0 relative">
        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2 flex-shrink-0">FX &amp; Gold</span>
        <div className="w-px h-6 bg-slate-100 dark:bg-slate-700 mx-1 flex-shrink-0" />
        <div className="pk-marquee">
          <div className="pk-marquee-track">
            {[...FX_GOLD, ...FX_GOLD].map((item, i) => (
              <TickerCell key={`${item.key}-${i}`} label={item.label} quote={rates[item.key] as MarketQuote | null} prefix={item.prefix} />
            ))}
          </div>
        </div>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-slate-800 pl-3 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live · {marketTime}
        </span>
      </div>
    </div>
  );
}
