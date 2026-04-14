/**
 * Shared subscription helpers — used by AIReport and Calculators pages.
 * Token format: base64(JSON.stringify({email,plan,expiry})) + "." + HMAC
 */

export const SUB_KEY = 'myfinance_sub_token';

export function getStoredToken(): string {
  return localStorage.getItem(SUB_KEY) ?? '';
}

export function decodeTokenPayload(
  token: string,
): { email?: string; plan?: string; expiry?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0]) return null;
    return JSON.parse(atob(parts[0]));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  const p = decodeTokenPayload(token);
  if (!p || typeof p.expiry !== 'number') return true;
  return p.expiry < Date.now();
}

/** Returns true if a valid, non-expired subscription token is stored. */
export function isProSubscriber(): boolean {
  const token = getStoredToken();
  return !!token && !isTokenExpired(token);
}
