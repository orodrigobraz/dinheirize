export type TransactionType = 'credit' | 'pix' | 'debit' | 'cash';

export interface Card {
  id: string;
  name: string;
  closureDay: number;
  dueDay: number;
  validity?: string;
  cardType?: 'credit' | 'debit' | 'both';
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string; // ISO String or YYYY-MM-DD
  description: string;
  type: TransactionType;
  tags: string[]; // tag ids or plain strings
  cardId?: string; // If 'credit'
  installments: number; // 1 for one-off
  currentInstallment?: number; // Helps identify which installment this is
  groupId?: string; // Links installments together
}

export type InvoiceStatus = 'open' | 'paid' | 'future';

export interface Invoice {
  id: string;
  cardId: string;
  month: number; // 1-12
  year: number;
  status: InvoiceStatus;
  transactions: Transaction[]; // Transactions mapped to this invoice specifically
}

export interface AppData {
  version: string;
  cards: Card[];
  tags: Tag[];
  transactions: Transaction[]; // All non-credit or one-off records
  invoices: Invoice[]; // All card invoices over time
}
