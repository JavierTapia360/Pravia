import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  UserCheck, 
  Building2, 
  Edit3, 
  Check, 
  X, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Briefcase, 
  Users, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Eye, 
  ExternalLink,
  Plus,
  ShieldCheck,
  FolderPlus,
  UploadCloud,
  RefreshCw,
  Folder
} from 'lucide-react';
import { comparecientesService } from '../services/comparecientes.service';
import { api } from '../services/api';

const DOCUMENT_CATEGORY_BY_FOLDER: Record<string, string> = {
  'Identificación': 'IDENTIFICACION',
  'Identificaciones': 'IDENTIFICACION',
  'Fiscal': 'CONSTANCIA_FISCAL',
  'Domicilio': 'COMPROBANTE_DOMICILIO',
  'Estado Civil': 'REGIMEN_MATRIMONIAL',
  'Migratorio': 'DOCUMENTO_MIGRATORIO',
  'Poderes': 'PODERES',
  'Constitución': 'ACTA_CONSTITUTIVA',
  'Representación': 'PODERES',
  'Registro Mercantil': 'INSCRIPCION_MERCANTIL',
  'Otros': 'OTROS',
};

export default function ComparecienteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as any;

  const [compareciente, setCompareciente] = useState<any>(null);
  const [archivoDocs, setArchivoDocs] = useState<any[]>([]);
  const [carpetasSugeridas, setCarpetasSugeridas] = useState<string[]>([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<string>('TODAS');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'general' | 'domicilios' | 'identificaciones' | 'documentos' | 'corporativo' | 'expedientes'>(
    initialTab === 'documentos' ? 'documentos' : 'general'
  );

  const [docVisorSeleccionado, setDocVisorSeleccionado] = useState<any | null>(null);
  const [subiendoNuevoDoc, setSubiendoNuevoDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (id === 'nuevo') {
      localStorage.removeItem('pravia_alta_session_id');
      localStorage.removeItem('comparecienteAltaSessionId');
      sessionStorage.removeItem('pravia_alta_session_id');
      sessionStorage.removeItem('comparecienteAltaSessionId');
      navigate(`/comparecientes/nuevo?mode=new&nonce=${crypto.randomUUID()}`, { replace: true });
      return;
    }
    if (id) {
      fetchDetail(id);
      fetchDocumentos(id);
    }
  }, [id]);

  const fetchDetail = async (compMasterId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await comparecientesService.obtenerPorId(compMasterId);
      setCompareciente(res?.data || res);
    } catch (err: any) {
      console.error(err);
      setError('No se pudo cargar la Ficha Maestra del Compareciente');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentos = async (compMasterId: string) => {
    try {
      const data = await api.get(`/comparecientes/${compMasterId}/documentos`);
      if (data.success && data.data) {
        setArchivoDocs(data.data.documentos || []);
        setCarpetasSugeridas(data.data.carpetas_sugeridas || []);
      }
    } catch (err) {
      console.error('Error cargando archivo documental:', err);
    }
  };

  const handleUploadNuevoDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !id) return;
    const file = e.target.files[0];

    setSubiendoNuevoDoc(true);
    setDocUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoria', carpetaSeleccionada === 'TODAS' ? 'OTROS' : (DOCUMENT_CATEGORY_BY_FOLDER[carpetaSeleccionada] || 'OTROS'));

      const data = await api.upload(`/comparecientes/${id}/documentos`, formData);
      if (data.success) {
        await fetchDocumentos(id);
      } else {
        throw new Error(data.error || 'No fue posible cargar el documento.');
      }
    } catch (err: any) {
      setDocUploadError(err.message || 'No fue posible cargar el documento.');
    } finally {
      setSubiendoNuevoDoc(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <span>Cargando Ficha Maestra del Compareciente...</span>
        </div>
      </div>
    );
  }

  if (error || !compareciente) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error || 'No se encontró el compareciente.'}</span>
        </div>
      </div>
    );
  }

  const isFisica = compareciente.tipo_persona === 'FISICA';
  const pf = compareciente.personaFisica;
  const pm = compareciente.personaMoral;

  const nombreMostrar = isFisica
    ? pf?.nombre_completo_calculado || `${pf?.nombre || ''} ${pf?.apellido_paterno || ''}`.trim()
    : pm?.razon_social || 'Persona Moral';

  const docsFiltrados = carpetaSeleccionada === 'TODAS'
    ? archivoDocs
    : archivoDocs.filter((d) => (d.categoria || '').toUpperCase().includes(carpetaSeleccionada.toUpperCase()));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/comparecientes')}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-gold-600 dark:text-slate-400 dark:hover:text-gold-400 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
          </button>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${isFisica ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}`}>
              {isFisica ? 'Persona Física' : 'Persona Moral'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {nombreMostrar}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/comparecientes/nuevo')}
            className="px-4 py-2 rounded-xl bg-gold hover:bg-gold-light text-slate-950 font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Compareciente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'general'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Datos Generales
        </button>
        <button
          onClick={() => setActiveTab('documentos')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'documentos'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FolderPlus className="w-4 h-4" /> Archivo Documental ({archivoDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('expedientes')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'expedientes'
              ? 'border-gold-500 text-gold-600 dark:text-gold-400'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Expedientes Relacionados
        </button>
      </div>

      {/* CONTENIDO PESTAÑAS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
        {/* PESTAÑA DATOS GENERALES */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Información de Identidad y Registro
            </h3>

            {isFisica ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">Nombre Completo</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{pf?.nombre_completo_calculado}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">CURP</p>
                  <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">{pf?.curp || 'No registrado'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">RFC</p>
                  <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">{pf?.rfc || 'No registrado'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">Estado Civil</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{pf?.estado_civil || 'No registrado'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">Régimen Matrimonial</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{pf?.regimen_matrimonial || 'No registrado'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">PEP (Persona Políticamente Expuesta)</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{pf?.pep_estado || (pf?.pep ? 'SI' : 'NO')}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">Nacimiento</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {[pf?.lugar_nacimiento, pf?.pais_nacimiento].filter(Boolean).join(', ') || 'No registrado'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">Nacionalidad / calidad migratoria</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {[pf?.nacionalidad, pf?.calidad_migratoria].filter(Boolean).join(' · ') || 'No registrado'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">Ocupación / escolaridad</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {[pf?.ocupacion, pf?.escolaridad].filter(Boolean).join(' · ') || 'No registrado'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">Actividad económica / giro</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {[pf?.actividad_economica, pf?.giro].filter(Boolean).join(' · ') || 'No registrado'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 md:col-span-2">
                  <p className="text-[11px] font-medium text-slate-400">Alias</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {compareciente.aliases?.map((item: any) => item.alias).join(', ') || 'Sin alias registrados'}
                  </p>
                </div>
                {pf?.pep_estado === 'SI' && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20">
                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Relación PEP</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{pf?.relacion_pep || 'Pendiente de documentar'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 md:col-span-2">
                  <p className="text-[11px] font-medium text-slate-400">Razón Social</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{pm?.razon_social}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <p className="text-[11px] font-medium text-slate-400">RFC</p>
                  <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">{pm?.rfc || 'No registrado'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-400" /> Domicilios</h4>
                <div className="mt-3 space-y-3">
                  {compareciente.domicilios?.length ? compareciente.domicilios.map((domicilio: any) => (
                    <div key={domicilio.id} className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{domicilio.tipo}{domicilio.principal ? ' · Principal' : ''}</span>
                      <p>{[domicilio.calle, domicilio.exterior, domicilio.colonia, domicilio.municipio, domicilio.estado, domicilio.codigo_postal].filter(Boolean).join(', ') || 'Dirección incompleta'}</p>
                      <p>{domicilio.comprobado ? 'Comprobado documentalmente' : 'Sin comprobación documental'}</p>
                    </div>
                  )) : <p className="text-xs text-slate-500">Sin domicilios registrados.</p>}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-400" /> Identificaciones</h4>
                <div className="mt-3 space-y-3">
                  {compareciente.identificaciones?.length ? compareciente.identificaciones.map((identificacion: any) => (
                    <div key={identificacion.id} className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{identificacion.tipo_identificacion}{identificacion.principal ? ' · Principal' : ''}</span>
                      <p>{identificacion.numero || 'Sin folio'} · {identificacion.estatus}</p>
                      <p>{identificacion.autoridad_emisora || 'Autoridad no registrada'}</p>
                    </div>
                  )) : <p className="text-xs text-slate-500">Sin identificaciones registradas.</p>}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Phone className="w-4 h-4 text-amber-400" /> Contactos</h4>
                <div className="mt-3 space-y-3">
                  {compareciente.contactos?.length ? compareciente.contactos.map((contacto: any) => (
                    <div key={contacto.id} className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{contacto.tipo}{contacto.principal ? ' · Principal' : ''}</span>
                      <p>{contacto.valor}</p>
                    </div>
                  )) : <p className="text-xs text-slate-500">Sin contactos registrados.</p>}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* PESTAÑA ARCHIVO DOCUMENTAL MAESTRO REUTILIZABLE */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-amber-400" /> Archivo Documental del Compareciente
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Expediente documental permanente conservado para todos los trámites del compareciente.
                </p>
              </div>

              {/* Botón Cargar Más Documentos */}
              <div>
                <input
                  type="file"
                  id="uploadMasterInput"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleUploadNuevoDoc}
                  className="hidden"
                />
                <label
                  htmlFor="uploadMasterInput"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {subiendoNuevoDoc ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                  <span>+ Cargar Documento al Archivo</span>
                </label>
              </div>
            </div>

            {docUploadError && (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {docUploadError}
              </div>
            )}

            {/* Filtros por Carpetas Sugeridas */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setCarpetaSeleccionada('TODAS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                  carpetaSeleccionada === 'TODAS'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas las Carpetas ({archivoDocs.length})
              </button>

              {carpetasSugeridas.map((carp) => (
                <button
                  key={carp}
                  type="button"
                  onClick={() => setCarpetaSeleccionada(carp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    carpetaSeleccionada === carp
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>{carp}</span>
                </button>
              ))}
            </div>

            {/* Lista de Documentos Confirmados en el Archivo */}
            {docsFiltrados.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docsFiltrados.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-slate-800 rounded-lg text-amber-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase">
                          {docItem.categoria}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200 truncate mt-1">
                          {docItem.nombre}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(docItem.size_bytes / 1024).toFixed(1)} KB • {new Date(docItem.fecha_carga).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Botón Visualizar (Abre Visor Interno Bajo Petición) */}
                      <button
                        type="button"
                        onClick={() => setDocVisorSeleccionado(docItem)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Visualizar documento"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Botón Descargar */}
                      {docItem.url_firmada && (
                        <a
                          href={docItem.url_firmada}
                          download={docItem.nombre}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
                          title="Descargar documento"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-500 text-xs">
                No hay documentos guardados en esta carpeta aún.
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA EXPEDIENTES RELACIONADOS */}
        {activeTab === 'expedientes' && (
          <div className="space-y-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Historial de Expedientes Notariales donde Participa
            </h3>

            {compareciente.expedientes?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {compareciente.expedientes.map((vinculo: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {vinculo.caracter?.nombre || 'Carácter no especificado'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        Folio: {vinculo.expediente?.numero_pravia || 'Sin folio'}
                      </h4>
                    </div>

                    <button
                      onClick={() => navigate(`/expedientes/${vinculo.expediente_id}?tab=comparecientes`)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      Abrir Expediente <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-800 text-xs text-slate-400">
                Este compareciente no está vinculado a expedientes activos por el momento.
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL VISOR INTERNO */}
      {docVisorSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold truncate">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="truncate">{docVisorSeleccionado.nombre}</span>
              </div>
              <button
                type="button"
                onClick={() => setDocVisorSeleccionado(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[400px]">
              {docVisorSeleccionado.url_firmada ? (
                <iframe
                  src={docVisorSeleccionado.url_firmada}
                  title={docVisorSeleccionado.nombre}
                  className="w-full h-[70vh] rounded-lg border border-slate-800"
                />
              ) : (
                <div className="text-slate-500 text-xs">Cargando vista previa del documento...</div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 text-xs">
              <span className="text-slate-400">Visor Interno PRAVIA OS</span>
              <button
                type="button"
                onClick={() => setDocVisorSeleccionado(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
