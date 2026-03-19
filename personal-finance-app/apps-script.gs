/**
 * Personal Finance App — Google Apps Script Backend
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
  return { success: true };
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
