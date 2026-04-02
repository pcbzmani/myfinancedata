/**
 * Smart data router — picks Google Sheets API (OAuth) or Apps Script proxy
 * based on whether the user has connected via Google OAuth.
 * All data routes import from here instead of directly from sheets.ts.
 */
import * as appsScript from './sheets';
import * as sheetsApi from './sheets-api';

function useOAuth(): boolean {
  return sheetsApi.isOAuthConnected();
}

export async function getRows(sheet: string): Promise<any[]> {
  return useOAuth() ? sheetsApi.getRows(sheet) : appsScript.getRows(sheet);
}

export async function addRow(sheet: string, data: Record<string, any>): Promise<void> {
  return useOAuth() ? sheetsApi.addRow(sheet, data) : appsScript.addRow(sheet, data);
}

export async function updateRow(sheet: string, id: string, data: Record<string, any>): Promise<void> {
  return useOAuth() ? sheetsApi.updateRow(sheet, id, data) : appsScript.updateRow(sheet, id, data);
}

export async function deleteRow(sheet: string, id: string): Promise<void> {
  return useOAuth() ? sheetsApi.deleteRow(sheet, id) : appsScript.deleteRow(sheet, id);
}

export async function ping(): Promise<boolean> {
  if (useOAuth()) {
    try { await sheetsApi.getRows('transactions'); return true; }
    catch { return false; }
  }
  return appsScript.ping();
}
