import type { Config } from '@netlify/functions';
import { createHmac }   from 'crypto';
import { getStore }     from '@netlify/blobs';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
const TOKEN_SECRET        = process.env.TOKEN_SECRET        ?? '';

const PLAN_DURATION: Record<string, number> = {
  monthly: 30  * 24 * 60 * 60 * 1000,
  yearly:  365 * 24 * 60 * 60 * 1000,
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

function buildToken(email: string, plan: string): string {
  const expiry  = Date.now() + (PLAN_DURATION[plan] ?? PLAN_DURATION.yearly);
  const payload = Buffer.from(JSON.stringify({ email, plan, expiry })).toString('base64');
  const sig     = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!RAZORPAY_KEY_SECRET) {
    return json({ error: 'Payment service not configured' }, 503);
  }

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid body' }, 400); }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    email,
    plan,
    type,   // 'donation' | 'subscription'
    amount, // donation amount in paise
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json({ error: 'Missing payment fields' }, 400);
  }

  // Verify Razorpay signature
  const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return json({ error: 'Payment verification failed' }, 403);
  }

  const userEmail   = (email || '').trim().toLowerCase();
  const isDonation  = type === 'donation';
  const now         = Date.now();

  try {
    const store    = getStore('subscriptions');
    const storeKey = userEmail || razorpay_payment_id;

    if (isDonation) {
      // Log donation — no token issued
      await store.setJSON(`donation_${razorpay_payment_id}`, {
        type:      'donation',
        email:     userEmail || null,
        paymentId: razorpay_payment_id,
        amount:    amount ? Math.round(amount / 100) : null, // store in rupees
        createdAt: new Date(now).toISOString(),
      });
      return json({ success: true, type: 'donation' });
    }

    // Subscription flow — issue a token
    if (!TOKEN_SECRET) {
      return json({ error: 'Token service not configured' }, 503);
    }
    const resolvedPlan      = (plan && plan in PLAN_DURATION) ? plan : 'yearly';
    const duration          = PLAN_DURATION[resolvedPlan];
    const subscriptionToken = buildToken(userEmail || 'user', resolvedPlan);

    await store.setJSON(storeKey, {
      subscriptionToken,
      email:     userEmail || null,
      plan:      resolvedPlan,
      paymentId: razorpay_payment_id,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + duration).toISOString(),
      amount:    resolvedPlan === 'yearly' ? 99 : 49,
    });

    return json({ subscriptionToken, plan: resolvedPlan, email: userEmail, type: 'subscription' });
  } catch (e) {
    console.error('Blobs write failed:', e);
    // Non-fatal for donations; fatal for subscriptions (no token to return)
    if (isDonation) return json({ success: true, type: 'donation' });
    return json({ error: 'Could not store subscription' }, 500);
  }
};

export const config: Config = {
  path: '/api/razorpay-verify',
};
