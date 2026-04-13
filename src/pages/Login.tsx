import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Bolhas de Fundo */}
      <div style={{
        position: 'absolute', width: '700px', height: '700px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.18) 0%, transparent 65%)',
        top: '-250px', left: '-200px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)',
        bottom: '-150px', right: '-150px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)',
        bottom: '100px', left: '100px', pointerEvents: 'none',
      }} />

      {/* Cartão */}
      <div style={{
        width: '100%', maxWidth: '420px', margin: '0 20px',
        padding: '48px 40px',
        background: 'rgba(22, 22, 34, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(212, 175, 55, 0.1)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <img 
              src={`${import.meta.env.BASE_URL}cifrao.png`} 
              alt="Dinheirize Logo" 
              style={{ width: '60px', height: '60px', objectFit: 'contain' }} 
            />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Dinheirize
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
            Controle financeiro pessoal
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 500,
              color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.3px',
            }}>
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px', fontSize: '15px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 500,
              color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.3px',
            }}>
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px', fontSize: '15px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#EF4444',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>⚠</span>
              {error.includes('Invalid login credentials')
                ? 'E-mail ou senha incorretos.'
                : error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              fontSize: '15px', fontWeight: 600,
              marginTop: '4px',
              background: loading
                ? 'rgba(212, 175, 55, 0.6)'
                : 'linear-gradient(135deg, #D4AF37 0%, #B5952F 100%)',
              color: '#fff', border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(212, 175, 55, 0.45)',
              transition: 'all 0.2s ease',
              transform: 'none',
            }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'none'; }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
