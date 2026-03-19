import { Router, Request, Response } from 'express';
import { getRows, addRow, deleteRow } from '../sheets';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await getRows('insurance'));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, provider, policyNumber, premium, frequency, sumAssured, startDate, endDate } = req.body;
    if (!type || !provider || !premium || !sumAssured || !startDate || !endDate)
      return res.status(400).json({ error: 'type, provider, premium, sumAssured, startDate, endDate required' });
    const row = {
      id: Date.now().toString(),
      type, provider,
      policyNumber: policyNumber || '',
      premium: Number(premium),
      frequency: frequency || 'yearly',
      sumAssured: Number(sumAssured),
      startDate, endDate,
      createdAt: new Date().toISOString(),
    };
    await addRow('insurance', row);
    res.status(201).json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteRow('insurance', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
