import { idbGetRows, idbAddRow, idbDeleteRow, idbUpdateRow } from './idb';

const STORAGE_KEY = 'myfinance_script_url';

export function getScriptUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function setScriptUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url);
}

/** True when running in local-only mode (no Apps Script URL configured) */
export function isLocalMode(): boolean {
  return !getScriptUrl();
}

async function call(params: Record<string, string>): Promise<any> {
  const base = getScriptUrl();
  if (!base) throw new Error('Google Sheets not configured.');
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${base}?${qs}`);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error(`Invalid response: ${text.slice(0, 200)}`); }
  if (json.error) throw new Error(json.error);
  return json;
}

export async function getRows(sheet: string): Promise<any[]> {
  if (isLocalMode()) return idbGetRows(sheet);
  const r = await call({ action: 'read', sheet });
  return r.data || [];
}

export async function addRow(sheet: string, data: Record<string, any>): Promise<void> {
  if (isLocalMode()) return idbAddRow(sheet, data);
  await call({ action: 'add', sheet, data: JSON.stringify(data) });
}

export async function deleteRow(sheet: string, id: string): Promise<void> {
  if (isLocalMode()) return idbDeleteRow(sheet, id);
  await call({ action: 'delete', sheet, id });
}

export async function updateRow(sheet: string, id: string, data: Record<string, any>): Promise<void> {
  if (isLocalMode()) return idbUpdateRow(sheet, id, data);
  await call({ action: 'update', sheet, id, data: JSON.stringify(data) });
}

export async function ping(): Promise<boolean> {
  if (isLocalMode()) return true;
  try { await call({ action: 'ping' }); return true; }
  catch { return false; }
}

export async function getMarketRates(): Promise<Record<string, { price: number; change: number; changePct: number }>> {
  if (isLocalMode()) {
    try {
      const r = await fetch('/api/market-rates', { signal: AbortSignal.timeout(15000) });
      if (!r.ok) return {};
      const json = await r.json();
      return json.data || {};
    } catch { return {}; }
  }
  const r = await call({ action: 'readMarket' });
  return r.data || {};
}

export async function syncVaultPin(rawPin: string): Promise<void> {
  if (isLocalMode()) return; // PIN already stored locally via localStorage in Vault.tsx
  await call({ action: 'setVaultPin', pin: rawPin });
}
