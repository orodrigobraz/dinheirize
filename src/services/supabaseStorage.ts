import { supabase } from '../lib/supabase';
import type { AppData, Card, Tag, Transaction, Invoice, InvoiceStatus } from '../types/finance';

// ─── Auth helper ──────────────────────────────────────────────────────────────

const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mapCard = (c: Record<string, unknown>): Card => ({
  id: c.id as string,
  name: c.name as string,
  closureDay: c.closure_day as number,
  dueDay: c.due_day as number,
  validity: c.validity as string | undefined,
  cardType: c.card_type as 'credit' | 'debit' | 'both' | undefined,
});

const mapTag = (t: Record<string, unknown>): Tag => ({
  id: t.id as string,
  name: t.name as string,
  color: t.color as string,
});

const mapTx = (t: Record<string, unknown>): Transaction => ({
  id: t.id as string,
  amount: Number(t.amount),
  date: t.date as string,
  description: t.description as string,
  type: t.type as Transaction['type'],
  tags: ((t.transaction_tags as { tag_id: string }[]) || []).map(tt => tt.tag_id),
  cardId: (t.card_id as string) ?? undefined,
  installments: t.installments as number,
  currentInstallment: (t.current_installment as number) ?? undefined,
  groupId: (t.group_id as string) ?? undefined,
});

const mapInvTx = (t: Record<string, unknown>, cardId: string): Transaction => ({
  id: t.id as string,
  amount: Number(t.amount),
  date: t.date as string,
  description: t.description as string,
  type: t.type as Transaction['type'],
  tags: ((t.invoice_transaction_tags as { tag_id: string }[]) || []).map(tt => tt.tag_id),
  cardId,
  installments: t.installments as number,
  currentInstallment: (t.current_installment as number) ?? undefined,
  groupId: (t.group_id as string) ?? undefined,
});

// ─── Load ─────────────────────────────────────────────────────────────────────

export const loadFromSupabase = async (): Promise<AppData | null> => {
  try {
    const [
      { data: cardsRaw, error: e1 },
      { data: tagsRaw, error: e2 },
      { data: txRaw, error: e3 },
      { data: invRaw, error: e4 },
    ] = await Promise.all([
      supabase.from('cards').select('*').order('created_at'),
      supabase.from('tags').select('*').order('name'),
      supabase.from('transactions').select('*, transaction_tags(tag_id)').order('date'),
      supabase
        .from('invoices')
        .select('*, invoice_transactions(*, invoice_transaction_tags(tag_id))')
        .order('year')
        .order('month'),
    ]);

    if (e1 || e2 || e3 || e4) {
      console.error('Supabase load errors:', { e1, e2, e3, e4 });
      return null;
    }

    const cards = (cardsRaw || []).map(c => mapCard(c as Record<string, unknown>));
    const tags = (tagsRaw || []).map(t => mapTag(t as Record<string, unknown>));
    const transactions = (txRaw || []).map(t => mapTx(t as Record<string, unknown>));
    const invoices: Invoice[] = (invRaw || [])
      .map(inv => ({
        id: inv.id as string,
        cardId: inv.card_id as string,
        month: inv.month as number,
        year: inv.year as number,
        status: inv.status as InvoiceStatus,
        transactions: ((inv.invoice_transactions as Record<string, unknown>[]) || []).map(t =>
          mapInvTx(t, inv.card_id as string)
        ),
      }))
      .filter(inv => inv.transactions.length > 0);

    return { version: '1.0', cards, tags, transactions, invoices };
  } catch (e) {
    console.error('loadFromSupabase failed:', e);
    return null;
  }
};

// ─── Full sync (wipe + re-insert all data for this user) ─────────────────────

