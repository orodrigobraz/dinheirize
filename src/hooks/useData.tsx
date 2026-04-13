import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppData, Card, Invoice, Tag, Transaction } from '../types/finance';
import { loadFromLocal, saveToLocal } from '../services/storage';
import {
  loadFromSupabase,
  fullSyncToSupabase,
  sb_addCard,
  sb_updateCard,
  sb_deleteCard,
  sb_upsertTags,
  sb_deleteTag,
  sb_addDirectTransaction,
  sb_addInvoiceTransactions,
  sb_updateInvoiceStatus,
  sb_updateInvoiceTransaction,
  sb_deleteInvoiceTransaction,
  type InvoiceTxPair,
} from '../services/supabaseStorage';

export type SyncStatus = 'synced' | 'syncing' | 'error';

interface DataContextProps {
  data: AppData;
  loading: boolean;
  syncStatus: SyncStatus;
  setData: (data: AppData) => void;
  addTransaction: (tx: Transaction) => void;
  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status']) => void;
  updateInvoiceTransaction: (invoiceId: string, transactionId: string, updatedTx: Partial<Transaction>) => void;
  deleteInvoiceTransaction: (invoiceId: string, transactionId: string) => void;
  deleteTag: (tagName: string) => void;
  deleteCard: (cardId: string) => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setDataState] = useState<AppData>(loadFromLocal());
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  // Ao montar: tentar Supabase. Se vazio + localStorage tiver dados → auto-migrar.
  useEffect(() => {
    const localData = loadFromLocal();

    loadFromSupabase()
      .then(supaData => {
        const supaEmpty =
          supaData &&
          supaData.cards.length === 0 &&
          supaData.transactions.length === 0 &&
          supaData.invoices.length === 0;

        if (supaData && !supaEmpty) {
          // Supabase tem dados — usar como fonte da verdade
          const filtered = {
            ...supaData,
            invoices: supaData.invoices.filter(inv => inv.transactions && inv.transactions.length > 0),
          };
          setDataState(filtered);
          saveToLocal(filtered);
          setSyncStatus('synced');
        } else if (supaEmpty && localData.cards.length === 0 && localData.invoices.length === 0) {
          // Ambos vazios — começo limpo
          setSyncStatus('synced');
        } else {
          // Supabase vazio, mas localStorage tem dados → auto-migrar!
          fullSyncToSupabase(localData)
            .then(() => setSyncStatus('synced'))
            .catch(() => setSyncStatus('error'));
        }
      })
      .catch(() => setSyncStatus('error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Substituição completa — sincroniza tudo com o Supabase
  const setData = (newData: AppData) => {
    const filtered = {
      ...newData,
      invoices: newData.invoices.filter(inv => inv.transactions && inv.transactions.length > 0),
    };
    setDataState(filtered);
    saveToLocal(filtered);
    setSyncStatus('syncing');
    fullSyncToSupabase(filtered)
      .then(() => setSyncStatus('synced'))
      .catch(() => setSyncStatus('error'));
  };

  const addCard = (card: Card) => {
    const newData = { ...data, cards: [...data.cards, card] };
    setDataState(newData);
    saveToLocal(newData);
    sb_addCard(card);
  };

  const updateCard = (updatedCard: Card) => {
    const newData = { ...data, cards: data.cards.map(c => c.id === updatedCard.id ? updatedCard : c) };
    setDataState(newData);
    saveToLocal(newData);
    sb_updateCard(updatedCard);
  };

  const deleteCard = (cardId: string) => {
    const newData = {
      ...data,
      cards: data.cards.filter(c => c.id !== cardId),
      invoices: data.invoices.filter(inv => inv.cardId !== cardId)
    };
    setDataState(newData);
    saveToLocal(newData);
    sb_deleteCard(cardId);
  };

  const updateInvoiceStatus = (invoiceId: string, status: Invoice['status']) => {
    const newData = {
      ...data,
      invoices: data.invoices.map(inv => inv.id === invoiceId ? { ...inv, status } : inv),
    };
    setDataState(newData);
    saveToLocal(newData);
    sb_updateInvoiceStatus(invoiceId, status);
  };

  const updateInvoiceTransaction = (invoiceId: string, transactionId: string, updatedTx: Partial<Transaction>) => {
    const newTags = [...data.tags];
    let resolvedTags: string[] | undefined;

    if (updatedTx.tags) {
      resolvedTags = updatedTx.tags.map(tagName => {
        const ext = newTags.find(t => t.name.toLowerCase() === tagName.toLowerCase() || t.id === tagName);
        if (ext) return ext.id;
        const newTag: Tag = { id: crypto.randomUUID(), name: tagName, color: '#F59E0B' };
        newTags.push(newTag);
        return newTag.id;
      });
    }

    const createdTags = newTags.filter(t => !data.tags.find(ot => ot.id === t.id));

    const newInvoices = [...data.invoices];
    const srcIdx = newInvoices.findIndex(inv => inv.id === invoiceId);
    if (srcIdx === -1) return;
    let srcInv = newInvoices[srcIdx];

    const txIdx = srcInv.transactions.findIndex(t => t.id === transactionId);
    if (txIdx === -1) return;

    const txToUpdate: Transaction = {
      ...srcInv.transactions[txIdx],
      ...updatedTx,
      ...(resolvedTags ? { tags: resolvedTags } : {}),
    };

    if (updatedTx.date && updatedTx.date !== srcInv.transactions[txIdx].date) {
      const card = data.cards.find(c => c.id === srcInv.cardId);
      if (card) {
        const [y, m, d] = updatedTx.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        let targetMonth = dateObj.getMonth() + 1;
        let targetYear = dateObj.getFullYear();

        if (dateObj.getDate() > card.closureDay) {
          targetMonth += 1;
          if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
        }
        if (txToUpdate.currentInstallment && txToUpdate.currentInstallment > 1) {
          targetMonth += (txToUpdate.currentInstallment - 1);
          while (targetMonth > 12) { targetMonth -= 12; targetYear += 1; }
        }

        if (targetMonth !== srcInv.month || targetYear !== srcInv.year) {
          srcInv = { ...srcInv, transactions: srcInv.transactions.filter(t => t.id !== transactionId) };
          newInvoices[srcIdx] = srcInv;

          const tgtIdx = newInvoices.findIndex(inv => inv.cardId === card.id && inv.month === targetMonth && inv.year === targetYear);
          if (tgtIdx === -1) {
            newInvoices.push({ id: crypto.randomUUID(), cardId: card.id, month: targetMonth, year: targetYear, status: 'future', transactions: [txToUpdate] });
          } else {
            newInvoices[tgtIdx] = { ...newInvoices[tgtIdx], transactions: [...newInvoices[tgtIdx].transactions, txToUpdate] };
          }

          const newData = { ...data, invoices: newInvoices, tags: newTags };
          setDataState(newData); saveToLocal(newData);
          sb_upsertTags(createdTags);
          sb_updateInvoiceTransaction(transactionId,
            { amount: txToUpdate.amount, date: txToUpdate.date, description: txToUpdate.description, tags: txToUpdate.tags },
            { cardId: card.id, month: targetMonth, year: targetYear }
          );
          return;
        }
      }
    }

    srcInv = { ...srcInv, transactions: srcInv.transactions.map(t => t.id === transactionId ? txToUpdate : t) };
    newInvoices[srcIdx] = srcInv;
    const newData = { ...data, invoices: newInvoices, tags: newTags };
    setDataState(newData); saveToLocal(newData);
    sb_upsertTags(createdTags);
    sb_updateInvoiceTransaction(transactionId,
      { amount: txToUpdate.amount, date: txToUpdate.date, description: txToUpdate.description, tags: txToUpdate.tags }
    );
  };

  const deleteInvoiceTransaction = (_invoiceId: string, transactionId: string) => {
    let groupIdToDelete: string | undefined;
    for (const inv of data.invoices) {
      const tx = inv.transactions.find(t => t.id === transactionId);
      if (tx?.groupId) { groupIdToDelete = tx.groupId; break; }
    }

    const newInvoices = data.invoices.map(inv => ({
      ...inv,
      transactions: inv.transactions.filter(tx => {
        if (groupIdToDelete && tx.groupId === groupIdToDelete) return false;
        if (tx.id === transactionId) return false;
        return true;
      }),
    }));

    const newData = { ...data, invoices: newInvoices };
    setDataState(newData); saveToLocal(newData);
    sb_deleteInvoiceTransaction(transactionId, groupIdToDelete);
  };

  const deleteTag = (tagName: string) => {
    const newTags = data.tags.filter(t => t.name.toLowerCase() !== tagName.toLowerCase());
    const getTagName = (tid: string) => newTags.find(tag => tag.id === tid)?.name ?? tid;
    const filterTags = (tags: string[]) => tags.filter(t => getTagName(t).toLowerCase() !== tagName.toLowerCase());

    const newData = {
      ...data,
      tags: newTags,
      transactions: data.transactions.map(tx => ({ ...tx, tags: filterTags(tx.tags) })),
      invoices: data.invoices.map(inv => ({
        ...inv,
        transactions: inv.transactions.map(tx => ({ ...tx, tags: filterTags(tx.tags) })),
      })),
    };
    setDataState(newData); saveToLocal(newData);
    sb_deleteTag(tagName);
  };

  const addTransaction = (tx: Transaction) => {
    const newTags = [...data.tags];
    const resolvedIds = tx.tags.map(tagName => {
      const ext = newTags.find(t => t.name.toLowerCase() === tagName.toLowerCase() || t.id === tagName);
      if (ext) return ext.id;
      const newTag: Tag = { id: crypto.randomUUID(), name: tagName, color: '#6366F1' };
      newTags.push(newTag);
      return newTag.id;
    });

    tx.tags = resolvedIds;
    // Marca o momento exato de inserção para ordenar corretamente
    tx.createdAt = new Date().toISOString();
    const createdTags = newTags.filter(t => !data.tags.find(ot => ot.id === t.id));

    if (tx.type !== 'credit') {
      const newData = { ...data, tags: newTags, transactions: [...data.transactions, tx] };
      setDataState(newData); saveToLocal(newData);
      sb_upsertTags(createdTags).then(() => sb_addDirectTransaction(tx));
      return;
    }

    if (!tx.cardId) return;
    const card = data.cards.find(c => c.id === tx.cardId);
    if (!card) return;

    const [y, m, d] = tx.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    let invoiceMonth = dateObj.getMonth() + 1;
    let invoiceYear = dateObj.getFullYear();
    if (dateObj.getDate() > card.closureDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 12) { invoiceMonth = 1; invoiceYear += 1; }
    }

    const newInvoices = [...data.invoices];
    const groupId = crypto.randomUUID();
    const pairs: InvoiceTxPair[] = [];

    for (let i = 0; i < tx.installments; i++) {
      let targetMonth = invoiceMonth + i;
      let targetYear = invoiceYear;
      while (targetMonth > 12) { targetMonth -= 12; targetYear += 1; }

      let invoice = newInvoices.find(inv => inv.cardId === card.id && inv.month === targetMonth && inv.year === targetYear);
      if (!invoice) {
        invoice = { id: crypto.randomUUID(), cardId: card.id, month: targetMonth, year: targetYear, status: 'future', transactions: [] };
        newInvoices.push(invoice);
      }

      const installmentTx: Transaction = { ...tx, id: crypto.randomUUID(), currentInstallment: i + 1, groupId };
      invoice.transactions.push(installmentTx);
      pairs.push({ invoiceId: invoice.id, cardId: card.id, month: targetMonth, year: targetYear, status: invoice.status, tx: installmentTx });
    }

    const newData = { ...data, tags: newTags, invoices: newInvoices };
    setDataState(newData); saveToLocal(newData);
    sb_upsertTags(createdTags).then(() => sb_addInvoiceTransactions(pairs));
  };

  return (
    <DataContext.Provider value={{
      data, loading, syncStatus, setData,
      addTransaction, addCard, updateCard,
      updateInvoiceStatus, updateInvoiceTransaction,
      deleteInvoiceTransaction, deleteTag, deleteCard,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
