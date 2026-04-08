import type { Config } from '@netlify/functions';

/** Yahoo Finance v8 quote endpoint — no API key needed */
const YF_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';

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
  goldUsd:   'GC=F',      // gold in USD/troy oz — converted below
};

interface Quote { price: number; change: number; changePct: number; }

async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const res = await fetch(`${YF_URL}${encodeURIComponent(symbol)}?interval=1d&range=2d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price     = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change    = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    return { price, change, changePct };
  } catch {
    return null;
  }
}

export default async () => {
  // Fetch all symbols in parallel
  const keys   = Object.keys(SYMBOLS);
  const quotes = await Promise.all(keys.map(k => fetchQuote(SYMBOLS[k])));
  const raw: Record<string, Quote | null> = {};
  keys.forEach((k, i) => { raw[k] = quotes[i]; });

  // Derive gold in INR/g and QAR/g from gold (USD/troy oz) + FX rates
  const TROY_OZ_TO_GRAMS = 31.1035;
  const goldUsd   = raw.goldUsd?.price   ?? 0;
  const usdInr    = raw.usdInr?.price    ?? 0;
  const usdQar    = raw.qarInr ? (usdInr / (raw.qarInr.price || 1)) : 3.64; // fallback peg
  const goldUsdChange    = raw.goldUsd?.change    ?? 0;
  const goldUsdChangePct = raw.goldUsd?.changePct ?? 0;

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
    nifty50:   raw.nifty50,
    bankNifty: raw.bankNifty,
    nasdaq:    raw.nasdaq,
    sp500:     raw.sp500,
    shanghai:  raw.shanghai,
    hangSeng:  raw.hangSeng,
    nikkei:    raw.nikkei,
    kospi:     raw.kospi,
    usdInr:    raw.usdInr,
    qarInr:    raw.qarInr,
    goldInr,
    goldQar,
  };

  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // cache 5 min at CDN edge
    },
  });
};

export const config: Config = {
  path: '/api/market-rates',
};
