import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow } from '../sheets-router';

const router = Router();

const VALID_TYPES = ['income', 'expense'];
const VALID_CATEGORIES = ['Salary', 'Freelance', 'Food', 'Transport', 'Shopping', 'Rent', 'Medical', 'Entertainment', 'Utilities', 'Other'];

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await getRows('transactions');
    rows.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(rows);
  } catch (e) {
    console.error('GET /transactions error:', e);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, category, amount, description, date } = req.body;

    if (!type || !category || amount === undefined) return res.status(400).json({ error: 'type, category, amount required' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'type must be income or expense' });
    if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
    if (description && typeof description === 'string' && description.length > 200) return res.status(400).json({ error: 'Description too long (max 200 chars)' });
    if (date && isNaN(new Date(date).getTime())) return res.status(400).json({ error: 'Invalid date' });

    const row = {
      id: Date.now().toString(),
      type,
      category,
      amount: amt,
      description: description ? String(description).slice(0, 200) : '',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    await addRow('transactions', row);
    res.status(201).json(row);
  } catch (e) {
    console.error('POST /transactions error:', e);
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    await deleteRow('transactions', id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /transactions error:', e);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
