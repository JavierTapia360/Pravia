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
    <main className="auth-page">
      <section className="surface-card auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="auth-brand__mark">P</span>
          <h1 id="login-title" className="auth-brand__name">
            PRAVIA <span>OS</span>
          </h1>
          <p>Sistema Operativo Jurídico-Notarial</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label" htmlFor="login-email">Correo electrónico</label>
            <div className="auth-input">
              <User size={18} aria-hidden="true" />
              <input 
                id="login-email"
                type="email"
                className="input-field" 
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
            <div className="auth-input">
              <Lock size={18} aria-hidden="true" />
              <input 
                id="login-password"
                type="password" 
                className="input-field" 
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
            className="btn btn-primary auth-submit"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Autenticando…' : 'Iniciar sesión'}
          </button>
        </form>

        {error && <p role="alert" className="form-alert">{error}</p>}

        <div className="auth-footer">
          <Link to="/recuperar-acceso">¿Olvidaste tu contraseña?</Link>
          <p>
            Acceso restringido. Si no tiene cuenta o necesita recuperar el acceso, contacte a Dirección.
          </p>
        </div>
      </section>
    </main>
  );
}
