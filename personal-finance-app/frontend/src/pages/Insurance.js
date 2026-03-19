import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getRows, addRow, deleteRow } from '../lib/api';
const TYPES = ['health', 'life', 'vehicle', 'home', 'term'];
const TYPE_META = {
    health: { emoji: '🏥', color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' },
    life: { emoji: '💙', color: 'text-blue-700', border: 'border-blue-200', bg: 'bg-blue-50' },
    vehicle: { emoji: '🚗', color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50' },
    home: { emoji: '🏠', color: 'text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50' },
    term: { emoji: '📋', color: 'text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50' },
};
const fmt = (n) => `₹${Math.abs(n).toLocaleString('en-IN')}`;
const EMPTY = { type: 'health', provider: '', policyNumber: '', premium: '', frequency: 'yearly', sumAssured: '', startDate: '', endDate: '' };
export default function Insurance() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const load = () => getRows('insurance').then(setItems).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);
    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await addRow('insurance', {
                id: crypto.randomUUID(),
                ...form,
                premium: Number(form.premium),
                sumAssured: Number(form.sumAssured),
                status: 'active',
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
            await deleteRow('insurance', id);
            load();
        }
        catch (e) {
            setError(e.message);
        }
    };
    const totalPremium = items.reduce((s, p) => s + Number(p.premium), 0);
    const expiringSoon = items.filter(p => {
        const days = (new Date(p.endDate).getTime() - Date.now()) / 86400000;
        return days <= 90 && days > 0;
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-slate-800", children: "Insurance" }), _jsx("p", { className: "text-sm text-slate-400 mt-0.5", children: "All your policies in one place" })] }), _jsx("button", { onClick: () => setShowForm(!showForm), className: "flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm", children: "+ Add Policy" })] }), error && (_jsxs("div", { className: "bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between", children: [error, _jsx("button", { onClick: () => setError(''), className: "text-rose-400 hover:text-rose-600 ml-4", children: "\u2715" })] })), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: "Total Policies" }), _jsx("p", { className: "text-2xl font-bold text-slate-700 mt-1.5", children: items.length })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: "Annual Premium" }), _jsx("p", { className: "text-2xl font-bold text-amber-600 mt-1.5", children: fmt(totalPremium) })] }), _jsxs("div", { className: `rounded-2xl border shadow-sm p-5 ${expiringSoon.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`, children: [_jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: "Expiring Soon" }), _jsxs("p", { className: `text-2xl font-bold mt-1.5 ${expiringSoon.length > 0 ? 'text-amber-600' : 'text-slate-700'}`, children: [expiringSoon.length, " ", expiringSoon.length > 0 ? '⚠️' : '✓'] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Within 90 days" })] })] }), showForm && (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 border-b border-slate-50 bg-slate-50/50", children: _jsx("h3", { className: "font-semibold text-slate-700", children: "Add Insurance Policy" }) }), _jsxs("form", { onSubmit: handleAdd, className: "p-6 grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Type" }), _jsx("select", { value: form.type, onChange: e => setForm({ ...form, type: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", children: TYPES.map(t => _jsxs("option", { value: t, children: [TYPE_META[t].emoji, " ", t.charAt(0).toUpperCase() + t.slice(1)] }, t)) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Provider" }), _jsx("input", { placeholder: "e.g. LIC, HDFC ERGO, Star Health", value: form.provider, onChange: e => setForm({ ...form, provider: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Premium (\u20B9)" }), _jsx("input", { type: "number", min: "0", step: "0.01", placeholder: "0.00", value: form.premium, onChange: e => setForm({ ...form, premium: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Payment Frequency" }), _jsxs("select", { value: form.frequency, onChange: e => setForm({ ...form, frequency: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "quarterly", children: "Quarterly" }), _jsx("option", { value: "yearly", children: "Yearly" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Sum Assured (\u20B9)" }), _jsx("input", { type: "number", min: "0", step: "1", placeholder: "0", value: form.sumAssured, onChange: e => setForm({ ...form, sumAssured: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Policy Number (optional)" }), _jsx("input", { placeholder: "e.g. LIC/2024/001234", value: form.policyNumber, onChange: e => setForm({ ...form, policyNumber: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "Start Date" }), _jsx("input", { type: "date", value: form.startDate, onChange: e => setForm({ ...form, startDate: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-slate-500 uppercase tracking-wider", children: "End / Renewal Date" }), _jsx("input", { type: "date", value: form.endDate, onChange: e => setForm({ ...form, endDate: e.target.value }), className: "w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400", required: true })] }), _jsxs("div", { className: "col-span-2 flex gap-3 justify-end pt-2 border-t border-slate-50", children: [_jsx("button", { type: "button", onClick: () => { setShowForm(false); setForm(EMPTY); }, className: "px-5 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors", children: saving ? 'Saving…' : 'Save Policy' })] })] })] })), items.length === 0 ? (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83D\uDEE1\uFE0F" }), _jsx("p", { className: "text-slate-500 font-medium", children: "No policies yet" }), _jsx("p", { className: "text-sm text-slate-400 mt-1", children: "Click \"Add Policy\" to track your insurance" })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: items.map(p => {
                    const daysLeft = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);
                    const meta = TYPE_META[p.type] || TYPE_META.health;
                    return (_jsxs("div", { className: `rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow group ${meta.bg} ${meta.border}`, children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "text-2xl", children: meta.emoji }), _jsxs("div", { children: [_jsx("p", { className: `font-semibold text-sm ${meta.color}`, children: p.provider }), _jsxs("p", { className: "text-xs text-slate-500 capitalize", children: [p.type, " insurance"] })] })] }), _jsx("button", { onClick: () => handleDelete(p.id), className: "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 transition-all text-lg font-bold", children: "\u00D7" })] }), _jsxs("div", { className: "space-y-2 text-sm mt-4", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Premium" }), _jsxs("span", { className: "font-semibold text-slate-800", children: [fmt(Number(p.premium)), " / ", p.frequency] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Sum Assured" }), _jsx("span", { className: "font-semibold text-slate-800", children: fmt(Number(p.sumAssured)) })] }), p.policyNumber && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Policy #" }), _jsx("span", { className: "font-medium text-xs text-slate-600", children: p.policyNumber })] })), _jsxs("div", { className: "flex justify-between pt-1 border-t border-black/5", children: [_jsx("span", { className: "text-slate-500", children: "Expires" }), _jsxs("span", { className: `font-medium text-xs ${daysLeft <= 90 ? 'text-amber-600 font-semibold' : 'text-slate-600'}`, children: [new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), daysLeft <= 90 && daysLeft > 0 && _jsxs("span", { className: "ml-1 text-amber-600", children: ["(", daysLeft, "d left)"] })] })] })] })] }, p.id));
                }) }))] }));
}
