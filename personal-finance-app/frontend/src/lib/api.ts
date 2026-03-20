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

// Fetch live market price from Yahoo Finance.
// Tries multiple CORS proxies in order until one works.
export async function getMarketPrice(symbol: string): Promise<{
  symbol: string; price: number; currency: string; exchange: string; name: string;
}> {
  const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  const proxies = [
    // allorigins returns the raw body — most reliable
    `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
    // corsproxy.io as fallback
    `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
  ];

  let lastError = `Symbol "${symbol}" not found on Yahoo Finance`;

  for (const url of proxies) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const text = await res.text();

      let data: any;
      try { data = JSON.parse(text); } catch { continue; }

      // Yahoo returns error details in the body even on 200
      const yahooError = data?.chart?.error?.description;
      if (yahooError) { lastError = yahooError; continue; }

      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) { lastError = 'No price data returned — check the symbol'; continue; }

      return {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        currency: meta.currency || 'INR',
        exchange: meta.exchangeName || '',
        name: meta.longName || meta.shortName || symbol,
      };
    } catch {
      continue;
    }
  }

  throw new Error(lastError);
}
