/**
 * SlidingNavPill — drop-in replacement for the desktop sidebar nav block
 * and the mobile bottom-tabs nav block in Layout.tsx.
 *
 * Renders the same NavLink list (icons + labels), but the active background
 * is a single absolutely-positioned <div> that slides between items on
 * route change. Measures the active child via offsetLeft/Top/Width/Height
 * inside a useLayoutEffect — works correctly when the sidebar collapses /
 * the viewport resizes.
 */

import { useLayoutEffect, useRef, useState, ComponentType, SVGProps } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

type NavItem = {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

interface SlidingNavPillProps {
  items: NavItem[];
  variant: 'sidebar' | 'bottom-tabs';
  collapsed?: boolean;            // sidebar only
  onItemClick?: () => void;        // optional — close mobile drawer, etc.
}

export default function SlidingNavPill({ items, variant, collapsed, onItemClick }: SlidingNavPillProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  const activeIdx = (() => {
    // Match the longest `to` prefix, with exact match for "/"
    const path = location.pathname;
    let best = -1;
    let bestLen = -1;
    items.forEach((it, i) => {
      if (it.to === '/' ? path === '/' : path.startsWith(it.to) && it.to.length > bestLen) {
        if (it.to === '/' && path === '/') { best = i; bestLen = 1; }
        else if (path.startsWith(it.to)) { best = i; bestLen = it.to.length; }
      }
    });
    return best === -1 ? 0 : best;
  })();

  const [pillStyle, setPillStyle] = useState<React.CSSProperties | null>(null);
  const [firstPaint, setFirstPaint] = useState(true);
  const axis = variant === 'sidebar' ? 'y' : 'x';

  const measure = (track: HTMLElement, node: HTMLElement): React.CSSProperties => {
    if (axis === 'y') {
      // Sidebar: all items share the same width, so derive insets from the
      // nav's own padding instead of measuring the node's left/width.
      // This avoids offsetLeft/getBoundingClientRect discrepancies entirely.
      const cs = getComputedStyle(track);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      return {
        top: 0,
        transform: `translateY(${node.offsetTop}px)`,
        height: node.offsetHeight,
        left: pl,
        right: pr,
      };
    }
    // Bottom-tabs: items are flex-1 so offsetLeft is unreliable; use rects.
    const tr = track.getBoundingClientRect();
    const nr = node.getBoundingClientRect();
    return {
      transform: `translateX(${Math.round(nr.left - tr.left)}px)`,
      width: node.offsetWidth,
      height: node.offsetHeight,
      top: Math.round(nr.top - tr.top),
    };
  };

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const nodes = track.querySelectorAll<HTMLElement>('[data-pill-item]');
    const node = nodes[activeIdx];
    if (!node) return;
    setPillStyle(measure(track, node));
    if (firstPaint) requestAnimationFrame(() => setFirstPaint(false));
  }, [activeIdx, collapsed, axis, firstPaint, items.length]);

  // Re-measure on resize so the bottom-tab pill follows window width
  useLayoutEffect(() => {
    const onResize = () => {
      const track = trackRef.current;
      if (!track) return;
      const nodes = track.querySelectorAll<HTMLElement>('[data-pill-item]');
      const node = nodes[activeIdx];
      if (!node) return;
      setPillStyle(measure(track, node));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIdx, axis]);

  // ── Sidebar variant ─────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      <nav ref={trackRef} className="pk-pill-track flex-1 px-2 py-4 space-y-0.5 overflow-y-auto relative">
        {pillStyle && (
          <div
            className={`pk-active-pill ${firstPaint ? 'first-paint' : ''}`}
            style={pillStyle}
            aria-hidden
          />
        )}
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            data-pill-item
            onClick={onItemClick}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-400'
              }`
            }
          >
            <Icon />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
    );
  }

  // ── Bottom-tabs variant ─────────────────────────────────────────────────
  return (
    <nav
      ref={trackRef}
      className="pk-pill-track fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex md:hidden"
    >
      {pillStyle && (
        <div
          className={`pk-active-pill bottom ${firstPaint ? 'first-paint' : ''}`}
          style={pillStyle}
          aria-hidden
        />
      )}
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          data-pill-item
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              isActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-400 dark:text-slate-500'
            }`
          }
        >
          <Icon />
          <span className="hidden xs:block">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
