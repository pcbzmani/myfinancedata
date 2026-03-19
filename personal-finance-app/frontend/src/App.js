import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Investments from './pages/Investments';
import Insurance from './pages/Insurance';
import Settings from './pages/Settings';
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsxs(Route, { path: "/", element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "transactions", element: _jsx(Transactions, {}) }), _jsx(Route, { path: "investments", element: _jsx(Investments, {}) }), _jsx(Route, { path: "insurance", element: _jsx(Insurance, {}) }), _jsx(Route, { path: "settings", element: _jsx(Settings, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/" }) })] }) }));
}
