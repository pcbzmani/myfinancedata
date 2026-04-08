import type { Config } from '@netlify/functions';

/**
 * Yahoo Finance v7 quote endpoint.
 * Uses batch quote API — fetches all symbols in one request.
 * Works server-side without cookies on Netlify's infrastructure.
 */

const SYMBOLS: Record<string, string> = {
  nifty50:   '^NSEI',
  bankNifty: '^NSEBANK',
  nasdaq:    '^NDX',
  sp500:     '^GSPC',
  shanghai:  '000001.SS',
  hangSeng:  '^HSI',
  nikkei:    '^N225',
  kospi:     '^KS11',
  usdInr:    'USDINR=X',
  qarInr:    'QARINR=X',
  goldUsd:   'GC=F',
};

interface Quote { price: number; change: number; changePct: number; }

async function fetchAllQuotes(): Promise<Record<string, Quote | null>> {
  const allSymbols = Object.values(SYMBOLS).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(allSymbols)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });

  if (!res.ok) {
    console.error('Yahoo Finance v7 failed:', res.status, await res.text().catch(() => ''));
    return {};
  }

  const json = await res.json();
  const results: any[] = json?.quoteResponse?.result ?? [];

  const out: Record<string, Quote | null> = {};
  // index by symbol
  const bySymbol: Record<string, any> = {};
  for (const r of results) bySymbol[r.symbol] = r;

  for (const [key, sym] of Object.entries(SYMBOLS)) {
    const q = bySymbol[sym];
    if (!q) { out[key] = null; continue; }
    const price     = q.regularMarketPrice ?? 0;
    const change    = q.regularMarketChange ?? 0;
    const changePct = q.regularMarketChangePercent ?? 0;
    out[key] = price > 0 ? { price, change, changePct } : null;
  }
  return out;
}

export default async () => {
  let raw: Record<string, Quote | null> = {};
  try {
    raw = await fetchAllQuotes();
  } catch (err) {
    console.error('get-market-rates error:', err);
  }

  // Derive gold in INR/g and QAR/g
  const TROY_OZ_TO_GRAMS = 31.1035;
  const goldUsd          = raw.goldUsd?.price      ?? 0;
  const usdInr           = raw.usdInr?.price       ?? 0;
  const qarInr           = raw.qarInr?.price        ?? 0;
  const usdQar           = usdInr > 0 && qarInr > 0 ? usdInr / qarInr : 3.64;
  const goldUsdChange    = raw.goldUsd?.change      ?? 0;
  const goldUsdChangePct = raw.goldUsd?.changePct   ?? 0;

  const goldInrPrice = goldUsd > 0 && usdInr > 0 ? (goldUsd * usdInr) / TROY_OZ_TO_GRAMS : 0;
  const goldQarPrice = goldUsd > 0 && usdQar > 0 ? (goldUsd * usdQar) / TROY_OZ_TO_GRAMS : 0;

  const goldInr: Quote | null = goldInrPrice > 0 ? {
    price:     goldInrPrice,
    change:    (goldUsdChange * usdInr) / TROY_OZ_TO_GRAMS,
    changePct: goldUsdChangePct,
  } : null;

  const goldQar: Quote | null = goldQarPrice > 0 ? {
    price:     goldQarPrice,
    change:    (goldUsdChange * usdQar) / TROY_OZ_TO_GRAMS,
    changePct: goldUsdChangePct,
  } : null;

  const data = {
    nifty50:   raw.nifty50   ?? null,
    bankNifty: raw.bankNifty ?? null,
    nasdaq:    raw.nasdaq    ?? null,
    sp500:     raw.sp500     ?? null,
    shanghai:  raw.shanghai  ?? null,
    hangSeng:  raw.hangSeng  ?? null,
    nikkei:    raw.nikkei    ?? null,
    kospi:     raw.kospi     ?? null,
    usdInr:    raw.usdInr   ?? null,
    qarInr:    raw.qarInr   ?? null,
    goldInr,
    goldQar,
  };

  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};

export const config: Config = {
  path: '/api/market-rates',
};
