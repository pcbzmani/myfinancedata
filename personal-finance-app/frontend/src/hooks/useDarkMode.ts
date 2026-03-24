import { useEffect, useState } from 'react';

const KEY = 'theme';

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem(KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(KEY, 'light');
    }
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}
