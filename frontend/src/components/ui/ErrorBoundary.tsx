import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          padding: 'var(--space-6)',
          textAlign: 'center'
        }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: 'var(--space-8)' }}>
            <AlertTriangle size={48} color="var(--color-danger)" style={{ margin: '0 auto var(--space-4)' }} />
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Algo salió mal</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              La aplicación encontró un error inesperado al mostrar esta vista.
            </p>
            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
              <code style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                {this.state.error?.message}
              </code>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <RefreshCw size={18} /> Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
