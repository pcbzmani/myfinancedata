import { useEffect, useState } from 'react';
import { getScriptUrl, setScriptUrl, ping } from '../lib/api';

const SCRIPT_CODE = `function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const action = e.parameter.action || 'read';
    const sheetName = e.parameter.sheet;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let result;
    if (action === 'ping') { result = { ok: true }; }
    else if (action === 'read') { result = readSheet(ss, sheetName); }
    else if (action === 'add') { result = addRow(ss, sheetName, JSON.parse(e.parameter.data)); }
    else if (action === 'delete') { result = deleteRow(ss, sheetName, e.parameter.id); }
    else { result = { error: 'Unknown action' }; }
    output.setContent(JSON.stringify(result));
  } catch (err) { output.setContent(JSON.stringify({ error: err.toString() })); }
  return output;
}
function readSheet(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return { data: [] };
  const v = sheet.getDataRange().getValues();
  const h = v[0];
  return { data: v.slice(1).map(r => { const o = {}; h.forEach((k,i) => o[k]=r[i]); return o; }) };
}
function addRow(ss, name, data) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const ks = Object.keys(data);
    const hr = sheet.getRange(1,1,1,ks.length);
    hr.setValues([ks]).setFontWeight('bold').setBackground('#7c3aed').setFontColor('#fff');
    sheet.setFrozenRows(1);
  }
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(h => data[h] !== undefined ? data[h] : ''));
  return { success: true };
}
function deleteRow(ss, name, id) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return { error: 'Sheet not found' };
  const v = sheet.getDataRange().getValues();
  const idCol = v[0].indexOf('id');
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][idCol]) === String(id)) { sheet.deleteRow(i+1); return { success: true }; }
  }
  return { error: 'Row not found' };
}`;

export default function Settings() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setUrl(getScriptUrl()); }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setScriptUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setScriptUrl(url);
    const ok = await ping();
    setTestResult(ok ? 'ok' : 'fail');
    setTesting(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Connect your Google Sheets database</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-violet-600">
          <h2 className="font-semibold text-white">📊 Google Sheets Setup</h2>
          <p className="text-violet-200 text-xs mt-0.5">One-time setup — your data lives in YOUR Google Sheet</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-3">
            {[
              { n: '1', text: 'Create a new Google Spreadsheet at sheets.google.com', sub: 'Give it any name e.g. "My Finance Data"' },
              { n: '2', text: 'Open Apps Script editor', sub: 'Click Extensions → Apps Script in the top menu' },
              { n: '3', text: 'Paste the script code below', sub: 'Delete any existing code, paste, click Save (Ctrl+S)' },
              { n: '4', text: 'Deploy as a Web App', sub: 'Deploy → New Deployment → Type: Web app → Execute as: Me → Who can access: Anyone → Deploy' },
              { n: '5', text: 'Copy the Web App URL and paste it below', sub: 'Looks like: https://script.google.com/macros/s/ABC.../exec' },
            ].map(({ n, text, sub }) => (
              <div key={n} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex-shrink-0 flex items-center justify-center">{n}</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{text}</p>
                  {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Apps Script Code</p>
              <button
                onClick={copyCode}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {copied ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-300 text-xs p-4 rounded-xl overflow-auto max-h-48 leading-relaxed font-mono">
              {SCRIPT_CODE}
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Web App URL</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Google Apps Script URL</label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full mt-1.5 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!url}
              className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              {saved ? '✓ Saved!' : 'Save URL'}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={!url || testing}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
          </div>
          {testResult === 'ok' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              ✓ Connection successful! Google Sheets is ready.
            </div>
          )}
          {testResult === 'fail' && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
              ✗ Connection failed. Check the URL and make sure the script is deployed with "Anyone" access.
            </div>
          )}
        </form>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <h3 className="font-medium text-slate-700 mb-2">🔒 Privacy</h3>
        <ul className="text-sm text-slate-500 space-y-1.5">
          <li>• Your data is stored in <strong>your own</strong> Google Sheet — we never see it</li>
          <li>• The Apps Script runs under your Google account</li>
          <li>• No third-party tracking or analytics</li>
          <li>• You can delete or revoke access anytime from Google Settings</li>
        </ul>
      </div>
    </div>
  );
}
