/**
 * UpiDonation — secure UPI donation widget.
 *
 * The UPI ID is NEVER stored here. It is fetched from /api/upi-info
 * (a Netlify serverless function) at click-time over HTTPS.
 * This means no one can change the payee by editing frontend code.
 */
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const PRESETS = [49, 99, 199, 499];

interface UpiInfo {
  upiId: string;
  name: string;
  upiString: string;
  deepLinks: { gpay: string; phonepe: string; paytm: string; generic: string };
}

interface Props {
  variant?: 'button' | 'card';
  label?: string;
}

export default function UpiDonation({ variant = 'button', label = 'Donate via UPI ☕' }: Props) {
  const [open, setOpen]       = useState(false);
  const [amount, setAmount]   = useState(99);
  const [custom, setCustom]   = useState('');
  const [info, setInfo]       = useState<UpiInfo | null>(null);
  const [qr, setQr]           = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const [copied, setCopied]   = useState(false);

  const finalAmount = custom ? parseInt(custom, 10) || 0 : amount;

  // Fetch UPI info from backend whenever modal opens or amount changes
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr('');
    fetch(`/api/upi-info?amount=${finalAmount}&note=Donation+to+PanamKasu`)
      .then(r => r.json())
      .then(async (data: UpiInfo) => {
        setInfo(data);
        // Generate QR from the UPI string returned by server
        const dataUrl = await QRCode.toDataURL(data.upiString, {
          width: 220,
          margin: 2,
          color: { dark: '#1a3a5f', light: '#ffffff' },
        });
        setQr(dataUrl);
      })
      .catch(() => setErr('Could not load payment details. Please try again.'))
      .finally(() => setLoading(false));
  }, [open, finalAmount]);

  function openModal() { setOpen(true); }
  function closeModal() { setOpen(false); setQr(''); setInfo(null); }

  async function copyUpiId() {
    if (!info) return;
    await navigator.clipboard.writeText(info.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const triggerBtn = variant !== 'card' ? (
    <button
      onClick={openModal}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm font-medium text-amber-700 dark:text-amber-300 transition-colors"
    >
      <span>☕</span> {label}
    </button>
  ) : null;

  const cardTrigger = variant === 'card' ? (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">☕</span>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Support PanamKasu</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Free forever — if it helps you, buy me a chai!</p>
        </div>
      </div>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
      >
        <span>🇮🇳</span> Donate via UPI
      </button>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Zero fees · Instant · GPay / PhonePe / Paytm</p>
    </div>
  ) : null;

  return (
    <>
      {triggerBtn}
      {cardTrigger}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">☕</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Support PanamKasu</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Zero fees · Instant UPI</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">

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
                  type="number" min="1" placeholder="Custom amount"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  onFocus={() => setAmount(0)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>

              {err && <p className="text-xs text-red-500">{err}</p>}

              {loading && (
                <div className="flex justify-center py-6">
                  <svg className="w-6 h-6 animate-spin text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </div>
              )}

              {info && !loading && (
                <>
                  {/* QR Code */}
                  {qr && (
                    <div className="flex flex-col items-center gap-2">
                      <img src={qr} alt="UPI QR Code" className="w-[180px] h-[180px] rounded-xl border border-slate-200 dark:border-slate-700" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Scan with any UPI app</p>
                    </div>
                  )}

                  {/* UPI ID display + copy — lets user verify before paying */}
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">UPI ID</span>
                    <span className="flex-1 text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 truncate">{info.upiId}</span>
                    <button
                      onClick={copyUpiId}
                      className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0 hover:text-amber-700 transition-colors"
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Security note */}
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                    ✅ Always verify the UPI ID above matches in your payment app before confirming
                  </p>

                  {/* Deep link buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'GPay', link: info.deepLinks.gpay, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
                      { label: 'PhonePe', link: info.deepLinks.phonepe, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
                      { label: 'Paytm', link: info.deepLinks.paytm, color: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
                    ].map(({ label, link, color }) => (
                      <a
                        key={label}
                        href={link}
                        className={`flex items-center justify-center py-2 rounded-xl text-xs font-semibold border transition-colors ${color}`}
                      >
                        {label}
                      </a>
                    ))}
                  </div>

                  {/* Generic UPI fallback */}
                  <a
                    href={info.deepLinks.generic}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
                  >
                    🇮🇳 Open UPI App — ₹{finalAmount || '—'}
                  </a>
                </>
              )}

              <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                No fees · Works with all UPI apps · Instant settlement
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
