import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/authStore';

export default function ChangePassword() {
  const user = useAuthStore((state) => state.user);
  const markPasswordChanged = useAuthStore((state) => state.markPasswordChanged);
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && !user.requires_password_change) return <Navigate to="/mi-dia" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmation) return setError('La confirmación no coincide.');
    setLoading(true);
    setError('');
    try {
      await authService.changePassword(currentPassword, newPassword);
      await markPasswordChanged();
      navigate('/mi-dia', { replace: true });
    } catch (changeError: any) {
      setError(changeError.message || 'No fue posible cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="auth-page">
    <section className="surface-card auth-card" aria-labelledby="change-password-title">
      <div className="auth-icon"><KeyRound size={24} /></div>
      <p className="eyebrow">Protección de la cuenta</p>
      <h1 id="change-password-title">Crea tu contraseña definitiva</h1>
      <p className="text-muted">Usa al menos 12 caracteres, mayúscula, minúscula, número y símbolo.</p>
      <form onSubmit={submit}>
        <label className="input-label" htmlFor="current-password">Contraseña temporal</label>
        <input id="current-password" className="input-field" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        <label className="input-label modal-field" htmlFor="new-password">Nueva contraseña</label>
        <input id="new-password" className="input-field" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} />
        <label className="input-label modal-field" htmlFor="confirm-password">Confirmar contraseña</label>
        <input id="confirm-password" className="input-field" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={12} />
        {error && <p role="alert" className="form-alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </section>
  </main>;
}
