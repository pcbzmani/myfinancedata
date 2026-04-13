import { useState } from 'react';
import { getRows } from '../lib/api';

function toCSV(rows: any[], columns: string[]): string {
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = columns.join(',');
  const body   = rows.map(r => columns.map(c => escape(r[c])).join(','));
  return [header, ...body].join('\n');
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Table = 'transactions' | 'investments' | 'insurance' | 'subscriptions';

const TABLE_COLUMNS: Record<Table, string[]> = {
  transactions: ['date', 'type', 'category', 'description', 'amount', 'currency'],
  investments:  ['name', 'type', 'amountInvested', 'currentValue', 'purchaseDate', 'notes'],
  insurance:    ['provider', 'type', 'premium', 'frequency', 'sumAssured', 'startDate', 'endDate', 'notes'],
  subscriptions:['name', 'category', 'cost', 'currency', 'frequency', 'startDate', 'endDate', 'status', 'website'],
};

const TABLE_LABELS: Record<Table, string> = {
  transactions:  'Transactions',
  investments:   'Investments',
  insurance:     'Insurance',
  subscriptions: 'Subscriptions',
};

export default function ExportButtons() {
  const [loading, setLoading] = useState<Table | null>(null);

  async function handleExport(table: Table) {
    setLoading(table);
    try {
      const rows = await getRows(table);
      if (!rows.length) { alert(`No ${TABLE_LABELS[table]} data to export.`); return; }
      const csv      = toCSV(rows, TABLE_COLUMNS[table]);
      const date     = new Date().toISOString().split('T')[0];
      downloadCSV(`myfinance_${table}_${date}.csv`, csv);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(TABLE_LABELS) as Table[]).map(table => (
        <button
          key={table}
          onClick={() => handleExport(table)}
          disabled={loading === table}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading === table ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          {TABLE_LABELS[table]}
        </button>
      ))}
    </div>
  );
}
