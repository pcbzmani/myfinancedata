import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow } from '../sheets';

const router = Router();

const VALID_TYPES = ['stocks', 'mutual_fund', 'crypto', 'fd', 'ppf', 'other'];
// These types have auto-fetched current price; others need manual currentValue
const MARKET_TYPES = ['stocks', 'mutual_fund'];

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await getRows('investments'));
  } catch (e) {
    console.error('GET /investments error:', e);
    res.status(500).json({ error: 'Failed to load investments' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, name, symbol, currentValue, units, buyPrice } = req.body;

    // Common required fields
    if (!type || !name || units === undefined || buyPrice === undefined)
      return res.status(400).json({ error: 'type, name, units, buyPrice are required' });
    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: 'Invalid investment type' });
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)
      return res.status(400).json({ error: 'Name must be 1–100 characters' });

    const unitsNum = Number(units);
    const buyPriceNum = Number(buyPrice);
    if (isNaN(unitsNum) || unitsNum < 0)
      return res.status(400).json({ error: 'units must be a non-negative number' });
    if (isNaN(buyPriceNum) || buyPriceNum < 0)
      return res.status(400).json({ error: 'buyPrice must be a non-negative number' });

    // amountInvested is always computed
    const amountInvested = unitsNum * buyPriceNum;

    // symbol required for market types
    if (MARKET_TYPES.includes(type)) {
      if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0)
        return res.status(400).json({ error: 'symbol is required for stocks and mutual funds' });
      if (!/^[A-Za-z0-9.\-^=]+$/.test(symbol.trim()))
        return res.status(400).json({ error: 'Invalid symbol format' });
    }

    // currentValue required for non-market types
    if (!MARKET_TYPES.includes(type)) {
      if (currentValue === undefined || currentValue === '')
        return res.status(400).json({ error: 'currentValue is required for this investment type' });
    }

    const currentNum = currentValue !== undefined && currentValue !== '' ? Number(currentValue) : 0;
    if (isNaN(currentNum) || currentNum < 0)
      return res.status(400).json({ error: 'currentValue must be a non-negative number' });

    const row = {
      id: Date.now().toString(),
      type,
      name: name.trim(),
      symbol: symbol ? String(symbol).trim() : '',
      units: unitsNum,
      buyPrice: buyPriceNum,
      amountInvested,
      currentValue: currentNum,
      createdAt: new Date().toISOString(),
    };
    await addRow('investments', row);
    res.status(201).json(row);
  } catch (e) {
    console.error('POST /investments error:', e);
    res.status(500).json({ error: 'Failed to save investment' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    await deleteRow('investments', id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /investments error:', e);
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

export default router;
