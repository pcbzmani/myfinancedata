import { useRef } from 'react';

export default function IncomeTax() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">🇮🇳 Income Tax Assistant</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            FY 2025-26 / AY 2026-27 · Old vs New regime comparison · ITR form recommender · Document checklist
          </p>
        </div>
        <button
          onClick={() => {
            if (iframeRef.current) {
              iframeRef.current.src = '/tax.html';
            }
          }}
          title="Restart assistant"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Restart
        </button>
      </div>

      {/* Full-featured iframe — scrollable inside */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <iframe
          ref={iframeRef}
          src="/tax.html"
          title="Income Tax Assistant"
          className="w-full border-0 block"
          style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
          allow="clipboard-write"
          loading="eager"
        />
      </div>
    </div>
  );
}
