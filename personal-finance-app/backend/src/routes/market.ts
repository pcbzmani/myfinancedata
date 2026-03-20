import { Router, Request, Response } from 'express';

const router = Router();

// Proxy Yahoo Finance to avoid browser CORS restrictions
router.get('/price', async (req: Request, res: Response) => {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'symbol query param required' });
  }
  // Only allow safe ticker characters
  if (!/^[A-Za-z0-9.\-^=]+$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol format' });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      return res.status(404).json({ error: `Symbol "${symbol}" not found on Yahoo Finance` });
    }

    const data = await resp.json() as any;
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta || !meta.regularMarketPrice) {
      return res.status(404).json({ error: 'No price data available for this symbol' });
    }

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
    if (e?.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Yahoo Finance request timed out' });
    }
    console.error('Market price fetch error:', e);
    res.status(502).json({ error: 'Failed to fetch market price' });
  }
});

export default router;
