import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileWarning,
  Landmark,
  ListTodo,
  PenTool,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { agendaService, AgendaTask } from '../services/agenda.service';
import { miDiaService } from '../services/miDia.service';
import { useToastStore } from '../stores/toastStore';
import { canAssignOtherResponsible, defaultResponsibleId, resolveResponsibleSelection } from '../utils/ownership';

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value || 0);

export default function MiDia() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { addToast } = useToastStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [catalogs, setCatalogs] = useState<any>({ usuarios: [], expedientes: [] });
  const [selectedUser, setSelectedUser] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIA');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskResponsibleId, setTaskResponsibleId] = useState('');
  const [creating, setCreating] = useState(false);

  const actorId = defaultResponsibleId(currentUser?.id);
  const canManageTeam = canAssignOtherResponsible(currentUser?.rol);
  const load = async () => {
    setLoading(true);
    setError('');
    try { setDashboard(await miDiaService.getDashboard(selectedUser === 'TODOS' ? undefined : selectedUser)); }
    catch (err: any) { setError(err.message || 'No fue posible preparar tu día'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    agendaService.catalogs().then((response) => setCatalogs(response.catalogos)).catch((err) => setError(err.message));
  }, []);
  useEffect(() => { setTaskResponsibleId(actorId); }, [actorId]);
  useEffect(() => { load(); }, [selectedUser]);

  const createTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!actorId || taskTitle.trim().length < 3) return addToast('Escribe una tarea clara', 'error');
    setCreating(true);
    try {
      await agendaService.createTask({
        responsable_id: resolveResponsibleSelection({ authenticatedUserId: actorId, role: currentUser?.rol, requestedResponsibleId: taskResponsibleId }),
        titulo: taskTitle.trim(),
        prioridad: taskPriority,
        fecha_limite: taskDeadline ? new Date(`${taskDeadline}T18:00:00`).toISOString() : null,
        idempotency_key: crypto.randomUUID(),
      });
      setTaskTitle(''); setTaskDeadline(''); setTaskResponsibleId(actorId);
      addToast('Tarea agregada a Mi Día', 'success');
      await load();
    } catch (err: any) { addToast(err.detail || err.message, 'error'); }
    finally { setCreating(false); }
  };

  const completeTask = async (task: AgendaTask) => {
    try {
      await agendaService.updateTask(task.id, { estatus: 'COMPLETADA' });
      addToast('Tarea completada', 'success');
      await load();
    } catch (err: any) { addToast(err.message, 'error'); }
  };

  const metrics = dashboard?.metricas || {};
  const metricCards = [
    { label: 'Tareas para hoy', value: metrics.tareas_hoy || 0, detail: `${metrics.tareas_vencidas || 0} vencidas`, icon: ListTodo, color: 'text-blue-600' },
    { label: 'Citas de hoy', value: metrics.citas_hoy || 0, detail: `${metrics.vencimientos_proximos || 0} vencimientos próximos`, icon: CalendarDays, color: 'text-teal-600' },
    { label: 'Firmas próximas', value: metrics.firmas_proximas || 0, detail: 'Siguientes 7 días', icon: PenTool, color: 'text-amber-600' },
    { label: 'Bloqueos', value: metrics.expedientes_bloqueados || 0, detail: 'Requieren desbloqueo', icon: ShieldAlert, color: 'text-rose-600' },
    { label: 'Documentos faltantes', value: metrics.documentos_faltantes || 0, detail: 'Requisitos obligatorios', icon: FileWarning, color: 'text-violet-600' },
    { label: 'Cobros pendientes', value: metrics.cobros_pendientes || 0, detail: money(metrics.saldo_pendiente_total || 0), icon: CircleDollarSign, color: 'text-emerald-600' },
  ];
  const tasks: AgendaTask[] = [...(dashboard?.tareas?.vencidas || []), ...(dashboard?.tareas?.hoy || []), ...(dashboard?.tareas?.siguientes || [])];

  const dateLabel = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="module-page mi-dia-page">
      <header className="module-page-header">
        <div><span className="module-eyebrow">Centro operativo</span><h1 className="module-title">Buenos días, {currentUser?.nombre || 'Usuario'}</h1><p className="module-description capitalize">{dateLabel} · Esto es lo que requiere atención.</p></div>
        <div className="module-actions">{canManageTeam && <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="control-height rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="TODOS">Vista del despacho</option>{catalogs.usuarios.map((item: any) => <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>)}</select>}<button onClick={load} disabled={loading} className="btn btn-secondary btn-md" aria-label="Actualizar Mi Día"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} />Actualizar</button></div>
      </header>

      {error && <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metricCards.map((card) => <article key={card.label} className="metric-card mi-dia-stat"><div className="flex items-center justify-between"><p className="metric-label normal-case tracking-normal">{card.label}</p><card.icon className={card.color} size={22} /></div><p className="metric-value">{card.value}</p><p className="mt-2 text-[13px] text-slate-500">{card.detail}</p></article>)}</section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)] gap-5">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between"><div><h2 className="font-black text-slate-900 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-600" /> Requiere atención</h2><p className="text-xs text-slate-500 mt-1">Priorizado por vencimiento y riesgo operativo.</p></div><span className="text-xs font-bold rounded-full bg-amber-100 text-amber-800 px-2 py-1">{dashboard?.alertas?.length || 0}</span></div>
          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">{loading ? <div className="p-12 text-center text-slate-500">Preparando prioridades…</div> : dashboard?.alertas?.length ? dashboard.alertas.map((alert: any) => <button key={alert.id} onClick={() => navigate(alert.ruta)} className="w-full p-4 text-left hover:bg-slate-50 flex items-center gap-3"><span className={`w-2.5 h-2.5 rounded-full shrink-0 ${alert.severidad === 'ALTA' ? 'bg-rose-500' : 'bg-amber-500'}`} /><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{alert.titulo}</p><p className="text-xs text-slate-500 truncate">{alert.detalle}</p></div>{alert.fecha && <span className="text-[11px] text-slate-500 shrink-0">{new Date(alert.fecha).toLocaleDateString('es-MX')}</span>}<ChevronRight size={16} className="text-slate-400" /></button>) : <div className="p-14 text-center"><CheckCircle2 size={42} className="mx-auto text-emerald-400" /><p className="font-bold text-slate-700 mt-3">Sin alertas críticas</p></div>}</div>
        </section>

        <div className="space-y-5">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h2 className="mb-1 font-bold text-slate-950">Nueva tarea rápida</h2>
            <p className="mb-4 text-[13px] text-slate-500">Registra un pendiente sin salir del tablero.</p>
            <form onSubmit={createTask} className="space-y-4"><label className="block"><span className="input-label">Tarea</span><input required minLength={3} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="¿Qué hay que hacer?" className="input-field" /></label>{canManageTeam ? <label className="block"><span className="input-label">Responsable de esta tarea</span><select required value={taskResponsibleId} onChange={(e) => setTaskResponsibleId(e.target.value)} className="input-field"><option value="">Seleccionar responsable</option>{catalogs.usuarios.map((item: any) => <option key={item.id} value={item.id}>{item.nombre} {item.apellido}</option>)}</select><span className="field-message">La vista seleccionada arriba no cambia esta asignación.</span></label> : <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">Responsable: {currentUser?.nombre || 'Usuario autenticado'}</p>}<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label><span className="input-label">Prioridad</span><select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="input-field"><option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select></label><label><span className="input-label">Fecha límite</span><input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} className="input-field" /></label></div><button disabled={creating} className="btn btn-primary btn-md w-full"><Plus size={16} /> {creating ? 'Agregando…' : 'Agregar tarea'}</button></form>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-200 flex items-center justify-between"><h2 className="font-black text-slate-900">Tareas abiertas</h2><Link to="/agenda" className="text-xs font-bold text-blue-700">Abrir agenda</Link></div><div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">{tasks.slice(0, 15).map((task) => <div key={task.id} className="p-3 flex gap-3"><button onClick={() => completeTask(task)} className="text-slate-400 hover:text-emerald-600"><CheckCircle2 size={19} /></button><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900">{task.titulo}</p><p className={`text-[11px] ${task.fecha_limite && new Date(task.fecha_limite) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>{task.prioridad}{task.fecha_limite ? ` · ${new Date(task.fecha_limite).toLocaleDateString('es-MX')}` : ''}</p>{task.expediente && <button onClick={() => navigate(`/expedientes/${task.expediente_id}`)} className="text-[11px] text-blue-700 font-bold">{task.expediente.numero_pravia}</button>}</div></div>)}{tasks.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No hay tareas abiertas.</p>}</div></section>
        </div>
      </div>

      <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link to="/agenda" className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md"><Clock3 className="text-teal-600" /><p className="font-black text-slate-900 mt-3">Próximos eventos</p><p className="text-sm text-slate-500">{dashboard?.eventos?.proximos?.length || 0} en los siguientes 7 días</p></Link>
        <Link to="/expedientes" className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md"><Users className="text-blue-600" /><p className="font-black text-slate-900 mt-3">Pendientes de cliente</p><p className="text-sm text-slate-500">{metrics.pendientes_cliente || 0} expedientes</p></Link>
        <Link to="/expedientes" className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md"><Landmark className="text-amber-600" /><p className="font-black text-slate-900 mt-3">Pendientes de notaría</p><p className="text-sm text-slate-500">{metrics.pendientes_notaria || 0} expedientes</p></Link>
        <Link to="/cotizaciones" className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md"><RefreshCw className="text-violet-600" /><p className="font-black text-slate-900 mt-3">Cotizaciones por seguir</p><p className="text-sm text-slate-500">{metrics.cotizaciones_seguimiento || 0} requieren contacto</p></Link>
      </section>
    </div>
  );
}
