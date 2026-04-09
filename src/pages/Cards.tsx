import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import type { Card } from '../types/finance';

export const Cards: React.FC = () => {
  const { data, addCard, updateCard, deleteCard } = useData();

  const [cardName, setCardName] = useState('');
  const [closureDay, setClosureDay] = useState(24);
  const [dueDay, setDueDay] = useState(1);
  const [validity, setValidity] = useState('');
  const [isCredit, setIsCredit] = useState(true);
  const [isDebit, setIsDebit] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const handleValidityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2)}`;
    setValidity(val);
  };

  const handleDueDayChange = (newDueDay: number) => {
    setDueDay(newDueDay);
    let calcClosure = newDueDay - 7;
    if (calcClosure <= 0) calcClosure += 30;
    setClosureDay(calcClosure);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) return;

    if (validity.length === 5) {
      const [month, year] = validity.split('/');
      const currentYear = Number(new Date().getFullYear().toString().slice(-2));
      if (Number(year) < currentYear) {
        alert("O ano de validade não pode ser inferior ao ano atual.");
        return;
      }
      if (Number(month) < 1 || Number(month) > 12) {
        alert("O mês de validade é inválido. Use um formato entre 01 e 12.");
        return;
      }
    }

    const cardType = (isCredit && isDebit) ? 'both' : (isCredit ? 'credit' : 'debit');

    if (editingCardId) {
      updateCard({
        id: editingCardId,
        name: cardName,
        closureDay: Number(closureDay),
        dueDay: Number(dueDay),
        validity: validity || undefined,
        cardType
      });
      setEditingCardId(null);
    } else {
      addCard({
        id: crypto.randomUUID(),
        name: cardName,
        closureDay: Number(closureDay),
        dueDay: Number(dueDay),
        validity: validity || undefined,
        cardType
      });
    }

    setCardName('');
    setDueDay(1);
    setClosureDay(24);
    setValidity('');
    setIsCredit(true);
    setIsDebit(false);
  };

  const handleEditClick = (c: Card, e: React.MouseEvent) => {
    e.preventDefault();
    setEditingCardId(c.id);
    setCardName(c.name);
    setDueDay(c.dueDay);
    setClosureDay(c.closureDay);
    setValidity(c.validity || '');
    
    // Default to credit only if old card had no type
    const t = c.cardType || 'credit';
    setIsCredit(t === 'credit' || t === 'both');
    setIsDebit(t === 'debit' || t === 'both');
  };

  const cancelEdit = () => {
    setEditingCardId(null);
    setCardName('');
    setDueDay(1);
    setClosureDay(24);
    setValidity('');
    setIsCredit(true);
    setIsDebit(false);
  };

  const handleDeleteCard = () => {
    if (!editingCardId) return;
    if (window.confirm("Atenção: Ao excluir este cartão, TODAS as faturas, parcelamentos e informações atreladas a ele serão apagadas. Você tem certeza?")) {
      deleteCard(editingCardId);
      cancelEdit();
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Gerenciar Cartões</h1>

      <div className="grid-1-2">
        
        {/* Formulário */}
        <div>
          <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '24px' }}>
              {editingCardId ? 'Editar Cartão' : 'Adicionar Cartão'}
            </h2>
            <form onSubmit={handleCreateCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Nome do Cartão (Instituição)</label>
                <input 
                  type="text" className="w-full"
                  value={cardName} onChange={e => setCardName(e.target.value)}
                  placeholder="Ex: Nubank, Itaú..." required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Dia do Vencimento</label>
                  <input 
                    type="number" min="1" max="31" className="w-full"
                    value={dueDay} onChange={e => handleDueDayChange(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Validade (Opcional)</label>
                  <input 
                    type="text" className="w-full"
                    maxLength={5}
                    value={validity} onChange={handleValidityChange}
                    placeholder="MM/AA"
                  />
                </div>
              </div>
              <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Função do Cartão</label>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="checkbox" required={!isCredit && !isDebit} checked={isCredit} 
                      onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Marque crédito, débito ou ambos se quiser continuar')}
                      onChange={e => { setIsCredit(e.target.checked); (e.target as HTMLInputElement).setCustomValidity(''); }} 
                      style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }} /> Crédito
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input type="checkbox" required={!isCredit && !isDebit} checked={isDebit} 
                      onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Marque crédito, débito ou ambos se quiser continuar')}
                      onChange={e => { setIsDebit(e.target.checked); (e.target as HTMLInputElement).setCustomValidity(''); }} 
                      style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }} /> Débito
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, minWidth: '150px' }}>
                  {editingCardId ? 'Salvar Alterações' : 'Adicionar Cartão'}
                </button>
                {editingCardId && (
                  <>
                    <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancelar</button>
                    <button type="button" className="btn-ghost" onClick={handleDeleteCard} style={{ color: '#EF4444' }}>Excluir</button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Lista Visual de Cartões */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', alignContent: 'start' }}>
          {data.cards.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum cartão cadastrado ainda.</p>
          ) : (
            data.cards.map((c: Card) => (
              <div 
                key={c.id} 
                className="glass-panel"
                style={{ 
                  borderRadius: '16px', 
                  padding: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  boxShadow: 'var(--shadow-lg)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
                    {c.name}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(c.cardType === 'credit' || c.cardType === 'both' || !c.cardType) && (
                      <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                        CRÉDITO
                      </div>
                    )}
                    {(c.cardType === 'debit' || c.cardType === 'both') && (
                      <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                        DÉBITO
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Fechamento</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Dia {c.closureDay.toString().padStart(2, '0')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Vencimento</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Dia {c.dueDay.toString().padStart(2, '0')}</div>
                  </div>
                  {c.validity && (
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Validade</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{c.validity}</div>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={(e) => handleEditClick(c, e)} 
                    style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    Editar Informações
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
