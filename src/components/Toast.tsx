import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onClose,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animação de entrada
    const showTimer = setTimeout(() => setVisible(true), 10);
    // Início do fade-out antes do unmount
    const fadeTimer = setTimeout(() => setVisible(false), duration - 400);
    // Remove do DOM
    const closeTimer = setTimeout(() => onClose(), duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const colors: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
    success: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      icon: '✓',
      color: '#10B981',
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
      icon: '✕',
      color: '#EF4444',
    },
    info: {
      bg: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.35)',
      icon: 'ℹ',
      color: '#6366F1',
    },
  };

  const c = colors[type];

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: '12px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: '260px',
        maxWidth: '380px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.97)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        pointerEvents: 'none',
      }}
    >
      {/* Ícone */}
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: `${c.color}22`,
          border: `1.5px solid ${c.color}`,
          color: c.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {c.icon}
      </div>

      {/* Mensagem */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
        }}
      >
        {message}
      </span>

      {/* Barra de progresso */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          borderRadius: '0 0 12px 12px',
          background: c.color,
          width: '100%',
          transformOrigin: 'left',
          animation: `toast-progress ${duration}ms linear forwards`,
        }}
      />

      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};
