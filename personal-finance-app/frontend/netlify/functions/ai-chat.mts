import type { Config } from '@netlify/functions';
import { createHmac } from 'crypto';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const TOKEN_SECRET      = process.env.TOKEN_SECRET ?? '';

const ALLOWED_ORIGIN = process.env.URL ?? 'https://pcbzmani.netlify.app';
const MAX_MESSAGE_LEN = 4000;

const CORS = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

/** Verify a subscription token issued by razorpay-verify.mts */
function verifyToken(token: string): { valid: boolean; reason?: string } {
  if (!TOKEN_SECRET) return { valid: false, reason: 'Server not configured' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'Malformed token' };
  const [payload64, sig] = parts;
  const expected = createHmac('sha256', TOKEN_SECRET).update(payload64).digest('hex');
  if (expected !== sig) return { valid: false, reason: 'Invalid token signature' };
  try {
    const decoded = JSON.parse(Buffer.from(payload64, 'base64').toString('utf-8'));
    if (decoded.expiry < Date.now()) return { valid: false, reason: 'Subscription expired' };
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Corrupt token payload' };
  }
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

  const { subscriptionToken, systemPrompt, message } = body;

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
        max_tokens: 4096,
        system:     systemPrompt ?? '',
        messages:   [{ role: 'user', content: message }],
      }),
    });

    const data: any = await res.json();
    if (!res.ok) {
      return json({ error: data?.error?.message ?? 'Anthropic API error' }, 502);
    }
    return json({ text: data.content?.[0]?.text ?? '' });
  } catch (err: any) {
    return json({ error: err.message ?? 'Internal error' }, 500);
  }
};

export const config: Config = {
  path: '/api/ai-chat',
};
