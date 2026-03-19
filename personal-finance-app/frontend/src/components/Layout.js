import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink } from 'react-router-dom';
function DashboardIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1.5" }), _jsx("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1.5" })] }));
}
function CreditCardIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "1", y: "4", width: "22", height: "16", rx: "2" }), _jsx("line", { x1: "1", y1: "10", x2: "23", y2: "10" })] }));
}
function TrendingUpIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }), _jsx("polyline", { points: "17 6 23 6 23 12" })] }));
}
function ShieldIcon() {
    return (_jsx("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }) }));
}
function CogIcon() {
    return (_jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" })] }));
}
const nav = [
    { to: '/', label: 'Dashboard', Icon: DashboardIcon },
    { to: '/transactions', label: 'Transactions', Icon: CreditCardIcon },
    { to: '/investments', label: 'Investments', Icon: TrendingUpIcon },
    { to: '/insurance', label: 'Insurance', Icon: ShieldIcon },
    { to: '/settings', label: 'Settings', Icon: CogIcon },
];
export default function Layout() {
    return (_jsxs("div", { className: "flex h-screen overflow-hidden bg-slate-50", children: [_jsxs("aside", { className: "w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col", children: [_jsx("div", { className: "px-5 pt-6 pb-5", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg shadow-violet-200", children: "\u20B9" }), _jsxs("div", { children: [_jsx("p", { className: "font-bold text-slate-800 text-sm leading-none", children: "MyFinance" }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "Personal Finance" })] })] }) }), _jsx("div", { className: "mx-4 h-px bg-slate-100" }), _jsx("nav", { className: "flex-1 px-3 py-4 space-y-0.5", children: nav.map(({ to, label, Icon }) => (_jsxs(NavLink, { to: to, end: to === '/', className: ({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-200/50'
                                : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700'}`, children: [_jsx(Icon, {}), label] }, to))) }), _jsx("div", { className: "mx-4 h-px bg-slate-100" }), _jsx("div", { className: "px-5 py-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "relative flex h-2 w-2", children: [_jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" }), _jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-emerald-500" })] }), _jsx("p", { className: "text-xs text-slate-400", children: "Synced to Google Sheets" })] }) })] }), _jsx("main", { className: "flex-1 overflow-auto", children: _jsx("div", { className: "max-w-6xl mx-auto px-8 py-8", children: _jsx(Outlet, {}) }) })] }));
}
