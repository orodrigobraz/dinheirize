import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Receipt, CreditCard, FileText, LogOut } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const features = [
    {
      title: 'Dashboard',
      description: 'Visão geral do seu patrimônio e transações do mês',
      icon: <LayoutDashboard size={32} />,
      path: '/dashboard',
      color: '#6366F1'
    },
    {
      title: 'Transações',
      description: 'Registre despesas avulsas e gerencie seu fluxo avulso',
      icon: <Receipt size={32} />,
      path: '/transactions',
      color: '#10B981'
    },
    {
      title: 'Faturas',
      description: 'Tenha o controle total das suas faturas e parcelamentos',
      icon: <FileText size={32} />,
      path: '/invoices',
      color: '#F59E0B'
    },
    {
      title: 'Meus Cartões',
      description: 'Gerencie seus cartões de crédito, débito e datas de corte',
      icon: <CreditCard size={32} />,
      path: '/cards',
      color: '#EF4444'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', maxWidth: '1000px', margin: '0 auto', paddingTop: '40px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Bem-vindo ao Dinheirize</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          O que você gostaria de explorar hoje? Escolha um dos módulos abaixo para acessar o painel correspondente.
        </p>
      </div>

      <div className="home-grid">
        {features.map((feat) => (
          <button
            key={feat.path}
            onClick={() => navigate(feat.path)}
            className="glass-panel"
            style={{
              padding: '40px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              textAlign: 'center',
              borderTop: `4px solid ${feat.color}`,
              transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
              cursor: 'pointer',
              background: 'rgba(26, 26, 36, 0.4)'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 24px -8px ${feat.color}40`;
              (e.currentTarget as HTMLElement).style.background = 'rgba(26, 26, 36, 0.8)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.background = 'rgba(26, 26, 36, 0.4)';
            }}
          >
            <div style={{ 
              width: '72px', height: '72px', borderRadius: '20px', 
              background: `${feat.color}15`, color: feat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              {feat.icon}
            </div>
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>{feat.title}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', lineHeight: 1.5 }}>{feat.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button onClick={signOut} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
          <LogOut size={18} /> Sair
        </button>
      </div>
    </div>
  );
};
