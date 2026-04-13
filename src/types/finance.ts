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
  date: string; // String ISO ou YYYY-MM-DD
  createdAt?: string; // Timestamp ISO de quando foi criada — para ordenar por inserção real
  description: string;
  type: TransactionType;
  tags: string[]; // ids de tags ou strings simples
  cardId?: string; // Se for 'credit'
  installments: number; // 1 para pagamento único
  currentInstallment?: number; // Ajuda a identificar qual é esta parcela
  groupId?: string; // Vincula parcelas juntas
}

export type InvoiceStatus = 'open' | 'paid' | 'future';

export interface Invoice {
  id: string;
  cardId: string;
  month: number; // 1-12
  year: number;
  status: InvoiceStatus;
  transactions: Transaction[]; // Transações mapeadas especificamente para esta fatura
}

export interface AppData {
  version: string;
  cards: Card[];
  tags: Tag[];
  transactions: Transaction[]; // Todos os registros que não são de crédito ou são pagamentos únicos
  invoices: Invoice[]; // Todas as faturas de cartão ao longo do tempo
}
