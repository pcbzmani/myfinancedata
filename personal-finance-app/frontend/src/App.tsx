import { useEffect } from 'react';
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
import Learn from './pages/Learn';
import {
  notificationsGranted,
  isNotifDisabled,
  registerPeriodicSync,
  scheduleInAppReminder,
} from './lib/notifications';

export default function App() {
  const { dark, toggle } = useDarkMode();

  useEffect(() => {
    // Re-register sync + schedule in-app reminder on load if already granted and not disabled
    if (notificationsGranted() && !isNotifDisabled()) {
      registerPeriodicSync();
      scheduleInAppReminder();
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
          <Route path="learn" element={<Learn />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
