import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRows } from '../lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, } from 'recharts';
const PIE_COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const fmt = (n) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12)
        return 'Good morning';
    if (h < 17)
        return 'Good afternoon';
    return 'Good evening';
}
function buildMonthly(txns) {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = { income: 0, expense: 0 };
    }
    txns.forEach(t => {
        if (!t.date)
            return;
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!(key in months))
            return;
        if (t.type === 'income')
            months[key].income += Number(t.amount) || 0;
        else
            months[key].expense += Number(t.amount) || 0;
    });
    return Object.entries(months).map(([key, v]) => ({
        label: new Date(key + '-01').toLocaleDateString('en-IN', { month: 'short' }),
        ...v,
    }));
}
function ArrowUpIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "12", y1: "19", x2: "12", y2: "5" }), _jsx("polyline", { points: "5 12 12 5 19 12" })] }));
}
function ArrowDownIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("polyline", { points: "19 12 12 19 5 12" })] }));
}
function WalletIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" }), _jsx("path", { d: "M4 6v12c0 1.1.9 2 2 2h14v-4" }), _jsx("circle", { cx: "18", cy: "12", r: "2" })] }));
}
function BarChartIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "18", y1: "20", x2: "18", y2: "10" }), _jsx("line", { x1: "12", y1: "20", x2: "12", y2: "4" }), _jsx("line", { x1: "6", y1: "20", x2: "6", y2: "14" })] }));
}
function StatCard({ label, value, sub, color, iconBg, icon }) {
    return (_jsxs("div", { className: "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200", children: [_jsx("div", { className: `inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${iconBg}`, children: _jsx("span", { className: color, children: icon }) }), _jsx("p", { className: "text-xs font-medium text-slate-400 uppercase tracking-wider", children: label }), _jsx("p", { className: `text-2xl font-bold mt-1 ${color}`, children: value }), sub && _jsx("p", { className: "text-xs text-slate-400 mt-1", children: sub })] }));
}
export default function Dashboard() {
    const [txns, setTxns] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [insurance, setInsurance] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        Promise.all([
            getRows('transactions'),
            getRows('investments'),
            getRows('insurance'),
        ]).then(([t, inv, ins]) => {
            setTxns(t);
            setInvestments(inv);
            setInsurance(ins);
            setLoading(false);
        }).catch(e => { setError(e.message); setLoading(false); });
    }, []);
    if (loading)
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" }) }));
    if (error)
        return (_jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-2xl p-6", children: [_jsx("p", { className: "font-semibold text-amber-800 mb-1", children: "\u26A0\uFE0F Cannot load data" }), _jsx("p", { className: "text-sm text-amber-700 mb-3", children: error }), _jsxs("p", { className: "text-sm text-amber-600", children: ["Go to ", _jsx(Link, { to: "/settings", className: "font-semibold underline", children: "Settings" }), " and configure your Google Sheets URL first."] })] }));
    const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    const netSavings = totalIncome - totalExpense;
    const totalInvested = investments.reduce((s, i) => s + Number(i.amountInvested || 0), 0);
    const currentPortfolio = investments.reduce((s, i) => s + Number(i.currentValue || 0), 0);
    const portfolioGain = currentPortfolio - totalInvested;
    const activePolicies = insurance.filter(i => String(i.status).toLowerCase() === 'active').length;
    const totalPremium = insurance.reduce((s, i) => s + Number(i.premium || 0), 0);
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const gainPct = totalInvested > 0 ? `${portfolioGain >= 0 ? '+' : ''}${((portfolioGain / totalInvested) * 100).toFixed(1)}%` : '—';
    const monthly = buildMonthly(txns);
    const recent = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
    const pieData = Object.entries(txns.filter(t => t.type === 'expense').reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount || 0);
        return acc;
    }, {})).map(([name, value]) => ({ name, value }));
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm text-slate-400", children: [getGreeting(), " \uD83D\uDC4B"] }), _jsx("h1", { className: "text-2xl font-bold text-slate-800 mt-0.5", children: "Financial Overview" }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })] }), totalIncome > 0 && (_jsxs("div", { className: `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${savingsRate >= 20 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : savingsRate >= 0 ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-rose-50 border-rose-200 text-rose-600'}`, children: [_jsx("span", { className: "text-xs font-medium opacity-70", children: "Savings Rate" }), _jsxs("span", { children: [savingsRate, "%"] })] }))] }), _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(StatCard, { label: "Total Income", value: fmt(totalIncome), color: "text-emerald-600", iconBg: "bg-emerald-100", icon: _jsx(ArrowUpIcon, {}) }), _jsx(StatCard, { label: "Total Expenses", value: fmt(totalExpense), color: "text-rose-500", iconBg: "bg-rose-100", icon: _jsx(ArrowDownIcon, {}) }), _jsx(StatCard, { label: "Net Savings", value: fmt(netSavings), sub: netSavings >= 0 ? 'Surplus' : 'Deficit', color: netSavings >= 0 ? 'text-violet-600' : 'text-rose-500', iconBg: netSavings >= 0 ? 'bg-violet-100' : 'bg-rose-100', icon: _jsx(WalletIcon, {}) }), _jsx(StatCard, { label: "Portfolio", value: fmt(currentPortfolio), sub: `${gainPct} gain/loss`, color: "text-blue-600", iconBg: "bg-blue-100", icon: _jsx(BarChartIcon, {}) })] }), _jsxs("div", { className: "grid grid-cols-5 gap-4", children: [_jsxs("div", { className: "col-span-3 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-center gap-4 mb-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-semibold text-slate-800", children: "Cash Flow" }), _jsx("p", { className: "text-xs text-slate-400", children: "Last 6 months" })] }), _jsxs("div", { className: "ml-auto flex gap-4 text-xs text-slate-500", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-violet-500" }), "Income"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-rose-400" }), "Expense"] })] })] }), _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(AreaChart, { data: monthly, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gi", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#7c3aed", stopOpacity: 0.2 }), _jsx("stop", { offset: "95%", stopColor: "#7c3aed", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "ge", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#f43f5e", stopOpacity: 0.15 }), _jsx("stop", { offset: "95%", stopColor: "#f43f5e", stopOpacity: 0 })] })] }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9" }), _jsx(XAxis, { dataKey: "label", tick: { fontSize: 11, fill: '#94a3b8' }, axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fontSize: 11, fill: '#94a3b8' }, axisLine: false, tickLine: false, tickFormatter: v => `₹${(v / 1000).toFixed(0)}k` }), _jsx(Tooltip, { formatter: (v) => [fmt(v), ''], contentStyle: { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 } }), _jsx(Area, { type: "monotone", dataKey: "income", stroke: "#7c3aed", strokeWidth: 2.5, fill: "url(#gi)", name: "Income", dot: false }), _jsx(Area, { type: "monotone", dataKey: "expense", stroke: "#f43f5e", strokeWidth: 2.5, fill: "url(#ge)", name: "Expense", dot: false })] }) })] }), _jsxs("div", { className: "col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow", children: [_jsx("h2", { className: "font-semibold text-slate-800 mb-1", children: "Expenses by Category" }), _jsx("p", { className: "text-xs text-slate-400 mb-3", children: "All time" }), pieData.length === 0 ? (_jsxs("div", { className: "h-[200px] flex flex-col items-center justify-center text-slate-300", children: [_jsx("p", { className: "text-3xl mb-2", children: "\uD83D\uDCCA" }), _jsx("p", { className: "text-sm", children: "No expenses yet" })] })) : (_jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: pieData, cx: "50%", cy: "50%", innerRadius: 45, outerRadius: 70, dataKey: "value", paddingAngle: 3, children: pieData.map((_, i) => _jsx(Cell, { fill: PIE_COLORS[i % PIE_COLORS.length] }, i)) }), _jsx(Tooltip, { formatter: (v) => [fmt(v), ''], contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 } }), _jsx(Legend, { iconType: "circle", iconSize: 7, formatter: (v) => _jsx("span", { className: "text-xs text-slate-600", children: v }) })] }) }))] })] }), _jsxs("div", { className: "grid grid-cols-5 gap-4", children: [_jsxs("div", { className: "col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-slate-50", children: [_jsx("h2", { className: "font-semibold text-slate-800", children: "Recent Transactions" }), _jsx(Link, { to: "/transactions", className: "text-xs text-violet-600 hover:text-violet-700 font-medium", children: "View all \u2192" })] }), recent.length === 0 ? (_jsxs("div", { className: "py-12 text-center", children: [_jsx("p", { className: "text-3xl mb-2", children: "\uD83D\uDCB3" }), _jsx("p", { className: "text-sm text-slate-400", children: "No transactions yet" }), _jsx(Link, { to: "/transactions", className: "text-xs text-violet-600 hover:underline mt-1 inline-block", children: "Add your first \u2192" })] })) : (_jsx("div", { className: "divide-y divide-slate-50", children: recent.map((t) => (_jsxs("div", { className: "flex items-center justify-between px-6 py-3 hover:bg-slate-50/60 transition-colors", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`, children: _jsx("span", { className: `text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`, children: t.type === 'income' ? '↑' : '↓' }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-slate-700", children: t.category }), t.description && _jsx("p", { className: "text-xs text-slate-400", children: t.description })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: `text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`, children: [t.type === 'income' ? '+' : '-', fmt(Number(t.amount))] }), _jsx("p", { className: "text-xs text-slate-400", children: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) })] })] }, t.id))) }))] }), _jsxs("div", { className: "col-span-2 space-y-4", children: [_jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "font-semibold text-slate-800", children: "Investments" }), _jsx("span", { className: `text-xs font-semibold px-2 py-0.5 rounded-full ${portfolioGain >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`, children: gainPct })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-slate-400", children: "Invested" }), _jsx("span", { className: "font-semibold text-slate-700", children: fmt(totalInvested) })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-slate-400", children: "Current Value" }), _jsx("span", { className: "font-semibold text-blue-600", children: fmt(currentPortfolio) })] }), _jsxs("div", { className: `flex justify-between text-sm font-semibold ${portfolioGain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`, children: [_jsx("span", { children: "P&L" }), _jsxs("span", { children: [portfolioGain >= 0 ? '+' : '', fmt(portfolioGain)] })] })] }), _jsx(Link, { to: "/investments", className: "text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block", children: "View portfolio \u2192" })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-100 shadow-sm p-5", children: [_jsx("h2", { className: "font-semibold text-slate-800 mb-3", children: "Insurance" }), _jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-slate-400", children: "Active Policies" }), _jsx("span", { className: "font-semibold text-slate-700", children: activePolicies })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-slate-400", children: "Annual Premium" }), _jsx("span", { className: "font-semibold text-amber-600", children: fmt(totalPremium) })] })] }), _jsx(Link, { to: "/insurance", className: "text-xs text-violet-600 hover:text-violet-700 font-medium mt-3 block", children: "Manage policies \u2192" })] })] })] })] }));
}
