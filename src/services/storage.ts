import type { AppData } from '../types/finance';

const INITIAL_DATA: AppData = {
  version: '1.0',
  cards: [],
  tags: [],
  transactions: [],
  invoices: []
};

// Camada primária do LocalStorage
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

// Camada de API de Acesso ao Sistema de Arquivos (Chrome/Edge)
type FileSystemPickerWindow = Window & typeof globalThis & {
  showOpenFilePicker: (opts: object) => Promise<FileSystemFileHandle[]>;
};

let fileHandle: FileSystemFileHandle | null = null;
let onFileHandleChange: ((connected: boolean) => void) | null = null;

// Fallback para Firefox/Safari: mantém últimos dados carregados para re-exportar ao salvar
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

// Helper: ler um objeto File e fazer o parse de AppData
const parseFileContents = async (file: File): Promise<AppData> => {
  const contents = await file.text();
  if (contents.trim() === '') return INITIAL_DATA;
  const parsed = JSON.parse(contents) as AppData;
  if (parsed.invoices) {
    parsed.invoices = parsed.invoices.filter(inv => inv.transactions && inv.transactions.length > 0);
  }
  return parsed;
};

// Helper: abrir arquivo via <input> oculto (fallback para Firefox/Safari)
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
  // Chrome/Edge: usar API de Acesso ao Sistema de Arquivos (suporta gravação)
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
      // Usuário cancelou ou erro
      console.error('File selection cancelled or failed:', e);
      return null;
    }
  }

  // Firefox/Safari: usar <input type="file"> oculto
  return openFileViaInput();
};

export const syncToFile = async (data: AppData) => {
  // Chrome/Edge: gravar de volta no mesmo arquivo silenciosamente
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
  // Fallback para Firefox/Safari: sem gravação silenciosa, dados salvos apenas no localStorage
  // O usuário deve exportar manualmente para manter o arquivo atualizado
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
