import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  Building2,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  PieChart,
  ShieldCheck,
  FileText,
  UserCheck,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Download
} from 'lucide-react';
import { useAuthStore } from '../App';
import {
  finanzasService,
  KPIFinancieroGlobal,
  ExpedienteItemFinanciero,
  MovimientoGlobalItem,
  CobranzaItem,
  EgresoItem,
  HonorariosDesgloseItem
} from '../services/finanzas.service';

export default function Finanzas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const userRole = user?.rol || 'DIRECCION';

  // Control de Pestañas
  const tabParam = searchParams.get('tab') || 'resumen';
  const [activeTab, setActiveTab] = useState<'resumen' | 'movimientos' | 'cobranza' | 'egresos' | 'honorarios'>(
    (tabParam as any) || 'resumen'
  );

  const setTab = (t: 'resumen' | 'movimientos' | 'cobranza' | 'egresos' | 'honorarios') => {
    setActiveTab(t);
    setSearchParams({ tab: t });
  };

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab Resumen
  const [kpis, setKpis] = useState<KPIFinancieroGlobal>({
    honorarios_esperados: 0,
    honorarios_generados: 0,
    ingreso_real_recibido: 0,
    total_cobrado_clientes: 0,
    pendiente_cobro: 0,
    egresos_realizados: 0,
    pendiente_pago: 0,
    saldo_terceros: 0,
    fondos_retenidos: 0,
    utilidad_pravia: 0,
    participacion_pravia: 0,
    total_presupuestado_general: 0
  });
  const [expedientes, setExpedientes] = useState<ExpedienteItemFinanciero[]>([]);

  // Tab Movimientos
  const [movimientos, setMovimientos] = useState<MovimientoGlobalItem[]>([]);

  // Tab Cobranza
  const [cobranzaKpis, setCobranzaKpis] = useState({
    total_por_cobrar: 0,
    expedientes_con_saldo: 0,
    firmados_con_saldo: 0,
    firmas_proximas_con_saldo: 0
  });
  const [cobranzaList, setCobranzaList] = useState<CobranzaItem[]>([]);

  // Tab Egresos
  const [egresosSummary, setEgresosSummary] = useState<{
    total_egresos_realizados: number;
    por_categoria: Record<string, number>;
  }>({ total_egresos_realizados: 0, por_categoria: {} });
  const [egresosList, setEgresosList] = useState<EgresoItem[]>([]);

  // Tab Honorarios PRAVIA
  const [honorariosKpis, setHonorariosKpis] = useState({
    honorarios_esperados: 0,
    honorarios_generados: 0,
    honorarios_cobrados: 0,
    honorarios_pendientes: 0
  });
  const [honorariosDesglose, setHonorariosDesglose] = useState<{
    por_abogado: HonorariosDesgloseItem[];
    por_notaria: HonorariosDesgloseItem[];
    por_tipo_acto: HonorariosDesgloseItem[];
  }>({ por_abogado: [], por_notaria: [], por_tipo_acto: [] });

  // Catálogos para Filtros
  const [catalogos, setCatalogos] = useState<{
    notarias: Array<{ id: string; nombre: string; numero_notaria: string }>;
    abogados: Array<{ id: string; nombre: string; apellido: string; rol: string }>;
    tipos_acto: Array<{ id: string; nombre: string }>;
    estatus_expediente: string[];
  }>({ notarias: [], abogados: [], tipos_acto: [], estatus_expediente: [] });

  // Filtros Globales
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState('TODOS');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [notariaId, setNotariaId] = useState('TODOS');
  const [abogadoId, setAbogadoId] = useState('TODOS');
  const [tipoActoId, setTipoActoId] = useState('TODOS');
  const [estadoCobro, setEstadoCobro] = useState('TODOS');
  const [naturalezaFilter, setNaturalezaFilter] = useState('TODOS');

  // Cargar Catálogos Iniciales
  useEffect(() => {
    finanzasService
      .getCatalogos()
      .then((res) => {
        if (res?.success) setCatalogos(res.catalogos);
      })
      .catch(() => {});
  }, []);

  // Cargar Datos según pestaña activa
  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams: Record<string, string> = {
        search,
        periodo,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        notaria_id: notariaId,
        abogado_id: abogadoId,
        tipo_acto_id: tipoActoId,
        estado_cobro: estadoCobro,
        naturaleza: naturalezaFilter
      };

      if (activeTab === 'resumen') {
        const res = await finanzasService.getResumen(filterParams);
        if (res.success) {
          setKpis(res.kpis);
          setExpedientes(res.expedientes || []);
        }
      } else if (activeTab === 'movimientos') {
        const res = await finanzasService.getMovimientos(filterParams);
        if (res.success) {
          setMovimientos(res.movimientos || []);
        }
      } else if (activeTab === 'cobranza') {
        const res = await finanzasService.getCobranza(filterParams);
        if (res.success) {
          setCobranzaKpis(res.kpis);
          setCobranzaList(res.cobranza || []);
        }
      } else if (activeTab === 'egresos') {
        const res = await finanzasService.getEgresos(filterParams);
        if (res.success) {
          setEgresosSummary(res.summary);
          setEgresosList(res.egresos || []);
        }
      } else if (activeTab === 'honorarios') {
        const res = await finanzasService.getHonorarios(filterParams);
        if (res.success) {
          setHonorariosKpis(res.kpis);
          setHonorariosDesglose(res.desglose);
        }
      }
    } catch (err: any) {
      console.error('[FINANZAS] Error cargando datos:', err);
      setError(err.message || 'Error al conectar con el servidor financiero');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [activeTab, search, periodo, fechaDesde, fechaHasta, notariaId, abogadoId, tipoActoId, estadoCobro, naturalezaFilter]);

  // Formateadores
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* ── 1. ENCABEZADO Y CONTROL DE PERMISOS / ROL DE USUARIO ────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Centro Financiero Global
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-900 text-slate-100">
              Rol: {userRole}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-amber-600" />
            Administración Financiera PRAVIA OS
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Control económico consolidado del despacho, cobranza, egresos a terceros y honorarios esperados, generados y recibidos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ── 2. NAVEGACIÓN POR PESTAÑAS PRINCIPALES ──────────────────────── */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 p-1.5 rounded-2xl gap-1">
        {[
          { id: 'resumen', label: 'Resumen General', icon: <PieChart className="w-4 h-4" /> },
          { id: 'movimientos', label: 'Movimientos', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'cobranza', label: 'Cobranza', icon: <Clock className="w-4 h-4" /> },
          { id: 'egresos', label: 'Egresos a Terceros', icon: <ArrowUpRight className="w-4 h-4" /> },
          { id: 'honorarios', label: 'Honorarios PRAVIA', icon: <TrendingUp className="w-4 h-4" /> }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === t.id
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 3. BARRA DE FILTROS GLOBAL ──────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          
          {/* Búsqueda */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por folio, cliente, concepto, notaría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>

          {/* Periodo */}
          <div>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none font-semibold"
            >
              <option value="TODOS">Periodo: Todos</option>
              <option value="HOY">Hoy</option>
              <option value="ESTA_SEMANA">Esta semana</option>
              <option value="ESTE_MES">Este mes</option>
              <option value="ESTE_ANO">Este año</option>
            </select>
          </div>

          {/* Notaría */}
          <div>
            <select
              value={notariaId}
              onChange={(e) => setNotariaId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none font-semibold"
            >
              <option value="TODOS">Notaría: Todas</option>
              {catalogos.notarias.map((n) => (
                <option key={n.id} value={n.id}>
                  Notaría No. {n.numero_notaria || 'S/N'} - {n.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Abogado */}
          <div>
            <select
              value={abogadoId}
              onChange={(e) => setAbogadoId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none font-semibold"
            >
              <option value="TODOS">Abogado: Todos</option>
              {catalogos.abogados.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.apellido}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Acto */}
          <div>
            <select
              value={tipoActoId}
              onChange={(e) => setTipoActoId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none font-semibold"
            >
              <option value="TODOS">Acto: Todos</option>
              {catalogos.tipos_acto.map((ta) => (
                <option key={ta.id} value={ta.id}>
                  {ta.nombre}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Fila secundaria de fechas y estado */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Fechas:
            </span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Estado de Cobro:</span>
            <select
              value={estadoCobro}
              onChange={(e) => setEstadoCobro(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs font-semibold"
            >
              <option value="TODOS">Todos</option>
              <option value="PAGADO">Solo Pagados</option>
              <option value="PENDIENTE">Con Saldo Pendiente</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. CONTENIDO SEGÚN LA PESTAÑA ACTIVA ─────────────────────────── */}

      {/* ────────────────── PESTAÑA 1: RESUMEN GENERAL ────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="space-y-8">
          
          {/* TABLERO SUPERIOR CON INDICADORES CONTABLES SEPARADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Honorarios Esperados */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Honorarios Esperados</span>
              <p className="text-xl font-black text-purple-900 truncate" title={formatCurrency(kpis.honorarios_esperados)}>
                {formatCurrency(kpis.honorarios_esperados)}
              </p>
              <p className="text-[11px] text-slate-500">Operaciones aceptadas / activas</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-cyan-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Saldo a Terceros</span>
              <p className="text-xl font-black text-cyan-900 truncate" title={formatCurrency(kpis.saldo_terceros)}>
                {formatCurrency(kpis.saldo_terceros)}
              </p>
              <p className="text-[11px] text-slate-500">Notaría, impuestos y proveedores por cubrir</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-violet-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Fondos Retenidos</span>
              <p className="text-xl font-black text-violet-900 truncate" title={formatCurrency(kpis.fondos_retenidos)}>
                {formatCurrency(kpis.fondos_retenidos)}
              </p>
              <p className="text-[11px] text-slate-500">Dinero de clientes aún bajo resguardo</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Utilidad PRAVIA</span>
              <p className="text-xl font-black text-emerald-900 truncate" title={formatCurrency(kpis.utilidad_pravia)}>
                {formatCurrency(kpis.utilidad_pravia)}
              </p>
              <p className="text-[11px] text-slate-500">Honorarios recibidos menos gastos internos</p>
            </div>

            {/* 2. Honorarios Generados */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Honorarios Generados</span>
              <p className="text-xl font-black text-blue-900 truncate" title={formatCurrency(kpis.honorarios_generados)}>
                {formatCurrency(kpis.honorarios_generados)}
              </p>
              <p className="text-[11px] text-slate-500">De expedientes ya firmados</p>
            </div>

            {/* 3. Ingreso Real Recibido */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Ingreso Real Recibido</span>
              <p className="text-xl font-black text-emerald-700 truncate" title={formatCurrency(kpis.ingreso_real_recibido)}>
                {formatCurrency(kpis.ingreso_real_recibido)}
              </p>
              <p className="text-[11px] text-emerald-600">Dinero cobrado por PRAVIA</p>
            </div>

            {/* 4. Total Cobrado a Clientes */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Total Cobrado Clientes</span>
              <p className="text-xl font-black text-indigo-900 truncate" title={formatCurrency(kpis.total_cobrado_clientes)}>
                {formatCurrency(kpis.total_cobrado_clientes)}
              </p>
              <p className="text-[11px] text-slate-500">Ingresos brutos validados</p>
            </div>

            {/* 5. Pendiente de Cobro */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Pendiente de Cobro</span>
              <p className="text-xl font-black text-rose-700 truncate" title={formatCurrency(kpis.pendiente_cobro)}>
                {formatCurrency(kpis.pendiente_cobro)}
              </p>
              <p className="text-[11px] text-rose-600">Adeudo total de clientes</p>
            </div>

            {/* 6. Egresos Realizados */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Egresos Realizados</span>
              <p className="text-xl font-black text-amber-800 truncate" title={formatCurrency(kpis.egresos_realizados)}>
                {formatCurrency(kpis.egresos_realizados)}
              </p>
              <p className="text-[11px] text-amber-700">Pagados a Notaría y Terceros</p>
            </div>

            {/* 7. Pendiente de Pago */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Pendiente de Pago</span>
              <p className="text-xl font-black text-orange-900 truncate" title={formatCurrency(kpis.pendiente_pago)}>
                {formatCurrency(kpis.pendiente_pago)}
              </p>
              <p className="text-[11px] text-orange-700">Terceros por cubrir</p>
            </div>

            {/* 8. Participación PRAVIA */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Participación PRAVIA</span>
              <p className="text-xl font-black text-slate-900 truncate" title={formatCurrency(kpis.participacion_pravia)}>
                {formatCurrency(kpis.participacion_pravia)}
              </p>
              <p className="text-[11px] text-slate-500">Participación interna pactada</p>
            </div>

          </div>

          {/* CONSOLIDADO FINANCIERO POR EXPEDIENTE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-600" />
                Consolidado Financiero por Expediente ({expedientes.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Folio / Acto</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Notaría</th>
                    <th className="py-3 px-4">Abogado</th>
                    <th className="py-3 px-4 text-right">Presupuesto</th>
                    <th className="py-3 px-4 text-right">Cobrado</th>
                    <th className="py-3 px-4 text-right">Pendiente Cobro</th>
                    <th className="py-3 px-4 text-right">Egresos</th>
                    <th className="py-3 px-4 text-right">Hon. Generados</th>
                    <th className="py-3 px-4 text-right">Ingreso Real</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {expedientes.map((item) => (
                    <tr key={item.expediente_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{item.folio}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{item.tipo_acto}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="line-clamp-1 max-w-[150px]" title={item.cliente}>{item.cliente}</div>
                        <div className="text-[10px] text-slate-400">Apertura: {formatDate(item.fecha_apertura)}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="line-clamp-1 max-w-[140px]" title={item.notaria}>{item.notaria}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{item.abogado}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.total_presupuestado)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(item.total_cobrado)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(item.saldo_pendiente)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                        {formatCurrency(item.total_egresado)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">
                        {formatCurrency(item.honorarios_generados)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900">
                        {formatCurrency(item.ingreso_real_honorarios)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.estado_financiero === 'LIQUIDADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado_financiero === 'ANTICIPO_RECIBIDO'
                            ? 'bg-blue-100 text-blue-800'
                            : item.estado_financiero === 'PAGO_PARCIAL'
                            ? 'bg-indigo-100 text-indigo-800'
                            : item.estado_financiero === 'CON_EGRESOS_PENDIENTES'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.estado_financiero}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/expedientes/${item.expediente_id}?tab=financiero`)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          Abrir <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ────────────────── PESTAÑA 2: MOVIMIENTOS GLOBALES ─────────────── */}
      {activeTab === 'movimientos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              Historial Consolidado de Movimientos Financieros ({movimientos.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Expediente / Cliente</th>
                  <th className="py-3 px-4">Tipo / Nat.</th>
                  <th className="py-3 px-4">Categoría / Concepto</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4">Forma Pago</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4 text-center">Estatus</th>
                  <th className="py-3 px-4 text-center">Comprobante / Factura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{formatDate(m.fecha)}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{m.folio_expediente}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{m.cliente}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.naturaleza === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.naturaleza} · {m.tipo_movimiento}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{m.concepto}</div>
                      <div className="text-[10px] text-slate-400">{m.categoria}</div>
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                      m.naturaleza === 'INGRESO' ? 'text-emerald-700' : 'text-amber-800'
                    }`}>
                      {formatCurrency(m.monto)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{m.forma_pago}</td>
                    <td className="py-3 px-4 text-slate-700">{m.usuario_registro}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.estatus === 'VALIDADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.estatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.comprobante_url ? (
                        <a href={m.comprobante_url} target="_blank" rel="noreferrer" className="text-amber-700 font-bold hover:underline">
                          PDF
                        </a>
                      ) : (
                        <span className="text-slate-400">Sin archivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── PESTAÑA 3: COBRANZA ─────────────────────────── */}
      {activeTab === 'cobranza' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Por Cobrar Total</span>
              <p className="text-xl font-black text-rose-800">{formatCurrency(cobranzaKpis.total_por_cobrar)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Expedientes con Saldo</span>
              <p className="text-xl font-black text-slate-900">{cobranzaKpis.expedientes_con_saldo}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Firmados con Saldo</span>
              <p className="text-xl font-black text-purple-900">{cobranzaKpis.firmados_con_saldo}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Firmas Próximas con Saldo</span>
              <p className="text-xl font-black text-amber-800">{cobranzaKpis.firmas_proximas_con_saldo}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Expedientes con Saldos Pendientes de Cobro ({cobranzaList.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Folio</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Abogado</th>
                    <th className="py-3 px-4 text-right">Presupuesto</th>
                    <th className="py-3 px-4 text-right">Pagado</th>
                    <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                    <th className="py-3 px-4 text-center">Firma / Atraso</th>
                    <th className="py-3 px-4 text-center">Alerta</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {cobranzaList.map((c) => (
                    <tr key={c.expediente_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.folio}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.cliente}</td>
                      <td className="py-3 px-4 text-slate-700">{c.abogado}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(c.total_operacion)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{formatCurrency(c.pagado)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">{formatCurrency(c.saldo)}</td>
                      <td className="py-3 px-4 text-center">
                        <div>{formatDate(c.fecha_firma)}</div>
                        {c.dias_atraso > 0 && <div className="text-[10px] font-bold text-rose-600">{c.dias_atraso} días atraso</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.alerta === 'FIRMADO_CON_SALDO'
                            ? 'bg-rose-100 text-rose-800'
                            : c.alerta === 'FIRMA_PROXIMA_CON_SALDO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.alerta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/expedientes/${c.expediente_id}?tab=financiero`)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          Abrir <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── PESTAÑA 4: EGRESOS A TERCEROS ──────────────── */}
      {activeTab === 'egresos' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Total Egresos a Notaría y Terceros</span>
              <p className="text-2xl font-black text-amber-900">{formatCurrency(egresosSummary.total_egresos_realizados)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                Historial de Egresos Realizados ({egresosList.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Expediente</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4">Forma Pago</th>
                    <th className="py-3 px-4 text-center">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {egresosList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{formatDate(e.fecha)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{e.folio_expediente}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{e.cliente}</td>
                      <td className="py-3 px-4 text-slate-700">{e.categoria}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{e.concepto}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">{formatCurrency(e.monto)}</td>
                      <td className="py-3 px-4 text-slate-700">{e.forma_pago}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {e.estatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── PESTAÑA 5: HONORARIOS PRAVIA ───────────────── */}
      {activeTab === 'honorarios' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Honorarios Esperados</span>
              <p className="text-xl font-black text-purple-900">{formatCurrency(honorariosKpis.honorarios_esperados)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Honorarios Generados</span>
              <p className="text-xl font-black text-blue-900">{formatCurrency(honorariosKpis.honorarios_generados)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Honorarios Cobrados</span>
              <p className="text-xl font-black text-emerald-700">{formatCurrency(honorariosKpis.honorarios_cobrados)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Honorarios Pendientes</span>
              <p className="text-xl font-black text-rose-700">{formatCurrency(honorariosKpis.honorarios_pendientes)}</p>
            </div>
          </div>

          {/* Desglose por Abogado */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-600" />
              Desglose de Honorarios por Abogado
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Abogado</th>
                    <th className="py-2.5 px-3 text-right">Esperados</th>
                    <th className="py-2.5 px-3 text-right">Generados</th>
                    <th className="py-2.5 px-3 text-right">Cobrados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {honorariosDesglose.por_abogado.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.nombre}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-900 font-bold">{formatCurrency(item.esperados)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-900 font-bold">{formatCurrency(item.generados)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">{formatCurrency(item.cobrados)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
