import { useState } from 'react';

const STORAGE_KEY = 'pk_welcomed_v1';

const STEPS = [
  {
    emoji: '🪙',
    title: 'Welcome to PanamKasu',
    subtitle: 'Your privacy-first personal finance app',
  },
  {
    emoji: '✨',
    title: 'Everything in one place',
    subtitle: 'Here\'s what you can track',
  },
  {
    emoji: '🚀',
    title: 'Ready to start!',
    subtitle: 'Pick how you\'d like to store your data',
  },
];

function StepBody({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <p>
          All your financial data stays in <strong>your own Google Sheet</strong> — or
          on this device in local mode. No accounts, no subscriptions, no tracking.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {['No ads', 'No analytics', 'Open source', 'Free forever'].map(tag => (
            <span key={tag} className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-medium px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
        {[
          ['💸', 'Transactions', 'Multi-currency income & expense tracking'],
          ['📈', 'Investments', 'Stocks, MF, crypto & FD with live prices'],
          ['🛡', 'Insurance', 'Policy cards, calendar reminders & ICS export'],
          ['🔁', 'Subscriptions', 'Monthly burn rate & renewal alerts'],
          ['🤖', 'AI Analyst', 'Free portfolio health report (2/day)'],
          ['🔐', 'Vault', 'PIN-protected local password manager'],
        ].map(([icon, name, desc]) => (
          <li key={name} className="flex gap-2.5 items-start">
            <span className="text-base leading-5 flex-shrink-0">{icon}</span>
            <span><strong>{name}</strong> — {desc}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-3">
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl p-3">
        <p className="font-semibold text-violet-700 dark:text-violet-300 text-sm mb-0.5">
          📊 Google Sheets <span className="font-normal text-xs text-violet-500">(recommended)</span>
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Go to <strong>Settings</strong> → follow the one-time setup. Your data
          syncs across all your devices.
        </p>
      </div>
      <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-xl p-3">
        <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-0.5">💾 Local mode</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Start right away — no setup needed. Data lives on this device.
          You can switch to Sheets anytime.
        </p>
      </div>
    </div>
  );
}

export default function WelcomeModal() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;
  const { emoji, title, subtitle } = STEPS[step];

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'pk-pop 350ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-5 pb-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`inline-block h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-violet-600'
                  : i < step
                  ? 'w-1.5 bg-violet-300 dark:bg-violet-700'
                  : 'w-1.5 bg-slate-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="text-center mb-5">
            <div className="text-5xl mb-3">{emoji}</div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{title}</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500">{subtitle}</p>
          </div>
          <StepBody step={step} />
        </div>

        {/* Actions */}
        <div className="px-6 pb-2 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? dismiss : () => setStep(s => s + 1)}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>

        {/* Skip */}
        <div className="text-center py-3">
          <button
            onClick={dismiss}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {isLast ? '' : 'Skip tour'}
          </button>
        </div>
      </div>
    </div>
  );
}
