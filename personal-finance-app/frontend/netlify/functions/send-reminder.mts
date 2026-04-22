import { getStore } from '@netlify/blobs';
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

  const store = getStore({ name: 'push-subscriptions', consistency: 'strong' });
  const subscription = await store.get('subscription', { type: 'json' }) as webpush.PushSubscription | null;

  if (!subscription) {
    console.log('No push subscription saved yet — skipping');
    return;
  }

  const payload = JSON.stringify({
    title: 'PanamKasu Reminder',
    body: "Don't forget to log today's financial entries!",
    url: '/transactions',
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log('Push notification sent');
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired or invalid — remove it so we stop sending
      await store.delete('subscription');
      console.log('Subscription expired — removed');
    } else {
      console.error('Push send error:', err);
    }
  }
};

export const config: Config = {
  schedule: '0 */4 * * *', // every 4 hours
};
