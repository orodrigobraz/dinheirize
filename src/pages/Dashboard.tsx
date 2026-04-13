import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { getTagColor } from '../utils/tagColor';

export const Dashboard: React.FC = () => {
  const { data } = useData();

  const currentYear = new Date().getFullYear();

  // Calcular anos disponíveis com base nos dados
  const yearsSet = new Set<number>([currentYear]);
  data.transactions.forEach(tx => yearsSet.add(new Date(tx.date).getFullYear()));
  data.invoices.forEach(inv => yearsSet.add(inv.year));
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (card: string) => setExpandedCards(prev => ({ ...prev, [card]: !prev[card] }));

  // Extrair todas as transações para o ano selecionado
  const yearTx: { desc: string; amount: number; tags: string[]; date: string }[] = [];

  // Também rastrear informações de parcelas separadamente (apenas transações de faturas)
  type TxEntry = { desc: string; amount: number; totalAmount: number; installments: number; originalInstallments: number; tags: string[]; date: string };
  const allTxEntries: TxEntry[] = [];

  data.transactions.forEach(tx => {
    if (new Date(tx.date).getFullYear() === selectedYear) {
      yearTx.push({ desc: tx.description, amount: tx.amount, tags: tx.tags, date: tx.date });
      allTxEntries.push({ desc: tx.description, amount: tx.amount, totalAmount: tx.amount, installments: 1, originalInstallments: 1, tags: tx.tags, date: tx.date });
    }
  });

  // Rastrear compras originais (agrupar parcelas por groupId ou descrição+valor para encontrar o custo total NESTE ano)
  const purchaseTotals = new Map<string, TxEntry>();
  data.invoices.forEach(inv => {
    if (inv.year === selectedYear) {
      inv.transactions.forEach(tx => {
        yearTx.push({ desc: tx.description, amount: tx.amount, tags: tx.tags, date: tx.date });
        const key = tx.groupId || `${tx.description}__${(tx.installments ?? 1)}__${tx.amount.toFixed(2)}`;
        
        if (!purchaseTotals.has(key)) {
          purchaseTotals.set(key, { 
            desc: tx.description, 
            amount: tx.amount, 
            totalAmount: tx.amount, 
            installments: 1, 
            originalInstallments: tx.installments ?? 1,
            tags: tx.tags, 
            date: tx.date 
          });
        } else {
          const entry = purchaseTotals.get(key)!;
          entry.totalAmount += tx.amount;
          entry.installments += 1;
        }
      });
    }
  });

  purchaseTotals.forEach(entry => allTxEntries.push(entry));

  // Cálculos de Análise
  const totalYearExpenses = yearTx.reduce((acc, t) => acc + t.amount, 0);

  // Maior compra pelo custo TOTAL (parcelas × valor da parcela)
  const maxTotalTx = allTxEntries.length > 0
    ? allTxEntries.reduce((max, t) => t.totalAmount > max.totalAmount ? t : max, allTxEntries[0])
    : null;

  // Maior transação ÚNICA (compra à vista ou parcela individual, a que for maior como cobrança única)
  const maxSingleTx = allTxEntries.length > 0
    ? allTxEntries.filter(t => t.installments === 1).reduce((max, t) => t.amount > max.amount ? t : max, allTxEntries.filter(t => t.installments === 1)[0] ?? allTxEntries[0])
    : null;

  const categorySums: Record<string, number> = {};
  yearTx.forEach(t => {
    if (t.tags.length === 0) {
      categorySums['Sem Tag'] = (categorySums['Sem Tag'] || 0) + t.amount;
    } else {
      t.tags.forEach(tagId => {
        const tagObj = data.tags.find(tag => tag.id === tagId);
        const tagName = tagObj ? tagObj.name : 'Outros';
        categorySums[tagName] = (categorySums[tagName] || 0) + (t.amount / t.tags.length);
      });
    }
  });

  const topCategories = Object.entries(categorySums)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  // Dados do Gráfico Mensal
  const chartData = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  let yearlyPaid = 0;
  let yearlyOpen = 0;
  let yearlyFuture = 0;
  let yearlyDirect = 0;

  for (let m = 1; m <= 12; m++) {
    let directTotal = 0;
    let openTotal = 0;
    let paidTotal = 0;
    let futureTotal = 0;

    data.transactions.forEach(tx => {
      const td = new Date(tx.date);
      if (td.getMonth() + 1 === m && td.getFullYear() === selectedYear) directTotal += tx.amount;
    });

    data.invoices.forEach(inv => {
      if (inv.month === m && inv.year === selectedYear) {
        const invTotal = inv.transactions.reduce((acc, t) => acc + t.amount, 0);
        if (inv.status === 'open') openTotal += invTotal;
        else if (inv.status === 'paid') paidTotal += invTotal;
        else if (inv.status === 'future') futureTotal += invTotal;
      }
    });

    yearlyPaid += paidTotal;
    yearlyOpen += openTotal;
    yearlyFuture += futureTotal;
    yearlyDirect += directTotal;

    chartData.push({
      name: monthNames[m - 1],
      open: openTotal,
      paid: paidTotal,
      future: futureTotal,
      total: openTotal + paidTotal + futureTotal
    });
  }

  // Dados do Gráfico de Pizza
  const pieData = Object.entries(categorySums)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  


  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + p.value, 0);
      return (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((p: any) => p.value > 0 && (
            <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: p.fill, fontWeight: 500 }}>{
                p.dataKey === 'paid' ? 'Faturas Pagas' :
                p.dataKey === 'open' ? 'Faturas Abertas' : 'Faturas Futuras'
              }</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>R$ {p.value.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>R$ {payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  // Resolver IDs de tags para nomes para o registro da transação
  const resolveTags = (tags: string[]) =>
    tags
      .map(tid => data.tags.find(t => t.id === tid)?.name ?? tid)
      .filter(Boolean);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Bem-vindo de volta! Aqui está o resumo das suas finanças.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Visão Geral do Ano:</h2>
        <select 
          value={selectedYear} 
          onChange={e => setSelectedYear(Number(e.target.value))}
          style={{ padding: '6px 16px', borderRadius: '8px', background: 'var(--bg-panel)', border: '1px solid var(--accent-primary)', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}
        >
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid-cards">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>Despesa Total ({selectedYear})</h3>
          <p style={{ fontSize: '24px', fontWeight: 700 }}>R$ {totalYearExpenses.toFixed(2)}</p>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Faturas Pagas</span>
              <span style={{ fontWeight: 600, color: '#10B981' }}>R$ {yearlyPaid.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Faturas Abertas</span>
              <span style={{ fontWeight: 600, color: '#F59E0B' }}>R$ {yearlyOpen.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Faturas Futuras</span>
              <span style={{ fontWeight: 600, color: '#EF4444' }}>R$ {yearlyFuture.toFixed(2)}</span>
            </div>
            {yearlyDirect > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Despesas Diretas</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>R$ {yearlyDirect.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="mobile-collapsible-header" onClick={() => toggleCard('cat')} style={{ cursor: 'pointer', margin: '-8px -8px 12px -8px', padding: '8px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Categorias Principais</h3>
            <ChevronDown size={18} className={`mobile-toggle-icon ${expandedCards['cat'] ? 'expanded' : ''}`} color="var(--text-secondary)" />
          </div>
          <div className={`mobile-collapse-content ${expandedCards['cat'] ? 'expanded' : ''}`}>
            <div className="mobile-collapse-inner">
              {topCategories.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topCategories.map((cat, index) => {
                    const color = cat.name === 'Sem Tag' ? '#64748B' : getTagColor(cat.name, data.tags);
                    return (
                      <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', width: '12px' }}>{index + 1}º</span>
                          <span style={{
                            padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                            background: `${color}18`, color: color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {cat.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>R$ {cat.value.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                 <p style={{ fontSize: '20px', fontWeight: 700 }}>~</p>
              )}
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="mobile-collapsible-header" onClick={() => toggleCard('maior')} style={{ cursor: 'pointer', margin: '-8px -8px 12px -8px', padding: '8px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Maior Compra (Total)</h3>
            <ChevronDown size={18} className={`mobile-toggle-icon ${expandedCards['maior'] ? 'expanded' : ''}`} color="var(--text-secondary)" />
          </div>
          <div className={`mobile-collapse-content ${expandedCards['maior'] ? 'expanded' : ''}`}>
            <div className="mobile-collapse-inner">
              <p style={{ fontSize: '20px', fontWeight: 700 }}>
                {maxTotalTx ? `R$ ${maxTotalTx.totalAmount.toFixed(2)}` : '~'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {maxTotalTx ? maxTotalTx.desc : ''}
              </p>
              {maxTotalTx && maxTotalTx.installments > 1 && (
                <p style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px' }}>
                  {maxTotalTx.installments}× de R$ {maxTotalTx.amount.toFixed(2)}{maxTotalTx.installments < maxTotalTx.originalInstallments ? ' (neste ano)' : ''}
                </p>
              )}
              {maxTotalTx && resolveTags(maxTotalTx.tags).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                  {resolveTags(maxTotalTx.tags).map(name => {
                    const color = getTagColor(name, data.tags);
                    return (
                      <span key={name} style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '12px', borderLeft: `3px solid ${color}`, background: `${color}18`, color }}>
                        {name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="mobile-collapsible-header" onClick={() => toggleCard('unica')} style={{ cursor: 'pointer', margin: '-8px -8px 12px -8px', padding: '8px' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Maior Compra Única</h3>
            <ChevronDown size={18} className={`mobile-toggle-icon ${expandedCards['unica'] ? 'expanded' : ''}`} color="var(--text-secondary)" />
          </div>
          <div className={`mobile-collapse-content ${expandedCards['unica'] ? 'expanded' : ''}`}>
            <div className="mobile-collapse-inner">
              <p style={{ fontSize: '20px', fontWeight: 700 }}>
                {maxSingleTx ? `R$ ${maxSingleTx.amount.toFixed(2)}` : '~'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {maxSingleTx ? maxSingleTx.desc : ''}
              </p>
              {maxSingleTx && resolveTags(maxSingleTx.tags).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                  {resolveTags(maxSingleTx.tags).map(name => {
                    const color = getTagColor(name, data.tags);
                    return (
                      <span key={name} style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '12px', borderLeft: `3px solid ${color}`, background: `${color}18`, color }}>
                        {name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid-charts">
        {/* Gráfico de Barras */}
        <div className="glass-panel" style={{ padding: '24px', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Acumulado Mensal</h3>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#10B981', borderRadius: '2px' }}></span> Pagas
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#F59E0B', borderRadius: '2px' }}></span> Abertas
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#EF4444', borderRadius: '2px' }}></span> Futuras
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="paid" stackId="a" fill="#10B981" />
                <Bar dataKey="open" stackId="a" fill="#F59E0B" />
                <Bar dataKey="future" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza */}
        <div className="glass-panel" style={{ padding: '24px', height: '360px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Distribuição por Categoria</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            {pieData.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Sem dados para este ano
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.name === 'Sem Tag' ? '#64748B' : getTagColor(entry.name, data.tags)} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Legenda Customizada */}
            {pieData.length > 0 && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {pieData.slice(0, 4).map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.name === 'Sem Tag' ? '#64748B' : getTagColor(entry.name, data.tags) }}></div>
                    <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
