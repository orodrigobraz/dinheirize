import React from 'react';
import { Sidebar } from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';

export const Layout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className={`layout-main ${isHome ? 'no-bottom-nav-mobile' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};
