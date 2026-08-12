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
        <main className="fatal-state">
          <div className="surface-card fatal-state__card">
            <span className="fatal-state__icon"><AlertTriangle size={28} /></span>
            <h1>Algo salió mal</h1>
            <p>
              La aplicación encontró un error inesperado al mostrar esta vista.
            </p>
            <div className="fatal-state__detail">
              <code>
                {this.state.error?.message}
              </code>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={18} /> Recargar aplicación
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
