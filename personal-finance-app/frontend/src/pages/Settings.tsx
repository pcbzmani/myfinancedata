import { useEffect, useState } from 'react';
import { getScriptUrl, setScriptUrl, ping } from '../lib/api';

const SCRIPT_CODE = `/*** Personal Finance App — Google Apps Script Backend
 * ===================================================
 * HOW TO DEPLOY:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Delete any existing code and paste THIS entire file
 * 3. Click "Deploy" → "New Deployment"
 * 4. Type: Web app
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Click Deploy → copy the Web app URL
 * 8. Paste that URL in the app's Settings page
 */

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action || 'read';
    const sheetName = e.parameter.sheet;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let result;

    if (action === 'ping') {
      result = { ok: true };
    } else if (action === 'read') {
      result = readSheet(ss, sheetName);
    } else if (action === 'add') {
      const data = JSON.parse(e.parameter.data);
      result = addRow(ss, sheetName, data);
    } else if (action === 'update') {
      const updates = JSON.parse(e.parameter.data);
      result = updateRow(ss, sheetName, e.parameter.id, updates);
    } else if (action === 'delete') {
      result = deleteRow(ss, sheetName, e.parameter.id);
    } else if (action === 'fixFormulas') {
      fixAllFormulas();
      result = { ok: true, message: 'Formulas refreshed' };
    } else if (action === 'setupMarket') {
      setupMarketSheet(ss);
      result = { ok: true, message: 'market_rates sheet ready' };
    } else if (action === 'readMarket') {
      result = readMarketRates(ss);
    } else {
      result = { error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}

function readSheet(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return { data: [] };

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1).map(function(row) {
    const obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
  return { data: rows };
}

function addRow(ss, name, data) {
  let sheet = ss.getSheetByName(name);
  let headerRow;

  if (!sheet) {
    sheet = ss.insertSheet(name);
    headerRow = Object.keys(data);
    const headerRange = sheet.getRange(1, 1, 1, headerRow.length);
    headerRange.setValues([headerRow]);
    headerRange.setFontWeight('bold').setBackground('#7c3aed').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headerRow.length, 150);
  } else {
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) return { error: 'Sheet has no columns' };
    headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  const row = headerRow.map(function(h) {
    return data[h] !== undefined ? data[h] : '';
  });
  sheet.appendRow(row);

  if (name === 'investments' && data.symbol &&
      (data.type === 'stocks' || data.type === 'mutual_fund')) {

    const lastRow = sheet.getLastRow();
    const currentValueCol = headerRow.indexOf('currentValue') + 1;
    const unitsCol = headerRow.indexOf('units') + 1;
    const symbolCol = headerRow.indexOf('symbol') + 1;

    if (currentValueCol > 0 && unitsCol > 0 && symbolCol > 0) {
      const unitsCell = colLetter(unitsCol) + lastRow;
      const symbolCell = colLetter(symbolCol) + lastRow;
      var formula = buildFormula(data.type, data.symbol, unitsCell, symbolCell, data.amountInvested || 0);
      if (formula) sheet.getRange(lastRow, currentValueCol).setFormula(formula);
    }
  }

  return { success: true };
}

function updateRow(ss, name, id, updates) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) return { error: 'Sheet not found: ' + name };

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf('id');
  if (idCol < 0) return { error: 'No id column' };

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      var rowNum = i + 1;
      var updatedRow = values[i].slice();

      // Generic: update any field in updates that exists as a header (never overwrite id)
      Object.keys(updates).forEach(function(key) {
        if (key === 'id') return;
        var col = headers.indexOf(key);
        if (col >= 0) updatedRow[col] = updates[key];
      });

      // Investment-specific: recompute amountInvested from units * buyPrice
      var unitsCol    = headers.indexOf('units');
      var buyPriceCol = headers.indexOf('buyPrice');
      var amountCol   = headers.indexOf('amountInvested');
      if (unitsCol >= 0 && buyPriceCol >= 0 && amountCol >= 0) {
        var units    = Number(updatedRow[unitsCol]);
        var buyPrice = Number(updatedRow[buyPriceCol]);
        if (units > 0 && buyPrice > 0) updatedRow[amountCol] = units * buyPrice;
      }

      sheet.getRange(rowNum, 1, 1, updatedRow.length).setValues([updatedRow]);

      // Investment-specific: re-stamp GOOGLEFINANCE formula for stocks/MF
      var typeCol         = headers.indexOf('type');
      var symbolCol       = headers.indexOf('symbol');
      var currentValueCol = headers.indexOf('currentValue');
      if (typeCol >= 0 && symbolCol >= 0 && currentValueCol >= 0) {
        var type   = String(values[i][typeCol] || '').trim();
        var symbol = String(values[i][symbolCol] || '').trim();
        if ((type === 'stocks' || type === 'mutual_fund') && symbol) {
          var amountInvested = amountCol >= 0 ? Number(updatedRow[amountCol]) : 0;
          var unitsCell  = colLetter(unitsCol + 1) + rowNum;
          var symbolCell = colLetter(symbolCol + 1) + rowNum;
          var formula = buildFormula(type, symbol, unitsCell, symbolCell, amountInvested);
          if (formula) sheet.getRange(rowNum, currentValueCol + 1).setFormula(formula);
        }
      }

      return { success: true };
    }
  }
  return { error: 'Row not found' };
}

function buildFormula(type, symbol, unitsCell, symbolCell, fallback) {
  if (type === 'stocks') {
    var sym = String(symbol).trim().toUpperCase();
    var gfTicker;
    if (sym.endsWith('.BO')) {
      gfTicker = 'BOM:' + sym.slice(0, -3);
    } else {
      gfTicker = 'NSE:' + (sym.endsWith('.NS') ? sym.slice(0, -3) : sym);
    }
    return '=IFERROR(GOOGLEFINANCE("' + gfTicker + '","price")*' + unitsCell + ',' + (fallback || 0) + ')';
  }
  if (type === 'mutual_fund') {
    return '=IFERROR(GOOGLEFINANCE(' + symbolCell + ')*' + unitsCell + ',' + (fallback || 0) + ')';
  }
  return null;
}

function fixAllFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = null;
  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    if (allSheets[s].getName().toLowerCase() === 'investments') {
      sheet = allSheets[s];
      break;
    }
  }
  if (!sheet || sheet.getLastRow() < 2) return;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var typeCol         = headers.indexOf('type');
  var symbolCol       = headers.indexOf('symbol');
  var unitsCol        = headers.indexOf('units');
  var amountCol       = headers.indexOf('amountInvested');
  var currentValueCol = headers.indexOf('currentValue');
  if (typeCol < 0 || symbolCol < 0 || unitsCol < 0 || currentValueCol < 0) return;

  for (var i = 1; i < data.length; i++) {
    var rowNum = i + 1;
    var type   = String(data[i][typeCol]).trim();
    var symbol = String(data[i][symbolCol]).trim();
    if (!symbol || (type !== 'stocks' && type !== 'mutual_fund')) continue;
    var invested   = Number(data[i][amountCol]) || 0;
    var unitsCell  = colLetter(unitsCol  + 1) + rowNum;
    var symbolCell = colLetter(symbolCol + 1) + rowNum;
    var formula = buildFormula(type, symbol, unitsCell, symbolCell, invested);
    if (formula) sheet.getRange(rowNum, currentValueCol + 1).setFormula(formula);
  }
}

function onOpen() {
  fixAllFormulas();
}

function colLetter(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function deleteRow(ss, name, id) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return { error: 'Sheet not found: ' + name };
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Row not found' };
}

function setupMarketSheet(ss) {
  var name = 'market_rates';
  var sheet = ss.getSheetByName(name);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(name);

  var hdr = sheet.getRange(1, 1, 1, 4);
  hdr.setValues([['key', 'price', 'change', 'changePct']]);
  hdr.setFontWeight('bold').setBackground('#7c3aed').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 4, 160);

  var keys = [
    ['nifty50'], ['bankNifty'], ['nasdaq'], ['sp500'],
    ['shanghai'], ['hangSeng'], ['nikkei'], ['kospi'],
    ['usdInr'], ['qarInr'], ['goldInr'], ['goldQar']
  ];
  sheet.getRange(2, 1, keys.length, 1).setValues(keys);

  var f = [
    ['=GOOGLEFINANCE("INDEXNSE:NIFTY_50","price")',
     '=IFERROR(GOOGLEFINANCE("INDEXNSE:NIFTY_50","change"),0)',
     '=IFERROR(GOOGLEFINANCE("INDEXNSE:NIFTY_50","changepct"),0)'],
    ['=GOOGLEFINANCE("INDEXNSE:NIFTY_BANK","price")',
     '=IFERROR(GOOGLEFINANCE("INDEXNSE:NIFTY_BANK","change"),0)',
     '=IFERROR(GOOGLEFINANCE("INDEXNSE:NIFTY_BANK","changepct"),0)'],
    ['=GOOGLEFINANCE("INDEXNASDAQ:NDX","price")',
     '=IFERROR(GOOGLEFINANCE("INDEXNASDAQ:NDX","change"),0)',
     '=IFERROR(GOOGLEFINANCE("INDEXNASDAQ:NDX","changepct"),0)'],
    ['=GOOGLEFINANCE("INDEXSP:.INX","price")',
     '=IFERROR(GOOGLEFINANCE("INDEXSP:.INX","change"),0)',
     '=IFERROR(GOOGLEFINANCE("INDEXSP:.INX","changepct"),0)'],
    ['=GOOGLEFINANCE("SHA:000001","price")',
     '=IFERROR(GOOGLEFINANCE("SHA:000001","change"),0)',
     '=IFERROR(GOOGLEFINANCE("SHA:000001","changepct"),0)'],
    ['=GOOGLEFINANCE("INDEXHANGSENG:HSI","price")',
     '=IFERROR(GOOGLEFINANCE("INDEXHANGSENG:HSI","change"),0)',
     '=IFERROR(GOOGLEFINANCE("INDEXHANGSENG:HSI","changepct"),0)'],
    ['=GOOGLEFINANCE("INDEXNIKKEI:NI225","price")',
     '=IFERROR(GOOGLEFINANCE("INDEXNIKKEI:NI225","change"),0)',
     '=IFERROR(GOOGLEFINANCE("INDEXNIKKEI:NI225","changepct"),0)'],
    ['=GOOGLEFINANCE("KRX:KOSPI","price")',
     '=IFERROR(GOOGLEFINANCE("KRX:KOSPI","change"),0)',
     '=IFERROR(GOOGLEFINANCE("KRX:KOSPI","changepct"),0)'],
    ['=GOOGLEFINANCE("CURRENCY:USDINR")',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:USDINR","change"),0)',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:USDINR","changepct"),0)'],
    ['=GOOGLEFINANCE("CURRENCY:QARINR")',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:QARINR","change"),0)',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:QARINR","changepct"),0)'],
    ['=(GOOGLEFINANCE("GLD")*10*GOOGLEFINANCE("CURRENCY:USDINR"))/31.1035',
     '=(IFERROR(GOOGLEFINANCE("GLD","change"),0)*10*GOOGLEFINANCE("CURRENCY:USDINR"))/31.1035',
     '=IFERROR(GOOGLEFINANCE("GLD","changepct"),0)'],
    ['=(GOOGLEFINANCE("GLD")*10*GOOGLEFINANCE("CURRENCY:USDQAR"))/31.1035',
     '=(IFERROR(GOOGLEFINANCE("GLD","change"),0)*10*GOOGLEFINANCE("CURRENCY:USDQAR"))/31.1035',
     '=IFERROR(GOOGLEFINANCE("GLD","changepct"),0)']
  ];

  sheet.getRange(2, 2, f.length, 3).setFormulas(f);
}

function readMarketRates(ss) {
  var sheet = ss.getSheetByName('market_rates');
  if (!sheet) {
    setupMarketSheet(ss);
    sheet = ss.getSheetByName('market_rates');
  }
  if (!sheet || sheet.getLastRow() < 2) return { data: {} };

  var values = sheet.getDataRange().getValues();
  var data = {};
  for (var i = 1; i < values.length; i++) {
    var key       = String(values[i][0]).trim();
    var price     = values[i][1];
    var change    = values[i][2];
    var changePct = values[i][3];
    if (key && typeof price === 'number' && !isNaN(price) && price > 0) {
      data[key] = {
        price:     price,
        change:    typeof change    === 'number' ? change    : 0,
        changePct: typeof changePct === 'number' ? changePct : 0
      };
    }
  }
  return { data: data };
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
