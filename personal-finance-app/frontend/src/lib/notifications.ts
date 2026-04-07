const ENTRY_KEY    = 'myfinance_last_entry';
const DISABLED_KEY = 'myfinance_notif_disabled';
const REMINDER_H   = 20; // 8 PM

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
    // Unregister periodic background sync
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
        minInterval: 20 * 60 * 60 * 1000, // 20 hours
      });
    }
  } catch { /* not supported in this browser */ }
}

/** Schedule an in-app notification at REMINDER_H (8 PM) if tab stays open */
export function scheduleInAppReminder() {
  if (!notificationsGranted() || isNotifDisabled()) return;
  const now    = new Date();
  const target = new Date(now);
  target.setHours(REMINDER_H, 0, 0, 0);
  if (target <= now) return; // already past 8 PM

  const ms = target.getTime() - now.getTime();
  setTimeout(() => {
    if (localStorage.getItem(ENTRY_KEY) !== todayStr()) {
      new Notification('MyFinance Reminder', {
        body: "Don't forget to log today's financial entries!",
        icon: '/pwa-192x192.png',
        tag: 'daily-reminder',
      });
    }
  }, ms);
}
