import { useState, useRef, useEffect } from 'react';
import { getRows } from '../lib/api';

/* ─── Daily usage tracking (localStorage) ────────────────────────────── */
const FREE_LIMIT = 2;
const usageKey = () => `panamkasu_ai_usage_${new Date().toISOString().slice(0, 10)}`;

function getUsedToday(): number {
  try { return parseInt(localStorage.getItem(usageKey()) ?? '0', 10) || 0; } catch { return 0; }
}
function incrementUsage(): number {
  const next = getUsedToday() + 1;
  try { localStorage.setItem(usageKey(), String(next)); } catch { /* noop */ }
  return next;
}

/* ─── Report prompt ──────────────────────────────────────────────────── */
const REPORT_PROMPT =
`Analyze my complete financial health and generate a detailed structured report:

# Financial Health Report

## 1. Spending Analysis
- Top expense categories by amount
- Unusual or high-spend patterns
- Suggestions to reduce unnecessary spend

## 2. Savings Rate
- Income vs expenses ratio
- Monthly savings amount and percentage
- Is the savings rate healthy? (benchmark: 20%+ is good)

## 3. Investment Portfolio Analysis
- Allocation breakdown (stocks, mutual funds, crypto, FD, gold, land)
- Portfolio gain/loss percentage
- Concentration risks and diversification recommendations

## 4. Insurance Coverage Assessment
- Current coverage adequacy
- Any gaps (life, health, vehicle, property)
- Premium efficiency analysis

## 5. Top 5 Actionable Recommendations
Numbered list of the most impactful steps to improve financial health.

Be specific with numbers from my data. Keep each section concise but insightful.`;

/* ─── Markdown renderer ──────────────────────────────────────────────── */
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{p.slice(2, -2)}</strong>
      : p
  );
}

