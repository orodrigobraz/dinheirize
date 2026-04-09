import type { AppData } from '../types/finance';

const INITIAL_DATA: AppData = {
  version: '1.0',
  cards: [],
  tags: [],
  transactions: [],
  invoices: []
};

// LocalStorage primary layer
export const loadFromLocal = (): AppData => {
  const data = localStorage.getItem('finance_data');
  if (data) {
    try {
      const parsed = JSON.parse(data) as AppData;
      if (parsed.invoices) {
        parsed.invoices = parsed.invoices.filter(inv => inv.transactions && inv.transactions.length > 0);
      }
      return parsed;
    } catch {
      return INITIAL_DATA;
    }
  }
  return INITIAL_DATA;
};

export const saveToLocal = (data: AppData) => {
  localStorage.setItem('finance_data', JSON.stringify(data));
};

// File System Access API layer (Chrome/Edge)
type FileSystemPickerWindow = Window & typeof globalThis & {
  showOpenFilePicker: (opts: object) => Promise<FileSystemFileHandle[]>;
};

let fileHandle: FileSystemFileHandle | null = null;
let onFileHandleChange: ((connected: boolean) => void) | null = null;

// Firefox/Safari fallback: keep last loaded data for re-export on save
let fallbackMode = false;

export const isFileSystemSupported = () => {
  return 'showOpenFilePicker' in window;
};

export const hasActiveFileHandle = () => {
  return fileHandle !== null || fallbackMode;
};

export const onFileConnectionChange = (cb: (connected: boolean) => void) => {
  onFileHandleChange = cb;
};

// Helper: read a File object and parse AppData
const parseFileContents = async (file: File): Promise<AppData> => {
  const contents = await file.text();
  if (contents.trim() === '') return INITIAL_DATA;
  const parsed = JSON.parse(contents) as AppData;
  if (parsed.invoices) {
    parsed.invoices = parsed.invoices.filter(inv => inv.transactions && inv.transactions.length > 0);
  }
  return parsed;
};

// Helper: open file via hidden <input> (Firefox/Safari fallback)
const openFileViaInput = (): Promise<AppData | null> => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) { resolve(null); return; }
      try {
        const data = await parseFileContents(file);
        fallbackMode = true;
        onFileHandleChange?.(true);
        resolve(data);
      } catch (e) {
        console.error('Failed to parse JSON file:', e);
        resolve(null);
      }
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    input.click();
  });
};

export const selectFileForSync = async (): Promise<AppData | null> => {
  // Chrome/Edge: use File System Access API (supports write-back)
  if (isFileSystemSupported()) {
    try {
      const picker = (window as FileSystemPickerWindow).showOpenFilePicker;
      const [handle] = await picker({
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      });
      fileHandle = handle;
      fallbackMode = false;
      onFileHandleChange?.(true);
      const file = await handle.getFile();
      return await parseFileContents(file);
    } catch (e) {
      // User cancelled or error
      console.error('File selection cancelled or failed:', e);
      return null;
    }
  }

  // Firefox/Safari: use hidden <input type="file">
  return openFileViaInput();
};

export const syncToFile = async (data: AppData) => {
  // Chrome/Edge: write back to the same file silently
  if (fileHandle) {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (e) {
      console.error('Failed to sync to file:', e);
    }
    return;
  }
  // Firefox/Safari fallback: no silent write-back, data is saved to localStorage only
  // User must manually export to keep the file updated
};

export const exportFileFallback = (data: AppData) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finance_data.json';
  a.click();
  URL.revokeObjectURL(url);
};
