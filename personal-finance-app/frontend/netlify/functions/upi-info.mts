/**
 * GET /api/upi-info
 * Returns UPI payment details for the donation flow.
 *
 * SECURITY: The UPI ID is hardcoded here on the server — it is NEVER
 * in any frontend file, env var, or client-accessible asset.
 * Changing it requires a code commit + Netlify deploy (same access
 * level as owning the entire site). Frontend only receives the value
 * at runtime over HTTPS and cannot be tricked by static-file edits.
 */
import type { Config } from '@netlify/functions';

// ── The ONE place the UPI ID exists ──────────────────────────────────
const UPI_ID   = 'pcbzmani-3@okaxis';
const UPI_NAME = 'PanamKasu';
// ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  // Tell browsers not to cache — always fetch fresh from server
  'Cache-Control': 'no-store',
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url    = new URL(req.url);
  const amount = url.searchParams.get('amount') ?? '';   // optional, e.g. "99"
  const note   = url.searchParams.get('note')   ?? 'Donation to PanamKasu';

  // Build the UPI intent URL server-side
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_NAME,
    cu: 'INR',
    tn: note,
    ...(amount ? { am: amount } : {}),
  });

  const upiString = `upi://pay?${params.toString()}`;

  return new Response(
    JSON.stringify({
      upiId:     UPI_ID,
      name:      UPI_NAME,
      upiString, // used to generate QR code client-side
      // App-specific deep links (same params)
      deepLinks: {
        gpay:    `gpay://upi/pay?${params.toString()}`,
        phonepe: `phonepe://pay?${params.toString()}`,
        paytm:   `paytmmp://pay?${params.toString()}`,
        generic: upiString,
      },
    }),
    { status: 200, headers: CORS }
  );
};

export const config: Config = { path: '/api/upi-info' };
