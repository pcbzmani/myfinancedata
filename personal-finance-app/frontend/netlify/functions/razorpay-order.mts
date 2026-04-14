import type { Config } from '@netlify/functions';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

const PLANS: Record<string, { amount: number; label: string }> = {
  yearly: { amount: 9900, label: '1-year Pro' },  // ₹99/year
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

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return json({ error: 'Payment service not configured' }, 503);
  }

  const plan = 'yearly';
  try { await req.json(); } catch { /* ignore */ }

  const { amount, label } = PLANS[plan];
  const receipt = `sub_${plan}_${Date.now()}`;

  try {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const res  = await fetch('https://api.razorpay.com/v1/orders', {
      method:  'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amount, currency: 'INR', receipt, notes: { plan, label } }),
    });

    const data: any = await res.json();
    if (!res.ok) {
      return json({ error: data?.error?.description ?? 'Razorpay order creation failed' }, 502);
    }

    return json({
      orderId:  data.id,
      amount:   data.amount,
      currency: data.currency,
      keyId:    RAZORPAY_KEY_ID,
      plan,
      label,
    });
  } catch (err: any) {
    return json({ error: err.message ?? 'Internal error' }, 500);
  }
};

export const config: Config = {
  path: '/api/razorpay-order',
};
