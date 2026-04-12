import type { Config } from '@netlify/functions';
import { createHmac }   from 'crypto';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
const TOKEN_SECRET        = process.env.TOKEN_SECRET        ?? '';

const PLAN_DURATION: Record<string, number> = {
  monthly: 30  * 24 * 60 * 60 * 1000,   // 30 days
  yearly:  365 * 24 * 60 * 60 * 1000,   // 365 days
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

/** Build a self-contained, HMAC-signed subscription token (no DB needed) */
function buildToken(email: string, plan: string): string {
  const expiry  = Date.now() + (PLAN_DURATION[plan] ?? PLAN_DURATION.monthly);
  const payload = Buffer.from(JSON.stringify({ email, plan, expiry })).toString('base64');
  const sig     = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!RAZORPAY_KEY_SECRET || !TOKEN_SECRET) {
    return json({ error: 'Payment service not configured' }, 503);
  }

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid body' }, 400); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, plan } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json({ error: 'Missing payment fields' }, 400);
  }

  // Razorpay signature verification: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
  const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return json({ error: 'Payment verification failed' }, 403);
  }

  // Issue a subscription token
  const subscriptionToken = buildToken(email || 'user', plan || 'monthly');

  return json({ subscriptionToken, plan: plan || 'monthly' });
};

export const config: Config = {
  path: '/api/razorpay-verify',
};
