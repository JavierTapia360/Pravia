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
    <div className="toast-region">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-message fade-in"
          style={{ borderColor: COLORS[t.type] }}
        >
          <div className="toast-message__icon" style={{ color: COLORS[t.type] }}>{ICONS[t.type]}</div>
          <div className="toast-message__copy">{t.message}</div>
          <button
            onClick={() => remove(t.id)}
            className="btn-icon"
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
