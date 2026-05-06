import { neon } from '@netlify/neon';
import type { Config } from '@netlify/functions';

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors() });
  }

  try {
    const subscription = await req.json();
    const endpoint = subscription?.endpoint;
    const p256dh   = subscription?.keys?.p256dh;
    const auth     = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return new Response('Invalid subscription', { status: 400, headers: cors() });
    }

    const sql = neon();
    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth)
      VALUES (${endpoint}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint)
      DO UPDATE SET p256dh = ${p256dh}, auth = ${auth}, is_active = true
    `;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors() },
    });
  } catch (err) {
    console.error('save-subscription error:', err);
    return new Response('Internal error', { status: 500, headers: cors() });
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const config: Config = {
  path: '/api/push/subscribe',
};
