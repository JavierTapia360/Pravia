import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileSearch,
  Gauge,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AIDashboard, aiService } from '../services/ai.service';

const number = new Intl.NumberFormat('es-MX');
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 6 });
const operationLabel = (value: string) => value.replace(/_/g, ' ').toLocaleLowerCase('es-MX').replace(/^./, (letter: string) => letter.toLocaleUpperCase('es-MX'));

export default function Inteligencia() {
  const navigate = useNavigate();
  const [data, setData] = useState<AIDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState('30_DIAS');
  const [usuarioId, setUsuarioId] = useState('TODOS');
  const [operacion, setOperacion] = useState('TODAS');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await aiService.dashboard({ periodo, usuario_id: usuarioId, operacion }));
    } catch (requestError: any) {
      setError(requestError.message || 'No fue posible cargar el centro de inteligencia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [periodo, usuarioId, operacion]);

  if (loading && !data) return <div className="flex min-h-[420px] items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" size={20} />Cargando consumo de IA…</div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.4fr_0.8fr] lg:px-8">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-700"><Sparkles size={17} />Asistencia documental controlada</div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Centro de Inteligencia</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Extracción con fuente, validación determinística, revisión humana y consumo medible. La IA propone; el equipo jurídico decide.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate('/comparecientes/nuevo')} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><FileSearch size={17} />Extraer documentos</button>
              <button type="button" onClick={() => navigate('/expedientes')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Revisar proyecto <ArrowRight size={16} /></button>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Configuración activa</p><p className="mt-1 text-lg font-semibold text-slate-950">{data?.configuracion.modelo_principal}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data?.configuracion.api_key_configurada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{data?.configuracion.api_key_configurada ? 'Proveedor listo' : 'Clave pendiente'}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Escalamiento</dt><dd className="font-semibold text-slate-900">{data?.configuracion.modelo_escalamiento}</dd></div>
              <div><dt className="text-slate-500">Razonamiento</dt><dd className="font-semibold capitalize text-slate-900">{data?.configuracion.razonamiento}</dd></div>
            </dl>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><LockKeyhole className="mt-0.5 shrink-0" size={15} />La clave permanece solo en el servidor. No se muestra ni se guarda en métricas.</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <select value={periodo} onChange={(event) => setPeriodo(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="HOY">Hoy</option><option value="ESTE_MES">Este mes</option><option value="30_DIAS">Últimos 30 días</option><option value="TODO">Todo</option></select>
        <select value={usuarioId} onChange={(event) => setUsuarioId(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="TODOS">Todos los usuarios</option>{data?.usuarios.map((user) => <option key={user.id} value={user.id}>{user.nombre} {user.apellido}</option>)}</select>
        <select value={operacion} onChange={(event) => setOperacion(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="TODAS">Todas las operaciones</option>{data?.operaciones.map((item) => <option key={item} value={item}>{operationLabel(item)}</option>)}</select>
        <button type="button" onClick={() => void load()} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><RefreshCw className={loading ? 'animate-spin' : ''} size={16} />Actualizar</button>
      </section>

      {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle size={17} />{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Solicitudes', value: number.format(data?.metricas.solicitudes || 0), detail: `${data?.metricas.documentos || 0} documentos`, icon: BrainCircuit },
          { label: 'Tokens totales', value: number.format(data?.metricas.total_tokens || 0), detail: `${number.format(data?.metricas.reasoning_tokens || 0)} razonamiento`, icon: Gauge },
          { label: 'Costo estimado', value: money.format(data?.metricas.costo_estimado_usd || 0), detail: 'Sin cargos ocultos', icon: CircleDollarSign },
          { label: 'Escalamientos', value: number.format(data?.metricas.escalaciones || 0), detail: `${data?.metricas.fallidas || 0} solicitudes fallidas`, icon: Sparkles },
        ].map((card) => <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{card.label}</p><card.icon className="text-indigo-600" size={19} /></div><p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.detail}</p></article>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Flujo de confirmación</h2>
          <p className="mt-1 text-sm text-slate-500">Ningún dato jurídico sensible se vuelve definitivo de forma silenciosa.</p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-5">
            {[
              ['1', 'Documento'], ['2', 'Extracción'], ['3', 'Validación'], ['4', 'Revisión humana'], ['5', 'Persistencia'],
            ].map(([step, label]) => <li key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="text-xs font-bold text-indigo-700">{step}</span><p className="mt-1 text-sm font-semibold text-slate-800">{label}</p></li>)}
          </ol>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><CheckCircle2 className="text-emerald-700" size={19} /><p className="mt-2 text-sm font-semibold text-emerald-950">Fuente por campo</p><p className="mt-1 text-xs leading-5 text-emerald-800">Documento, ID, confianza y valor confirmado.</p></div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><AlertTriangle className="text-amber-700" size={19} /><p className="mt-2 text-sm font-semibold text-amber-950">Conflictos visibles</p><p className="mt-1 text-xs leading-5 text-amber-800">Valores distintos no se resuelven arbitrariamente.</p></div>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4"><ShieldCheck className="text-indigo-700" size={19} /><p className="mt-2 text-sm font-semibold text-indigo-950">Reglas primero</p><p className="mt-1 text-xs leading-5 text-indigo-800">CURP, RFC, fechas y montos se validan en código.</p></div>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Jerarquía documental</h2>
          <p className="mt-1 text-sm text-slate-500">Prioridad configurable sin ocultar discrepancias.</p>
          <div className="mt-5 space-y-3">
            {[
              ['RFC', 'Constancia fiscal → documento oficial → ficha'],
              ['Identidad', 'INE o pasaporte → CURP → ficha'],
              ['Domicilio fiscal', 'Constancia de situación fiscal'],
              ['Domicilio particular', 'Comprobante → identificación'],
            ].map(([label, detail]) => <div key={label} className="flex gap-3 rounded-lg border border-slate-200 p-3"><FileCheck2 className="mt-0.5 shrink-0 text-slate-500" size={18} /><div><p className="text-sm font-semibold text-slate-900">{label}</p><p className="text-xs leading-5 text-slate-500">{detail}</p></div></div>)}
          </div>
          <p className="mt-4 flex gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs leading-5 text-slate-200"><Scale className="shrink-0 text-amber-300" size={17} />IA ≠ aprobación jurídica. Todo borrador generado o asistido requiere revisión profesional.</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4"><h2 className="text-lg font-semibold text-slate-950">Solicitudes recientes</h2><p className="text-sm text-slate-500">Uso técnico, duración y costo estimado por operación.</p></div>
        {data?.solicitudes_recientes.length ? <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Operación</th><th className="px-5 py-3">Modelo</th><th className="px-5 py-3">Contexto</th><th className="px-5 py-3 text-right">Tokens</th><th className="px-5 py-3 text-right">Costo</th><th className="px-5 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{data.solicitudes_recientes.map((log) => <tr key={log.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-medium text-slate-900">{operationLabel(log.operacion)}</p><p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString('es-MX')} · {log.duracion_ms} ms</p></td><td className="px-5 py-4"><span className="font-mono text-xs text-slate-700">{log.modelo}</span>{log.escalamiento_utilizado && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Escalado</span>}</td><td className="px-5 py-4 text-slate-600">{log.expediente?.numero_pravia || `${log.documentos_enviados} documento(s)`}</td><td className="px-5 py-4 text-right font-medium">{number.format(log.total_tokens)}</td><td className="px-5 py-4 text-right">{money.format(Number(log.costo_estimado_usd))}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${log.estatus === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{log.estatus === 'COMPLETADO' ? 'Completado' : 'Fallido'}</span></td></tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center"><BrainCircuit className="mx-auto text-slate-300" size={36} /><p className="mt-3 font-semibold text-slate-800">Aún no hay consumo registrado</p><p className="mt-1 text-sm text-slate-500">Las operaciones aparecerán aquí después de una extracción o revisión real.</p></div>}
      </section>
    </div>
  );
}