export const fullSyncToSupabase = async (data: AppData): Promise<void> => {
  const userId = await getUserId();
  if (!userId) { console.error('fullSyncToSupabase: no user'); return; }

  try {
    // Delete only current user's data (RLS + user_id filter)
    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('invoices').delete().eq('user_id', userId);  // cascades invoice_transactions + tags
    await supabase.from('cards').delete().eq('user_id', userId);
    await supabase.from('tags').delete().eq('user_id', userId);

    if (data.cards.length > 0) {
      await supabase.from('cards').insert(
        data.cards.map(c => ({ id: c.id, name: c.name, closure_day: c.closureDay, due_day: c.dueDay, validity: c.validity, card_type: c.cardType, user_id: userId }))
      );
    }
    if (data.tags.length > 0) {
      await supabase.from('tags').insert(
        data.tags.map(t => ({ id: t.id, name: t.name, color: t.color, user_id: userId }))
      );
    }
    for (const tx of data.transactions) {
      await supabase.from('transactions').insert({
        id: tx.id, amount: tx.amount, date: tx.date, description: tx.description,
        type: tx.type, installments: tx.installments,
        current_installment: tx.currentInstallment ?? null,
        group_id: tx.groupId ?? null, card_id: null, user_id: userId,
      });
      if (tx.tags.length > 0) {
        await supabase.from('transaction_tags').insert(
          tx.tags.map(tagId => ({ transaction_id: tx.id, tag_id: tagId }))
        );
      }
    }
    for (const inv of data.invoices) {
      await supabase.from('invoices').insert({
        id: inv.id, card_id: inv.cardId, month: inv.month, year: inv.year, status: inv.status, user_id: userId,
      });
      for (const tx of inv.transactions) {
        await supabase.from('invoice_transactions').insert({
          id: tx.id, invoice_id: inv.id, amount: tx.amount, date: tx.date,
          description: tx.description, type: tx.type, installments: tx.installments,
          current_installment: tx.currentInstallment ?? null, group_id: tx.groupId ?? null,
        });
        if (tx.tags.length > 0) {
          await supabase.from('invoice_transaction_tags').insert(
            tx.tags.map(tagId => ({ invoice_transaction_id: tx.id, tag_id: tagId }))
          );
        }
      }
    }
  } catch (e) {
    console.error('fullSyncToSupabase failed:', e);
    throw e;
  }
};

// ─── Cards ────────────────────────────────────────────────────────────────────

export const sb_addCard = async (card: Card) => {
  const userId = await getUserId();
  const { error } = await supabase.from('cards').insert({
    id: card.id, name: card.name, closure_day: card.closureDay, due_day: card.dueDay, validity: card.validity, card_type: card.cardType, user_id: userId,
  });
  if (error) console.error('sb_addCard:', error);
};

export const sb_updateCard = async (card: Card) => {
  const { error } = await supabase.from('cards')
    .update({ name: card.name, closure_day: card.closureDay, due_day: card.dueDay, validity: card.validity, card_type: card.cardType })
    .eq('id', card.id);
  if (error) console.error('sb_updateCard:', error);
};

