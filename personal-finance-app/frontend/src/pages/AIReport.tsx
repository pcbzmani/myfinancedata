import { useState, useEffect, useRef } from 'react';
import { getRows } from '../lib/api';

/* ─── Google Identity Services types ─────────────────────────────────── */
declare global {
  interface Window {
    google: any;
    Razorpay: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

function loadGSI(): Promise<void> {
  return new Promise(resolve => {
    if (window.google?.accounts) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => resolve(); // fail silently, button won't render
    document.head.appendChild(s);
  });
}

function parseGoogleJWT(credential: string): { email: string; name: string; picture: string } | null {
  try {
    const payload = JSON.parse(atob(credential.split('.')[1]));
    return { email: payload.email ?? '', name: payload.name ?? '', picture: payload.picture ?? '' };
  } catch { return null; }
}

/* ─── Subscription token helpers ─────────────────────────────────────── */
const SUB_KEY   = 'myfinance_sub_token';

function getStoredToken(): string  { return localStorage.getItem(SUB_KEY) ?? ''; }
function saveToken(t: string)      { localStorage.setItem(SUB_KEY, t); }
function clearToken()              { localStorage.removeItem(SUB_KEY); }

function decodeTokenPayload(token: string): { email?: string; plan?: string; expiry?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0]) return null;
    return JSON.parse(atob(parts[0]));
  } catch { return null; }
}
function isTokenExpired(token: string): boolean {
  if (!token) return true;
  const p = decodeTokenPayload(token);
  if (!p || typeof p.expiry !== 'number') return true;
  return p.expiry < Date.now();
}

/* ─── Razorpay ────────────────────────────────────────────────────────── */
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
  let inList = false;
  text.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('# '))        { inList = false; elements.push(<h1 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">{t.slice(2)}</h1>); }
    else if (t.startsWith('## ')) { inList = false; elements.push(<h2 key={i} className="text-base font-bold mt-5 mb-2 text-violet-700 dark:text-violet-400">{t.slice(3)}</h2>); }
    else if (t.startsWith('### ')){ inList = false; elements.push(<h3 key={i} className="text-sm font-semibold mt-3 mb-1 text-slate-700 dark:text-slate-200">{t.slice(4)}</h3>); }
    else if (t.startsWith('- ') || t.startsWith('* ')) { inList = true; elements.push(<li key={i} className="ml-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc">{renderInline(t.slice(2))}</li>); }
    else if (/^\d+\. /.test(t))   { inList = true; elements.push(<li key={i} className="ml-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-decimal">{renderInline(t.replace(/^\d+\. /, ''))}</li>); }
    else if (t === '')             { inList = false; elements.push(<div key={i} className="h-2" />); }
    else                           { inList = false; elements.push(<p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{renderInline(t)}</p>); }
  });
  return <div className="space-y-0.5">{elements}</div>;
}

/* ─── Plan details ────────────────────────────────────────────────────── */
const PLAN = { price: '₹99', period: '/year', label: '1-year Pro', saves: 'Best value' };

