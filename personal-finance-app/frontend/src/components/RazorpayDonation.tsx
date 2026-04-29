import { useState } from 'react';

/* Razorpay SDK global type */
declare global {
  interface Window {
    Razorpay: any;
  }
}

const PRESETS = [49, 99, 199, 499];

interface Props {
  /** Visual variant: 'button' renders an inline button; 'card' renders a full card */
  variant?: 'button' | 'card';
  label?:   string;
}

function loadRazorpaySdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.head.appendChild(script);
  });
}

export default function RazorpayDonation({ variant = 'button', label = 'Support PanamKasu ❤️' }: Props) {
  const [open,    setOpen]    = useState(false);
  const [amount,  setAmount]  = useState<number>(99);
  const [custom,  setCustom]  = useState('');
  const [step,    setStep]    = useState<'pick' | 'processing' | 'success' | 'error'>('pick');
  const [errMsg,  setErrMsg]  = useState('');
  const [email,   setEmail]   = useState('');

  function openModal() { setOpen(true); setStep('pick'); setErrMsg(''); }
  function closeModal() { setOpen(false); setStep('pick'); }

  const finalAmount = custom ? parseInt(custom, 10) || 0 : amount;

  async function handlePay() {
    if (finalAmount < 1) { setErrMsg('Minimum donation is ₹1'); return; }
    setStep('processing');
    setErrMsg('');

    try {
      await loadRazorpaySdk();

      // 1. Create order
      const orderRes = await fetch('/api/razorpay-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: finalAmount * 100, label: `Donation ₹${finalAmount}` }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? 'Order creation failed');

      // 2. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         order.keyId,
          amount:      order.amount,
          currency:    order.currency,
          order_id:    order.orderId,
          name:        'PanamKasu',
          description: `Donation — ₹${finalAmount}`,
          image:       '/pwa-192x192.png',
          prefill:     { email: email || undefined },
          theme:       { color: '#c47d0e' },
          modal: {
            ondismiss: () => reject(new Error('cancelled')),
          },
          handler: async (response: any) => {
            try {
              // 3. Verify payment
              const verifyRes = await fetch('/api/razorpay-verify', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  email,
                  type:   'donation',
                  amount: order.amount,
                }),
              });
              const vData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(vData.error ?? 'Verification failed');
              resolve();
            } catch (e: any) {
              reject(e);
            }
          },
        });
        rzp.open();
      });

      setStep('success');
    } catch (e: any) {
      if (e.message === 'cancelled') {
        setStep('pick'); // user closed the modal — go back to pick
      } else {
        setStep('error');
        setErrMsg(e.message ?? 'Payment failed. Please try again.');
      }
    }
  }

  /* ── Trigger button ── */
  const triggerBtn = variant === 'card' ? null : (
    <button
      onClick={openModal}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm font-medium text-amber-700 dark:text-amber-300 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      {label}
    </button>
  );

  const cardTrigger = variant === 'card' ? (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">☕</span>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Support PanamKasu</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">This app is free forever. If it helps you, buy me a coffee!</p>
        </div>
      </div>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        Donate via Razorpay
      </button>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Donations keep the AI credits funded. Thank you! 🙏</p>
    </div>
  ) : null;

  return (
    <>
      {triggerBtn}
      {cardTrigger}

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">☕</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Support PanamKasu</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Any amount helps keep the lights on</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {step === 'success' && (
                <div className="text-center py-6 space-y-3">
                  <div className="text-5xl">🎉</div>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Thank you so much!</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Your donation helps keep PanamKasu free for everyone. You're awesome! 🙏</p>
                  <button onClick={closeModal} className="mt-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
                    Close
                  </button>
                </div>
              )}

              {step === 'error' && (
                <div className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
                    {errMsg}
                  </div>
                  <button onClick={() => setStep('pick')} className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    ← Try again
                  </button>
                </div>
              )}

              {(step === 'pick' || step === 'processing') && (
                <>
                  {/* Amount presets */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Choose amount</p>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESETS.map(p => (
                        <button
                          key={p}
                          onClick={() => { setAmount(p); setCustom(''); }}
                          className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                            !custom && amount === p
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                          }`}
                        >
                          ₹{p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom amount */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Custom amount"
                      value={custom}
                      onChange={e => setCustom(e.target.value)}
                      onFocus={() => setAmount(0)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>

                  {/* Optional email */}
                  <div>
                    <input
                      type="email"
                      placeholder="Email (optional, for receipt)"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>

                  {errMsg && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errMsg}</p>
                  )}

                  {/* Pay button */}
                  <button
                    onClick={handlePay}
                    disabled={step === 'processing' || finalAmount < 1}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {step === 'processing' ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        Opening Razorpay…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        Donate ₹{finalAmount || '—'} via Razorpay
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                    Secure payment via Razorpay · UPI, cards, net banking accepted
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
