/**
 * GET /api/admin-subscribers
 * Returns: subscriber list, monthly token usage, credit alert status.
 * Protected by ADMIN_SECRET env var — pass as ?secret=... query param or
 * x-admin-secret header.
 */
import type { Config } from '@netlify/functions';
import { getStore, listStores } from '@netlify/blobs';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // Auth check
  const url    = new URL(req.url);
  const secret = req.headers.get('x-admin-secret') ?? url.searchParams.get('secret') ?? '';
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    // ── 1. Subscribers ────────────────────────────────────────────────────────
    const subStore = getStore('subscriptions');
    const subList  = await subStore.list();
    const subscribers: any[] = [];

    for (const entry of subList.blobs) {
      const data: any = await subStore.get(entry.key, { type: 'json' }).catch(() => null);
      if (!data) continue;
      const now       = Date.now();
      const expiresMs = data.expiresAt ? new Date(data.expiresAt).getTime() : null;
      subscribers.push({
        email:      entry.key,
        plan:       data.plan,
        paymentId:  data.paymentId,
        subscribedAt: data.createdAt,
        expiresAt:  data.expiresAt ?? null,
        amount:     data.amount ?? 99,
        active:     expiresMs ? expiresMs > now : true,
        daysLeft:   expiresMs ? Math.max(0, Math.floor((expiresMs - now) / 86_400_000)) : null,
      });
    }

    // Sort newest first
    subscribers.sort((a, b) =>
      new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
    );

    // ── 2. Monthly token usage ────────────────────────────────────────────────
    const usageStore = getStore('api-usage');
    const months: Record<string, any> = {};
    const usageList = await usageStore.list();

    for (const entry of usageList.blobs) {
      if (entry.key === 'credit-alert') continue;
      const data: any = await usageStore.get(entry.key, { type: 'json' }).catch(() => null);
      if (data) months[entry.key] = data;
    }

    // ── 3. Credit alert status ────────────────────────────────────────────────
    const creditAlert: any = await usageStore.get('credit-alert', { type: 'json' }).catch(() => null);

    return json({
      totalSubscribers: subscribers.length,
      activeSubscribers: subscribers.filter(s => s.active).length,
      subscribers,
      tokenUsage: months,
      creditAlert: creditAlert ?? { alert: false },
    });
  } catch (err: any) {
    return json({ error: err.message ?? 'Internal error' }, 500);
  }
};

export const config: Config = {
  path: '/api/admin-subscribers',
};