/* ═══════════════════════════════════════════════════════════════════════ */
export default function AIReport() {
  /* Google auth state */
  const [gUser, setGUser]           = useState<{ email: string; name: string; picture: string } | null>(null);
  const [gsiReady, setGsiReady]     = useState(false);
  const [gsiLoading, setGsiLoading] = useState(!!GOOGLE_CLIENT_ID);
  const [gsiBlocked, setGsiBlocked] = useState(false);
  const gButtonRef                  = useRef<HTMLDivElement>(null);

  /* Subscription state */
  const [subToken, setSubToken]   = useState<string>(getStoredToken);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError]   = useState('');
  const [newToken, setNewToken]   = useState('');
  const [showSavedToken, setShowSavedToken] = useState(false);
  const [restoreChecked, setRestoreChecked] = useState(false);

  /* AI state */
  const [report, setReport]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [customMsg, setCustomMsg] = useState('');

  const isSubscribed = !!subToken && !isTokenExpired(subToken);
  const tokenInfo    = isSubscribed ? decodeTokenPayload(subToken) : null;

  /* ── Handle Google sign-in callback (stable ref to avoid stale closure) ── */
  const handleGoogleCredential = useRef(async (response: any) => {});
  handleGoogleCredential.current = async (response: any) => {
    const user = parseGoogleJWT(response.credential);
    if (!user?.email) return;
    setGUser(user);
    setRestoreChecked(false);

    // Auto-restore subscription for this Google account
    const currentToken = getStoredToken();
    const currentSubscribed = !!currentToken && !isTokenExpired(currentToken);
    if (!currentSubscribed) {
      try {
        const res  = await fetch('/api/restore-subscription', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: user.email }),
        });
        const data: any = await res.json();
        if (res.ok && data.subscriptionToken && !isTokenExpired(data.subscriptionToken)) {
          saveToken(data.subscriptionToken);
          setSubToken(data.subscriptionToken);
        }
      } catch { /* no subscription — show upgrade CTA */ }
    }
    setRestoreChecked(true);
  };

  /* ── Load Google Identity Services ── */
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) { setGsiLoading(false); return; }
    // Timeout fallback: if GSI doesn't load in 5s (e.g. Brave/ad-blockers), show manual option
    const timeout = setTimeout(() => setGsiLoading(false), 5000);
    loadGSI().then(() => {
      clearTimeout(timeout);
      if (!window.google?.accounts) { setGsiLoading(false); return; }
      window.google.accounts.id.initialize({
        client_id:   GOOGLE_CLIENT_ID,
        callback:    (r: any) => handleGoogleCredential.current(r),
        auto_select: false,
      });
      setGsiReady(true);
      setGsiLoading(false);
    });
    return () => clearTimeout(timeout);
  }, []);

  /* ── Render Google button after GSI ready + div mounted ── */
  useEffect(() => {
    if (!gsiReady || gUser || isSubscribed) return;
    // Small delay ensures React has committed the ref div to DOM
    const t = setTimeout(() => {
      if (gButtonRef.current) {
        window.google?.accounts.id.renderButton(gButtonRef.current, {
          theme: 'outline',
          size:  'large',
          width: '320',
          text:  'signin_with',
          shape: 'rectangular',
        });
        // Check 600ms later if button actually rendered (Brave/ad-blockers can
        // let the script load but silently prevent renderButton from working)
        setTimeout(() => {
          if (gButtonRef.current && gButtonRef.current.children.length === 0) {
            setGsiBlocked(true);
          }
        }, 600);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [gsiReady, gUser, isSubscribed]);

  function handleSignOut() {
    window.google?.accounts.id.disableAutoSelect();
    setGUser(null);
    clearToken();
    setSubToken('');
    setNewToken('');
    setReport('');
  }

  /* ── Build financial context ── */
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
      catTotals[t.category || 'Other'] = (catTotals[t.category || 'Other'] || 0) + Number(t.amount);
    });
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([c, v]) => `  - ${c}: ₹${v.toLocaleString('en-IN')}`).join('\n');

    return `You are a personal finance assistant for an Indian user. Financial data:

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
${transactions.slice(0, 10).map((t: any) => `  - ${t.type} | ${t.category} | ₹${t.amount} | ${t.description || ''}`).join('\n') || '  (no data)'}

INVESTMENTS (${investments.length} total):
${investments.map((i: any) => `  - ${i.name} (${i.type}) | Invested: ₹${i.amountInvested} | Current: ₹${i.currentValue}`).join('\n') || '  (no data)'}

INSURANCE (${insurance.length} policies):
${insurance.map((p: any) => `  - ${p.provider} (${p.type}) | ₹${p.premium}/${p.frequency} | Sum Assured: ₹${p.sumAssured}`).join('\n') || '  (no data)'}

Give practical, India-specific financial advice. Use ₹ for amounts.`;
  }

  /* ── Call AI via server proxy ── */
  async function callAI(message: string) {
    if (!isSubscribed) return;
    setLoading(true);
    setError('');
    setReport('');
    try {
      const systemPrompt = await buildSystemPrompt();
      const res = await fetch('/api/ai-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscriptionToken: subToken, systemPrompt, message }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI service error');
      setReport(data.text ?? '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Razorpay payment flow ── */
  async function handleSubscribe() {
    const email = gUser?.email ?? '';
    setSubLoading(true);
    setSubError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load payment SDK. Check your connection.');

      const orderRes = await fetch('/api/razorpay-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: 'yearly' }),
      });
      const orderData: any = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error ?? 'Could not create payment order');

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         orderData.keyId,
          amount:      orderData.amount,
          currency:    orderData.currency,
          name:        'MyFinance Pro',
          description: orderData.label,
          order_id:    orderData.orderId,
          prefill:     { name: gUser?.name ?? '', email },
          theme:       { color: '#7c3aed' },
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch('/api/razorpay-verify', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  email,
                  plan: orderData.plan,
                }),
              });
              const verifyData: any = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error ?? 'Payment verification failed');
              saveToken(verifyData.subscriptionToken);
              setSubToken(verifyData.subscriptionToken);
              setNewToken(verifyData.subscriptionToken);
              setShowSavedToken(true);
              resolve();
            } catch (err: any) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
      });
    } catch (err: any) {
      if (err.message !== 'Payment cancelled') setSubError(err.message);
    } finally {
      setSubLoading(false);
    }
  }

  /* ── PDF download ── */
  function downloadReport() {
    const date = new Date().toISOString().split('T')[0];
    function bold(s: string) { return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
    function mdToHtml(md: string): string {
      const out: string[] = []; let i = 0; const lines = md.split('\n');
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith('|')) {
          const tl: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('|')) { tl.push(lines[i].trim()); i++; }
          const rows = tl.filter(l => !/^\|[\s\-|:]+\|$/.test(l));
          if (rows.length) { out.push('<table>'); rows.forEach((r, ri) => { const cells = r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()); const tag = ri === 0 ? 'th' : 'td'; out.push('<tr>' + cells.map(c => `<${tag}>${bold(c)}</${tag}>`).join('') + '</tr>'); }); out.push('</table>'); }
          continue;
        }
        if (t.startsWith('# '))       out.push(`<h1>${bold(t.slice(2))}</h1>`);
        else if (t.startsWith('## ')) out.push(`<h2>${bold(t.slice(3))}</h2>`);
        else if (t.startsWith('### '))out.push(`<h3>${bold(t.slice(4))}</h3>`);
        else if (t.startsWith('- ') || t.startsWith('* ')) out.push(`<li>${bold(t.slice(2))}</li>`);
        else if (/^\d+\. /.test(t))   out.push(`<li class="ol">${bold(t.replace(/^\d+\. /, ''))}</li>`);
        else if (t === '' || t === '---') out.push('<br/>');
        else out.push(`<p>${bold(t)}</p>`);
        i++;
      }
      return out.join('\n');
    }
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>MyFinance — Financial Health Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1e293b;line-height:1.6}.header{background:#7c3aed;color:#fff;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;font-size:10pt}.header strong{font-size:11pt}.content{padding:24px 32px}h1{font-size:18pt;font-weight:700;color:#1e293b;margin:18px 0 6px;padding-bottom:6px;border-bottom:2px solid #7c3aed}h2{font-size:12pt;font-weight:700;color:#6d28d9;margin:16px 0 4px}h3{font-size:10.5pt;font-weight:600;color:#475569;margin:12px 0 3px}p{margin:4px 0;font-size:10pt;color:#334155}li{margin:3px 0 3px 20px;font-size:10pt;color:#334155;list-style:disc}li.ol{list-style:decimal}strong{color:#1e293b}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:9.5pt}th{background:#ede9fe;color:#4c1d95;font-weight:600;text-align:left;padding:5px 8px;border:1px solid #c4b5fd}td{padding:4px 8px;border:1px solid #e2e8f0;color:#334155}tr:nth-child(even) td{background:#f8fafc}.footer{margin-top:32px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:8pt;color:#94a3b8;display:flex;justify-content:space-between}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:0}.content{padding:20px 28px}}</style></head><body><div class="header"><strong>MyFinance — Financial Health Report</strong><span>Generated: ${date}</span></div><div class="content">${mdToHtml(report)}<div class="footer"><span>MyFinance Pro</span><span>${date}</span></div></div><script>window.onload=function(){window.print()};<\/script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI Finance Analyst</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Subscribe to get personalised financial health reports and expert advice — powered by Claude AI.
        </p>
      </div>

      {/* ── SUBSCRIBED (token in localStorage — Google sign-in not required to use AI) ── */}
      {isSubscribed && (
        <div className="space-y-4">

          {/* New token banner */}
          {showSavedToken && newToken && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Save your backup token</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Next time just sign in with Google and your subscription restores automatically. Keep this token as a backup just in case.</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2">
                <code className="flex-1 text-xs text-slate-700 dark:text-slate-300 break-all font-mono leading-relaxed">{newToken}</code>
                <button onClick={() => navigator.clipboard.writeText(newToken)} className="flex-shrink-0 p-1.5 rounded-lg bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors" title="Copy">
                  <svg className="w-4 h-4 text-amber-700 dark:text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
              <button onClick={() => setShowSavedToken(false)} className="text-xs text-amber-600 dark:text-amber-400 underline">Got it, dismiss</button>
            </div>
          )}

          {/* User + subscription badge */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {gUser?.picture
                ? <img src={gUser.picture} alt="" className="w-9 h-9 rounded-full ring-2 ring-violet-200 dark:ring-violet-800" />
                : <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 ring-2 ring-violet-200 dark:ring-violet-800 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
              }
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {gUser?.name ?? tokenInfo?.email ?? 'Pro Subscriber'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-600 text-white">PRO</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {gUser?.email ?? tokenInfo?.email ?? 'Subscription active'}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              {tokenInfo?.expiry && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Expires {new Date(tokenInfo.expiry!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
              <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                {gUser ? 'Sign out' : 'Remove subscription'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => callAI(REPORT_PROMPT)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Analysing your finances…</>
              ) : (
                <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>Generate Full Financial Report</>
              )}
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && customMsg.trim()) { callAI(customMsg.trim()); setCustomMsg(''); } }}
                placeholder="Ask anything about your finances… (e.g. Should I increase my SIP?)"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={() => { if (customMsg.trim()) { callAI(customMsg.trim()); setCustomMsg(''); } }}
                disabled={loading || !customMsg.trim()}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                Ask
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Report */}
          {report && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Report</span>
                <div className="flex gap-2">
                  <button onClick={() => callAI(REPORT_PROMPT)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    Regenerate
                  </button>
                  <button onClick={downloadReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
      )}

      {/* ── NOT SUBSCRIBED — show upgrade flow ── */}
      {!isSubscribed && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Banner */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span className="font-bold text-lg">MyFinance Pro</span>
            </div>
            <p className="text-sm text-violet-100">AI-powered financial analysis based on your real data — no API key needed.</p>
          </div>

          {/* Features */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <ul className="space-y-2">
              {[
                'Full financial health report from your transactions & investments',
                'Ask anything — investment strategy, savings rate, insurance gaps',
                'Pro Finance Calculators: SIP, Loan EMI, Avg Stock Price, Gold charge',
                'Claude AI (Anthropic) runs on secure servers — your key never exposed',
                'Your financial data stays on your device',
                'Download PDF reports',
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <svg className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Step 1 — Sign in with Google */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sign in with Google</span>
              </div>

              {!gUser ? (
                <div className="space-y-2">
                  {gsiLoading ? (
                    /* Loading state while GSI script fetches */
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      <span className="text-sm text-slate-500 dark:text-slate-400">Loading sign-in…</span>
                    </div>
                  ) : GOOGLE_CLIENT_ID && gsiReady && !gsiBlocked ? (
                    /* Google renders button into this div */
                    <div ref={gButtonRef} className="min-h-[44px]" />
                  ) : GOOGLE_CLIENT_ID ? (
                    /* GSI blocked by browser (Brave, ad-blocker, etc.) or renderButton failed silently */
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Google Sign-In was blocked</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Your browser or an extension is blocking Google's sign-in button (common in Brave, Firefox strict mode, or ad-blockers).
                          </p>
                        </div>
                      </div>

                      {/* Try prompt() as fallback — sometimes works even when renderButton fails */}
                      <button
                        onClick={() => window.google?.accounts.id.prompt()}
                        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Try Sign in with Google</span>
                      </button>

                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">If that doesn't work, try one of these:</p>
                      <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 ml-3">
                        <li>• Open this page in <strong className="text-slate-700 dark:text-slate-300">Chrome</strong> or <strong className="text-slate-700 dark:text-slate-300">Firefox</strong></li>
                        <li>• In Brave: click the <strong className="text-slate-700 dark:text-slate-300">Shield icon</strong> → disable shields for this site</li>
                        <li>• Disable your ad-blocker for <strong className="text-slate-700 dark:text-slate-300">pcbzmani.netlify.app</strong></li>
                      </ul>
                    </div>
                  ) : (
                    /* VITE_GOOGLE_CLIENT_ID not set in Netlify env vars */
                    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Google Sign-In not configured</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Add <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in Netlify → Environment variables, then redeploy.</p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500">Used only to verify your identity and restore your subscription on any device. The rest of the app works without login.</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
                  {gUser.picture && <img src={gUser.picture} alt="" className="w-7 h-7 rounded-full" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 truncate">{gUser.name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">{gUser.email}</p>
                  </div>
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>

            {/* Step 2 — Subscribe */}
            {gUser && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Unlock Pro — ₹99/year</span>
                </div>

                {/* Single plan card */}
                <div className="rounded-xl border-2 border-violet-500 bg-violet-50 dark:bg-violet-900/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">1-Year Pro</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">Best value</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-violet-700 dark:text-violet-400">₹99</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/year</span>
                  </div>
                  <ul className="space-y-1">
                    {['AI financial health reports', 'Unlimited AI questions', 'Pro calculators (SIP, EMI, Gold…)', 'PDF export', 'Auto-renews after 1 year'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <svg className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {subError && <p className="text-xs text-red-600 dark:text-red-400">{subError}</p>}

                <button
                  onClick={handleSubscribe}
                  disabled={subLoading}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {subLoading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Opening payment…</>
                  ) : (
                    <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>Get Pro — ₹99/year</>
                  )}
                </button>
                <p className="text-center text-xs text-slate-400 dark:text-slate-500">Secure payment via Razorpay · UPI, Cards, Net Banking</p>
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                  By subscribing, you agree to our{' '}
                  <a href="/privacy-policy.html" target="_blank" rel="noopener" className="underline hover:text-violet-600">Privacy Policy</a>
                  {' '}and{' '}
                  <a href="/refund-policy.html" target="_blank" rel="noopener" className="underline hover:text-violet-600">Refund Policy</a>
                  {' '}(no refunds; contact <a href="mailto:pcbzmani@gmail.com" className="underline hover:text-violet-600">pcbzmani@gmail.com</a> for feature requests).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
