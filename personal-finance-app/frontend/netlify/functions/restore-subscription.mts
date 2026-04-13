import type { Config } from '@netlify/functions';
import { getStore }    from '@netlify/blobs';

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
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid body' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return json({ error: 'Valid email is required' }, 400);
  }

  try {
    const store = getStore('subscriptions');
    const record = await store.get(email, { type: 'json' }) as any;

    if (!record) {
      return json({ error: 'No subscription found for this email' }, 404);
    }

    return json({
      subscriptionToken: record.subscriptionToken,
      plan:              record.plan,
      createdAt:         record.createdAt,
    });
  } catch (e: any) {
    console.error('Blobs read failed:', e);
    return json({ error: 'Could not restore subscription. Try entering your token manually.' }, 500);
  }
};

export const config: Config = {
  path: '/api/restore-subscription',
};
