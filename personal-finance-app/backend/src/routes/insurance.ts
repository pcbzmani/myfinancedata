import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow } from '../sheets';

const router = Router();

const VALID_TYPES = ['health', 'life', 'vehicle', 'home', 'term'];
const VALID_FREQUENCIES = ['monthly', 'quarterly', 'yearly'];

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await getRows('insurance'));
  } catch (e) {
    console.error('GET /insurance error:', e);
    res.status(500).json({ error: 'Failed to load insurance policies' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, provider, policyNumber, premium, frequency, sumAssured, startDate, endDate } = req.body;

    if (!type || !provider || premium === undefined || sumAssured === undefined || !startDate || !endDate)
      return res.status(400).json({ error: 'type, provider, premium, sumAssured, startDate, endDate required' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid insurance type' });
    if (typeof provider !== 'string' || provider.trim().length === 0 || provider.length > 100)
      return res.status(400).json({ error: 'Provider must be 1–100 characters' });
    if (frequency && !VALID_FREQUENCIES.includes(frequency)) return res.status(400).json({ error: 'frequency must be monthly, quarterly, or yearly' });
    const prem = Number(premium);
    const assured = Number(sumAssured);
    if (isNaN(prem) || prem <= 0) return res.status(400).json({ error: 'premium must be a positive number' });
    if (isNaN(assured) || assured <= 0) return res.status(400).json({ error: 'sumAssured must be a positive number' });
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid startDate' });
    if (isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid endDate' });
    if (end <= start) return res.status(400).json({ error: 'endDate must be after startDate' });
    if (policyNumber && policyNumber.length > 50) return res.status(400).json({ error: 'policyNumber too long' });

    const row = {
      id: Date.now().toString(),
      type,
      provider: provider.trim(),
      policyNumber: policyNumber ? String(policyNumber).slice(0, 50) : '',
      premium: prem,
      frequency: frequency || 'yearly',
      sumAssured: assured,
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
    };
    await addRow('insurance', row);
    res.status(201).json(row);
  } catch (e) {
    console.error('POST /insurance error:', e);
    res.status(500).json({ error: 'Failed to save insurance policy' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });
    await deleteRow('insurance', id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('DELETE /insurance error:', e);
    res.status(500).json({ error: 'Failed to delete insurance policy' });
  }
});

export default router;
