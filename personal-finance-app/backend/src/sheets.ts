/**
 * Google Apps Script proxy layer.
 * All data lives in Google Sheets. This module routes every CRUD call
 * through the Apps Script web-app URL stored in config.json.
 */
import fs from 'fs';
import path from 'path';
// node-fetch v2 (CommonJS)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

function loadConfig(): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
}

function saveConfig(cfg: Record<string, string>) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

export function getScriptUrl(): string {
  return loadConfig().scriptUrl || '';
}

export function setScriptUrl(url: string) {
  const cfg = loadConfig();
  cfg.scriptUrl = url;
  saveConfig(cfg);
}

async function call(params: Record<string, string>): Promise<any> {
  const base = getScriptUrl();
  if (!base) throw new Error('Google Sheets not configured. Please set the Apps Script URL in Settings.');
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${base}?${qs}`, { follow: 20, timeout: 15000 });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Invalid response: ${text.slice(0, 200)}`); }
}

export async function getRows(sheet: string): Promise<any[]> {
  const r = await call({ action: 'read', sheet });
  return r.data || [];
}

export async function addRow(sheet: string, data: Record<string, any>): Promise<void> {
  await call({ action: 'add', sheet, data: JSON.stringify(data) });
}

export async function deleteRow(sheet: string, id: string): Promise<void> {
  await call({ action: 'delete', sheet, id });
}

export async function ping(): Promise<boolean> {
  try {
    await call({ action: 'ping' });
    return true;
  } catch { return false; }
}
