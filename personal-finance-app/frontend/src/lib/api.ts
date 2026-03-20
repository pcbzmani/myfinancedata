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

// Fetch live market price via a free CORS proxy → Yahoo Finance.
// No backend needed — works directly from the browser.
export async function getMarketPrice(symbol: string): Promise<{
  symbol: string; price: number; currency: string; exchange: string; name: string;
}> {
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`;

  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Symbol "${symbol}" not found`);

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error('No price data for this symbol');

  return {
    symbol: meta.symbol,
    price: meta.regularMarketPrice,
    currency: meta.currency || 'INR',
    exchange: meta.exchangeName || '',
    name: meta.longName || meta.shortName || symbol,
  };
}
