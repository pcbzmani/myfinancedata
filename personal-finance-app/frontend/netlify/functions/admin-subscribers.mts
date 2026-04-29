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
    // ── 1. Subscribers + Donations ────────────────────────────────────────────
    const subStore = getStore('subscriptions');
    const subscribers: any[] = [];
    const donations: any[]   = [];

    let cursor: string | undefined;
    do {
      const page: any = await subStore.list(cursor ? { cursor } : {});
      for (const entry of (page.blobs ?? [])) {
        if (entry.key === 'credit-alert') continue;
        const data: any = await subStore.get(entry.key, { type: 'json' }).catch(() => null);
        if (!data) continue;

        if (data.type === 'donation' || entry.key.startsWith('donation_')) {
          // Donation record
          donations.push({
            email:     data.email ?? null,
            paymentId: data.paymentId,
            amount:    data.amount ?? null,
            createdAt: data.createdAt,
          });
        } else {
          // Subscription record
          const now       = Date.now();
          const expiresMs = data.expiresAt ? new Date(data.expiresAt).getTime() : null;
          const email     = data.email ?? (entry.key.includes('@') ? entry.key : null);
          subscribers.push({
            email:        email ?? entry.key,
            plan:         data.plan,
            paymentId:    data.paymentId,
            subscribedAt: data.createdAt,
            expiresAt:    data.expiresAt ?? null,
            amount:       data.amount ?? 99,
            active:       expiresMs ? expiresMs > now : true,
            daysLeft:     expiresMs ? Math.max(0, Math.floor((expiresMs - now) / 86_400_000)) : null,
          });
        }
      }
      cursor = page.cursor;
    } while (cursor);

    // Sort newest first
    subscribers.sort((a, b) =>
      new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
    );
    donations.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

    const totalDonated = donations.reduce((sum, d) => sum + (d.amount ?? 0), 0);

    return json({
      totalSubscribers:  subscribers.length,
      activeSubscribers: subscribers.filter(s => s.active).length,
      subscribers,
      donations,
      totalDonated,
      tokenUsage:  months,
      creditAlert: creditAlert ?? { alert: false },
    });
  } catch (err: any) {
    return json({ error: err.message ?? 'Internal error' }, 500);
  }
};

export const config: Config = {
  path: '/api/admin-subscribers',
};
