import { useEffect, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  FileCheck2,
  Filter,
  Landmark,
  RefreshCw,
  Scale,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { reportesService } from '../services/reportes.service';

const COLORS = ['#d97706', '#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#475569', '#0891b2'];
const currency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value || 0);

export default function Reportes() {
  const [data, setData] = useState<any>(null);
  const [catalogs, setCatalogs] = useState<any>({ usuarios: [], notarias: [], tipos_acto: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ periodo: 'ESTE_MES', desde: '', hasta: '', abogado_id: 'TODOS', gestor_id: 'TODOS', notaria_id: 'TODOS', tipo_acto_id: 'TODOS', estatus: 'TODOS' });

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await reportesService.getSummary(filters)); }
    catch (err: any) { setError(err.message || 'No fue posible generar el reporte'); }
    finally { setLoading(false); }
  };
  useEffect(() => { reportesService.getCatalogs().then((response) => setCatalogs(response.catalogos)).catch(() => undefined); }, []);
  useEffect(() => { load(); }, [filters]);

  const kpi = data?.kpis || {};
  const cards = [
    { label: 'Expedientes nuevos', value: kpi.expedientes_nuevos || 0, note: `${kpi.expedientes_abiertos || 0} abiertos`, icon: BriefcaseBusiness },
    { label: 'Firmados', value: kpi.firmados || 0, note: `${kpi.entregados || 0} entregados`, icon: FileCheck2 },
    { label: 'Tiempo promedio', value: `${kpi.tiempo_promedio_dias || 0} días`, note: 'Apertura a entrega', icon: Clock3 },
    { label: 'Conversión prospecto', value: `${kpi.conversion_prospecto_cotizacion || 0}%`, note: 'A cotización', icon: TrendingUp },
    { label: 'Conversión cotización', value: `${kpi.conversion_cotizacion_expediente || 0}%`, note: 'A expediente', icon: Scale },
    { label: 'Honorarios esperados', value: currency(kpi.honorarios_esperados), note: 'Participación pactada', icon: WalletCards },
    { label: 'Ingreso PRAVIA', value: currency(kpi.ingresos_recibidos_pravia), note: 'Recibido explícitamente', icon: TrendingUp },
    { label: 'Pendiente clientes', value: currency(kpi.pendiente_clientes), note: 'Saldo por cobrar', icon: Users },
    { label: 'Egresos', value: currency(kpi.egresos), note: 'Terceros e internos', icon: Landmark },
    { label: 'Fondos retenidos', value: currency(kpi.fondos_retenidos), note: 'Bajo resguardo', icon: WalletCards },
  ];
  const update = (key: string, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-7 space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><span className="text-xs font-bold uppercase tracking-wider text-amber-700">Inteligencia operativa</span><h1 className="text-3xl font-black text-slate-950 flex items-center gap-3"><BarChart3 className="text-amber-600" /> Reportes</h1><p className="text-sm text-slate-500 mt-1">Indicadores verificables de operación, conversión y finanzas.</p></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Actualizar</button></header>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-600"><Filter size={15} /> Filtros del reporte</div><div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        <select value={filters.periodo} onChange={(e) => update('periodo', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="HOY">Hoy</option><option value="ESTA_SEMANA">Esta semana</option><option value="ESTE_MES">Este mes</option><option value="ESTE_ANO">Este año</option><option value="TODOS">Todo</option><option value="PERSONALIZADO">Personalizado</option></select>
        <select value={filters.abogado_id} onChange={(e) => update('abogado_id', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="TODOS">Todos los abogados</option>{catalogs.usuarios.map((item: any) => <option key={`a-${item.id}`} value={item.id}>{item.nombre} {item.apellido}</option>)}</select>
        <select value={filters.gestor_id} onChange={(e) => update('gestor_id', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="TODOS">Todos los gestores</option>{catalogs.usuarios.map((item: any) => <option key={`g-${item.id}`} value={item.id}>{item.nombre} {item.apellido}</option>)}</select>
        <select value={filters.notaria_id} onChange={(e) => update('notaria_id', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="TODOS">Todas las notarías</option>{catalogs.notarias.map((item: any) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
        <select value={filters.tipo_acto_id} onChange={(e) => update('tipo_acto_id', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="TODOS">Todos los actos</option>{catalogs.tipos_acto.map((item: any) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
        <select value={filters.estatus} onChange={(e) => update('estatus', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="TODOS">Todos los estados</option>{['ABIERTO', 'EN_INTEGRACION', 'EN_PROCESO', 'PENDIENTE_CLIENTE', 'PENDIENTE_NOTARIA', 'FIRMA_PROGRAMADA', 'FIRMADO', 'POST_FIRMA', 'LISTO_ENTREGA', 'ENTREGADO', 'SUSPENDIDO', 'CANCELADO'].map((item) => <option key={item} value={item}>{item}</option>)}</select>
        {filters.periodo === 'PERSONALIZADO' && <div className="flex gap-1"><input type="date" value={filters.desde} onChange={(e) => update('desde', e.target.value)} className="min-w-0 w-1/2 rounded-xl border border-slate-200 px-2 py-2 text-xs" /><input type="date" value={filters.hasta} onChange={(e) => update('hasta', e.target.value)} className="min-w-0 w-1/2 rounded-xl border border-slate-200 px-2 py-2 text-xs" /></div>}
      </div></section>

      {error && <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">{cards.map((card) => <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"><card.icon size={20} className="text-amber-600 mb-3" /><p className="text-xl font-black text-slate-950 truncate" title={String(card.value)}>{card.value}</p><p className="text-xs font-bold text-slate-700">{card.label}</p><p className="text-[11px] text-slate-500 mt-1">{card.note}</p></div>)}</section>

      {loading ? <div className="p-16 text-center text-slate-500">Calculando indicadores…</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          <ChartCard title="Expedientes por tipo de acto" subtitle="Distribución de nuevas operaciones"><ResponsiveContainer width="100%" height={290}><BarChart data={data?.desglose?.por_tipo_acto || []} layout="vertical" margin={{ left: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="nombre" width={125} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="total" name="Expedientes" fill="#d97706" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Distribución por estado" subtitle="Carga operativa del periodo"><ResponsiveContainer width="100%" height={290}><PieChart><Pie data={data?.desglose?.por_estatus || []} dataKey="total" nameKey="nombre" innerRadius={62} outerRadius={102} paddingAngle={2}>{(data?.desglose?.por_estatus || []).map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Carga por abogado" subtitle="Expedientes abiertos en el periodo"><ResponsiveContainer width="100%" height={290}><BarChart data={data?.desglose?.por_abogado || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="nombre" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" name="Expedientes" fill="#1d4ed8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Tendencia de operación" subtitle="Aperturas, firmas y entregas por mes"><ResponsiveContainer width="100%" height={290}><LineChart data={data?.desglose?.tendencia || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="periodo" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="nuevos" stroke="#1d4ed8" strokeWidth={2} /><Line type="monotone" dataKey="firmados" stroke="#d97706" strokeWidth={2} /><Line type="monotone" dataKey="entregados" stroke="#0f766e" strokeWidth={2} /></LineChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Operación por notaría" subtitle="Volumen de expedientes vinculados"><div className="space-y-3 pt-2">{(data?.desglose?.por_notaria || []).slice(0, 10).map((item: any, index: number) => <div key={item.id}><div className="flex justify-between text-xs mb-1"><span className="font-bold text-slate-700 truncate">{item.nombre}</span><span className="text-slate-500">{item.total}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(4, (item.total / Math.max(1, data.kpis.expedientes_nuevos)) * 100)}%` }} /></div></div>)}{!(data?.desglose?.por_notaria || []).length && <p className="text-sm text-slate-500 text-center py-12">Sin datos para el periodo.</p>}</div></ChartCard>
          <ChartCard title="Responsabilidad de gestoría" subtitle="Asignación de expedientes"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="py-2">Gestor</th><th className="py-2 text-right">Expedientes</th></tr></thead><tbody>{(data?.desglose?.por_gestor || []).map((item: any) => <tr key={item.id} className="border-b border-slate-100"><td className="py-3 font-semibold text-slate-800">{item.nombre}</td><td className="py-3 text-right font-black">{item.total}</td></tr>)}</tbody></table></div></ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"><h2 className="font-black text-slate-900">{title}</h2><p className="text-xs text-slate-500 mb-4">{subtitle}</p>{children}</section>;
}

