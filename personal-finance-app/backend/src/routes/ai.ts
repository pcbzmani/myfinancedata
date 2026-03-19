import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const prisma = new PrismaClient();

router.post('/chat', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
  if (!settings?.aiApiKey) {
    return res.status(400).json({ error: 'No AI API key configured. Go to Settings to add your key.' });
  }

  const [transactions, investments, insurance] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: 'desc' }, take: 50 }),
    prisma.investment.findMany(),
    prisma.insurance.findMany(),
  ]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalInvested = investments.reduce((s, i) => s + i.amountInvested, 0);
  const currentPortfolio = investments.reduce((s, i) => s + i.currentValue, 0);

  const systemPrompt = `You are a personal finance assistant with access to the user's financial data:

SUMMARY:
- Total Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Expense: ₹${totalExpense.toLocaleString('en-IN')}
- Net Savings: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}
- Total Invested: ₹${totalInvested.toLocaleString('en-IN')}
- Portfolio Value: ₹${currentPortfolio.toLocaleString('en-IN')}
- Portfolio Gain/Loss: ₹${(currentPortfolio - totalInvested).toLocaleString('en-IN')}
- Active Insurance Policies: ${insurance.length}

RECENT TRANSACTIONS:
${transactions.slice(0, 10).map(t => `- ${t.type} | ${t.category} | ₹${t.amount} | ${t.description || ''}`).join('\n')}

INVESTMENTS:
${investments.map(i => `- ${i.name} (${i.type}) | Invested: ₹${i.amountInvested} | Current: ₹${i.currentValue}`).join('\n')}

INSURANCE:
${insurance.map(p => `- ${p.provider} (${p.type}) | ₹${p.premium}/${p.frequency} | Sum: ₹${p.sumAssured}`).join('\n')}

Give helpful, practical financial advice. Use ₹ for currency.`;

  try {
    if (settings.aiProvider === 'anthropic') {
      const client = new Anthropic({ apiKey: settings.aiApiKey });
      const response = await client.messages.create({
        model: settings.aiModel || 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return res.json({ reply: text });
    }

    if (settings.aiProvider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.aiApiKey}` },
        body: JSON.stringify({
          model: settings.aiModel || 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
          max_tokens: 1024,
        }),
      });
      const data = await response.json() as any;
      return res.json({ reply: data.choices?.[0]?.message?.content || 'No response' });
    }

    return res.status(400).json({ error: 'Unsupported AI provider' });
  } catch (err: any) {
    return res.status(500).json({ error: `AI error: ${err.message}` });
  }
});

export default router;
