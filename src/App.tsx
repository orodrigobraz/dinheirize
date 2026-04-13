import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider, useData } from './hooks/useData';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Cards } from './pages/Cards';
import { Invoices } from './pages/Invoices';

// Mostra o spinner ou o conteúdo do app quando auth+data estiverem prontos
const AppRoutes: React.FC = () => {
  const { loading } = useData();
  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10, 12, 20, 0.8)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366F1',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Carregando dados…
          </p>
        </div>
      )}
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="cards" element={<Cards />} />
            <Route path="invoices" element={<Invoices />} />
          </Route>
        </Routes>
      </HashRouter>
    </>
  );
};

// Auth gate: mostra o Login se não autenticado, envolve o app no DataProvider se autenticado
const AuthGate: React.FC = () => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366F1',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AuthGate />
  </AuthProvider>
);

export default App;
