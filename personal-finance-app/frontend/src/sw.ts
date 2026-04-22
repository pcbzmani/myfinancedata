/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Activate new service worker immediately — don't wait for old tabs to close
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Never cache API calls — always go to network
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
  }
});

const NOTIF_CACHE = 'myfinance-notif-v1';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

async function checkAndNotify() {
  const today = getToday();
  const cache = await caches.open(NOTIF_CACHE);

  // Skip if already notified today
  const notifiedRes = await cache.match('notified-date');
  if (notifiedRes && (await notifiedRes.text()) === today) return;

  // Skip if user already made an entry today
  const entryRes = await cache.match('entry-date');
  if (entryRes && (await entryRes.text()) === today) return;

  await self.registration.showNotification('PanamKasu Reminder', {
    body: "Don't forget to log today's financial entries!",
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: 'daily-reminder',
    renotify: true,
    data: { url: '/transactions' },
  });

  await cache.put('notified-date', new Response(today));
}

// ── Web Push (Netlify scheduled function → browser) ──────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(checkAndNotify());
});

// ── Periodic background sync (Chrome Android PWA) ────────────────────────────
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'daily-entry-reminder') {
    event.waitUntil(checkAndNotify());
  }
});

// ── Notification click → open app ────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || '/transactions';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients: readonly WindowClient[]) => {
        const match = clients.find(c => c.url.includes(self.location.origin));
        if (match) return match.focus();
        return self.clients.openWindow(url);
      })
  );
});

// ── Message from app (entry made today) ──────────────────────────────────────
self.addEventListener('message', async (event: ExtendableMessageEvent) => {
  if ((event.data as { type?: string })?.type === 'ENTRY_MADE') {
    const cache = await caches.open(NOTIF_CACHE);
    await cache.put('entry-date', new Response((event.data as { date: string }).date));
    // Dismiss any pending reminder notification
    const notifications = await self.registration.getNotifications({ tag: 'daily-reminder' });
    notifications.forEach(n => n.close());
  }
});
