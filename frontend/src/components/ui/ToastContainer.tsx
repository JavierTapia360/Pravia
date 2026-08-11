import { useToastStore } from '../../stores/toastStore';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

const COLORS = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
};

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--space-6)',
      right: 'var(--space-6)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: `1px solid ${COLORS[t.type]}`,
            boxShadow: 'var(--shadow-lg)',
            minWidth: '300px',
            maxWidth: '450px',
            pointerEvents: 'all',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ color: COLORS[t.type], flexShrink: 0 }}>{ICONS[t.type]}</div>
          <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{t.message}</div>
          <button
            onClick={() => remove(t.id)}
            className="btn-icon"
            style={{ padding: '2px', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
