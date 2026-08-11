import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldShell({ id, label, hint, error, required, children }: FieldShellProps) {
  const messageId = `${id}-message`;
  return (
    <div className="form-field">
      <label className="input-label" htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {children}
      {(error || hint) && <p id={messageId} className={error ? 'field-message field-message--error' : 'field-message'}>{error || hint}</p>}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id: providedId, label, hint, error, required, className = '', ...props }, ref,
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        id={id}
        className={`input-field ${error ? 'input-field--error' : ''} ${className}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={(error || hint) ? `${id}-message` : undefined}
        required={required}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id: providedId, label, hint, error, required, className = '', children, ...props }, ref,
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <select
        ref={ref}
        id={id}
        className={`input-field ${error ? 'input-field--error' : ''} ${className}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={(error || hint) ? `${id}-message` : undefined}
        required={required}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});
