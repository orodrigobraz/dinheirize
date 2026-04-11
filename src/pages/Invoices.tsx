import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import type { Invoice } from '../types/finance';
import { isWeekend, addDays, format } from 'date-fns';
import { Trash2, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getTagColor } from '../utils/tagColor';

export const Invoices: React.FC = () => {
  const { data, updateInvoiceStatus, updateInvoiceTransaction, deleteInvoiceTransaction } = useData();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Todos os Meses
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'paid' | 'future'>('all');
  
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxTags, setEditTxTags] = useState('');
  const [editTxDate, setEditTxDate] = useState('');

  // States for Accordion (Expanded Invoices)
  const [expandedInvoices, setExpandedInvoices] = useState<string[]>([]);

  const toggleInvoice = (invoiceId: string) => {
    setExpandedInvoices(prev => 
      prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const yearsSet = new Set<number>([new Date().getFullYear()]);
  data.invoices.forEach(inv => yearsSet.add(inv.year));
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Filter Invoices
  const filteredInvoices = data.invoices.filter(inv => {
    if (inv.year !== selectedYear) return false;
    if (selectedMonth !== 0 && inv.month !== selectedMonth) return false;
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => b.month - a.month); // Descending by month

  // We want to group the filtered invoices by Month explicitly.
  const groupedByMonth = filteredInvoices.reduce((acc, inv) => {
    if (!acc[inv.month]) acc[inv.month] = [];
    acc[inv.month].push(inv);
    return acc;
  }, {} as Record<number, Invoice[]>);

  const monthsToRender = Object.keys(groupedByMonth)
    .map(Number)
    .sort((a, b) => b - a); // Descending months

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Faturas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visualize o peso de todos os seus cartões organizados pelo tempo.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '32px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="w-full-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Filtros:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ano:</label>
          <select 
            value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Mês:</label>
          <select 
            value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}
          >
            <option value={0}>Todos os Meses</option>
            {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Status:</label>
          <select 
            value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}
          >
            <option value="all">Todas as Faturas</option>
            <option value="open">Abertas</option>
            <option value="paid">Pagas</option>
            <option value="future">Futuras</option>
          </select>
        </div>
      </div>

      {monthsToRender.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-secondary)' }}>
          Nenhuma fatura encontrada com os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {monthsToRender.map(month => {
            const monthlyInvoices = groupedByMonth[month];
            const sumOfMonth = monthlyInvoices.reduce((monthAcc, inv) => 
               monthAcc + inv.transactions.reduce((acc, tx) => acc + tx.amount, 0), 0
            );

            return (
              <div key={month} style={{ borderLeft: '4px solid var(--accent-primary)', paddingLeft: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{monthNames[month - 1]} {selectedYear}</h2>
                  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>
                    Total: <br className="hide-desktop" /> <span style={{ whiteSpace: 'nowrap' }}>R$ {sumOfMonth.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid-invoices">
                  {monthlyInvoices.map((inv: Invoice) => {
                    const card = data.cards.find(c => c.id === inv.cardId);
                    const total = inv.transactions.reduce((acc, tx) => acc + tx.amount, 0);
                    const isExpanded = expandedInvoices.includes(inv.id);

                    let dueDateStr = '';
                    if (card) {
                      let baseDueDate = new Date(inv.year, inv.month - 1, card.dueDay);
                      while (isWeekend(baseDueDate)) {
                        baseDueDate = addDays(baseDueDate, 1);
                      }
                      dueDateStr = format(baseDueDate, 'dd/MM/yyyy');
                    }

                    return (
                      <div key={inv.id} className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                        {/* Header da Fatura (Clicável) */}
                        <div 
                          style={{ padding: '16px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background 0.2s' }}
                          onClick={() => toggleInvoice(inv.id)}
                        >
                          <div className="hide-mobile" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                            {card?.name.charAt(0).toUpperCase()}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px', minWidth: 0 }}>
                            {/* Linha 1: Nome do Cartão --- Situação */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <div style={{ fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card?.name}</div>
                              <select 
                                value={inv.status}
                                onChange={(e) => { e.stopPropagation(); updateInvoiceStatus(inv.id, e.target.value as any); }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ 
                                  padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, textAlign: 'center', letterSpacing: '0.5px',
                                  background: inv.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : inv.status === 'open' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: inv.status === 'paid' ? '#10B981' : inv.status === 'open' ? '#F59E0B' : '#EF4444',
                                  border: `1px solid ${inv.status === 'paid' ? 'rgba(16, 185, 129, 0.3)' : inv.status === 'open' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, 
                                  cursor: 'pointer', appearance: 'none', outline: 'none', flexShrink: 0
                                }}
                              >
                                <option value="future" style={{ background: '#EF4444', color: '#FFFFFF', fontWeight: 600 }}>FUTURA</option>
                                <option value="open" style={{ background: '#F59E0B', color: '#FFFFFF', fontWeight: 600 }}>ABERTA</option>
                                <option value="paid" style={{ background: '#10B981', color: '#FFFFFF', fontWeight: 600 }}>PAGA</option>
                              </select>
                            </div>
                            
                            {/* Linha 2: Vencimento --- Valor */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}>Venc. {dueDateStr}</div>
                              <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>R$ {total.toFixed(2)}</div>
                            </div>
                          </div>

                          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>

                        {/* Extrato Detalhado (Mostrado apenas se expandido) */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                            {inv.transactions.length === 0 ? (
                              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                Fatura vazia.
                              </div>
                            ) : (
                              <>
                                {/* ── Gráfico de distribuição por tag ── */}
                                {(() => {
                                  const tagTotals: Record<string, { name: string; value: number }> = {};
                                  inv.transactions.forEach(tx => {
                                    if (!tx.tags || tx.tags.length === 0) {
                                      tagTotals['__sem_tag__'] = tagTotals['__sem_tag__'] || { name: 'Sem tag', value: 0 };
                                      tagTotals['__sem_tag__'].value += tx.amount;
                                    } else {
                                      tx.tags.forEach(tid => {
                                        const tag = data.tags.find(t => t.id === tid);
                                        const name = tag?.name ?? tid;
                                        tagTotals[tid] = tagTotals[tid] || { name, value: 0 };
                                        tagTotals[tid].value += tx.amount;
                                      });
                                    }
                                  });
                                  const chartData = Object.values(tagTotals)
                                    .sort((a, b) => b.value - a.value)
                                    .map(entry => ({
                                      ...entry,
                                      color: entry.name === 'Sem tag' ? '#64748B' : getTagColor(entry.name, data.tags),
                                    }));
                                  const invoiceTotal = inv.transactions.reduce((s, t) => s + t.amount, 0);
                                  return (
                                    <div style={{
                                      padding: '20px 24px',
                                      borderBottom: '1px solid var(--border)',
                                      background: 'rgba(255,255,255,0.015)',
                                      display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
                                    }}>
                                      <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                          <PieChart>
                                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value">
                                              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip formatter={(value: unknown) => [`R$ ${Number(value).toFixed(2)}`, '']} contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                                          </PieChart>
                                        </ResponsiveContainer>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' }}>
                                        {chartData.map((entry, i) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                                              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{entry.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{((entry.value / invoiceTotal) * 100).toFixed(0)}%</span>
                                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '70px', textAlign: 'right' }}>R$ {entry.value.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Lista de transações */}
                                <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {inv.transactions.map(tx => {
                                  if (editingTxId === tx.id) {
                                    return (
                                      <div key={tx.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'var(--bg-panel-hover)', borderRadius: '12px', border: '1px solid var(--border-focus)' }}>
                                        
                                        <div className="form-grid-invoice">
                                          <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Data</label>
                                            <input 
                                              type="date" style={{ padding: '10px 12px', width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                              value={editTxDate} onChange={e => setEditTxDate(e.target.value)} 
                                            />
                                          </div>
                                          <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Descrição</label>
                                            <input 
                                              type="text" style={{ padding: '10px 12px', width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                              value={editTxDesc} onChange={e => setEditTxDesc(e.target.value)} 
                                              placeholder="Nome da transação"
                                            />
                                          </div>
                                          <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Tags</label>
                                            <input 
                                              type="text" style={{ padding: '10px 12px', width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                              value={editTxTags} onChange={e => setEditTxTags(e.target.value)} 
                                              placeholder="Supermercado, Lazer..."
                                            />
                                          </div>
                                          <div>
                                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Valor (R$)</label>
                                            <input 
                                              type="number" step="0.01" style={{ padding: '10px 12px', width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                                              value={editTxAmount} onChange={e => setEditTxAmount(e.target.value)} 
                                              placeholder="0,00"
                                            />
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                          {tx.installments > 1 ? (
                                            <div style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 500, flex: 1 }}>
                                              ⚠️ Aviso: ao apagar, todas as {tx.installments} parcelas associadas serão excluídas do sistema.
                                            </div>
                                          ) : <div style={{ flex: 1 }}></div>}
                                          
                                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <button 
                                              className="btn-ghost" style={{ padding: '8px', color: 'var(--danger)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                              onClick={() => {
                                                deleteInvoiceTransaction(inv.id, tx.id);
                                                setEditingTxId(null);
                                              }}
                                              title="Apagar transação permanentemente"
                                            >
                                              <Trash2 size={18} />
                                            </button>
                                            <button className="btn-ghost" style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => setEditingTxId(null)}>
                                              Cancelar
                                            </button>
                                            <button 
                                              className="btn-primary" style={{ padding: '8px 24px', borderRadius: '8px', fontWeight: 600 }}
                                              onClick={() => {
                                                updateInvoiceTransaction(inv.id, tx.id, {
                                                  description: editTxDesc,
                                                  amount: parseFloat(editTxAmount) || tx.amount,
                                                  tags: editTxTags.split(/[\s,]+/).filter(t => t.trim() !== ''),
                                                  date: editTxDate || tx.date
                                                });
                                                setEditingTxId(null);
                                              }}
                                            >
                                              Salvar Alterações
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={tx.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                      {/* Linha Superior: Nome, Tags, Editar */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {tx.description}
                                          </span>
                                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                            {tx.tags?.map(tid => {
                                              const t = data.tags?.find(tag => tag.id === tid);
                                              const tagName = t ? t.name : tid;
                                              const tagColor = getTagColor(tagName, data.tags);
                                              return t ? (
                                                <span
                                                  key={tid}
                                                  className="tag"
                                                  style={{
                                                    borderLeft: `3px solid ${tagColor}`,
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    background: `${tagColor}18`,
                                                    color: tagColor,
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  {t.name}
                                                </span>
                                              ) : null;
                                            })}
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            setEditingTxId(tx.id);
                                            setEditTxDesc(tx.description);
                                            setEditTxAmount(tx.amount.toString());
                                            setEditTxDate(tx.date || '');
                                            
                                            const tagNames = (tx.tags || []).map(tid => {
                                              const t = data.tags.find(tag => tag.id === tid);
                                              return t ? t.name : tid;
                                            }).join(' ');
                                            setEditTxTags(tagNames);
                                          }}
                                          style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600, opacity: 0.8, flexShrink: 0 }}
                                        >
                                          EDITAR
                                        </button>
                                      </div>
                                      
                                      {/* Linha Inferior: Data, Parcelas, Valor */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                          <span>{tx.date}</span>
                                          {tx.installments > 1 && (
                                            <span style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                                              Parcela {tx.currentInstallment}/{tx.installments}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                          R$ {tx.amount.toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
