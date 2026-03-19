import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow } from '../sheets';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await getRows('transactions');
    rows.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, category, amount, description, date } = req.body;
    if (!type || !category || !amount) return res.status(400).json({ error: 'type, category, amount required' });
    const row = {
      id: Date.now().toString(),
      type,
      category,
      amount: Number(amount),
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    await addRow('transactions', row);
    res.status(201).json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRow('transactions', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