export const sb_deleteCard = async (cardId: string) => {
  const { error: e1 } = await supabase.from('invoices').delete().eq('card_id', cardId);
  const { error: e2 } = await supabase.from('cards').delete().eq('id', cardId);
  if (e1 || e2) console.error('sb_deleteCard:', { e1, e2 });
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const sb_upsertTags = async (tags: Tag[]) => {
  if (tags.length === 0) return;
  const userId = await getUserId();
  const { error } = await supabase.from('tags')
    .upsert(tags.map(t => ({ id: t.id, name: t.name, color: t.color, user_id: userId })), { onConflict: 'id' });
  if (error) console.error('sb_upsertTags:', error);
};

export const sb_deleteTag = async (tagName: string) => {
  const { error } = await supabase.from('tags').delete().ilike('name', tagName);
  if (error) console.error('sb_deleteTag:', error);
};

// ─── Direct transactions ──────────────────────────────────────────────────────

export const sb_addDirectTransaction = async (tx: Transaction) => {
  const userId = await getUserId();
  const { error } = await supabase.from('transactions').insert({
    id: tx.id, amount: tx.amount, date: tx.date, description: tx.description,
    type: tx.type, installments: tx.installments,
    current_installment: tx.currentInstallment ?? null,
    group_id: tx.groupId ?? null, card_id: null, user_id: userId,
  });
  if (error) { console.error('sb_addDirectTransaction:', error); return; }
  if (tx.tags.length > 0) {
    const { error: te } = await supabase.from('transaction_tags').insert(
      tx.tags.map(tagId => ({ transaction_id: tx.id, tag_id: tagId }))
    );
    if (te) console.error('sb_addDirectTransaction tags:', te);
  }
};

// ─── Invoice transactions ─────────────────────────────────────────────────────

export type InvoiceTxPair = {
  invoiceId: string;
  cardId: string;
  month: number;
  year: number;
  status: InvoiceStatus;
  tx: Transaction;
};

export const sb_addInvoiceTransactions = async (pairs: InvoiceTxPair[]) => {
  const userId = await getUserId();
  for (const { invoiceId, cardId, month, year, status, tx } of pairs) {
    await supabase.from('invoices').upsert(
      { id: invoiceId, card_id: cardId, month, year, status, user_id: userId },
      { onConflict: 'card_id,month,year' }
    );
    const { data: inv } = await supabase.from('invoices').select('id')
      .eq('card_id', cardId).eq('month', month).eq('year', year).single();
    const realInvoiceId = inv?.id ?? invoiceId;

    const { error: te } = await supabase.from('invoice_transactions').insert({
      id: tx.id, invoice_id: realInvoiceId, amount: tx.amount, date: tx.date,
      description: tx.description, type: tx.type, installments: tx.installments,
      current_installment: tx.currentInstallment ?? null, group_id: tx.groupId ?? null,
    });
    if (te) { console.error('sb_addInvoiceTransactions tx:', te); continue; }

    if (tx.tags.length > 0) {
      await supabase.from('invoice_transaction_tags').insert(
        tx.tags.map(tagId => ({ invoice_transaction_id: tx.id, tag_id: tagId }))
      );
    }
  }
};

// ─── Invoice status ───────────────────────────────────────────────────────────

export const sb_updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId);
  if (error) console.error('sb_updateInvoiceStatus:', error);
};

// ─── Update invoice transaction ───────────────────────────────────────────────

export const sb_updateInvoiceTransaction = async (
  txId: string,
  fields: { amount: number; date: string; description: string; tags: string[] },
  moveToInvoice?: { cardId: string; month: number; year: number }
) => {
  const userId = await getUserId();
  let invoiceId: string | undefined;

  if (moveToInvoice) {
    await supabase.from('invoices').upsert(
      { card_id: moveToInvoice.cardId, month: moveToInvoice.month, year: moveToInvoice.year, status: 'future', user_id: userId },
      { onConflict: 'card_id,month,year' }
    );
    const { data: inv } = await supabase.from('invoices').select('id')
      .eq('card_id', moveToInvoice.cardId).eq('month', moveToInvoice.month).eq('year', moveToInvoice.year).single();
    invoiceId = inv?.id;
  }

  const payload: Record<string, unknown> = {
    amount: fields.amount, date: fields.date, description: fields.description,
  };
  if (invoiceId) payload.invoice_id = invoiceId;

  const { error } = await supabase.from('invoice_transactions').update(payload).eq('id', txId);
  if (error) { console.error('sb_updateInvoiceTransaction:', error); return; }

  await supabase.from('invoice_transaction_tags').delete().eq('invoice_transaction_id', txId);
  if (fields.tags.length > 0) {
    await supabase.from('invoice_transaction_tags').insert(
      fields.tags.map(tagId => ({ invoice_transaction_id: txId, tag_id: tagId }))
    );
  }
};

// ─── Delete invoice transaction(s) ───────────────────────────────────────────

export const sb_deleteInvoiceTransaction = async (txId: string, groupId?: string) => {
  if (groupId) {
    const { error } = await supabase.from('invoice_transactions').delete().eq('group_id', groupId);
    if (error) console.error('sb_deleteInvoiceTransaction (group):', error);
  } else {
    const { error } = await supabase.from('invoice_transactions').delete().eq('id', txId);
    if (error) console.error('sb_deleteInvoiceTransaction (single):', error);
  }
};
