import React, { useEffect } from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Sim',
  cancelLabel = 'Não',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 12, 20, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99998,
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '28px 32px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.22s ease',
        }}
      >
        {/* Ícone */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
            border: `1.5px solid ${danger ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            marginBottom: '20px',
          }}
        >
          {danger ? '⚠' : '💬'}
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="btn-ghost"
            style={{ minWidth: '90px' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              minWidth: '90px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '14px',
              background: danger ? '#EF4444' : 'var(--accent-primary)',
              color: '#fff',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
