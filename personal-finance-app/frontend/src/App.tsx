import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useDarkMode } from './hooks/useDarkMode';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Investments from './pages/Investments';
import Insurance from './pages/Insurance';
import Subscriptions from './pages/Subscriptions';
import Vault from './pages/Vault';
import Split from './pages/Split';
import Settings from './pages/Settings';
import AIReport from './pages/AIReport';
import {
  hasAskedPermission,
  requestPermission,
  notificationsGranted,
  registerPeriodicSync,
  scheduleInAppReminder,
} from './lib/notifications';

function NotificationBanner({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    const granted = await requestPermission();
    if (granted) {
      await registerPeriodicSync();
      scheduleInAppReminder();
    }
    onClose();
  }

  function handleDismiss() {
    // markAskedPermission already called inside requestPermission — call it here for dismiss
    import('./lib/notifications').then(m => m.markAskedPermission());
    onClose();
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md
                    bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                    rounded-2xl shadow-xl p-4 flex items-start gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
        <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Daily entry reminder</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Get a notification at 8 PM if you haven't logged your finances for the day.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Enabling…' : 'Enable'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

export default function App() {
  const { dark, toggle } = useDarkMode();
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  useEffect(() => {
    // If already granted, just re-register sync and schedule in-app reminder
    if (notificationsGranted()) {
      registerPeriodicSync();
      scheduleInAppReminder();
      return;
    }
    // Show banner once, after 3 seconds, if not yet asked
    if (!hasAskedPermission() && 'Notification' in window) {
      const t = setTimeout(() => setShowNotifBanner(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout dark={dark} onToggleDark={toggle} />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="investments" element={<Investments />} />
          <Route path="insurance" element={<Insurance />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="vault" element={<Vault />} />
          <Route path="split" element={<Split />} />
          <Route path="ai" element={<AIReport />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {showNotifBanner && <NotificationBanner onClose={() => setShowNotifBanner(false)} />}
    </BrowserRouter>
  );
}
