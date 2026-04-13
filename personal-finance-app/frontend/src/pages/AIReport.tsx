import { useState, useEffect } from 'react';
import { getRows } from '../lib/api';

/* ─── Subscription token helpers ─────────────────────────────────────── */
const SUB_KEY = 'myfinance_sub_token';

function getStoredToken(): string {
  return localStorage.getItem(SUB_KEY) ?? '';
}
function saveToken(token: string) {
  localStorage.setItem(SUB_KEY, token);
}
function clearToken() {
  localStorage.removeItem(SUB_KEY);
}
function decodeTokenPayload(token: string): { email?: string; plan?: string; expiry?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0]) return null;
    return JSON.parse(atob(parts[0]));
  } catch {
    return null;
  }
}
function isTokenExpired(token: string): boolean {
  if (!token) return true;
  const p = decodeTokenPayload(token);
  if (!p || typeof p.expiry !== 'number') return true;
  return p.expiry < Date.now();
}

/* ─── Razorpay type ──────────────────────────────────────────────────── */
declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ─── Report prompt ─────────────────────────────────────────────────── */
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

/* ─── Inline renderer ────────────────────────────────────────────────── */
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
      inList = false;
      elements.push(
        <h1 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
          {trimmed.slice(2)}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      inList = false;
      elements.push(
        <h2 key={i} className="text-base font-bold mt-5 mb-2 text-violet-700 dark:text-violet-400">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      inList = false;
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

/* ─── Main component ─────────────────────────────────────────────────── */
type Provider = 'anthropic' | 'groq' | 'google';
type Mode = 'pro' | 'own';
type ProView = 'cta' | 'restore' | 'manual' | 'token_revealed';

export default function AIReport() {
  /* subscription state */
  const [subToken, setSubToken]   = useState<string>(getStoredToken);
  const [subMode, setSubMode]     = useState<Mode>(getStoredToken() ? 'pro' : 'own');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError]   = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [proView, setProView]     = useState<ProView>('cta');

  /* email & restore state */
  const [paymentEmail, setPaymentEmail]   = useState('');
  const [restoreEmail, setRestoreEmail]   = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError]   = useState('');
  const [manualToken, setManualToken]     = useState('');
  const [manualError, setManualError]     = useState('');
  const [newToken, setNewToken]           = useState('');  // shown after payment

  /* own-key state */
  const [apiKey, setApiKey]       = useState('');
  const [provider, setProvider]   = useState<Provider>('anthropic');
  const [keyVisible, setKeyVisible] = useState(false);

  /* shared state */
  const [report, setReport]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [customMsg, setCustomMsg] = useState('');

  /* keep subMode in sync if token expires */
  useEffect(() => {
    if (subToken && isTokenExpired(subToken)) {
      clearToken();
      setSubToken('');
      setSubMode('own');
    }
  }, [subToken]);

  const isSubscribed = !!subToken && !isTokenExpired(subToken);
  const tokenInfo    = isSubscribed ? decodeTokenPayload(subToken) : null;

  /* ── Build financial context for system prompt ── */
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

  /* ── Call AI via proxy (Pro) or direct (own key) ── */
  async function callAI(message: string) {
    setLoading(true);
    setError('');
    setReport('');

    try {
      const systemPrompt = await buildSystemPrompt();

      if (isSubscribed) {
        /* ── Pro mode: server-side proxy ── */
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionToken: subToken, systemPrompt, message }),
        });
        const data: any = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'AI service error');
        setReport(data.text ?? '');
        return;
      }

      /* ── Own key mode ── */
      const key = apiKey.trim();
      if (!key) { setError('Enter your API key first'); setLoading(false); return; }

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
        const data: any = await res.json();
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
        const data: any = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Groq API error');
        setReport(data.choices?.[0]?.message?.content || '');
        return;
      }

      if (provider === 'google') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: message }] }],
              generationConfig: { maxOutputTokens: 4096 },
            }),
          }
        );
        const data: any = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Google AI error');
        setReport(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Razorpay subscription flow ── */
  async function handleSubscribe() {
    if (!paymentEmail.trim() || !paymentEmail.includes('@')) {
      setSubError('Enter a valid email to receive your subscription token');
      return;
    }
    setSubLoading(true);
    setSubError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load payment SDK. Check your connection.');

      /* Create order on server */
      const orderRes = await fetch('/api/razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const orderData: any = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? 'Could not create payment order');

      /* Open Razorpay checkout */
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         orderData.keyId,
          amount:      orderData.amount,
          currency:    orderData.currency,
          name:        'MyFinance Pro',
          description: orderData.label,
          order_id:    orderData.orderId,
          prefill: { name: '', email: paymentEmail.trim() },
          theme:   { color: '#7c3aed' },
          handler: async (response: any) => {
            try {
              /* Verify payment + get subscription token */
              const verifyRes = await fetch('/api/razorpay-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  email: paymentEmail.trim(),
                  plan:  orderData.plan,
                }),
              });
              const verifyData: any = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error ?? 'Payment verification failed');

              saveToken(verifyData.subscriptionToken);
              setSubToken(verifyData.subscriptionToken);
              setNewToken(verifyData.subscriptionToken);
              setSubMode('pro');
              setProView('token_revealed');
              resolve();
            } catch (err: any) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        });
        rzp.open();
      });
    } catch (err: any) {
      if (err.message !== 'Payment cancelled') setSubError(err.message);
    } finally {
      setSubLoading(false);
    }
  }

  /* ── Restore subscription by email ── */
  async function handleRestore() {
    if (!restoreEmail.trim() || !restoreEmail.includes('@')) {
      setRestoreError('Enter the email you used when subscribing');
      return;
    }
    setRestoreLoading(true);
    setRestoreError('');
    try {
      const res = await fetch('/api/restore-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: restoreEmail.trim() }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not restore subscription');
      saveToken(data.subscriptionToken);
      setSubToken(data.subscriptionToken);
      setSubMode('pro');
      setProView('cta');
    } catch (err: any) {
      setRestoreError(err.message);
    } finally {
      setRestoreLoading(false);
    }
  }

  /* ── Manual token entry ── */
  function handleManualToken() {
    const t = manualToken.trim();
    if (!t.includes('.')) { setManualError('Invalid token format'); return; }
    if (isTokenExpired(t)) { setManualError('This token has expired'); return; }
    saveToken(t);
    setSubToken(t);
    setSubMode('pro');
    setProView('cta');
    setManualToken('');
    setManualError('');
  }

  /* ── Download report as printable HTML ── */
  function downloadReport() {
    const date = new Date().toISOString().split('T')[0];
    function bold(s: string) { return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
    function mdToHtml(md: string): string {
      const lines = md.split('\n');
      const out: string[] = [];
      let i = 0;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('|')) {
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i].trim()); i++; }
          const rows = tableLines.filter(l => !/^\|[\s\-|:]+\|$/.test(l));
          if (rows.length > 0) {
            out.push('<table>');
            rows.forEach((row, ri) => {
              const cells = row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
              const tag = ri === 0 ? 'th' : 'td';
              out.push('<tr>' + cells.map(c => `<${tag}>${bold(c)}</${tag}>`).join('') + '</tr>');
            });
            out.push('</table>');
          }
          continue;
        }
        if (t.startsWith('# '))        out.push(`<h1>${bold(t.slice(2))}</h1>`);
        else if (t.startsWith('## '))  out.push(`<h2>${bold(t.slice(3))}</h2>`);
        else if (t.startsWith('### ')) out.push(`<h3>${bold(t.slice(4))}</h3>`);
        else if (t.startsWith('- ') || t.startsWith('* ')) out.push(`<li>${bold(t.slice(2))}</li>`);
        else if (/^\d+\. /.test(t))    out.push(`<li class="ol">${bold(t.replace(/^\d+\. /, ''))}</li>`);
        else if (t === '' || t === '---') out.push('<br/>');
        else out.push(`<p>${bold(t)}</p>`);
        i++;
      }
      return out.join('\n');
    }
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>MyFinance — Financial Health Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1e293b;line-height:1.6;padding:0}.header{background:#7c3aed;color:#fff;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;font-size:10pt}.header strong{font-size:11pt}.content{padding:24px 32px}h1{font-size:18pt;font-weight:700;color:#1e293b;margin:18px 0 6px;padding-bottom:6px;border-bottom:2px solid #7c3aed}h2{font-size:12pt;font-weight:700;color:#6d28d9;margin:16px 0 4px}h3{font-size:10.5pt;font-weight:600;color:#475569;margin:12px 0 3px}p{margin:4px 0;font-size:10pt;color:#334155}li{margin:3px 0 3px 20px;font-size:10pt;color:#334155;list-style:disc}li.ol{list-style:decimal}br{display:block;margin:6px 0;content:''}strong{color:#1e293b}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:9.5pt}th{background:#ede9fe;color:#4c1d95;font-weight:600;text-align:left;padding:5px 8px;border:1px solid #c4b5fd}td{padding:4px 8px;border:1px solid #e2e8f0;color:#334155}tr:nth-child(even) td{background:#f8fafc}.footer{margin-top:32px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:8pt;color:#94a3b8;display:flex;justify-content:space-between}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:0}.content{padding:20px 28px}}</style></head><body><div class="header"><strong>MyFinance — Financial Health Report</strong><span>Generated: ${date}</span></div><div class="content">${mdToHtml(report)}<div class="footer"><span>MyFinance — for personal use only</span><span>${date}</span></div></div><script>window.onload=function(){window.print()};<\/script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  /* ── Derived labels ── */
  const modelLabel     = provider === 'anthropic' ? 'Claude Haiku (Anthropic)' : provider === 'groq' ? 'Llama 3.1 (Groq)' : 'Gemini 2.0 Flash (Google AI)';
  const keyPlaceholder = provider === 'anthropic' ? 'sk-ant-api03-…' : provider === 'groq' ? 'gsk_…' : 'AIza…';
  const keyHint        = provider === 'anthropic' ? 'Get a free key at console.anthropic.com' : provider === 'groq' ? 'Get a free key at console.groq.com' : 'Get a free key at aistudio.google.com/apikey';
  const canGenerate    = isSubscribed ? true : !!apiKey.trim();

  const planDetails = {
    monthly: { price: '₹199', period: '/month', saves: '' },
    yearly:  { price: '₹1,499', period: '/year', saves: 'Save 37%' },
  };

  /* ─── UI ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI Finance Analyst</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Get a personalised financial health report powered by AI.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setSubMode('pro')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            subMode === 'pro'
              ? 'bg-violet-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Pro (No Key Needed)
        </button>
        <button
          onClick={() => setSubMode('own')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            subMode === 'own'
              ? 'bg-violet-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Use My Own Key
        </button>
      </div>

      {/* ── PRO TAB ── */}
      {subMode === 'pro' && (
        <div className="space-y-4">
          {isSubscribed ? (
            /* ── Active subscription ── */
            <div className="space-y-3">
              {/* Token revealed after fresh payment */}
              {proView === 'token_revealed' && newToken && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Save your subscription token</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">Copy and store this somewhere safe. You'll need it to restore your subscription on a new device or after clearing your browser.</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2">
                    <code className="flex-1 text-xs text-slate-700 dark:text-slate-300 break-all font-mono leading-relaxed">{newToken}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(newToken); }}
                      className="flex-shrink-0 p-1.5 rounded-lg bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
                      title="Copy token"
                    >
                      <svg className="w-4 h-4 text-amber-700 dark:text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                  <button onClick={() => setProView('cta')} className="text-xs text-amber-600 dark:text-amber-400 underline">I've saved it, dismiss</button>
                </div>
              )}

              {/* Subscription badge */}
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-600 text-white">PRO</span>
                    <span className="text-sm font-semibold text-violet-800 dark:text-violet-200">Active Subscription</span>
                  </div>
                  <button
                    onClick={() => { clearToken(); setSubToken(''); setSubMode('own'); setProView('cta'); setNewToken(''); }}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
                {tokenInfo && (
                  <div className="text-xs text-violet-700 dark:text-violet-300 space-y-0.5">
                    {tokenInfo.email && <p>Email: <strong>{tokenInfo.email}</strong></p>}
                    <p>Plan: <strong className="capitalize">{tokenInfo.plan}</strong></p>
                    <p>Expires: <strong>{new Date(tokenInfo.expiry!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
                  </div>
                )}
                <p className="text-xs text-violet-600 dark:text-violet-400">AI runs on our servers — your API key is never needed on your device.</p>
              </div>
            </div>
          ) : proView === 'restore' ? (
            /* ── Restore by email ── */
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setProView('cta'); setRestoreError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                </button>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Restore Subscription</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter the email you used when subscribing. Your subscription token will be restored automatically.</p>
              <input
                type="email"
                value={restoreEmail}
                onChange={e => setRestoreEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRestore(); }}
                placeholder="your@email.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {restoreError && <p className="text-xs text-red-600 dark:text-red-400">{restoreError}</p>}
              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {restoreLoading ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Restoring…</>
                ) : 'Restore my subscription'}
              </button>
              <p className="text-center text-xs text-slate-400">
                Have your token?{' '}
                <button onClick={() => { setProView('manual'); setRestoreError(''); }} className="text-violet-600 dark:text-violet-400 underline">Enter it manually</button>
              </p>
            </div>
          ) : proView === 'manual' ? (
            /* ── Manual token entry ── */
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setProView('cta'); setManualError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                </button>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Enter Subscription Token</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Paste the token you saved after subscribing.</p>
              <textarea
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                placeholder="Paste your token here…"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              {manualError && <p className="text-xs text-red-600 dark:text-red-400">{manualError}</p>}
              <button
                onClick={handleManualToken}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
              >
                Activate
              </button>
            </div>
          ) : (
            /* ── Upgrade CTA ── */
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Banner */}
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span className="font-bold text-lg">MyFinance Pro</span>
                </div>
                <p className="text-sm text-violet-100">Use AI without managing your own API key. Powered by Claude on our servers.</p>
              </div>

              {/* Features */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <ul className="space-y-2">
                  {[
                    'Full financial health reports — no API key needed',
                    'Ask unlimited custom questions about your finances',
                    'Claude AI (Anthropic) on secure backend servers',
                    'Your financial data stays on your device',
                    'Download PDF reports',
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <svg className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan selector + email */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Choose a plan</p>
                <div className="flex gap-3">
                  {(['monthly', 'yearly'] as const).map(plan => (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`flex-1 rounded-xl border-2 p-3 text-left transition-all ${
                        selectedPlan === plan
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{plan}</span>
                        {planDetails[plan].saves && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{planDetails[plan].saves}</span>
                        )}
                      </div>
                      <span className="text-xl font-bold text-violet-700 dark:text-violet-400">{planDetails[plan].price}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-0.5">{planDetails[plan].period}</span>
                    </button>
                  ))}
                </div>

                {/* Email field */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Your email — to recover subscription on any device</label>
                  <input
                    type="email"
                    value={paymentEmail}
                    onChange={e => setPaymentEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {subError && <p className="text-xs text-red-600 dark:text-red-400">{subError}</p>}

                <button
                  onClick={handleSubscribe}
                  disabled={subLoading}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {subLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Opening payment…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      Subscribe — {planDetails[selectedPlan].price}{planDetails[selectedPlan].period}
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                  Secure payment via Razorpay · UPI, Cards, Net Banking accepted
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button onClick={() => { setProView('restore'); setSubError(''); }} className="text-xs text-violet-600 dark:text-violet-400 underline">Already subscribed? Restore</button>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <button onClick={() => { setProView('manual'); setSubError(''); }} className="text-xs text-violet-600 dark:text-violet-400 underline">Enter token manually</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── OWN KEY TAB ── */}
      {subMode === 'own' && (
        <div className="space-y-4">
          {/* Security notice */}
          <div className="flex gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
              <p className="font-semibold">Your API key is session-only</p>
              <p>Held in memory only — never saved to localStorage, cookies, or any server. Cleared when you leave this page.</p>
            </div>
          </div>

          {/* Config card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Configuration</h2>

            {/* Provider */}
            <div className="flex gap-2 flex-wrap">
              {([
                { id: 'anthropic', label: 'Anthropic (Claude)' },
                { id: 'groq',      label: 'Groq (Llama)'       },
                { id: 'google',    label: 'Google (Gemini)'    },
              ] as { id: Provider; label: string }[]).map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setApiKey(''); setError(''); }}
                  className={`flex-1 min-w-[120px] py-2 rounded-xl text-sm font-medium border transition-colors ${
                    provider === p.id
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* API key */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{modelLabel} — API Key</label>
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
        </div>
      )}

      {/* ── Action buttons (shown when can generate) ── */}
      {(isSubscribed || subMode === 'own') && (
        <div className="space-y-3">
          <button
            onClick={() => callAI(REPORT_PROMPT)}
            disabled={loading || !canGenerate}
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
              disabled={loading || !canGenerate || !customMsg.trim()}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      )}

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
