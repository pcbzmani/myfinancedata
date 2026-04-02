import { Router, Request, Response } from 'express';
import { getRows } from '../sheets-router';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [transactions, investments, insurance] = await Promise.all([
      getRows('transactions'),
      getRows('investments'),
      getRows('insurance'),
    ]);

    const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalInvested = investments.reduce((s: number, i: any) => s + Number(i.amountInvested), 0);
    const currentPortfolio = investments.reduce((s: number, i: any) => s + Number(i.currentValue), 0);
    const totalPremium = insurance.reduce((s: number, p: any) => s + Number(p.premium), 0);

    const now = new Date();
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthTx = transactions.filter((t: any) => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      return {
        label,
        income: monthTx.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0),
        expense: monthTx.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0),
      };
    });

    res.json({
      summary: { totalIncome, totalExpense, netSavings: totalIncome - totalExpense, totalInvested, currentPortfolio, portfolioGain: currentPortfolio - totalInvested, totalPremium, activePolicies: insurance.length },
      monthly,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
