import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors() });
  }

  try {
    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return new Response('Invalid subscription', { status: 400, headers: cors() });
    }

    const store = getStore({ name: 'push-subscriptions', consistency: 'strong' });
    await store.setJSON('subscription', subscription);

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const config: Config = {
  path: '/api/push/subscribe',
};
