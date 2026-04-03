import { useState } from 'react';
import { getRows } from '../lib/api';

const REPORT_PROMPT =
  `Analyze my complete financial health and generate a detailed structured report with the following sections:

# Financial Health Report

## 1. Spending Analysis
- Top expense categories by amount
- Any unusual or high-spend patterns
- Suggestions to reduce unnecessary spend

## 2. Savings Rate
- Income vs expenses ratio
- Monthly savings amount and percentage
- Is the savings rate healthy? (benchmark: 20%+ is good)

## 3. Investment Portfolio Analysis
- Allocation breakdown (stocks, mutual funds, crypto, FD, gold, land)
- Portfolio gain/loss percentage
- Concentration risks
- Diversification recommendations

## 4. Insurance Coverage Assessment
- Current coverage adequacy
- Any gaps (life, health, vehicle, property)
- Premium efficiency analysis

## 5. Top 5 Actionable Recommendations
Numbered list of the most impactful steps to improve my financial health.

Be specific with numbers from my data. Keep each section concise but insightful.`;

type Provider = 'anthropic' | 'groq';

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ReportRenderer({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      if (inList) { inList = false; }
      elements.push(
        <h1 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
          {trimmed.slice(2)}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      if (inList) { inList = false; }
      elements.push(
        <h2 key={i} className="text-base font-bold mt-5 mb-2 text-violet-700 dark:text-violet-400">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      if (inList) { inList = false; }
      elements.push(
        <h3 key={i} className="text-sm font-semibold mt-3 mb-1 text-slate-700 dark:text-slate-200">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      elements.push(
        <li key={i} className="ml-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc">
          {renderInline(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\. /.test(trimmed)) {
      inList = true;
      elements.push(
        <li key={i} className="ml-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-decimal">
          {renderInline(trimmed.replace(/^\d+\. /, ''))}
        </li>
      );
    } else if (trimmed === '') {
      inList = false;
      elements.push(<div key={i} className="h-2" />);
    } else {
      inList = false;
      elements.push(
        <p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    }
  });

  return <div className="space-y-0.5">{elements}</div>;
}

export default function AIReport() {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);

  async function buildSystemPrompt(): Promise<string> {
    const [transactions, investments, insurance] = await Promise.all([
      getRows('transactions'),
      getRows('investments'),
      getRows('insurance'),
    ]);
    const totalIncome   = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalExpense  = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalInvested = investments.reduce((s: number, i: any) => s + Number(i.amountInvested), 0);
    const portfolioVal  = investments.reduce((s: number, i: any) => s + Number(i.currentValue), 0);

    const catTotals: Record<string, number> = {};
    transactions.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      const c = t.category || 'Other';
      catTotals[c] = (catTotals[c] || 0) + Number(t.amount);
    });
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([c, v]) => `  - ${c}: ₹${v.toLocaleString('en-IN')}`).join('\n');

    return `You are a personal finance assistant with access to the user's financial data:

SUMMARY:
- Total Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Expense: ₹${totalExpense.toLocaleString('en-IN')}
- Net Savings: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}
- Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0}%
- Total Invested: ₹${totalInvested.toLocaleString('en-IN')}
- Portfolio Value: ₹${portfolioVal.toLocaleString('en-IN')}
- Portfolio Gain/Loss: ₹${(portfolioVal - totalInvested).toLocaleString('en-IN')}
- Active Insurance Policies: ${insurance.length}

TOP EXPENSE CATEGORIES:
${topCats || '  (no data)'}

RECENT TRANSACTIONS (last 10):
${transactions.slice(0, 10).map((t: any) => `  - ${t.type} | ${t.category} | ${t.currency || '₹'}${t.amount} | ${t.description || ''}`).join('\n') || '  (no data)'}

INVESTMENTS (${investments.length} total):
${investments.map((i: any) => `  - ${i.name} (${i.type}) | Invested: ₹${i.amountInvested} | Current: ₹${i.currentValue}`).join('\n') || '  (no data)'}

INSURANCE (${insurance.length} policies):
${insurance.map((p: any) => `  - ${p.provider} (${p.type}) | ₹${p.premium}/${p.frequency} | Sum Assured: ₹${p.sumAssured}`).join('\n') || '  (no data)'}

Give helpful, practical financial advice. Use ₹ for INR amounts.`;
  }

  async function callAI(message: string) {
    const key = apiKey.trim();
    if (!key) { setError('Enter your API key first'); return; }
    setLoading(true);
    setError('');
    setReport('');
    try {
      const systemPrompt = await buildSystemPrompt();

      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error');
        setReport(data.content?.[0]?.text || '');
        return;
      }

      if (provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            max_tokens: 4096,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Groq API error');
        setReport(data.choices?.[0]?.message?.content || '');
        return;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    const date = new Date().toISOString().split('T')[0];

    // Convert markdown to HTML for print
    function mdToHtml(md: string): string {
      return md
        .split('\n')
        .map(line => {
          const t = line.trim();
          if (t.startsWith('# '))   return `<h1>${t.slice(2)}</h1>`;
          if (t.startsWith('## '))  return `<h2>${t.slice(3)}</h2>`;
          if (t.startsWith('### ')) return `<h3>${t.slice(4)}</h3>`;
          if (t.startsWith('- ') || t.startsWith('* '))
            return `<li>${t.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</li>`;
          if (/^\d+\. /.test(t))
            return `<li class="ol">${t.replace(/^\d+\. /, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</li>`;
          if (t === '' || t === '---') return '<br/>';
          if (t.startsWith('|'))    return `<div class="table-row">${t}</div>`;
          return `<p>${t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`;
        })
        .join('\n');
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>MyFinance — Financial Health Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           font-size: 11pt; color: #1e293b; line-height: 1.6; padding: 0; }
    .header { background: #7c3aed; color: #fff; padding: 10px 24px;
              display: flex; justify-content: space-between; align-items: center;
              font-size: 10pt; }
    .header strong { font-size: 11pt; }
    .content { padding: 24px 32px; }
    h1 { font-size: 18pt; font-weight: 700; color: #1e293b; margin: 18px 0 6px;
         padding-bottom: 6px; border-bottom: 2px solid #7c3aed; }
    h2 { font-size: 12pt; font-weight: 700; color: #6d28d9; margin: 16px 0 4px; }
    h3 { font-size: 10.5pt; font-weight: 600; color: #475569; margin: 12px 0 3px; }
    p  { margin: 4px 0; font-size: 10pt; color: #334155; }
    li { margin: 3px 0 3px 20px; font-size: 10pt; color: #334155; list-style: disc; }
    li.ol { list-style: decimal; }
    br { display: block; margin: 6px 0; content: ''; }
    strong { color: #1e293b; }
    .table-row { font-family: monospace; font-size: 9pt; color: #475569;
                 padding: 1px 0; white-space: pre-wrap; }
    .footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid #e2e8f0;
              font-size: 8pt; color: #94a3b8;
              display: flex; justify-content: space-between; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0; }
      .content { padding: 20px 28px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <strong>MyFinance — Financial Health Report</strong>
    <span>Generated: ${date}</span>
  </div>
  <div class="content">
    ${mdToHtml(report)}
    <div class="footer">
      <span>MyFinance — for personal use only</span>
      <span>${date}</span>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); };<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  const modelLabel = provider === 'anthropic' ? 'Claude Haiku (Anthropic)' : 'Llama 3.1 (Groq)';
  const keyPlaceholder = provider === 'anthropic' ? 'sk-ant-api03-…' : 'gsk_…';
  const keyHint = provider === 'anthropic'
    ? 'Get a free key at console.anthropic.com'
    : 'Get a free key at console.groq.com';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI Finance Analyst</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Get a personalised report based on your transactions, investments and insurance data.
        </p>
      </div>

      {/* Security notice */}
      <div className="flex gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
          <p className="font-semibold">Your API key is session-only</p>
          <p>It is held in memory only — never saved to localStorage, cookies, or any server. It is cleared the moment you leave this page or close your browser tab.</p>
        </div>
      </div>

      {/* Config card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Configuration</h2>

        {/* Provider */}
        <div className="flex gap-3">
          {(['anthropic', 'groq'] as Provider[]).map(p => (
            <button
              key={p}
              onClick={() => { setProvider(p); setApiKey(''); setError(''); }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                provider === p
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'
              }`}
            >
              {p === 'anthropic' ? 'Anthropic (Claude)' : 'Groq (Llama)'}
            </button>
          ))}
        </div>

        {/* API key input */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {modelLabel} — API Key
          </label>
          <div className="relative">
            <input
              type={keyVisible ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={keyPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={() => setKeyVisible(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={keyVisible ? 'Hide key' : 'Show key'}
            >
              {keyVisible ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">{keyHint}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={() => callAI(REPORT_PROMPT)}
          disabled={loading || !apiKey.trim()}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Analysing your finances…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              Generate Full Financial Report
            </>
          )}
        </button>

        {/* Custom question */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && customMsg.trim()) { callAI(customMsg.trim()); setCustomMsg(''); } }}
            placeholder="Ask a specific question about your finances…"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={() => { if (customMsg.trim()) { callAI(customMsg.trim()); setCustomMsg(''); } }}
            disabled={loading || !apiKey.trim() || !customMsg.trim()}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            Ask
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Report output */}
      {report && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Report</span>
            <div className="flex gap-2">
              <button
                onClick={() => callAI(REPORT_PROMPT)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Regenerate
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download PDF
              </button>
            </div>
          </div>
          <div className="px-5 py-5">
            <ReportRenderer text={report} />
          </div>
        </div>
      )}
    </div>
  );
}
