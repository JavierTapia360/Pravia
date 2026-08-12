import { useEffect, useState } from 'react';
import { KeyRound, Plus, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import { usersService, type ManagedUser } from '../services/users.service';
import type { AppRole } from '../services/auth.service';
import { useToastStore } from '../stores/toastStore';

const roles: { value: AppRole; label: string }[] = [
  { value: 'DIRECCION', label: 'Dirección' },
  { value: 'ADMINISTRACION', label: 'Administración' },
  { value: 'ABOGADO', label: 'Abogado' },
  { value: 'RECEPCION', label: 'Recepción' },
  { value: 'GESTORIA', label: 'Gestoría' },
  { value: 'CONSULTA', label: 'Consulta' },
];

const blankUser = { email: '', nombre: '', apellido: '', rol: 'ABOGADO' as AppRole, initial_password: '' };

export default function Usuarios() {
  const toast = useToastStore((state) => state.addToast);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(blankUser);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try { setUsers(await usersService.list()); }
    catch (loadError: any) { setError(loadError.message || 'No fue posible cargar los usuarios.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const createUser = async () => {
    setSaving(true);
    try {
      await usersService.create(form);
      toast('Cuenta creada. La contraseña temporal debe compartirse por un canal seguro.', 'success');
      setCreateOpen(false);
      setForm(blankUser);
      await load();
    } catch (saveError: any) { toast(saveError.message || 'No fue posible crear la cuenta.', 'error'); }
    finally { setSaving(false); }
  };

  const updateUser = async (user: ManagedUser, input: Record<string, unknown>) => {
    try {
      await usersService.update(user.id, input);
      toast('Permisos de la cuenta actualizados.', 'success');
      await load();
    } catch (saveError: any) { toast(saveError.message || 'No fue posible actualizar la cuenta.', 'error'); }
  };

  const resetPassword = async () => {
    if (!passwordUser) return;
    setSaving(true);
    try {
      await usersService.setTemporaryPassword(passwordUser.id, temporaryPassword);
      toast('Contraseña temporal establecida; las sesiones anteriores fueron cerradas.', 'success');
      setPasswordUser(null);
      setTemporaryPassword('');
      await load();
    } catch (saveError: any) { toast(saveError.message || 'No fue posible establecer la contraseña.', 'error'); }
    finally { setSaving(false); }
  };

  return <div className="page-enter">
    <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
      <div>
        <p className="eyebrow">Configuración restringida</p>
        <h1>Usuarios y acceso</h1>
        <p className="text-muted">Altas, roles, activación y cierre de sesiones desde un único control.</p>
      </div>
      <button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nueva cuenta</button>
    </header>

    <section className="glass-card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <span className="auth-icon" style={{ margin: 0 }}><ShieldCheck size={22} /></span>
        <div><strong>Permisos efectivos en servidor</strong><p className="text-muted" style={{ margin: 0 }}>Los cambios de rol o desactivación cierran inmediatamente las sesiones existentes.</p></div>
      </div>
      {loading ? <LoadingState label="Cargando cuentas" rows={4} /> : error ? <ErrorState title="No se pudieron cargar las cuentas" description={error} retry={() => void load()} /> :
        <div className="users-grid">
          {users.map((user) => <article className="user-access-card" key={user.id}>
            <div className="user-access-heading">
              <span className="user-avatar">{user.nombre.charAt(0).toLocaleUpperCase('es-MX')}</span>
              <div><strong>{user.nombre} {user.apellido}</strong><small>{user.email}</small></div>
              <span className={`badge ${user.activo ? 'badge-success' : 'badge-secondary'}`}>{user.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
            <label className="input-label" htmlFor={`role-${user.id}`}>Rol</label>
            <select id={`role-${user.id}`} className="input-field" value={user.rol} onChange={(event) => void updateUser(user, { rol: event.target.value })}>
              {roles.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}
            </select>
            <div className="user-access-meta">
              <span>{user.requires_password_change ? 'Cambio de contraseña pendiente' : 'Contraseña definitiva'}</span>
              <span>{user.last_login_at ? `Último acceso: ${new Date(user.last_login_at).toLocaleString('es-MX')}` : 'Sin accesos registrados'}</span>
            </div>
            <div className="user-access-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPasswordUser(user)}><KeyRound size={15} /> Contraseña temporal</button>
              <button type="button" className={`btn btn-sm ${user.activo ? 'btn-danger' : 'btn-secondary'}`} onClick={() => void updateUser(user, { activo: !user.activo })}>
                {user.activo ? <UserRoundX size={15} /> : <UserRoundCheck size={15} />}{user.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </article>)}
        </div>}
    </section>

    <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nueva cuenta" footer={<><button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="btn btn-primary" disabled={saving} onClick={() => void createUser()}>{saving ? 'Creando…' : 'Crear cuenta'}</button></>}>
      <div className="form-grid">
        <label className="input-label">Nombre<input className="input-field" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></label>
        <label className="input-label">Apellido<input className="input-field" value={form.apellido} onChange={(event) => setForm({ ...form, apellido: event.target.value })} /></label>
      </div>
      <label className="input-label" style={{ marginTop: 'var(--space-4)' }}>Correo<input className="input-field" type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label className="input-label" style={{ marginTop: 'var(--space-4)' }}>Rol<select className="input-field" value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value as AppRole })}>{roles.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}</select></label>
      <label className="input-label" style={{ marginTop: 'var(--space-4)' }}>Contraseña temporal<input className="input-field" type="password" autoComplete="new-password" value={form.initial_password} onChange={(event) => setForm({ ...form, initial_password: event.target.value })} /></label>
      <p className="text-muted" style={{ fontSize: '0.82rem' }}>Mínimo 12 caracteres, mayúscula, minúscula, número y símbolo. El usuario deberá cambiarla al entrar.</p>
    </Modal>

    <Modal isOpen={Boolean(passwordUser)} onClose={() => setPasswordUser(null)} title="Establecer contraseña temporal" footer={<><button className="btn btn-secondary" onClick={() => setPasswordUser(null)}>Cancelar</button><button className="btn btn-primary" disabled={saving || temporaryPassword.length < 12} onClick={() => void resetPassword()}>{saving ? 'Guardando…' : 'Guardar y cerrar sesiones'}</button></>}>
      <p>La cuenta de <strong>{passwordUser?.nombre} {passwordUser?.apellido}</strong> deberá cambiarla en el siguiente acceso.</p>
      <label className="input-label">Nueva contraseña temporal<input className="input-field" type="password" autoComplete="new-password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} /></label>
    </Modal>
  </div>;
}
