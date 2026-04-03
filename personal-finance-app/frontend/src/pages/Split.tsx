import { useEffect } from 'react';
import { addRow } from '../lib/api';

export default function Split() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'splitit_expense') return;
      // split.html only fires this when paidBy === the user's myMember in that group
      const { expense } = event.data as {
        expense: { id: string; desc: string; amount: number; currency: string; category: string; paidBy: string; date: string };
      };
      const cat = expense.category?.replace(/^[\p{Emoji}\u200d\s]+/u, '').trim() || 'Shared Expense';
      addRow('transactions', {
        id: crypto.randomUUID(),
        type: 'expense',
        category: cat,
        currency: expense.currency || 'QAR',
        amount: Number(expense.amount),
        description: `${expense.desc} [SplitIt]`,
        date: expense.date || new Date().toISOString().split('T')[0],
      }).catch(console.error);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="-mx-4 -my-4 md:-mx-8 md:-my-8">
      <iframe
        src="/split.html"
        title="SplitIt — Group Expense Tracker"
        style={{ width: '100%', height: '100dvh', border: 'none', display: 'block' }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
