import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getRows, getScriptUrl } from '../sheets';

const router = Router();
const MAX_MESSAGE_LENGTH = 500;

/**
 * POST /api/v1/ai/chat
 * Body: { message, apiKey?, provider?: 'anthropic'|'groq', model? }
 *
 * Reads real-time financial data from Google Sheets and passes it as
 * context to the selected AI provider. apiKey can also be supplied via
 * the ANTHROPIC_API_KEY or AI_API_KEY environment variable.
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { message, apiKey, provider = 'anthropic', model } = req.body;

  if (!message || typeof message !== 'string')
    return res.status(400).json({ error: 'Message required' });
  if (message.length > MAX_MESSAGE_LENGTH)
    return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });

  const key = apiKey || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || '';
  if (!key)
    return res.status(400).json({ error: 'No AI API key. Pass apiKey in the request body or set ANTHROPIC_API_KEY env var.' });

  if (!getScriptUrl())
    return res.status(400).json({ error: 'Google Sheets not configured. Set the Apps Script URL in Settings.' });

  try {
    const [transactions, investments, insurance] = await Promise.all([
      getRows('transactions'),
      getRows('investments'),
      getRows('insurance'),
    ]);

    const totalIncome    = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalExpense   = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalInvested  = investments.reduce((s: number, i: any) => s + Number(i.amountInvested), 0);
    const currentPortfolio = investments.reduce((s: number, i: any) => s + Number(i.currentValue), 0);

    const systemPrompt = `You are a personal finance assistant with access to the user's financial data:

SUMMARY:
- Total Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Expense: ₹${totalExpense.toLocaleString('en-IN')}
- Net Savings: ₹${(totalIncome - totalExpense).toLocaleString('en-IN')}
- Total Invested: ₹${totalInvested.toLocaleString('en-IN')}
- Portfolio Value: ₹${currentPortfolio.toLocaleString('en-IN')}
- Portfolio Gain/Loss: ₹${(currentPortfolio - totalInvested).toLocaleString('en-IN')}
- Active Insurance Policies: ${insurance.length}

RECENT TRANSACTIONS (last 10):
${transactions.slice(0, 10).map((t: any) => `- ${t.type} | ${t.category} | ${t.currency || '₹'}${t.amount} | ${t.description || ''}`).join('\n')}

INVESTMENTS:
${investments.map((i: any) => `- ${i.name} (${i.type}) | Invested: ₹${i.amountInvested} | Current: ₹${i.currentValue}`).join('\n')}

INSURANCE:
${insurance.map((p: any) => `- ${p.provider} (${p.type}) | ₹${p.premium}/${p.frequency} | Sum Assured: ₹${p.sumAssured}`).join('\n')}

Give helpful, practical financial advice. Use ₹ for INR amounts.`;

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey: key });
      const response = await client.messages.create({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return res.json({ reply: text });
    }

    if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: model || 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
          max_tokens: 1024,
        }),
      });
      const data = await response.json() as any;
      return res.json({ reply: data.choices?.[0]?.message?.content || 'No response' });
    }

    return res.status(400).json({ error: 'Unsupported AI provider. Use "anthropic" or "groq".' });
  } catch (err) {
    console.error('AI route error:', err);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
});

export default router;
