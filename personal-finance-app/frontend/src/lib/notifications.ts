const ENTRY_KEY    = 'myfinance_last_entry';
const DISABLED_KEY = 'myfinance_notif_disabled';
const INTERVAL_MS  = 4 * 60 * 60 * 1000; // every 4 hours

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

/** Register periodic background sync (Chrome Android / TWA) */
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
    // Re-schedule next 4-hour check regardless (resets after entry made)
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
