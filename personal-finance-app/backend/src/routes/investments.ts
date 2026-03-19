import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow } from '../sheets';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await getRows('investments'));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, name, amountInvested, currentValue, units, buyPrice } = req.body;
    if (!type || !name || !amountInvested || !currentValue)
      return res.status(400).json({ error: 'type, name, amountInvested, currentValue required' });
    const row = {
      id: Date.now().toString(),
      type, name,
      amountInvested: Number(amountInvested),
      currentValue: Number(currentValue),
      units: units ? Number(units) : '',
      buyPrice: buyPrice ? Number(buyPrice) : '',
      createdAt: new Date().toISOString(),
    };
    await addRow('investments', row);
    res.status(201).json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRow('investments', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
