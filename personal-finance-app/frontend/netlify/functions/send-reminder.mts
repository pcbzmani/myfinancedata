import { neon } from '@netlify/neon';
import webpush from 'web-push';
import type { Config } from '@netlify/functions';

export default async () => {
  const publicKey  = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    console.error('Missing VAPID env vars — skipping push');
    return;
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  const sql = neon();
  const subscriptions = await sql`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE is_active = true
  `;

  if (subscriptions.length === 0) {
    console.log('No active push subscriptions — skipping');
    return;
  }

  const payload = JSON.stringify({
    title: 'PanamKasu Reminder',
    body: "Don't forget to log today's financial entries!",
    url: '/transactions',
  });

  let sent = 0;
  for (const row of subscriptions) {
    const pushSub: webpush.PushSubscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      await webpush.sendNotification(pushSub, payload);
      await sql`UPDATE push_subscriptions SET last_sent_at = NOW() WHERE id = ${row.id}`;
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired — mark inactive
        await sql`UPDATE push_subscriptions SET is_active = false WHERE id = ${row.id}`;
        console.log(`Subscription ${row.id} expired — marked inactive`);
      } else {
        console.error(`Push send error for subscription ${row.id}:`, err);
      }
    }
  }

  console.log(`Push reminder sent to ${sent}/${subscriptions.length} subscribers`);
};

export const config: Config = {
  schedule: '0 */4 * * *', // every 4 hours
};
