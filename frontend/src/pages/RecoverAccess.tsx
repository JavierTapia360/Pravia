import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { authService } from '../services/auth.service';

export default function RecoverAccess() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (token && password !== confirmation) return setError('La confirmación no coincide.');
    setLoading(true);
    setError('');
    try {
      if (token) {
        await authService.resetPassword(token, password);
        navigate('/login', { replace: true });
      } else {
        const response = await authService.requestRecovery(email);
        setMessage(response.message);
      }
    } catch (recoveryError: any) {
      setError(recoveryError.message || 'No fue posible completar la recuperación.');
    } finally { setLoading(false); }
  };

  return <main className="auth-page">
    <section className="surface-card auth-card" aria-labelledby="recovery-title">
      <div className="auth-icon">{token ? <ShieldCheck size={24} /> : <MailCheck size={24} />}</div>
      <p className="eyebrow">Acceso seguro</p>
      <h1 id="recovery-title">{token ? 'Restablecer contraseña' : 'Recuperar acceso'}</h1>
      <p className="text-muted">{token ? 'Crea una contraseña definitiva para cerrar todas las sesiones anteriores.' : 'Si la cuenta está activa, recibirás un enlace de 30 minutos por el canal configurado.'}</p>
      <form onSubmit={submit}>
        {token ? <>
          <label className="input-label" htmlFor="recovery-password">Nueva contraseña</label>
          <input id="recovery-password" className="input-field" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <label className="input-label modal-field" htmlFor="recovery-confirmation">Confirmar contraseña</label>
          <input id="recovery-confirmation" className="input-field" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        </> : <>
          <label className="input-label" htmlFor="recovery-email">Correo de la cuenta</label>
          <input id="recovery-email" className="input-field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </>}
        {message && <p role="status" className="form-success">{message}</p>}
        {error && <p role="alert" className="form-alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={loading || Boolean(message)}>{loading ? 'Procesando…' : token ? 'Guardar contraseña' : 'Enviar instrucciones'}</button>
      </form>
      <p className="auth-back"><Link to="/login">Volver a iniciar sesión</Link></p>
    </section>
  </main>;
}
