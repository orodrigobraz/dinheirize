import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, CreditCard, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';


export const Sidebar: React.FC = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <aside className={`sidebar-nav ${isHome ? 'hide-on-mobile-home' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '0 12px', marginBottom: '4px' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'block' }}>
          <h2 style={{ color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <img src={`${import.meta.env.BASE_URL}cifrao.png`} alt="Dinheirize Logo" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
            Dinheirize
          </h2>
        </Link>
      </div>

      {/* Navegação */}
      <nav className="sidebar-links" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <SidebarLink to="/transactions" icon={<Receipt size={20} />} label="Transações" />

        {/* Hub Principal / Início — apenas mobile no centro */}
        <SidebarLink 
          to="/" 
          exact
          icon={<img src={`${import.meta.env.BASE_URL}cifrao.png`} alt="Home" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />} 
          label="Início" 
          className="hide-desktop"
        />

        <SidebarLink to="/invoices" icon={<FileText size={20} />} label="Faturas" />
        <SidebarLink to="/cards" icon={<CreditCard size={20} />} label="Cartões" />
      </nav>


      {/* Info do usuário + sair */}
      <div className="sidebar-user" style={{
        borderTop: '1px solid var(--border)', paddingTop: '14px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <p style={{
          fontSize: '12px', color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 4px',
        }}>
          {user?.email}
        </p>
        <button
          id="sidebar-logout"
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '8px 10px',
            borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'transparent',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
            (e.currentTarget as HTMLElement).style.color = '#EF4444';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
};

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string; exact?: boolean; className?: string }> = ({ to, icon, label, exact, className }) => (
  <NavLink
    to={to}
    end={exact}
    className={`sidebar-link ${className || ''}`}
    style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 12px', borderRadius: '8px',
      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
      fontWeight: isActive ? 600 : 500,
      transition: 'all 0.2s',
    })}
  >
    <div style={{ color: 'inherit' }}>{icon}</div>
    <span className="sidebar-link-text">{label}</span>
  </NavLink>
);
