import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getRows, addRow, deleteRow } from '../lib/api';
const TYPES = ['stocks', 'mutual_fund', 'crypto', 'fd', 'ppf', 'other'];
const TYPE_META = {
    stocks: { label: 'Stocks', color: 'text-blue-700', bg: 'bg-blue-100' },
    mutual_fund: { label: 'Mutual Fund', color: 'text-violet-700', bg: 'bg-violet-100' },
    crypto: { label: 'Crypto', color: 'text-amber-700', bg: 'bg-amber-100' },
    fd: { label: 'FD', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    ppf: { label: 'PPF', color: 'text-teal-700', bg: 'bg-teal-100' },
    other: { label: 'Other', color: 'text-slate-600', bg: 'bg-slate-100' },
};
const fmt = (n) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY = { type: 'stocks', name: '', amountInvested: '', currentValue: '', units: '', buyPrice: '' };
export default function Investments() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const load = () => getRows('investments').then(setItems).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);
    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await addRow('investments', {
                id: crypto.randomUUID(),
                ...form,
                amountInvested: Number(form.amountInvested),
                currentValue: Number(form.currentValue),
                units: form.units ? Number(form.units) : '',
                buyPrice: form.buyPrice ? Number(form.buyPrice) : '',
            });
            setShowForm(false);
            setForm(EMPTY);
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
            await deleteRow('investments', id);
            load();
        }
        catch (e) {
            setError(e.message);
        }
    };
    const totalInvested = items.reduce((s, i) => s + Number(i.amountInvested), 0);
    const totalCurrent = items.reduce((s, i) => s + Number(i.currentValue), 0);
    const gain = totalCurrent - totalInvested;
    const gainPct = totalInvested > 0 ? ((gain / totalInvested) * 100).toFixed(1) : '0.0';
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-800", children: "Investments" }), _jsx("p", { className: "text-sm text-slate-400 mt-0.5", children: "Stocks, mutual funds, crypto & more" })] }), _jsx("button", { onClick: () => setShowForm(!showForm), className: "flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm", children: "+ Add Investment" })] }), error && (_jsxs("div", { className: "bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between", children: [error, _jsx("button", { onClick: () => setError(''), className: "text-rose-400 hover:text-rose-600 ml-4", children: "\u2715" })] })), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: "Total Invested" }), _jsx("p", { className: "text-2xl font-bold text-slate-700 mt-1.5", children: fmt(totalInvested) })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: "Current Value" }), _jsx("p", { className: "text-2xl font-bold text-blue-600 mt-1.5", children: fmt(totalCurrent) })] }), _jsxs("div", { className: `rounded-2xl border shadow-sm p-5 ${gain >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`, children: [_jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: "Total P&L" }), _jsxs("p", { className: `text-2xl font-bold mt-1.5 ${gain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`, children: [gain >= 0 ? '+' : '', fmt(gain)] }), _jsxs("p", { className: `text-xs mt-1 ${gain >= 0 ? 'text-emerald-500' : 'text-rose-400'}`, children: [gainPct, "% return"] })] })] }), showForm && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 border-b border-slate-50 bg-slate-50/50", children: _jsx("h3", { className: "font-semibold text-slate-700", children: "Add Investment" }) }), _jsxs("form", { onSubmit: handleAdd, className: "p-6 grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Type" }), _jsx("select", { value: form.type, onChange: e => setForm({ ...form, type: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", children: TYPES.map(t => _jsx("option", { value: t, children: TYPE_META[t].label }, t)) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Name" }), _jsx("input", { placeholder: "e.g. HDFC Mid Cap Fund", value: form.name, onChange: e => setForm({ ...form, name: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Amount Invested (\u20B9)" }), _jsx("input", { type: "number", min: "0", step: "0.01", placeholder: "0.00", value: form.amountInvested, onChange: e => setForm({ ...form, amountInvested: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Current Value (\u20B9)" }), _jsx("input", { type: "number", min: "0", step: "0.01", placeholder: "0.00", value: form.currentValue, onChange: e => setForm({ ...form, currentValue: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Units (optional)" }), _jsx("input", { type: "number", min: "0", step: "any", placeholder: "\u2014", value: form.units, onChange: e => setForm({ ...form, units: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Buy Price per Unit (optional)" }), _jsx("input", { type: "number", min: "0", step: "0.01", placeholder: "\u2014", value: form.buyPrice, onChange: e => setForm({ ...form, buyPrice: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" })] }), _jsxs("div", { className: "col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50", children: [_jsx("button", { type: "button", onClick: () => { setShowForm(false); setForm(EMPTY); }, className: "px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors", children: saving ? 'Saving…' : 'Save Investment' })] })] })] })), items.length === 0 ? (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83D\uDCC8" }), _jsx("p", { className: "text-slate-500 font-medium", children: "No investments yet" }), _jsx("p", { className: "text-sm text-slate-400 mt-1", children: "Click \"Add Investment\" to track your portfolio" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: items.map(inv => {
                    const g = Number(inv.currentValue) - Number(inv.amountInvested);
                    const gPct = Number(inv.amountInvested) > 0 ? ((g / Number(inv.amountInvested)) * 100).toFixed(1) : '0.0';
                    const meta = TYPE_META[inv.type] || TYPE_META.other;
                    return (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow group", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("span", { className: `text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`, children: meta.label }), _jsx("button", { onClick: () => handleDelete(inv.id), className: "text-slate-200 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-lg font-bold", children: "\u00D7" })] }), _jsx("p", { className: "font-semibold text-slate-800 text-base mb-4", children: inv.name }), _jsxs("div", { className: "grid grid-cols-2 gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Invested" }), _jsx("p", { className: "font-semibold text-slate-700 mt-0.5", children: fmt(Number(inv.amountInvested)) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-slate-400", children: "Current" }), _jsx("p", { className: "font-semibold text-blue-600 mt-0.5", children: fmt(Number(inv.currentValue)) })] })] }), _jsxs("div", { className: `flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${g >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`, children: [_jsxs("span", { children: [g >= 0 ? '▲' : '▼', " P&L"] }), _jsxs("span", { children: [g >= 0 ? '+' : '', fmt(g), " (", gPct, "%)"] })] }), inv.units && (_jsxs("p", { className: "text-xs text-slate-400 mt-2", children: [inv.units, " units ", inv.buyPrice ? `@ ₹${Number(inv.buyPrice).toLocaleString('en-IN')}` : ''] }))] }, inv.id));
                }) }))] }));
}
