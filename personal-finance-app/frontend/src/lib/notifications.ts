const ENTRY_KEY    = 'myfinance_last_entry';
const DISABLED_KEY = 'myfinance_notif_disabled';
const INTERVAL_MS  = 4 * 60 * 60 * 1000; // every 4 hours

// VAPID public key — set VITE_VAPID_PUBLIC_KEY in Netlify env vars
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** Call after a transaction is successfully added */
export function markEntryMadeToday() {
  localStorage.setItem(ENTRY_KEY, todayStr());
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'ENTRY_MADE', date: todayStr() });
  }
}

export function notificationsGranted() {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function isNotifDisabled() {
  return localStorage.getItem(DISABLED_KEY) === '1';
}

export async function setNotifEnabled(enabled: boolean) {
  if (enabled) {
    localStorage.removeItem(DISABLED_KEY);
    await subscribeToWebPush();
    await registerPeriodicSync();
    scheduleInAppReminder();
  } else {
    localStorage.setItem(DISABLED_KEY, '1');
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if ('periodicSync' in reg) {
          await (reg as any).periodicSync.unregister('daily-entry-reminder');
        }
      } catch { /* ignore */ }
    }
  }
}

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Subscribe to Web Push and save the subscription to Netlify Blob via API */
export async function subscribeToWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!VAPID_PUBLIC_KEY) return; // not configured (local dev)

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
  } catch (err) {
    console.warn('Web Push subscription failed:', err);
  }
}

/** Register periodic background sync (Chrome Android PWA) */
export async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator) || isNotifDisabled()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      await (reg as any).periodicSync.register('daily-entry-reminder', {
        minInterval: INTERVAL_MS,
      });
    }
  } catch { /* not supported in this browser */ }
}

/** Fire a reminder every 4 hours while the tab is open, if no entry today */
export function scheduleInAppReminder() {
  if (!notificationsGranted() || isNotifDisabled()) return;

  setTimeout(() => {
    if (!isNotifDisabled() && localStorage.getItem(ENTRY_KEY) !== todayStr()) {
      new Notification('MyFinance Reminder', {
        body: "Don't forget to log today's financial entries!",
        icon: '/pwa-192x192.png',
        tag: 'daily-reminder',
      });
    }
    scheduleInAppReminder();
  }, INTERVAL_MS);
}

/** Fire a test notification immediately (for verification in Settings) */
export function fireTestNotification() {
  if (!notificationsGranted()) return;
  new Notification('MyFinance Reminder', {
    body: "Don't forget to log today's financial entries!",
    icon: '/pwa-192x192.png',
    tag: 'daily-reminder-test',
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
