import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
}

router.get('/transactions.csv', async (_req: Request, res: Response) => {
  const data = await prisma.transaction.findMany({ orderBy: { date: 'desc' } });
  const csv = toCSV(
    ['Date', 'Type', 'Category', 'Amount', 'Description'],
    data.map(t => [new Date(t.date).toLocaleDateString('en-IN'), t.type, t.category, t.amount, t.description || ''])
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(csv);
});

router.get('/investments.csv', async (_req: Request, res: Response) => {
  const data = await prisma.investment.findMany();
  const csv = toCSV(
    ['Name', 'Type', 'Amount Invested', 'Current Value', 'Gain/Loss', 'Units', 'Buy Price', 'Date'],
    data.map(i => [i.name, i.type, i.amountInvested, i.currentValue, i.currentValue - i.amountInvested, i.units ?? '', i.buyPrice ?? '', new Date(i.date).toLocaleDateString('en-IN')])
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="investments.csv"');
  res.send(csv);
});

router.get('/insurance.csv', async (_req: Request, res: Response) => {
  const data = await prisma.insurance.findMany();
  const csv = toCSV(
    ['Provider', 'Type', 'Premium', 'Frequency', 'Sum Assured', 'Start Date', 'End Date'],
    data.map(p => [p.provider, p.type, p.premium, p.frequency, p.sumAssured, new Date(p.startDate).toLocaleDateString('en-IN'), new Date(p.endDate).toLocaleDateString('en-IN')])
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="insurance.csv"');
  res.send(csv);
});

router.get('/all', async (_req: Request, res: Response) => {
  const [transactions, investments, insurance] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: 'desc' } }),
    prisma.investment.findMany(),
    prisma.insurance.findMany(),
  ]);
  res.json({ transactions, investments, insurance });
});

export default router;
