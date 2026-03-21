import { Router, Request, Response } from 'express';

const router = Router();

// ── shared Yahoo Finance fetcher ──────────────────────────────────────────────
async function yf(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    return { price, change, changePct: prev > 0 ? (change / prev) * 100 : 0 };
  } catch { return null; }
}

// ── GET /price?symbol= (used by investment stock lookup) ──────────────────────
router.get('/price', async (req: Request, res: Response) => {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== 'string')
    return res.status(400).json({ error: 'symbol query param required' });
  if (!/^[A-Za-z0-9.\-^=]+$/.test(symbol))
    return res.status(400).json({ error: 'Invalid symbol format' });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return res.status(404).json({ error: `Symbol "${symbol}" not found` });

    const data = await resp.json() as any;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice)
      return res.status(404).json({ error: 'No price data available' });

    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    res.json({
      symbol:    meta.symbol,
      price,
      change,
      changePct: prev > 0 ? (change / prev) * 100 : 0,
      currency:  meta.currency || 'INR',
      exchange:  meta.exchangeName || '',
      name:      meta.longName || meta.shortName || symbol,
    });
  } catch (e: any) {
    if (e?.name === 'TimeoutError') return res.status(504).json({ error: 'Timed out' });
    res.status(502).json({ error: 'Failed to fetch market price' });
  }
});

// ── GET /rates — all dashboard ticker data in one call ────────────────────────
router.get('/rates', async (_req: Request, res: Response) => {
  const SYMBOLS = {
    // Indices
    nifty50:   '^NSEI',
    bankNifty: '^NSEBANK',
    nasdaq:    '^NDX',
    sp500:     '^GSPC',
    shanghai:  '000001.SS',
    hangSeng:  '^HSI',
    nikkei:    '^N225',
    kospi:     '^KS11',
    // Currencies
    usdInr:    'INR=X',
    qarInr:    'QARINR=X',
    usdQar:    'QAR=X',
    // Gold ETF (USD)
    gld:       'GLD',
  };

  const keys = Object.keys(SYMBOLS) as (keyof typeof SYMBOLS)[];
  const results = await Promise.all(keys.map(k => yf(SYMBOLS[k])));

  const data: Record<string, any> = {};
  keys.forEach((k, i) => { data[k] = results[i]; });

  // Compute gold in INR and QAR per 10g:
  //   =GLD * 10 * CURRENCY / 31.1035
  if (data.gld && data.usdInr) {
    data.goldInr = {
      price:     (data.gld.price  * 10 * data.usdInr.price) / 31.1035,
      change:    (data.gld.change * 10 * data.usdInr.price) / 31.1035,
      changePct: data.gld.changePct,
    };
  }
  if (data.gld && data.usdQar) {
    data.goldQar = {
      price:     (data.gld.price  * 10 * data.usdQar.price) / 31.1035,
      change:    (data.gld.change * 10 * data.usdQar.price) / 31.1035,
      changePct: data.gld.changePct,
    };
  }

  res.json(data);
});

export default router;
