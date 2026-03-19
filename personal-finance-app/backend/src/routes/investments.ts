import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow } from '../sheets';

const router = Router();

const VALID_TYPES = ['stocks', 'mutual_fund', 'crypto', 'fd', 'ppf', 'other'];

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
    const { type, name, amountInvested, currentValue, units, buyPrice } = req.body;

    if (!type || !name || amountInvested === undefined || currentValue === undefined)
      return res.status(400).json({ error: 'type, name, amountInvested, currentValue required' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid investment type' });
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)
      return res.status(400).json({ error: 'Name must be 1–100 characters' });
    const invested = Number(amountInvested);
    const current = Number(currentValue);
    if (isNaN(invested) || invested < 0) return res.status(400).json({ error: 'amountInvested must be a non-negative number' });
    if (isNaN(current) || current < 0) return res.status(400).json({ error: 'currentValue must be a non-negative number' });
    if (units !== undefined && (isNaN(Number(units)) || Number(units) < 0)) return res.status(400).json({ error: 'units must be non-negative' });
    if (buyPrice !== undefined && (isNaN(Number(buyPrice)) || Number(buyPrice) < 0)) return res.status(400).json({ error: 'buyPrice must be non-negative' });

    const row = {
      id: Date.now().toString(),
      type,
      name: name.trim(),
      amountInvested: invested,
      currentValue: current,
      units: units ? Number(units) : '',
      buyPrice: buyPrice ? Number(buyPrice) : '',
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
