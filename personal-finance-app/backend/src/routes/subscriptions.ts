import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow, updateRow } from '../sheets';

const router = Router();

const VALID_FREQUENCIES = ['monthly', 'quarterly', 'yearly'];
const VALID_CATEGORIES = ['productivity', 'entertainment', 'tools', 'cloud', 'ai', 'other'];
const VALID_STATUSES = ['active', 'cancelled', 'paused'];

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await getRows('subscriptions'));
  } catch (e) {
    console.error('GET /subscriptions error:', e);
    res.status(500).json({ error: 'Failed to load subscriptions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, cost, currency, frequency, startDate, endDate, website, notes } = req.body;

    if (!name || cost === undefined || !frequency || !startDate)
      return res.status(400).json({ error: 'name, cost, frequency, startDate required' });
    if (!VALID_FREQUENCIES.includes(frequency))
      return res.status(400).json({ error: 'frequency must be monthly, quarterly, or yearly' });
    const c = Number(cost);
    if (isNaN(c) || c <= 0) return res.status(400).json({ error: 'cost must be a positive number' });
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)
      return res.status(400).json({ error: 'name must be 1–100 characters' });
    if (category && !VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: 'Invalid category' });

    const row = {
      id: Date.now().toString(),
      name: name.trim(),
      category: category || 'other',
      cost: c,
      currency: currency || 'QAR',
      frequency,
      startDate,
      endDate: endDate || '',
      website: website || '',
      notes: notes || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    await addRow('subscriptions', row);
    res.status(201).json(row);
  } catch (e) {
    console.error('POST /subscriptions error:', e);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    const { status } = req.body;
    if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await updateRow('subscriptions', id, req.body);
    res.json({ message: 'Updated' });
  } catch (e) {
    console.error('PUT /subscriptions error:', e);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    await deleteRow('subscriptions', id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /subscriptions error:', e);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

export default router;
