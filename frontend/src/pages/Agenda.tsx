import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Filter,
  List,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { AgendaEvent, AgendaTask, AgendaView, agendaService } from '../services/agenda.service';
import { useToastStore } from '../stores/toastStore';

const EVENT_LABELS: Record<string, string> = {
  PERSONAL: 'Personal', DESPACHO: 'Despacho', FIRMA: 'Firma', AUDIENCIA: 'Audiencia',
  VENCIMIENTO: 'Vencimiento', CITA: 'Cita', NOTARIA: 'Notaría', SEGUIMIENTO: 'Seguimiento', OTRO: 'Otro',
};
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const mondayOf = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));
const inputDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const emptyForm = (date = new Date()) => ({
  titulo: '', descripcion: '', tipo: 'CITA', fecha_inicio: inputDateTime(date.toISOString()), fecha_fin: '',
  todo_el_dia: false, responsable_id: '', expediente_id: '', compareciente_id: '', recordatorios: [60] as number[],
});

function rangeFor(view: AgendaView, anchor: Date) {
  if (view === 'dia') return { from: startOfDay(anchor), to: endOfDay(anchor) };
  if (view === 'semana') {
    const from = mondayOf(anchor);
    return { from, to: endOfDay(addDays(from, 6)) };
  }
  if (view === 'lista') return { from: startOfDay(anchor), to: endOfDay(addDays(anchor, 90)) };
  return {
    from: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

export default function Agenda() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [view, setView] = useState<AgendaView>('mes');
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [tasks, setTasks] = useState<AgendaTask[]>([]);
  const [catalogs, setCatalogs] = useState<any>({ usuarios: [], expedientes: [], comparecientes: [], tipos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [userFilter, setUserFilter] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AgendaEvent | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const actorId = catalogs.usuarios[0]?.id || '';
  const currentRange = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [eventResponse, taskResponse] = await Promise.all([
        agendaService.list({
          desde: currentRange.from.toISOString(), hasta: currentRange.to.toISOString(),
          tipo: typeFilter, user_id: userFilter,
        }),
        agendaService.listTasks({ user_id: userFilter, estatus: 'TODOS' }),
      ]);
      setEvents(eventResponse.eventos || []);
      setTasks((taskResponse.tareas || []).filter((task: AgendaTask) => !['COMPLETADA', 'CANCELADA'].includes(task.estatus)));
    } catch (err: any) {
      setError(err.message || 'No fue posible cargar la agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    agendaService.catalogs().then((response) => setCatalogs(response.catalogos)).catch((err) => setError(err.message));
  }, []);
  useEffect(() => { load(); }, [view, anchor, typeFilter, userFilter]);

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? events.filter((event) => [event.titulo, event.descripcion, event.expediente?.numero_pravia, event.compareciente_nombre, event.responsable_nombre].some((value) => String(value || '').toLowerCase().includes(term))) : events;
  }, [events, search]);

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = addDays(first, -((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }, [anchor]);

  const openCreate = (date = anchor) => {
    const next = emptyForm(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9));
    next.responsable_id = userFilter !== 'TODOS' ? userFilter : actorId;
    setForm(next);
    setSelected(null);
    setCancelReason('');
    setShowEditor(true);
  };
  const openEdit = (event: AgendaEvent) => {
    setSelected(event);
    setForm({
      titulo: event.titulo, descripcion: event.descripcion || '', tipo: event.tipo,
      fecha_inicio: inputDateTime(event.fecha_inicio), fecha_fin: inputDateTime(event.fecha_fin), todo_el_dia: event.todo_el_dia,
      responsable_id: event.user_id || actorId, expediente_id: event.expediente_id || '', compareciente_id: event.compareciente_id || '',
      recordatorios: Array.isArray(event.recordatorios) ? event.recordatorios : [],
    });
    setCancelReason('');
    setShowEditor(true);
  };

  const saveEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!actorId || !form.responsable_id) return addToast('Selecciona un usuario responsable', 'error');
    setSaving(true);
    try {
      const payload = {
        ...form,
        actor_user_id: actorId,
        fecha_inicio: new Date(form.fecha_inicio).toISOString(),
        fecha_fin: form.fecha_fin ? new Date(form.fecha_fin).toISOString() : null,
        expediente_id: form.expediente_id || null,
        compareciente_id: form.compareciente_id || null,
        idempotency_key: selected ? undefined : crypto.randomUUID(),
      };
      if (selected) await agendaService.update(selected.id, payload);
      else await agendaService.create(payload);
      addToast(selected ? 'Evento actualizado' : 'Evento creado', 'success');
      setShowEditor(false);
      await load();
    } catch (err: any) {
      addToast(err.detail || err.message || 'No fue posible guardar el evento', 'error');
    } finally { setSaving(false); }
  };

  const cancelEvent = async () => {
    if (!selected || cancelReason.trim().length < 5) return addToast('Escribe un motivo de al menos 5 caracteres', 'error');
    setSaving(true);
    try {
      await agendaService.cancel(selected.id, { actor_user_id: actorId, motivo_cancelacion: cancelReason.trim() });
      addToast('Evento cancelado con trazabilidad', 'success');
      setShowEditor(false);
      await load();
    } catch (err: any) { addToast(err.detail || err.message, 'error'); }
    finally { setSaving(false); }
  };

  const completeTask = async (task: AgendaTask) => {
    try {
      await agendaService.updateTask(task.id, { estatus: 'COMPLETADA', actor_user_id: actorId });
      addToast('Tarea completada', 'success');
      await load();
    } catch (err: any) { addToast(err.message, 'error'); }
  };

  const moveAnchor = (direction: number) => {
    if (view === 'mes') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1));
    else if (view === 'semana') setAnchor(addDays(anchor, direction * 7));
    else setAnchor(addDays(anchor, direction));
  };

  const title = view === 'mes'
    ? anchor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    : view === 'semana'
      ? `${currentRange.from.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${currentRange.to.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : anchor.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const renderEvent = (event: AgendaEvent) => (
    <button key={event.id} type="button" onClick={() => openEdit(event)} className="w-full text-left rounded-lg border px-2.5 py-2 hover:shadow-sm transition bg-white" style={{ borderLeftWidth: 4, borderLeftColor: event.color }}>
      <span className="block text-xs font-bold text-slate-900 truncate">{event.titulo}</span>
      <span className="block text-[10px] text-slate-500 truncate">{event.todo_el_dia ? 'Todo el día' : new Date(event.fecha_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · {EVENT_LABELS[event.tipo]}</span>
    </button>
  );

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-7 space-y-5">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Operación diaria</span>
          <h1 className="text-3xl font-black text-slate-950 flex items-center gap-3"><CalendarDays className="text-amber-600" /> Agenda</h1>
          <p className="text-sm text-slate-500 mt-1">Firmas, citas, vencimientos y seguimientos vinculados al expediente.</p>
        </div>
        <button type="button" onClick={() => openCreate(new Date())} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold hover:bg-slate-800"><Plus size={17} /> Nuevo evento</button>
      </header>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex items-center gap-2">
          <button aria-label="Periodo anterior" onClick={() => moveAnchor(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronLeft size={18} /></button>
          <button onClick={() => setAnchor(new Date())} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold">Hoy</button>
          <button aria-label="Periodo siguiente" onClick={() => moveAnchor(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronRight size={18} /></button>
          <h2 className="ml-2 text-sm md:text-base font-black text-slate-900 capitalize">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['dia', 'semana', 'mes', 'lista'] as AgendaView[]).map((item) => <button key={item} onClick={() => setView(item)} className={`px-3 py-2 rounded-lg text-xs font-bold capitalize ${view === item ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item}</button>)}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
        <label className="relative md:col-span-2"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar evento, folio o responsable" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" /></label>
        <label className="relative"><Filter size={15} className="absolute left-3 top-3 text-slate-400" /><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"><option value="TODOS">Todos los tipos</option>{catalogs.tipos.map((item: any) => <option key={item.tipo} value={item.tipo}>{EVENT_LABELS[item.tipo]}</option>)}</select></label>
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"><option value="TODOS">Todo el despacho</option>{catalogs.usuarios.map((user: any) => <option key={user.id} value={user.id}>{user.nombre} {user.apellido}</option>)}</select>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_310px] gap-5">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[560px]">
          {loading ? <div className="p-12 text-center text-slate-500">Cargando agenda…</div> : view === 'mes' ? (
            <div>
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">{WEEKDAYS.map((day) => <div key={day} className="p-2 text-center text-[11px] font-bold text-slate-500 uppercase">{day}</div>)}</div>
              <div className="grid grid-cols-7">{monthDays.map((day) => {
                const inMonth = day.getMonth() === anchor.getMonth();
                const dayEvents = visibleEvents.filter((event) => new Date(event.fecha_inicio).toDateString() === day.toDateString());
                return <div key={day.toISOString()} className={`min-h-28 border-b border-r border-slate-100 p-1.5 ${inMonth ? 'bg-white' : 'bg-slate-50/70'}`}><button onClick={() => openCreate(day)} className={`w-7 h-7 rounded-full text-xs font-bold ${day.toDateString() === new Date().toDateString() ? 'bg-amber-500 text-white' : inMonth ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-400'}`}>{day.getDate()}</button><div className="mt-1 space-y-1">{dayEvents.slice(0, 3).map(renderEvent)}{dayEvents.length > 3 && <button onClick={() => { setAnchor(day); setView('dia'); }} className="text-[10px] font-bold text-blue-700">+{dayEvents.length - 3} más</button>}</div></div>;
              })}</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">{visibleEvents.length ? visibleEvents.map((event) => <div key={event.id} className="p-4 flex gap-4 items-start"><div className="w-16 shrink-0 text-center"><div className="text-xl font-black text-slate-900">{new Date(event.fecha_inicio).getDate()}</div><div className="text-[10px] uppercase font-bold text-slate-500">{new Date(event.fecha_inicio).toLocaleDateString('es-MX', { month: 'short' })}</div></div><div className="flex-1">{renderEvent(event)}{event.expediente && <button onClick={() => navigate(`/expedientes/${event.expediente_id}`)} className="mt-1.5 text-[11px] font-bold text-blue-700 inline-flex items-center gap-1"><ExternalLink size={12} /> {event.expediente.numero_pravia}</button>}</div></div>) : <div className="p-14 text-center"><List className="mx-auto text-slate-300" size={42} /><p className="mt-3 font-bold text-slate-700">No hay eventos en este periodo</p><button onClick={() => openCreate(anchor)} className="mt-3 text-sm font-bold text-amber-700">Crear el primero</button></div>}</div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3"><h2 className="font-black text-slate-900">Tareas abiertas</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{tasks.length}</span></div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">{tasks.slice(0, 20).map((task) => <div key={task.id} className="rounded-xl border border-slate-200 p-3"><div className="flex gap-2"><button aria-label={`Completar ${task.titulo}`} onClick={() => completeTask(task)} className="text-slate-400 hover:text-emerald-600"><CheckCircle2 size={18} /></button><div className="min-w-0"><p className="text-sm font-bold text-slate-900">{task.titulo}</p><p className="text-[11px] text-slate-500">{task.prioridad}{task.fecha_limite ? ` · ${new Date(task.fecha_limite).toLocaleDateString('es-MX')}` : ''}</p>{task.expediente && <button onClick={() => navigate(`/expedientes/${task.expediente_id}`)} className="text-[11px] text-blue-700 font-bold">{task.expediente.numero_pravia}</button>}</div></div></div>)}{tasks.length === 0 && <p className="text-sm text-slate-500 py-5 text-center">Sin tareas abiertas.</p>}</div>
          </div>
        </aside>
      </div>

      {showEditor && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between z-10"><div><p className="text-xs uppercase font-bold text-amber-700">{selected ? 'Editar y mover' : 'Nuevo'}</p><h2 className="text-xl font-black text-slate-950">Evento de agenda</h2></div><button onClick={() => setShowEditor(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
            <form onSubmit={saveEvent} className="p-5 space-y-4">
              <label className="block"><span className="block text-xs font-bold text-slate-700 mb-1">Título</span><input required minLength={3} maxLength={180} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <div className="grid sm:grid-cols-2 gap-3"><label><span className="block text-xs font-bold text-slate-700 mb-1">Tipo</span><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">{Object.entries(EVENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="block text-xs font-bold text-slate-700 mb-1">Responsable</span><select required value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Seleccionar</option>{catalogs.usuarios.map((user: any) => <option key={user.id} value={user.id}>{user.nombre} {user.apellido}</option>)}</select></label></div>
              <div className="grid sm:grid-cols-2 gap-3"><label><span className="block text-xs font-bold text-slate-700 mb-1">Inicio</span><input type="datetime-local" required value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><label><span className="block text-xs font-bold text-slate-700 mb-1">Fin (opcional)</span><input type="datetime-local" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label></div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.todo_el_dia} onChange={(e) => setForm({ ...form, todo_el_dia: e.target.checked })} /> Todo el día</label>
              <div className="grid sm:grid-cols-2 gap-3"><label><span className="block text-xs font-bold text-slate-700 mb-1">Expediente (opcional)</span><select value={form.expediente_id} onChange={(e) => setForm({ ...form, expediente_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Sin vínculo</option>{catalogs.expedientes.map((item: any) => <option key={item.id} value={item.id}>{item.numero_pravia} · {item.cliente_alias}</option>)}</select></label><label><span className="block text-xs font-bold text-slate-700 mb-1">Compareciente (opcional)</span><select value={form.compareciente_id} onChange={(e) => setForm({ ...form, compareciente_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Sin vínculo</option>{catalogs.comparecientes.map((item: any) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label></div>
              <label className="block"><span className="block text-xs font-bold text-slate-700 mb-1">Descripción y contexto</span><textarea rows={3} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 resize-y" /></label>
              <fieldset><legend className="text-xs font-bold text-slate-700 mb-2">Recordatorios preparados</legend><div className="flex flex-wrap gap-2">{[{ n: 15, l: '15 min' }, { n: 60, l: '1 hora' }, { n: 1440, l: '1 día' }].map((item) => <label key={item.n} className={`px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer ${form.recordatorios.includes(item.n) ? 'bg-blue-50 border-blue-300 text-blue-800' : 'border-slate-200 text-slate-600'}`}><input type="checkbox" className="sr-only" checked={form.recordatorios.includes(item.n)} onChange={() => setForm({ ...form, recordatorios: form.recordatorios.includes(item.n) ? form.recordatorios.filter((value) => value !== item.n) : [...form.recordatorios, item.n] })} />{item.l}</label>)}</div></fieldset>
              {selected?.expediente_id && <button type="button" onClick={() => navigate(`/expedientes/${selected.expediente_id}`)} className="text-sm font-bold text-blue-700 inline-flex items-center gap-1"><ExternalLink size={15} /> Abrir expediente relacionado</button>}
              {selected && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><label className="block text-xs font-bold text-rose-800 mb-1">Cancelar con motivo</label><div className="flex gap-2"><input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo obligatorio" className="flex-1 rounded-lg border border-rose-200 px-3 py-2 text-sm" /><button type="button" disabled={saving} onClick={cancelEvent} className="px-3 py-2 rounded-lg bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1"><RotateCcw size={14} /> Cancelar evento</button></div></div>}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200"><button type="button" onClick={() => setShowEditor(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600">Cerrar</button><button disabled={saving} type="submit" className="px-5 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold inline-flex items-center gap-2"><Edit3 size={15} /> {saving ? 'Guardando…' : selected ? 'Guardar cambios' : 'Crear evento'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
