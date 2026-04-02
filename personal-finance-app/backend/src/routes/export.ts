import { Router, Request, Response } from 'express';
import { getRows } from '../sheets-router';

const router = Router();

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
}

const FREQ_MULTIPLIER: Record<string, number> = { monthly: 12, quarterly: 4, yearly: 1 };

router.get('/transactions.csv', async (_req: Request, res: Response) => {
  try {
    const data = await getRows('transactions');
    const csv = toCSV(
      ['Date', 'Type', 'Category', 'Currency', 'Amount', 'Description'],
      data.map((t: any) => [t.date || '', t.type || '', t.category || '', t.currency || 'QAR', t.amount || 0, t.description || ''])
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/investments.csv', async (_req: Request, res: Response) => {
  try {
    const data = await getRows('investments');
    const csv = toCSV(
      ['Name', 'Type', 'Symbol', 'Amount Invested', 'Current Value', 'Gain/Loss', 'Units', 'Buy Price', 'Date'],
      data.map((i: any) => [
        i.name || '', i.type || '', i.symbol || '',
        i.amountInvested || 0, i.currentValue || 0,
        Number(i.currentValue || 0) - Number(i.amountInvested || 0),
        i.units || '', i.buyPrice || '', i.date || '',
      ])
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="investments.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/insurance.csv', async (_req: Request, res: Response) => {
  try {
    const data = await getRows('insurance');
    const csv = toCSV(
      ['Provider', 'Type', 'Premium', 'Frequency', 'Annual Premium', 'Sum Assured', 'Policy Number', 'Start Date', 'End Date'],
      data.map((p: any) => {
        const annual = Number(p.premium || 0) * (FREQ_MULTIPLIER[p.frequency] ?? 1);
        return [p.provider || '', p.type || '', p.premium || 0, p.frequency || 'yearly', annual, p.sumAssured || 0, p.policyNumber || '', p.startDate || '', p.endDate || ''];
      })
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="insurance.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', async (_req: Request, res: Response) => {
  try {
    const [transactions, investments, insurance] = await Promise.all([
      getRows('transactions'),
      getRows('investments'),
      getRows('insurance'),
    ]);
    res.json({ transactions, investments, insurance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
