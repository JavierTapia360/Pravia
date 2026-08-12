import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);
  const { status, user } = useAuthStore();
  const navigate = useNavigate();

  if (status === 'authenticated') return <Navigate to={user?.requires_password_change ? '/cambiar-contrasena' : '/mi-dia'} replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const authenticated = await login(email, password);
      navigate(authenticated.requires_password_change ? '/cambiar-contrasena' : '/mi-dia', { replace: true });
    } catch (loginError: any) {
      setError(loginError.message || 'No fue posible iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent 40%)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>
            PRAVIA <span style={{ color: 'var(--color-primary)' }}>OS</span>
          </h1>
          <p className="text-muted">Sistema Operativo Jurídico-Notarial</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">Correo electrónico</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="login-email"
                type="email"
                className="input-field" 
                style={{ paddingLeft: '40px' }}
                placeholder="nombre@despacho.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="login-password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="login-password"
                type="password" 
                className="input-field" 
                style={{ paddingLeft: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: 'var(--space-4)', height: '44px' }}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {error && <p role="alert" style={{ marginTop: 'var(--space-4)', color: 'var(--color-danger)', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <Link to="/recuperar-acceso" style={{ display: 'inline-block', marginBottom: 'var(--space-3)' }}>¿Olvidaste tu contraseña?</Link>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Acceso restringido. Si no tiene cuenta o necesita recuperar el acceso, contacte a Dirección.
          </p>
        </div>
      </div>
    </div>
  );
}
