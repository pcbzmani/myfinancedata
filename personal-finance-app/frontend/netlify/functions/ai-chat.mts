import type { Config } from '@netlify/functions';
import { createHmac } from 'crypto';
import { getStore } from '@netlify/blobs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const TOKEN_SECRET      = process.env.TOKEN_SECRET ?? '';
const ALERT_TOPIC       = process.env.NTFY_ALERT_TOPIC ?? '';   // e.g. "myfinance-pcbzmani"

const ALLOWED_ORIGIN = process.env.URL ?? 'https://pcbzmani.netlify.app';
const MAX_MESSAGE_LEN = 4000;

const CORS = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── Finance-only system prompt (server-enforced, not client-overridable) ──────
const FINANCE_SYSTEM_PROMPT = `You are MyFinance AI — a dedicated personal finance assistant built exclusively for the MyFinance app (pcbzmani.netlify.app).

You ONLY answer questions related to:
- Personal finance and budgeting
- Savings instruments: FD, RD, PPF, NPS, savings accounts
- Investments: stocks, mutual funds, SIP, ELSS, ETF, bonds, index funds
- Insurance: term life, health, vehicle, ULIP, endowment
- Indian taxation: ITR filing, TDS, GST, capital gains tax, 80C/80D deductions, HRA, surcharge
- Loans and EMI: home loan, car loan, personal loan, education loan
- Credit cards, CIBIL score, credit health
- Gold, silver, and commodity investments
- Retirement and long-term financial planning
- Cryptocurrencies only from an investment/tax perspective
- Indian economy, RBI policy, repo rate, inflation as they relate to personal finance
- Analysis of the user's own financial data provided in the prompt

STRICT RULE: If the user asks about ANYTHING outside personal finance — including but not limited to coding, recipes, travel, general knowledge, sports, entertainment, relationships, health symptoms, or any other non-finance topic — you must respond with exactly this polite refusal:
"I'm MyFinance AI, designed exclusively for personal finance questions. I'm not able to help with that topic, but I'd be happy to assist with budgeting, investment planning, tax calculations, insurance queries, or analysing your financial data. What finance question can I help you with? 😊"

Never use web search or real-time data for non-finance topics.
Never guarantee investment returns — always note that past performance does not guarantee future results.
Keep answers practical, concise, and focused on the Indian financial context where applicable.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

/** Verify a subscription token issued by razorpay-verify.mts */
function verifyToken(token: string): { valid: boolean; email?: string; reason?: string } {
  if (!TOKEN_SECRET) return { valid: false, reason: 'Server not configured' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'Malformed token' };
  const [payload64, sig] = parts;
  const expected = createHmac('sha256', TOKEN_SECRET).update(payload64).digest('hex');
  if (expected !== sig) return { valid: false, reason: 'Invalid token signature' };
  try {
    const decoded = JSON.parse(Buffer.from(payload64, 'base64').toString('utf-8'));
    if (decoded.expiry < Date.now()) return { valid: false, reason: 'Subscription expired' };
    return { valid: true, email: decoded.email };
  } catch {
    return { valid: false, reason: 'Corrupt token payload' };
  }
}

/** Track monthly token usage in Netlify Blobs */
async function trackUsage(inputTokens: number, outputTokens: number) {
  try {
    const store  = getStore('api-usage');
    const month  = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const existing: any = await store.get(month, { type: 'json' }).catch(() => null);
    const prev = existing ?? { inputTokens: 0, outputTokens: 0, calls: 0 };
    await store.setJSON(month, {
      inputTokens:  prev.inputTokens  + inputTokens,
      outputTokens: prev.outputTokens + outputTokens,
      calls:        prev.calls        + 1,
      updatedAt:    new Date().toISOString(),
    });
  } catch { /* non-fatal */ }
}

/** Send a push notification via ntfy.sh when credits run out */
async function sendCreditAlert(message: string) {
  if (!ALERT_TOPIC) return;
  try {
    await fetch(`https://ntfy.sh/${ALERT_TOPIC}`, {
      method: 'POST',
      body:   message,
      headers: {
        Title:    'MyFinance AI — Action Required',
        Priority: 'urgent',
        Tags:     'warning,money_with_wings',
      },
    });
  } catch { /* non-fatal */ }
}

/** Write a credit alert flag to Blobs so the admin dashboard can show it */
async function flagCreditAlert(errorMessage: string) {
  try {
    const store = getStore('api-usage');
    await store.setJSON('credit-alert', {
      alert:     true,
      message:   errorMessage,
      alertedAt: new Date().toISOString(),
    });
    await sendCreditAlert(`Anthropic API error on MyFinance: ${errorMessage}`);
  } catch { /* non-fatal */ }
}

export default async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  // Note: systemPrompt from client is intentionally ignored — server enforces finance-only prompt
  const { subscriptionToken, message } = body;

  // --- Verify subscription token ---
  const check = verifyToken(subscriptionToken ?? '');
  if (!check.valid) {
    return json({ error: check.reason ?? 'Not subscribed' }, 403);
  }

  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'AI service not configured on server' }, 503);
  }
  if (!message || typeof message !== 'string') {
    return json({ error: 'message is required' }, 400);
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return json({ error: `Message too long (max ${MAX_MESSAGE_LEN} chars)` }, 400);
  }

  // --- Call Anthropic ---
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            ANTHROPIC_API_KEY,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system:     FINANCE_SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: message }],
      }),
    });

    const data: any = await res.json();

    // Detect billing / credit errors
    if (!res.ok) {
      const errMsg = data?.error?.message ?? 'Anthropic API error';
      const errType = data?.error?.type ?? '';
      // Credit exhausted: 402, or "credit_balance_too_low" type, or 529 overloaded
      if (res.status === 402 || errType.includes('credit') || errType.includes('billing')) {
        await flagCreditAlert(`Credits depleted (${res.status}): ${errMsg}`);
        return json({ error: 'AI service temporarily unavailable — credits depleted. The app owner has been notified.' }, 503);
      }
      return json({ error: errMsg }, 502);
    }

    // Track successful token usage
    const usage = data.usage ?? {};
    await trackUsage(usage.input_tokens ?? 0, usage.output_tokens ?? 0);

    return json({ text: data.content?.[0]?.text ?? '' });
  } catch (err: any) {
    return json({ error: err.message ?? 'Internal error' }, 500);
  }
};

export const config: Config = {
  path: '/api/ai-chat',
};
