import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import type { Transaction } from '../types/finance';
import { getTagColor } from '../utils/tagColor';

export const Transactions: React.FC = () => {
  const { data, addTransaction, deleteTag } = useData();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [type, setType] = useState<'credit' | 'pix' | 'debit' | 'cash'>('credit');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [tagsInput, setTagsInput] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    if ((type === 'credit' || type === 'debit') && !cardId) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount)) return;

    // Split tags by comma or space
    const tagsArr = tagsInput.split(/[\s,]+/).filter(t => t.trim() !== '');

    // Set the date to the 1st of the selected month so it perfectly falls into the target invoice
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      amount: parsedAmount,
      description,
      date: dateStr,
      type,
      tags: tagsArr,
      installments: type === 'credit' ? (Number(installments) || 1) : 1,
      ...((type === 'credit' || type === 'debit') ? { cardId } : {})
    };

    addTransaction(newTx);

    // Reset Form
    setAmount('');
    setDescription('');
    setTagsInput('');
    setInstallments('1');
  };

  const handleAppendTag = (tagName: string) => {
    const currentTags = tagsInput.split(/[\s,]+/).filter(t => t.trim() !== '');
    if (!currentTags.includes(tagName)) {
      setTagsInput([...currentTags, tagName].join(' ') + ' ');
    }
  };

  const getTagName = (tidOrName: string) => {
    const t = data.tags.find(tag => tag.id === tidOrName);
    return t ? t.name : tidOrName;
  };

  const uniqueTagsSet = new Set<string>();
  data.tags.forEach(t => uniqueTagsSet.add(t.name));
  data.transactions.forEach(tx => tx.tags.forEach(t => uniqueTagsSet.add(getTagName(t))));
  data.invoices.forEach(inv => inv.transactions.forEach(tx => tx.tags.forEach(t => uniqueTagsSet.add(getTagName(t)))));
  const uniqueTagsList = Array.from(uniqueTagsSet).filter(t => t.trim() !== '');

  return (
    <div>
      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Transações</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Add Transaction Form */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Nova Despesa</h2>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Linha 1: Valor · Descrição · Mês · Ano */}
            <div className="form-grid-4">
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Valor (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => {
                    const allowed = ['Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','Home','End'];
                    if (allowed.includes(e.key)) return;
                    if (/^[0-9.,]$/.test(e.key)) return;
                    e.preventDefault();
                  }}
                  placeholder="0,00"
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Mercado, Uber, assinatura..."
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Mês de Referência</label>
                <select style={{ width: '100%', boxSizing: 'border-box' }} value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                  <option value={1}>Janeiro</option>
                  <option value={2}>Fevereiro</option>
                  <option value={3}>Março</option>
                  <option value={4}>Abril</option>
                  <option value={5}>Maio</option>
                  <option value={6}>Junho</option>
                  <option value={7}>Julho</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Setembro</option>
                  <option value={10}>Outubro</option>
                  <option value={11}>Novembro</option>
                  <option value={12}>Dezembro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Ano</label>
                <select style={{ width: '100%', boxSizing: 'border-box' }} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                  {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linha 2: Método · Cartão · Parcelas */}
            <div className={type === 'credit' ? 'form-grid-3' : (type === 'debit' ? 'form-grid-2' : 'form-grid-1')}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Método de Pagamento</label>
                <select style={{ width: '100%', boxSizing: 'border-box' }} value={type} onChange={e => setType(e.target.value as 'credit' | 'pix' | 'debit' | 'cash')}>
                  <option value="credit">Cartão de Crédito</option>
                  <option value="pix">Pix</option>
                  <option value="debit">Cartão de Débito</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>
              {(type === 'credit' || type === 'debit') && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Cartão Selecionado</label>
                    <select style={{ width: '100%', boxSizing: 'border-box' }} value={cardId} onChange={e => setCardId(e.target.value)} required>
                      <option value="">Selecione um Cartão</option>
                      {data.cards
                        .filter(c => type === 'credit' ? (c.cardType === 'credit' || c.cardType === 'both' || !c.cardType) : (c.cardType === 'debit' || c.cardType === 'both'))
                        .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  {type === 'credit' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Parcelas</label>
                      <input
                        type="number" min="1"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        value={installments} onChange={e => setInstallments(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Row 4: Tags */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tags (separadas por espaço/vírgula)</label>
              <input
                type="text"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={tagsInput} onChange={e => setTagsInput(e.target.value)}
                placeholder="Ex: Alimentação, Transporte..."
              />
              {uniqueTagsList.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {uniqueTagsList.map(tName => {
                    const tagColor = getTagColor(tName, data.tags);
                    return (
                      <div key={tName} style={{ display: 'flex', alignItems: 'stretch' }}>
                        <button
                          type="button"
                          onClick={() => handleAppendTag(tName)}
                          className="tag"
                          style={{
                            borderLeft: `3px solid ${tagColor}`,
                            cursor: 'pointer',
                            background: `${tagColor}18`,
                            color: tagColor,
                            fontWeight: 600,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            paddingRight: '8px',
                          }}
                        >
                          + {tName}
                        </button>
                        <button
                          type="button"
                          onClick={() => { if(window.confirm(`Apagar a tag "${tName}" definitivamente?`)) deleteTag(tName); }}
                          style={{ background: `${tagColor}18`, color: 'var(--danger)', padding: '0 8px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', borderLeft: `1px solid ${tagColor}30`, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}
                          title="Apagar Tag Definitivamente"
                        >✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', display: 'block' }}>
                As tags serão criadas automaticamente caso não existam.
              </span>
            </div>

            {/* Submit */}
            <div>
              <button type="submit" className="btn-primary" style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600 }}>
                Adicionar Despesa
              </button>
            </div>

          </form>
        </div>

        {/* Recent Transactions — last added */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Última Transação Adicionada</h2>
          {data.transactions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Nenhuma despesa direta encontrada.</p>
          ) : (() => {
            const tx = data.transactions[data.transactions.length - 1];
            const methodLabel: Record<string, string> = { credit: 'Cartão de Crédito', pix: 'Pix', debit: 'Débito', cash: 'Dinheiro' };
            return (
              <div style={{
                padding: '20px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#6366F1', flexShrink: 0,
                      boxShadow: '0 0 8px #6366F1',
                    }} />
                    <p style={{ fontWeight: 700, fontSize: '16px' }}>{tx.description}</p>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', paddingLeft: '18px' }}>
                    {tx.date} &bull; {methodLabel[tx.type] ?? tx.type}
                    {tx.installments > 1 && ` • ${tx.installments}x`}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '18px' }}>
                    {tx.tags.map(tid => {
                      const t = data.tags.find(tag => tag.id === tid);
                      if (!t) return null;
                      const tagColor = getTagColor(t.name, data.tags);
                      return (
                        <span key={tid} className="tag" style={{ borderLeft: `3px solid ${tagColor}`, padding: '2px 7px', background: `${tagColor}18`, color: tagColor, fontWeight: 600, fontSize: '10px' }}>
                          {t.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div style={{
                  fontWeight: 800, fontSize: '22px',
                  color: 'var(--text-primary)', whiteSpace: 'nowrap',
                }}>
                  R$ {tx.amount.toFixed(2)}
                </div>
              </div>
            );
          })()}

          {data.transactions.length > 1 && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '14px', textAlign: 'right' }}>
              + {data.transactions.length - 1} transaç{data.transactions.length - 1 === 1 ? 'ão anterior' : 'ões anteriores'} diretas registradas.
            </p>
          )}

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>
            Nota: Compras via Cartão de Crédito aparecem nas Faturas da aba correspondente.
          </p>
        </div>
      </div>
    </div>
  );
};
