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
  let headerRow;

  if (!sheet) {
    // Brand-new sheet: build headers from data keys directly to avoid
    // getLastColumn() returning 0 before the data is flushed.
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

  // For stocks and mutual funds, replace the currentValue cell with a live
  // GOOGLEFINANCE formula so the price auto-updates in Google Sheets.
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
      var updatedRow = values[i].slice(); // shallow copy

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
        var units     = Number(updatedRow[unitsCol]);
        var buyPrice  = Number(updatedRow[buyPriceCol]);
        if (units > 0 && buyPrice > 0) updatedRow[amountCol] = units * buyPrice;
      }

      // Write the entire row back in one shot
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

/**
 * Builds the GOOGLEFINANCE formula for stocks or mutual funds.
 *   type        – 'stocks' | 'mutual_fund'
 *   symbol      – Yahoo-format ticker (INFY.NS) or Google Finance ticker
 *   unitsCell   – e.g. "E5"
 *   symbolCell  – e.g. "D5"  (used for MF cell-reference formula)
 *   fallback    – amountInvested used as IFERROR fallback
 */
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

/**
 * Scans every row in the 'investments' sheet and stamps the correct
 * GOOGLEFINANCE formula into the currentValue column for stocks and
 * mutual funds.  Run this ONCE manually from the Apps Script editor
 * (select fixAllFormulas → Run) to fix any existing rows that have a
 * plain 0.  It is also wired to the onOpen trigger so formulas are
 * refreshed every time the spreadsheet is opened.
 */
function fixAllFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Find investments sheet case-insensitively
  var sheet = null;
  var allSheets = ss.getSheets();
  for (var s = 0; s < allSheets.length; s++) {
    if (allSheets[s].getName().toLowerCase() === 'investments') {
      sheet = allSheets[s];
      break;
    }
  }
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log('fixAllFormulas: investments sheet not found or empty');
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  Logger.log('fixAllFormulas: headers = ' + JSON.stringify(headers));

  var typeCol         = headers.indexOf('type');
  var symbolCol       = headers.indexOf('symbol');
  var unitsCol        = headers.indexOf('units');
  var amountCol       = headers.indexOf('amountInvested');
  var currentValueCol = headers.indexOf('currentValue');

  if (typeCol < 0 || symbolCol < 0 || unitsCol < 0 || currentValueCol < 0) {
    Logger.log('fixAllFormulas: missing required columns. typeCol=' + typeCol +
               ' symbolCol=' + symbolCol + ' unitsCol=' + unitsCol +
               ' currentValueCol=' + currentValueCol);
    return;
  }

  var fixed = 0;
  for (var i = 1; i < data.length; i++) {
    var rowNum   = i + 1;
    var type     = String(data[i][typeCol]).trim();
    var symbol   = String(data[i][symbolCol]).trim();
    var invested = Number(data[i][amountCol]) || 0;

    Logger.log('Row ' + rowNum + ': type=' + type + ' symbol=' + symbol);
    if (!symbol || (type !== 'stocks' && type !== 'mutual_fund')) continue;

    var unitsCell  = colLetter(unitsCol  + 1) + rowNum;
    var symbolCell = colLetter(symbolCol + 1) + rowNum;
    var formula = buildFormula(type, symbol, unitsCell, symbolCell, invested);

    if (formula) {
      Logger.log('Row ' + rowNum + ': setting formula → ' + formula);
      sheet.getRange(rowNum, currentValueCol + 1).setFormula(formula);
      fixed++;
    }
  }
  Logger.log('fixAllFormulas: done. Fixed ' + fixed + ' row(s).');
}

/**
 * Automatically refresh GOOGLEFINANCE formulas each time the spreadsheet
 * is opened.  To register this trigger:
 *   Apps Script editor → Triggers (clock icon) → Add Trigger →
 *   Function: onOpen, Event: From spreadsheet, On open
 */
function onOpen() {
  fixAllFormulas();
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

/**
 * Creates (or resets) the 'market_rates' sheet with GOOGLEFINANCE formulas.
 * Run once manually: Apps Script editor → select setupMarketSheet → Run
 * Or call via ?action=setupMarket from the app's Settings page.
 */
function setupMarketSheet(ss) {
  var name = 'market_rates';
  var sheet = ss.getSheetByName(name);
  if (sheet) ss.deleteSheet(sheet);          // recreate fresh each time
  sheet = ss.insertSheet(name);

  // ── Headers ────────────────────────────────────────────────────────────────
  var hdr = sheet.getRange(1, 1, 1, 4);
  hdr.setValues([['key', 'price', 'change', 'changePct']]);
  hdr.setFontWeight('bold').setBackground('#7c3aed').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 4, 160);

  // ── Row keys (column A) ────────────────────────────────────────────────────
  var keys = [
    ['nifty50'], ['bankNifty'], ['nasdaq'], ['sp500'],
    ['shanghai'], ['hangSeng'], ['nikkei'], ['kospi'],
    ['usdInr'], ['qarInr'], ['goldInr'], ['goldQar']
  ];
  sheet.getRange(2, 1, keys.length, 1).setValues(keys);

  // ── GOOGLEFINANCE formulas (columns B, C, D) ───────────────────────────────
  // changepct from GOOGLEFINANCE is already in % points (e.g. 0.49 means 0.49%)
  var f = [
    // Indices
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

    // Currencies
    ['=GOOGLEFINANCE("CURRENCY:USDINR")',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:USDINR","change"),0)',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:USDINR","changepct"),0)'],

    ['=GOOGLEFINANCE("CURRENCY:QARINR")',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:QARINR","change"),0)',
     '=IFERROR(GOOGLEFINANCE("CURRENCY:QARINR","changepct"),0)'],

    // Gold in INR per 10g  =GLD * 10 * USDINR / 31.1035
    ['=(GOOGLEFINANCE("GLD")*10*GOOGLEFINANCE("CURRENCY:USDINR"))/31.1035',
     '=(IFERROR(GOOGLEFINANCE("GLD","change"),0)*10*GOOGLEFINANCE("CURRENCY:USDINR"))/31.1035',
     '=IFERROR(GOOGLEFINANCE("GLD","changepct"),0)'],

    // Gold in QAR per 10g  =GLD * 10 * USDQAR / 31.1035
    ['=(GOOGLEFINANCE("GLD")*10*GOOGLEFINANCE("CURRENCY:USDQAR"))/31.1035',
     '=(IFERROR(GOOGLEFINANCE("GLD","change"),0)*10*GOOGLEFINANCE("CURRENCY:USDQAR"))/31.1035',
     '=IFERROR(GOOGLEFINANCE("GLD","changepct"),0)']
  ];

  sheet.getRange(2, 2, f.length, 3).setFormulas(f);
  Logger.log('setupMarketSheet: done — ' + f.length + ' rows written.');
}

/**
 * Reads the market_rates sheet and returns all rows as a key→{price,change,changePct} map.
 * Creates the sheet automatically if it doesn't exist yet.
 */
function readMarketRates(ss) {
  var sheet = ss.getSheetByName('market_rates');
  if (!sheet) {
    setupMarketSheet(ss);
    sheet = ss.getSheetByName('market_rates');
  }
  if (!sheet || sheet.getLastRow() < 2) return { data: {} };

  var values = sheet.getDataRange().getValues(); // computed values, not formula strings
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
}
