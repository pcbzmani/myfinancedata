/**
 * Google Sheets API v4 — OAuth2 data layer.
 * Alternative to apps-script proxy. Used when user has connected via Google OAuth.
 * Same interface as sheets.ts so sheets-router.ts can swap transparently.
 */
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(__dirname, '../../config.json');

function loadConfig(): Record<string, any> {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
}

function saveConfig(cfg: Record<string, any>) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

export function isOAuthConnected(): boolean {
  return !!loadConfig().googleRefreshToken;
}

export function getOAuthStatus() {
  const cfg = loadConfig();
  return {
    connected: !!cfg.googleRefreshToken,
    email: cfg.googleEmail || null,
    spreadsheetId: cfg.googleSpreadsheetId || null,
    spreadsheetUrl: cfg.googleSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${cfg.googleSpreadsheetId}`
      : null,
  };
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/v1/auth/google/callback'
  );
}

function getAuthClient() {
  const cfg = loadConfig();
  if (!cfg.googleRefreshToken) throw new Error('Google OAuth not connected. Please connect via Settings.');
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: cfg.googleRefreshToken });
  return oauth2;
}

export function getAuthUrl(): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
}

export async function handleCallback(code: string): Promise<void> {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
  const { data: userInfo } = await oauth2Api.userinfo.get();

  const cfg = loadConfig();
  cfg.googleRefreshToken = tokens.refresh_token;
  cfg.googleEmail = userInfo.email;
  saveConfig(cfg);

  await getOrCreateSpreadsheet();
}

export async function disconnect(): Promise<void> {
  const cfg = loadConfig();
  delete cfg.googleRefreshToken;
  delete cfg.googleEmail;
  delete cfg.googleSpreadsheetId;
  saveConfig(cfg);
}

async function getOrCreateSpreadsheet(): Promise<string> {
  const cfg = loadConfig();
  if (cfg.googleSpreadsheetId) return cfg.googleSpreadsheetId;

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const { data } = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'MyFinance Data' },
      sheets: [
        { properties: { title: 'transactions' } },
        { properties: { title: 'investments' } },
        { properties: { title: 'insurance' } },
        { properties: { title: 'vault' } },
      ],
    },
  });

  const spreadsheetId = data.spreadsheetId!;
  const updatedCfg = loadConfig();
  updatedCfg.googleSpreadsheetId = spreadsheetId;
  saveConfig(updatedCfg);
  return spreadsheetId;
}

async function getSheetsClient() {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

async function getSpreadsheetId(): Promise<string> {
  const cfg = loadConfig();
  if (cfg.googleSpreadsheetId) return cfg.googleSpreadsheetId;
  return getOrCreateSpreadsheet();
}

export async function getRows(sheetName: string): Promise<any[]> {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSpreadsheetId();

  try {
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0] as string[];
    return rows.slice(1).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
  } catch (e: any) {
    if (e.code === 400 || e.status === 400) return [];
    throw e;
  }
}

export async function addRow(sheetName: string, data: Record<string, any>): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSpreadsheetId();

  let headers: string[];
  try {
    const { data: existing } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    const firstRow = existing.values?.[0] as string[] | undefined;
    if (!firstRow || firstRow.length === 0) {
      headers = Object.keys(data);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    } else {
      headers = firstRow;
    }
  } catch {
    headers = Object.keys(data);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }

  const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

export async function updateRow(sheetName: string, id: string, updates: Record<string, any>): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSpreadsheetId();

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = data.values || [];
  if (rows.length < 2) throw new Error('Row not found');

  const headers = rows[0] as string[];
  const idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('No id column');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) {
      const updated = [...rows[i]];
      Object.keys(updates).forEach(key => {
        if (key === 'id') return;
        const col = headers.indexOf(key);
        if (col >= 0) updated[col] = String(updates[key]);
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${i + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [updated] },
      });
      return;
    }
  }
  throw new Error('Row not found');
}

export async function deleteRow(sheetName: string, id: string): Promise<void> {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSpreadsheetId();

  const { data: valData } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = valData.values || [];
  const headers = (rows[0] || []) as string[];
  const idCol = headers.indexOf('id');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) {
      const { data: ssData } = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = ssData.sheets?.find(s => s.properties?.title === sheetName);
      if (!sheet) throw new Error(`Sheet tab '${sheetName}' not found`);

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheet.properties!.sheetId!,
                dimension: 'ROWS',
                startIndex: i,
                endIndex: i + 1,
              },
            },
          }],
        },
      });
      return;
    }
  }
  throw new Error('Row not found');
}
