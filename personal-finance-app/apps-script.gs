/*** Personal Finance App — Google Apps Script Backend
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
    } else if (action === 'delete') {
      result = deleteRow(ss, sheetName, e.parameter.id);
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

  const values = sheet.getDataRange().getValues(); // returns computed values (formulas evaluated)
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

  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = Object.keys(data);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold').setBackground('#7c3aed').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 150);
  }

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headerRow.map(function(h) {
    return data[h] !== undefined ? data[h] : '';
  });
  sheet.appendRow(row);

  // For stocks and mutual funds, replace the currentValue cell with a live
  // GOOGLEFINANCE formula so the price auto-updates in Google Sheets.
  if (name === 'investments' && data.symbol &&
      (data.type === 'stocks' || data.type === 'mutual_fund')) {

    const lastRow = sheet.getLastRow();
    const currentValueCol = headerRow.indexOf('currentValue') + 1; // 1-based
    const unitsCol = headerRow.indexOf('units') + 1;

    if (currentValueCol > 0 && unitsCol > 0) {
      const ticker = yahooToGoogleTicker(data.symbol);
      const unitsCell = colLetter(unitsCol) + lastRow;
      // =IFERROR(GOOGLEFINANCE("NSE:INFY","price") * units_cell, amountInvested)
      const formula = '=IFERROR(GOOGLEFINANCE("' + ticker + '","price")*' + unitsCell + ',' + (data.amountInvested || 0) + ')';
      sheet.getRange(lastRow, currentValueCol).setFormula(formula);
    }
  }

  return { success: true };
}

/**
 * Converts a Yahoo Finance symbol to a Google Finance ticker.
 *   INFY.NS   → NSE:INFY
 *   RELIANCE.NS → NSE:RELIANCE
 *   500325.BO → BOM:500325
 *   AAPL      → AAPL  (US stocks work as-is)
 */
function yahooToGoogleTicker(symbol) {
  if (symbol.endsWith('.NS')) return 'NSE:' + symbol.slice(0, -3);
  if (symbol.endsWith('.BO')) return 'BOM:' + symbol.slice(0, -3);
  return symbol;
}

/** Convert a 1-based column index to a spreadsheet letter (1→A, 27→AA, etc.) */
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
