import { ReactNode, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmationOptions {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'default';
}

interface ConfirmDialogProps extends ConfirmationOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-shell" role="presentation">
      <button type="button" className="modal-backdrop" onClick={onCancel} aria-label="Cerrar confirmación" />
      <section className="modal-dialog confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description">
        <header className="modal-header">
          <div className={`confirmation-dialog__icon confirmation-dialog__icon--${tone}`}><AlertTriangle size={20} /></div>
          <div className="confirmation-dialog__heading">
            <h2 id="confirmation-title">{title}</h2>
          </div>
          <button type="button" className="btn-icon" onClick={onCancel} aria-label="Cerrar"><X size={18} /></button>
        </header>
        <div className="modal-body"><p id="confirmation-description" className="confirmation-dialog__description">{description}</p></div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-secondary btn-md" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`btn btn-md ${tone === 'danger' ? 'btn-danger confirmation-dialog__danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
}

export function useConfirmation() {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);

  const requestConfirmation = (next: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions(next);
  });

  const finish = (accepted: boolean) => {
    resolver.current?.(accepted);
    resolver.current = null;
    setOptions(null);
  };

  return {
    requestConfirmation,
    confirmationDialog: options ? (
      <ConfirmDialog {...options} open onConfirm={() => finish(true)} onCancel={() => finish(false)} />
    ) : null,
  };
}
