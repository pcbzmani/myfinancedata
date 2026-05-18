/**
 * PageTransition — wraps <Outlet/> in Layout.tsx so route changes fade-up
 * the new page content. Re-applies the `.pk-route` animation each time
 * the route changes by changing the React key.
 */

import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="pk-route">
      {children}
    </div>
  );
}