function ReportRenderer({ text }: { text: string }) {
  const elements: React.ReactNode[] = [];
  text.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('# '))       elements.push(<h1 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">{t.slice(2)}</h1>);
    else if (t.startsWith('## ')) elements.push(<h2 key={i} className="text-base font-bold mt-5 mb-2 text-violet-700 dark:text-violet-400">{t.slice(3)}</h2>);
    else if (t.startsWith('### '))elements.push(<h3 key={i} className="text-sm font-semibold mt-3 mb-1 text-slate-700 dark:text-slate-200">{t.slice(4)}</h3>);
    else if (t.startsWith('- ') || t.startsWith('* ')) elements.push(<li key={i} className="ml-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc">{renderInline(t.slice(2))}</li>);
    else if (/^\d+\. /.test(t))   elements.push(<li key={i} className="ml-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-decimal">{renderInline(t.replace(/^\d+\. /, ''))}</li>);
    else if (t === '')             elements.push(<div key={i} className="h-2" />);
    else                           elements.push(<p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{renderInline(t)}</p>);
  });
  return <div className="space-y-0.5">{elements}</div>;
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function AIReport() {
  const [report, setReport]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [limitError, setLimitError] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [usedToday, setUsedToday] = useState(getUsedToday);
  const [remaining, setRemaining] = useState(FREE_LIMIT - getUsedToday());
  const reportRef = useRef<HTMLDivElement>(null);

  // Keep UI in sync after the component mounts (in case other tabs incremented)
  useEffect(() => {
    const u = getUsedToday();
    setUsedToday(u);
    setRemaining(Math.max(0, FREE_LIMIT - u));
  }, []);

  /* ── Build financial context from Google Sheets ── */
  async function buildSystemPrompt(): Promise<string> {
    const [transactions, investments, insurance] = await Promise.all([
      getRows('transactions'),
      getRows('investments'),
      getRows('insurance'),
    ]);

    const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

    // Group by currency
    const byCur: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t: any) => {
      const cur = (t.currency && String(t.currency).trim()) || 'QAR';
      if (!byCur[cur]) byCur[cur] = { income: 0, expense: 0 };
      if (t.type === 'income') byCur[cur].income += Number(t.amount) || 0;
      else byCur[cur].expense += Number(t.amount) || 0;
    });
    const currencyLines = Object.entries(byCur)
      .map(([c, v]) => `  ${c}: Income ${c === 'INR' ? '₹' : c + ' '}${fmt(v.income)}, Expense ${c === 'INR' ? '₹' : c + ' '}${fmt(v.expense)}, Net ${c === 'INR' ? '₹' : c + ' '}${fmt(v.income - v.expense)}`)
      .join('\n');

    const totalIncome   = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalExpense  = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalInvested = investments.reduce((s: number, i: any) => s + Number(i.amountInvested), 0);
    const portfolioVal  = investments.reduce((s: number, i: any) => s + Number(i.currentValue), 0);

    const catTotals: Record<string, number> = {};
    transactions.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      catTotals[t.category || 'Other'] = (catTotals[t.category || 'Other'] || 0) + Number(t.amount);
    });
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([c, v]) => `  - ${c}: ₹${fmt(v)}`).join('\n');

    const recentTxns = [...transactions]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15)
      .map((t: any) => `  - [${t.date}] ${t.type} | ${t.category} | ₹${t.amount} | ${t.description || ''}`)
      .join('\n');

    return `You are PanamKasu AI, a personal finance assistant. Here is the user's real financial data:

TRANSACTIONS SUMMARY (all-time):
${currencyLines || '  (no transactions)'}
- Overall Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0}%

TOP EXPENSE CATEGORIES:
${topCats || '  (no data)'}

RECENT TRANSACTIONS (last 15):
${recentTxns || '  (no data)'}

INVESTMENT PORTFOLIO (${investments.length} positions):
${investments.map((i: any) => `  - ${i.name || 'Unknown'} (${i.type || '?'}) | Invested: ₹${i.amountInvested} | Current: ₹${i.currentValue} | Gain: ₹${(Number(i.currentValue) - Number(i.amountInvested)).toFixed(0)}`).join('\n') || '  (no investments)'}
- Total Invested: ₹${fmt(totalInvested)} | Portfolio Value: ₹${fmt(portfolioVal)} | Gain/Loss: ₹${fmt(portfolioVal - totalInvested)}

INSURANCE POLICIES (${insurance.length} policies):
${insurance.map((p: any) => `  - ${p.provider || '?'} (${p.type || '?'}) | Premium: ₹${p.premium}/${p.frequency || 'yearly'} | Sum Assured: ₹${p.sumAssured || '?'} | Status: ${p.status || 'active'}`).join('\n') || '  (no insurance data)'}

Give practical, India-specific financial advice. Use ₹ for Indian amounts and appropriate currency symbols for others. Be specific about numbers from this data.`;
  }

  /* ── Call AI via server proxy ── */
  async function callAI(message: string) {
    setLoading(true);
    setError('');
    setLimitError(false);
    setReport('');

    // Optimistic local check
    if (usedToday >= FREE_LIMIT) {
      setLimitError(true);
      setLoading(false);
      return;
    }

    try {
      const systemCtx = await buildSystemPrompt();
      const fullMessage = `${systemCtx}\n\n---\n\nUser question: ${message}`;

      const res = await fetch('/api/ai-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: fullMessage }),
      });

      const data: any = await res.json();

      if (res.status === 429 || data.limitExceeded) {
        setLimitError(true);
        // Sync local counter
        setUsedToday(FREE_LIMIT);
        setRemaining(0);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? 'AI service error');

      const newUsed = incrementUsage();
      setUsedToday(newUsed);
      setRemaining(Math.max(0, FREE_LIMIT - newUsed));
      setReport(data.text ?? '');

      // Scroll to report
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── PDF download ── */
  function downloadReport() {
    const date = new Date().toISOString().split('T')[0];
    function bold(s: string) { return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
    function mdToHtml(md: string): string {
      const out: string[] = [];
      md.split('\n').forEach(line => {
        const t = line.trim();
        if (t.startsWith('# '))       out.push(`<h1>${bold(t.slice(2))}</h1>`);
        else if (t.startsWith('## ')) out.push(`<h2>${bold(t.slice(3))}</h2>`);
        else if (t.startsWith('### '))out.push(`<h3>${bold(t.slice(4))}</h3>`);
        else if (t.startsWith('- ') || t.startsWith('* ')) out.push(`<li>${bold(t.slice(2))}</li>`);
        else if (/^\d+\. /.test(t))   out.push(`<li class="ol">${bold(t.replace(/^\d+\. /, ''))}</li>`);
        else if (t === '' || t === '---') out.push('<br/>');
        else out.push(`<p>${bold(t)}</p>`);
      });
      return out.join('\n');
    }
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>PanamKasu — Financial Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1e293b;line-height:1.6}.header{background:#c47d0e;color:#fff;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;font-size:10pt}.header strong{font-size:11pt}.content{padding:24px 32px}h1{font-size:18pt;font-weight:700;color:#1e293b;margin:18px 0 6px;padding-bottom:6px;border-bottom:2px solid #c47d0e}h2{font-size:12pt;font-weight:700;color:#7c5200;margin:16px 0 4px}h3{font-size:10.5pt;font-weight:600;color:#475569;margin:12px 0 3px}p{margin:4px 0;font-size:10pt;color:#334155}li{margin:3px 0 3px 20px;font-size:10pt;color:#334155;list-style:disc}li.ol{list-style:decimal}strong{color:#1e293b}.footer{margin-top:32px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:8pt;color:#94a3b8;display:flex;justify-content:space-between}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:0}.content{padding:20px 28px}}</style></head><body><div class="header"><strong>PanamKasu — Financial Report</strong><span>Generated: ${date}</span></div><div class="content">${mdToHtml(report)}<div class="footer"><span>PanamKasu AI</span><span>${date}</span></div></div><script>window.onload=function(){window.print()};<\/script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  const atLimit = usedToday >= FREE_LIMIT;

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI Finance Analyst</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Get personalised financial advice powered by Claude AI — reads your real transactions, investments &amp; insurance data.
        </p>
      </div>

      {/* ── Daily usage badge ── */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
        atLimit
          ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700'
          : remaining === 1
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{atLimit ? '⏳' : '✨'}</span>
          <div>
            <p className={`text-sm font-semibold ${atLimit ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'}`}>
              {atLimit ? 'Daily limit reached' : `${remaining} free request${remaining !== 1 ? 's' : ''} remaining today`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {atLimit ? 'Resets at midnight · Consider donating to support PanamKasu ❤️' : `${FREE_LIMIT} free AI requests per day — resets at midnight`}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {Array.from({ length: FREE_LIMIT }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full border-2 ${i < usedToday ? 'bg-rose-400 border-rose-400' : 'border-slate-300 dark:border-slate-600'}`} />
          ))}
        </div>
      </div>

      {/* ── AI action panel ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ask your AI financial advisor</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Analysed from your Google Sheets data — no data leaves your account</p>
        </div>

        <div className="p-5 space-y-3">
          {/* Full report button */}
          <button
            onClick={() => callAI(REPORT_PROMPT)}
            disabled={loading || atLimit}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Analysing your finances…</>
            ) : (
              <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>Generate Full Financial Report</>
            )}
          </button>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            {[
              'Where am I spending the most?',
              'Should I increase my SIP?',
              'How to improve my savings rate?',
              'Am I over-insured or under-insured?',
              'Best tax-saving options for me?',
            ].map(q => (
              <button
                key={q}
                onClick={() => callAI(q)}
                disabled={loading || atLimit}
                className="text-xs px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Custom question */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && customMsg.trim() && !loading && !atLimit) { callAI(customMsg.trim()); setCustomMsg(''); } }}
              placeholder="Ask anything about your finances…"
              disabled={loading || atLimit}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
            />
            <button
              onClick={() => { if (customMsg.trim()) { callAI(customMsg.trim()); setCustomMsg(''); } }}
              disabled={loading || !customMsg.trim() || atLimit}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      </div>

      {/* ── Limit reached message ── */}
      {limitError && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">You've used your 2 free AI requests for today</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">Your daily limit resets at midnight. Come back tomorrow for more analysis!</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-700 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Love PanamKasu? Support the app ❤️</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">PanamKasu is free to use. If it's saving you time and money, consider a small donation to help keep the servers running.</p>
            <a
              href="https://razorpay.me/@pcbzmani"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Donate to Support PanamKasu
            </a>
          </div>
        </div>
      )}

      {/* ── General error ── */}
      {error && !limitError && (
        <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* ── Report output ── */}
      {report && (
        <div ref={reportRef} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">AI Response</span>
            <div className="flex gap-2">
              <button onClick={downloadReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Save as PDF
              </button>
            </div>
          </div>
          <div className="px-5 py-5">
            <ReportRenderer text={report} />
          </div>
        </div>
      )}

      {/* ── Optional donation section (always visible at bottom) ── */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">☕</span>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Support PanamKasu</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This app is free forever. If it helps you, buy me a coffee!</p>
          </div>
        </div>
        <a
          href="https://razorpay.me/@pcbzmani"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm font-medium text-amber-700 dark:text-amber-300 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Donate via Razorpay — any amount
        </a>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Donations keep the AI credits funded. Thank you! 🙏</p>
      </div>

    </div>
  );
}
