const STORAGE_KEY = 'myfinance_script_url';

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

export async function ping(): Promise<boolean> {
  try { await call({ action: 'ping' }); return true; }
  catch { return false; }
}
