import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', isLoading = false, className = '', children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`btn btn-${variant} btn-${size} ${className}`.trim()}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="button-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
});
