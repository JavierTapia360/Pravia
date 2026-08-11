import type { LucideIcon } from 'lucide-react';
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, compact = false }: EmptyStateProps) {
  return (
    <section className={`state-panel${compact ? ' state-panel--compact' : ''}`} aria-label={title}>
      <span className="state-panel__icon" aria-hidden="true"><Icon size={22} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="state-panel__action">{action}</div>}
    </section>
  );
}

interface LoadingStateProps {
  label?: string;
  rows?: number;
}

export function LoadingState({ label = 'Cargando información', rows = 3 }: LoadingStateProps) {
  return (
    <section className="state-panel state-panel--loading" aria-busy="true" aria-live="polite">
      <div className="state-panel__loading-label"><LoaderCircle size={18} className="spinner" /> {label}</div>
      <div className="skeleton-list" aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => <span className="skeleton-line" key={index} />)}
      </div>
    </section>
  );
}

interface ErrorStateProps {
  title?: string;
  description: string;
  retry?: () => void;
}

export function ErrorState({ title = 'No pudimos cargar esta información', description, retry }: ErrorStateProps) {
  return (
    <section className="state-panel state-panel--error" role="alert">
      <span className="state-panel__icon" aria-hidden="true"><AlertCircle size={22} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {retry && <button type="button" className="btn btn-secondary" onClick={retry}>Intentar de nuevo</button>}
    </section>
  );
}
