const STORAGE_KEY = 'myfinance_script_url';

// Backend base URL — empty in dev (Vite proxy), set VITE_API_BASE in prod (Railway URL)
const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

export function getScriptUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setScriptUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url);
}

async function call(params: Record<string, string>): Promise<any> {
  const base = getScriptUrl();
  if (!base) throw new Error('Google Sheets not configured. Go to Settings to add your Apps Script URL.');
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${base}?${qs}`);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 200)}`); }
  if (json.error) throw new Error(json.error);
  return json;
}

export async function getRows(sheet: string): Promise<any[]> {
  const r = await call({ action: 'read', sheet });
  return r.data || [];
}

export async function addRow(sheet: string, data: Record<string, any>): Promise<void> {
  await call({ action: 'add', sheet, data: JSON.stringify(data) });
}

export async function deleteRow(sheet: string, id: string): Promise<void> {
  await call({ action: 'delete', sheet, id });
}

export async function updateRow(sheet: string, id: string, data: Record<string, any>): Promise<void> {
  await call({ action: 'update', sheet, id, data: JSON.stringify(data) });
}

export async function ping(): Promise<boolean> {
  try { await call({ action: 'ping' }); return true; }
  catch { return false; }
}

export async function getMarketRates(): Promise<Record<string, { price: number; change: number; changePct: number }>> {
  const r = await call({ action: 'readMarket' });
  return r.data || {};
}

export async function syncVaultPin(rawPin: string): Promise<void> {
  await call({ action: 'setVaultPin', pin: rawPin });
}

// ── Google OAuth (Option D — no Apps Script needed) ──────────────────────────

export function getGoogleAuthUrl(): string {
  return `${API_BASE}/api/v1/auth/google`;
}

export async function getGoogleAuthStatus(): Promise<{
  connected: boolean;
  email: string | null;
  spreadsheetUrl: string | null;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/status`);
    if (!res.ok) return { connected: false, email: null, spreadsheetUrl: null };
    return res.json();
  } catch {
    return { connected: false, email: null, spreadsheetUrl: null };
  }
}

export async function disconnectGoogle(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/google`, { method: 'DELETE' });
}

