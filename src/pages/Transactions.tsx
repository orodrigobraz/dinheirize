import React, { useState, useCallback } from 'react';
import { useData } from '../hooks/useData';
import type { Transaction } from '../types/finance';
import { getTagColor } from '../utils/tagColor';
import { Toast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

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

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  // Modal de confirmação para excluir tag
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  // Guarda a última transação adicionada nesta sessão para exibição super imediata e 100% perfeita
  const [lastAddedTx, setLastAddedTx] = useState<{ tx: Transaction; cardName?: string } | null>(null);

  // Dado um cartão e um mês/ano, avança até o primeiro mês não pago e alerta o usuário
  const aplicarProximoMesNaoPago = (cId: string, mesInicial: number, anoInicial: number, isManualChange: boolean = false) => {
    let m = mesInicial;
    let y = anoInicial;
    for (let i = 0; i < 24; i++) {
      const inv = data.invoices.find(inv => inv.cardId === cId && inv.month === m && inv.year === y);
      if (!inv || inv.status !== 'paid') break;
      m++;
      if (m > 12) { m = 1; y++; }
    }
    setSelectedMonth(m);
    setSelectedYear(y);

    if (isManualChange && (m !== mesInicial || y !== anoInicial)) {
      setToast({ message: 'O mês escolhido já possuía uma fatura paga, avançamos para o próximo.', type: 'info' });
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    if ((type === 'credit' || type === 'debit') && !cardId) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount)) return;

    // Separar tags por vírgula ou espaço
    const tagsArr = tagsInput.split(/[\s,]+/).filter(t => t.trim() !== '');

    // Definir a data para o dia 1 do mês selecionado para cair perfeitamente na fatura alvo
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

    // Guarda a transação recém-adicionada para visualização imediata exata
    const cName = (type === 'credit' || type === 'debit')
      ? data.cards.find(c => c.id === cardId)?.name
      : undefined;
    setLastAddedTx({ tx: newTx, cardName: cName });

    // Limpar formulário
    setAmount('');
    setDescription('');
    setTagsInput('');
    setInstallments('1');

    // Exibir toast de sucesso
    setToast({ message: 'Despesa adicionada com sucesso!', type: 'success' });
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
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}

      {tagToDelete && (
        <ConfirmModal
          title="Excluir Tag"
          message={`Deseja realmente apagar a tag "${tagToDelete}" definitivamente? Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, excluir"
          cancelLabel="Não"
          danger
          onConfirm={() => {
            deleteTag(tagToDelete);
            setTagToDelete(null);
          }}
          onCancel={() => setTagToDelete(null)}
        />
      )}

      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Transações</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Formulário de Adicionar Transação */}
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
                <select
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={selectedMonth}
                  onChange={e => {
                    const newMonth = Number(e.target.value);
                    if ((type === 'credit' || type === 'debit') && cardId) {
                      aplicarProximoMesNaoPago(cardId, newMonth, selectedYear, true);
                    } else {
                      setSelectedMonth(newMonth);
                    }
                  }}
                >
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
                <select 
                  style={{ width: '100%', boxSizing: 'border-box' }} 
                  value={selectedYear} 
                  onChange={e => {
                    const newYear = Number(e.target.value);
                    if ((type === 'credit' || type === 'debit') && cardId) {
                      aplicarProximoMesNaoPago(cardId, selectedMonth, newYear, true);
                    } else {
                      setSelectedYear(newYear);
                    }
                  }}
                >
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
                <select
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={type}
                  onChange={e => {
                    const newType = e.target.value as 'credit' | 'pix' | 'debit' | 'cash';
                    setType(newType);
                    // Auto-avança se o novo tipo usa cartão e já tem um selecionado
                    if ((newType === 'credit' || newType === 'debit') && cardId) {
                      aplicarProximoMesNaoPago(cardId, selectedMonth, selectedYear);
                    }
                  }}
                >
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
                    <select
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      value={cardId}
                      onChange={e => {
                        const newCardId = e.target.value;
                        setCardId(newCardId);
                        // Auto-avança para o próximo mês não pago deste cartão
                        if (newCardId) {
                          aplicarProximoMesNaoPago(newCardId, selectedMonth, selectedYear);
                        }
                      }}
                      required
                    >
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

            {/* Linha 4: Tags */}
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
                          onClick={() => setTagToDelete(tName)}
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

            {/* Enviar */}
            <div>
              <button type="submit" className="btn-primary" style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600 }}>
                Adicionar Despesa
              </button>
            </div>

          </form>
        </div>

        {/* Última Transação Adicionada — qualquer método */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>Última Transação Adicionada</h2>
          {(() => {
            const methodLabel: Record<string, string> = {
              credit: 'Cartão de Crédito',
              pix: 'Pix',
              debit: 'Cartão de Débito',
              cash: 'Dinheiro',
            };
            const methodColor: Record<string, string> = {
              credit: '#6366F1',
              pix: '#10B981',
              debit: '#3B82F6',
              cash: '#F59E0B',
            };

            // Prioridade: o que acabou de ser adicionado AGORA. Se recarregar a página, cai pro fallback de createdAt
            let entry: { tx: Transaction; cardName?: string } | null = lastAddedTx;

            if (!entry) {
              // Combina diretas + de faturas e ordena pelo createdAt (mais recente primeiro)
              type TxEntry = { tx: Transaction; cardName?: string };
              const seenGroups = new Set<string>();
              const all: TxEntry[] = [
                ...data.transactions.map(tx => ({ tx })),
                ...data.invoices.flatMap(inv => {
                  const card = data.cards.find(c => c.id === inv.cardId);
                  // Pega apenas a 1ª parcela de um grupo para não duplicar na exibição global
                  return inv.transactions
                    .filter(tx => {
                      const key = tx.groupId ?? tx.id;
                      if (seenGroups.has(key)) return false;
                      seenGroups.add(key);
                      return true;
                    })
                    .map(tx => ({
                      tx: { ...tx, type: 'credit' as const },
                      cardName: card?.name,
                    }));
                }),
              ];

              if (all.length > 0) {
                // Ordena com alta precisão usando epoch do timestamp (novo primeiro), fallback para date
                all.sort((a, b) => {
                  const ca = a.tx.createdAt ? new Date(a.tx.createdAt).getTime() : 0;
                  const cb = b.tx.createdAt ? new Date(b.tx.createdAt).getTime() : 0;
                  if (ca !== cb) return cb - ca;
                  return b.tx.date.localeCompare(a.tx.date);
                });
                entry = all[0];
              }
            }

            if (!entry) {
              return <p style={{ color: 'var(--text-secondary)' }}>Nenhuma transação registrada ainda.</p>;
            }

            const { tx, cardName } = entry;
            const color = methodColor[tx.type] ?? '#D4AF37';

            return (
              <div style={{
                padding: '18px',
                background: `${color}0D`,
                border: `1px solid ${color}40`,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {/* Linha 1: ponto + nome + valor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: color, flexShrink: 0,
                    boxShadow: `0 0 8px ${color}`,
                  }} />
                  <p style={{
                    fontWeight: 700, fontSize: '15px',
                    flex: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tx.description}
                  </p>
                  <span style={{ fontWeight: 800, fontSize: '18px', color: color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    R$ {tx.amount.toFixed(2)}
                  </span>
                </div>

                {/* Linha 2: badge do método + nome do cartão + parcelas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', borderRadius: '99px',
                    background: `${color}20`, border: `1px solid ${color}50`,
                    color, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    {tx.type === 'credit' && '💳'}
                    {tx.type === 'pix'    && '⚡'}
                    {tx.type === 'debit'  && '🏧'}
                    {tx.type === 'cash'   && '💵'}
                    {' '}{methodLabel[tx.type] ?? tx.type}
                  </span>
                  {cardName && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {cardName}
                    </span>
                  )}
                  {tx.installments > 1 && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                    }}>
                      {tx.installments}x
                    </span>
                  )}
                </div>

                {/* Linha 3: data */}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-4px' }}>
                  {tx.date}
                </p>

                {/* Tags */}
                {tx.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
