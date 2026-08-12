import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Building2, 
  Search, 
  Plus, 
  Archive,
  AlertTriangle,
  CheckCircle2, 
  ChevronRight,
  FolderOpen,
  MapPin,
  X
} from 'lucide-react';
import { comparecientesService, calcularCalidadInformacion } from '../services/comparecientes.service';
import { ModalNuevoCompareciente } from '../components/comparecientes/ModalNuevoCompareciente';

// ─── Modal de confirmación para archivar ────────────────────────────
interface ModalArchivarProps {
  compareciente: any;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
  procesando: boolean;
}

function ModalArchivarCompareciente({ compareciente, onClose, onConfirm, procesando }: ModalArchivarProps) {
  const [motivo, setMotivo] = useState('');

  const isFisica = compareciente?.tipo_persona === 'FISICA';
  const pf = compareciente?.personaFisica || compareciente?.persona_fisica;
  const pm = compareciente?.personaMoral || compareciente?.persona_moral;
  const nombreDisplay = isFisica
    ? (pf?.nombre_completo_calculado || compareciente?.nombre_busqueda)
    : (pm?.razon_social || compareciente?.nombre_busqueda);

  const handleConfirm = async () => {
    await onConfirm(motivo || 'Archivado manualmente desde el catálogo');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Archive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Retirar Compareciente</h3>
              <p className="text-xs text-slate-500">Archivar de forma reversible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nombre del compareciente */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Compareciente</p>
            <p className="text-sm font-bold text-slate-950">{nombreDisplay}</p>
            <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              El registro y sus relaciones se conservarán para trazabilidad.
            </p>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={2}
              placeholder="Ej. Registro duplicado o fuera de operación..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-400 outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 pt-0">
          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={procesando}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {procesando ? 'Procesando...' : 'Archivar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────
export default function Comparecientes() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [total, setTotal] = useState(0);
  const [page] = useState(1);

  const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);
  const [modalArchivar, setModalArchivar] = useState<any | null>(null);
  const [procesandoArchivar, setProcesandoArchivar] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [search, filterTipo, page]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 24, search };
      if (filterTipo === 'FISICA' || filterTipo === 'MORAL') {
        params.tipo_persona = filterTipo;
      }
      const res = await comparecientesService.listarMaster(params);
      if (res?.success) {
        setData(res.data || []);
        setTotal(res.meta?.total || (res.data || []).length);
      }
    } catch (err: any) {
      console.error(err);
      setError('No se pudo cargar el catálogo de personas maestras');
    } finally {
      setLoading(false);
    }
  };

  const handleArchivar = async (motivo: string) => {
    if (!modalArchivar) return;
    setProcesandoArchivar(true);
    try {
      await comparecientesService.archivarCompareciente(modalArchivar.id, { motivo });
      setModalArchivar(null);
      setFeedbackMsg({
        tipo: 'success',
        texto: 'Compareciente archivado correctamente.'
      });
      await fetchData();
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'error', texto: err.message || 'Error al procesar la acción.' });
    } finally {
      setProcesandoArchivar(false);
    }
  };

  const totalFisicas = data.filter((c) => c.tipo_persona === 'FISICA').length;
  const totalMorales = data.filter((c) => c.tipo_persona === 'MORAL').length;

  return (
    <div className="module-page comparecientes-page">
      
      {/* Feedback toast */}
      {feedbackMsg && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
          feedbackMsg.tipo === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {feedbackMsg.tipo === 'success'
            ? <CheckCircle2 className="w-4 h-4" />
            : <AlertTriangle className="w-4 h-4" />}
          {feedbackMsg.texto}
          <button onClick={() => setFeedbackMsg(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. ENCABEZADO */}
      <div className="module-page-header">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Catálogo Único Reutilizable
            </span>
          </div>
          <h1 className="module-title">
            Comparecientes
          </h1>
          <p className="module-description">
            Directorio maestro único de Personas Físicas y Morales reutilizable en Expedientes, Apoderados y Representaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('pravia_alta_session_id');
            localStorage.removeItem('comparecienteAltaSessionId');
            sessionStorage.removeItem('pravia_alta_session_id');
            sessionStorage.removeItem('comparecienteAltaSessionId');
            navigate(`/comparecientes/nuevo?mode=new&nonce=${crypto.randomUUID()}`);
          }}
          className="btn btn-primary btn-lg shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          + Nuevo Compareciente
        </button>
      </div>

      {/* 2. KPI INDICADORES */}
      <div className="metric-grid">
        <div className="surface-card flex items-center gap-4 p-5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="metric-label">Total comparecientes</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{total}</p>
          </div>
        </div>
        <div className="surface-card flex items-center gap-4 p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="metric-label">Personas físicas</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{totalFisicas}</p>
          </div>
        </div>
        <div className="surface-card flex items-center gap-4 p-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="metric-label">Personas morales</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{totalMorales}</p>
          </div>
        </div>
      </div>

      {/* 3. BÚSQUEDA Y FILTROS */}
      <div className="toolbar-card justify-between">
        <div className="relative w-full md:max-w-xl md:flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nombre, Razón Social, CURP, RFC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="control-height w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {(['TODOS', 'FISICA', 'MORAL'] as const).map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFilterTipo(tipo)}
              className={`control-height px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                filterTipo === tipo
                  ? tipo === 'TODOS'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : tipo === 'FISICA'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tipo === 'TODOS' ? 'Todos' : tipo === 'FISICA' ? 'Personas Físicas' : 'Personas Morales'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. LISTADO DE TARJETAS */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Cargando directorio de comparecientes...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm text-center">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron comparecientes.</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Utiliza el botón "+ Nuevo Compareciente" para registrar una Persona Física o Moral.
          </p>
        </div>
      ) : (
        <div className="entity-grid">
          {data.map((c) => {
            const isFisica = c.tipo_persona === 'FISICA';
            const pf = c.personaFisica || c.persona_fisica;
            const pm = c.personaMoral || c.persona_moral;

            const nombreDisplay = isFisica
              ? (pf?.nombre_completo_calculado || c.nombre_busqueda)
              : (pm?.razon_social || c.nombre_busqueda);

            const rfcDisplay = isFisica ? (pf?.rfc || 'Sin RFC') : (pm?.rfc || 'Sin RFC');
            const curpDisplay = isFisica ? (pf?.curp || 'Sin CURP') : null;
            const expedientesCount = c.expedientes?.length || 0;
            const calidad = calcularCalidadInformacion(c);

            return (
              <div
                key={c.id}
                className="entity-card flex flex-col justify-between group"
              >
                {/* Cuerpo — clic navega al detalle */}
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/comparecientes/${c.id}`)}
                >
                  {/* Fila Superior */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isFisica ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {isFisica ? <UserCheck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      {isFisica ? 'PERSONA FÍSICA' : 'PERSONA MORAL'}
                    </span>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                      {c.estatus || 'ACTIVO'}
                    </span>
                  </div>

                  {/* ── NOMBRE — CONTRASTE ALTO: sin depender de H3 ni variables de tema claro ── */}
                  <div className="mt-2 line-clamp-2 text-lg font-extrabold uppercase leading-snug text-slate-950 transition-colors group-hover:text-amber-800">
                    {nombreDisplay}
                  </div>

                  {/* RFC y CURP — contraste alto legible */}
                  <div className="mt-3 space-y-1 text-xs">
                    <p className="font-mono font-bold text-slate-950">
                      <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-600">RFC: </span>
                      <span>{rfcDisplay}</span>
                    </p>
                    {curpDisplay && (
                      <p className="font-mono font-bold text-slate-950">
                        <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-600">CURP: </span>
                        <span>{curpDisplay}</span>
                      </p>
                    )}
                  </div>

                  {/* Domicilio */}
                  {c.domicilios?.[0] && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-slate-600 line-clamp-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                      {c.domicilios[0].calle} {c.domicilios[0].exterior}, {c.domicilios[0].colonia}
                    </p>
                  )}
                </div>

                {/* Pie */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  
                  {/* Barra de Calidad */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[13px] font-medium">
                      <span className="text-slate-500">Calidad de Información</span>
                      <span className={`font-bold ${
                        calidad.porcentaje >= 85 ? 'text-emerald-700'
                        : calidad.porcentaje >= 60 ? 'text-amber-700'
                        : 'text-rose-700'
                      }`}>
                        {calidad.porcentaje}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          calidad.porcentaje >= 85 ? 'bg-emerald-500'
                          : calidad.porcentaje >= 60 ? 'bg-amber-500'
                          : 'bg-rose-500'
                        }`}
                        style={{ width: `${calidad.porcentaje}%` }}
                      />
                    </div>
                  </div>

                  {/* Acciones de pie */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Botón archivar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalArchivar(c);
                      }}
                      className="flex min-h-9 items-center gap-1 px-2 py-1 text-[13px] font-semibold text-slate-500 transition-colors hover:rounded-lg hover:bg-amber-50 hover:text-amber-700"
                      title="Archivar de forma reversible"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archivar
                    </button>

                    {/* Enlace ficha */}
                    <button
                      type="button"
                      onClick={() => navigate(`/comparecientes/${c.id}`)}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-bold text-amber-800 transition-colors hover:bg-amber-50"
                    >
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      Ver perfil · {expedientesCount} exp.
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ARCHIVAR */}
      {modalArchivar && (
        <ModalArchivarCompareciente
          compareciente={modalArchivar}
          onClose={() => setModalArchivar(null)}
          onConfirm={handleArchivar}
          procesando={procesandoArchivar}
        />
      )}

      {/* MODAL NUEVO COMPARECIENTE */}
      <ModalNuevoCompareciente
        isOpen={isModalNuevoOpen}
        onClose={() => setIsModalNuevoOpen(false)}
        onSuccess={() => fetchData()}
      />

    </div>
  );
}
