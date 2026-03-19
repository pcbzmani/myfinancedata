import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getRows, addRow, deleteRow } from '../lib/api';
const CATEGORIES = ['Salary', 'Freelance', 'Food', 'Transport', 'Shopping', 'Rent', 'Medical', 'Entertainment', 'Utilities', 'Other'];
const fmt = (n) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY_FORM = { type: 'expense', category: 'Food', amount: '', description: '', date: '' };
export default function Transactions() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const load = () => getRows('transactions').then(setItems).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);
    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await addRow('transactions', {
                id: crypto.randomUUID(),
                ...form,
                amount: Number(form.amount),
                date: form.date || new Date().toISOString().split('T')[0],
            });
            setShowForm(false);
            setForm(EMPTY_FORM);
            load();
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (id) => {
        try {
            await deleteRow('transactions', id);
            load();
        }
        catch (e) {
            setError(e.message);
        }
    };
    const filtered = filter === 'all' ? items : items.filter(t => t.type === filter);
    const totalIn = items.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = items.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-800", children: "Transactions" }), _jsx("p", { className: "text-sm text-slate-400 mt-0.5", children: "Track your income and expenses" })] }), _jsx("button", { onClick: () => setShowForm(!showForm), className: "flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm", children: "+ Add Transaction" })] }), error && (_jsxs("div", { className: "bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between", children: [error, _jsx("button", { onClick: () => setError(''), className: "text-rose-400 hover:text-rose-600 ml-4", children: "\u2715" })] })), _jsx("div", { className: "grid grid-cols-3 gap-4", children: [
                    { label: 'Total Income', value: totalIn, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                    { label: 'Total Expenses', value: totalOut, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100' },
                    { label: 'Net Balance', value: totalIn - totalOut, color: totalIn - totalOut >= 0 ? 'text-violet-600' : 'text-rose-500', bg: 'bg-white border-slate-100' },
                ].map(({ label, value, color, bg }) => (_jsxs("div", { className: `rounded-2xl p-5 border shadow-sm ${bg}`, children: [_jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: label }), _jsx("p", { className: `text-2xl font-bold mt-1.5 ${color}`, children: fmt(value) })] }, label))) }), showForm && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 border-b border-slate-50 bg-slate-50/50", children: _jsx("h3", { className: "font-semibold text-slate-700", children: "New Transaction" }) }), _jsxs("form", { onSubmit: handleAdd, className: "p-6 grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Type" }), _jsx("div", { className: "flex gap-2 mt-1.5", children: ['income', 'expense'].map(t => (_jsx("button", { type: "button", onClick: () => setForm({ ...form, type: t }), className: `flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${form.type === t
                                                ? t === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-400 bg-rose-50 text-rose-600'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'}`, children: t === 'income' ? '↑ Income' : '↓ Expense' }, t))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Category" }), _jsx("select", { value: form.category, onChange: e => setForm({ ...form, category: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400", children: CATEGORIES.map(c => _jsx("option", { children: c }, c)) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Amount (\u20B9)" }), _jsx("input", { type: "number", min: "0", step: "0.01", placeholder: "0.00", value: form.amount, onChange: e => setForm({ ...form, amount: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Date" }), _jsx("input", { type: "date", value: form.date, onChange: e => setForm({ ...form, date: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Note (optional)" }), _jsx("input", { placeholder: "What was this for?", value: form.description, onChange: e => setForm({ ...form, description: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" })] }), _jsxs("div", { className: "col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50", children: [_jsx("button", { type: "button", onClick: () => { setShowForm(false); setForm(EMPTY_FORM); }, className: "px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors", children: saving ? 'Saving…' : 'Save Transaction' })] })] })] })), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-slate-50", children: [_jsxs("p", { className: "text-sm text-slate-500", children: [filtered.length, " records"] }), _jsx("div", { className: "flex gap-1 bg-slate-100 rounded-lg p-1", children: ['all', 'income', 'expense'].map(f => (_jsx("button", { onClick: () => setFilter(f), className: `px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`, children: f }, f))) })] }), filtered.length === 0 ? (_jsxs("div", { className: "py-16 text-center", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83D\uDCB3" }), _jsx("p", { className: "text-slate-500 font-medium", children: "No transactions yet" }), _jsx("p", { className: "text-sm text-slate-400 mt-1", children: "Click \"Add Transaction\" to get started" })] })) : (_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-50/80 border-b border-slate-100", children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider", children: "Date" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider", children: "Category" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider", children: "Note" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider", children: "Amount" }), _jsx("th", { className: "px-6 py-3 w-8" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-50", children: filtered.map(t => (_jsxs("tr", { className: "hover:bg-slate-50/50 transition-colors group", children: [_jsx("td", { className: "px-6 py-3.5 text-slate-500 text-xs whitespace-nowrap", children: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }), _jsx("td", { className: "px-6 py-3.5", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: `w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-400'}` }), _jsx("span", { className: "font-medium text-slate-700", children: t.category }), _jsx("span", { className: `text-xs px-1.5 py-0.5 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`, children: t.type })] }) }), _jsx("td", { className: "px-6 py-3.5 text-slate-400 text-xs max-w-xs truncate", children: t.description || '—' }), _jsxs("td", { className: `px-6 py-3.5 text-right font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`, children: [t.type === 'income' ? '+' : '-', fmt(Number(t.amount))] }), _jsx("td", { className: "px-6 py-3.5 text-right", children: _jsx("button", { onClick: () => handleDelete(t.id), className: "text-slate-200 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-base font-bold", children: "\u00D7" }) })] }, t.id))) })] }))] })] }));
}
