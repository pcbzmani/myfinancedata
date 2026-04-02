import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow, updateRow } from '../sheets-router';

const router = Router();

const VALID_CATEGORIES = ['banking', 'social', 'work', 'shopping', 'entertainment', 'email', 'other'];

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await getRows('vault'));
  } catch (e) {
    console.error('GET /vault error:', e);
    res.status(500).json({ error: 'Failed to load vault' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { siteName, siteUrl, category, username, email, password, notes } = req.body;

    if (!siteName || !password)
      return res.status(400).json({ error: 'siteName and password required' });
    if (typeof siteName !== 'string' || siteName.trim().length === 0 || siteName.length > 100)
      return res.status(400).json({ error: 'siteName must be 1–100 characters' });
    if (category && !VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: 'Invalid category' });

    const row = {
      id: Date.now().toString(),
      siteName: siteName.trim(),
      siteUrl: siteUrl || '',
      category: category || 'other',
      username: username || '',
      email: email || '',
      password,
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };
    await addRow('vault', row);
    res.status(201).json(row);
  } catch (e) {
    console.error('POST /vault error:', e);
    res.status(500).json({ error: 'Failed to save vault entry' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    await updateRow('vault', id, req.body);
    res.json({ message: 'Updated' });
  } catch (e) {
    console.error('PUT /vault error:', e);
    res.status(500).json({ error: 'Failed to update vault entry' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    await deleteRow('vault', id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /vault error:', e);
    res.status(500).json({ error: 'Failed to delete vault entry' });
  }
});

export default router;
