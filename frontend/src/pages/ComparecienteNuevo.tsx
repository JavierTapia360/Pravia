import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Building2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Eye,
  X,
  FileCheck,
  Download,
  FolderPlus,
  Sparkles,
  Plus,
  Info,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  CreditCard,
  BookOpen
} from 'lucide-react';
import { api } from '../services/api';
import { useConfirmation } from '../components/ui/ConfirmDialog';

interface CargaTemporalBackend {
  id: string;
  nombre_original: string;
  tipo_documento: string;
  tamano_bytes: number;
  mime_type: string;
  estado: string;
  created_at: string;
  url_firmada?: string;
  error_mensaje?: string;
  fileObject?: File;
}

const CLASIFICACIONES_DISPONIBLES = [
  { clave: 'INE_FRENTE', label: 'INE frente' },
  { clave: 'INE_REVERSO', label: 'INE reverso' },
  { clave: 'PASAPORTE', label: 'Pasaporte' },
  { clave: 'CURP', label: 'CURP' },
  { clave: 'CONSTANCIA_FISCAL', label: 'Constancia de Situación Fiscal' },
  { clave: 'COMPROBANTE_DOMICILIO', label: 'Comprobante de domicilio' },
  { clave: 'ACTA_NACIMIENTO', label: 'Acta de nacimiento' },
  { clave: 'DOCUMENTO_MIGRATORIO', label: 'Documento migratorio' },
  { clave: 'IDENTIFICACION_REPRESENTANTE', label: 'Identificación de representante' },
  { clave: 'ACTA_CONSTITUTIVA', label: 'Acta constitutiva' },
  { clave: 'PODER', label: 'Poder' },
  { clave: 'OTRO', label: 'Otro' }
];

const TRATAMIENTOS_DISPONIBLES = [
  'Sr.', 'Sra.', 'Lic.', 'Licda.', 'Ing.', 'Inga.', 'Dr.', 'Dra.', 'Mtro.', 'Mtra.', 'Otro'
];

const ESTADOS_CIVILES = [
  { value: "SOLTERO", label: "Soltero(a)" },
  { value: "CASADO", label: "Casado(a)" },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ComparecienteNuevo() {
  const { requestConfirmation, confirmationDialog } = useConfirmation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expedienteId = searchParams.get('expedienteId');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionCreationStartedRef = useRef(false);

  // ESTADO DE SESIÓN CON VALIDACIÓN RIGUROSA DE UUID
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [estadoSesion, setEstadoSesion] = useState<'PREPARANDO' | 'ACTIVA' | 'ERROR'>('PREPARANDO');
  const [errorSesionDetalle, setErrorSesionDetalle] = useState<{
    httpStatus?: number;
    endpoint: string;
    mensaje: string;
  } | null>(null);

  const [tipoPersona, setTipoPersona] = useState<'FISICA' | 'MORAL'>('FISICA');

  // Bandeja de documentos desde el backend
  const [cargas, setCargas] = useState<CargaTemporalBackend[]>([]);
  const [integrarMap, setIntegrarMap] = useState<Record<string, boolean>>({});
  const [subiendoArchivos, setSubiendoArchivos] = useState(false);

  // Visor Modal Interno
  const [docVisorSeleccionado, setDocVisorSeleccionado] = useState<{
    id: string;
    nombre: string;
    url: string;        // blob: URL para el iframe
    blobUrl?: string;   // misma referencia para revoke al cerrar
    cargando?: boolean;
  } | null>(null);

  // Extracción IA
  const [procesandoIA, setProcesandoIA] = useState(false);
  const [pasoIA, setPasoIA] = useState<string>('');
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const [resumenIA, setResumenIA] = useState<{
    proveedor?: string;
    modelo?: string;
    resumen?: string;
    alertas?: string[];
    conflictos?: Array<{ campo: string; alternativas: Array<{ valor: string; fuente: string }> }>;
  } | null>(null);

  const [iaStatus, setIaStatus] = useState<{
    provider_configured: boolean;
    model_configured: boolean;
    api_key_configured: boolean;
    model: string;
  } | null>(null);

  useEffect(() => {
    api.get('/comparecientes/ia/status')
      .then((data) => setIaStatus(data))
      .catch(() => {});
  }, []);

  const [guardando, setGuardando] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'success' | 'info' | 'error'; texto: string } | null>(null);
  const [modalConfirmacion, setModalConfirmacion] = useState<{
    comparecienteId: string;
    docsIntegrados: number;
  } | null>(null);

  // ==========================================
  // CAMPOS COMPLETOS PERSONA FÍSICA
  // ==========================================
  const [tratamiento, setTratamiento] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [nuevoAliasInput, setNuevoAliasInput] = useState('');

  // PEP
  const [pepEstado, setPepEstado] = useState<'PENDIENTE' | 'SI' | 'NO'>('PENDIENTE');
  const [relacionPep, setRelacionPep] = useState('');

  // Actividad y Ocupación
  const [actividadEconomica, setActividadEconomica] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [giro, setGiro] = useState('');

  // Identificadores
  const [rfc, setRfc] = useState('');
  const [curp, setCurp] = useState('');

  // Datos Personales
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [lugarNacimiento, setLugarNacimiento] = useState('');
  const [paisNacimiento, setPaisNacimiento] = useState('México');
  const [nacionalidad, setNacionalidad] = useState('Mexicana');
  const [sexo, setSexo] = useState('MASCULINO');

  // ESTADO CIVIL EXCLUSIVAMENTE SOLTERO / CASADO
  const [estadoCivil, setEstadoCivil] = useState<'SOLTERO' | 'CASADO' | ''>('');
  const [regimenMatrimonial, setRegimenMatrimonial] = useState('');
  const [escolaridad, setEscolaridad] = useState('');

  // Contacto
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

  // Identificación Oficial
  const [tipoIdentificacion, setTipoIdentificacion] = useState('INE');
  const [folioIdentificacion, setFolioIdentificacion] = useState('');
  const [autoridadEmisora, setAutoridadEmisora] = useState('');
  const [paisEmisor, setPaisEmisor] = useState('México');
  const [fechaExpedicionIdentificacion, setFechaExpedicionIdentificacion] = useState('');
  const [fechaVencimientoIdentificacion, setFechaVencimientoIdentificacion] = useState('');
  const [identificacionPrincipal, setIdentificacionPrincipal] = useState(true);

  // Domicilio Particular (fuente: comprobante de domicilio CFE / Agua / Teléfono)
  const [domicilioPais, setDomicilioPais] = useState('México');
  const [domicilioEstado, setDomicilioEstado] = useState('');
  const [domicilioMunicipio, setDomicilioMunicipio] = useState('');
  const [domicilioCiudad, setDomicilioCiudad] = useState('');
  const [domicilioColonia, setDomicilioColonia] = useState('');
  const [domicilioCalle, setDomicilioCalle] = useState('');
  const [domicilioExterior, setDomicilioExterior] = useState('');
  const [domicilioInterior, setDomicilioInterior] = useState('');
  const [domicilioCp, setDomicilioCp] = useState('');
  const [domicilioReferencias, setDomicilioReferencias] = useState('');
  const [tipoDomicilio, setTipoDomicilio] = useState('PARTICULAR');
  const [documentoSoporteDomicilio, setDocumentoSoporteDomicilio] = useState('');

  // Domicilio Fiscal (fuente: Constancia de Situación Fiscal CSF)
  const [domFiscalPais, setDomFiscalPais] = useState('México');
  const [domFiscalEstado, setDomFiscalEstado] = useState('');
  const [domFiscalMunicipio, setDomFiscalMunicipio] = useState('');
  const [domFiscalCiudad, setDomFiscalCiudad] = useState('');
  const [domFiscalColonia, setDomFiscalColonia] = useState('');
  const [domFiscalCalle, setDomFiscalCalle] = useState('');
  const [domFiscalExterior, setDomFiscalExterior] = useState('');
  const [domFiscalInterior, setDomFiscalInterior] = useState('');
  const [domFiscalCp, setDomFiscalCp] = useState('');
  const [domFiscalReferencias, setDomFiscalReferencias] = useState('');
  const [domFiscalDocumento, setDomFiscalDocumento] = useState('Constancia de Situación Fiscal (CSF)');

  // Nota para fecha de nacimiento derivada de CURP
  const [notaCurpFechaNac, setNotaCurpFechaNac] = useState<string | null>(null);

  // Auto-completar Autoridad Emisora según el tipo de identificación
  useEffect(() => {
    if (tipoIdentificacion === 'INE') {
      setAutoridadEmisora('Instituto Nacional Electoral');
    } else if (tipoIdentificacion === 'PASAPORTE') {
      setAutoridadEmisora('Secretaría de Relaciones Exteriores');
    }
  }, [tipoIdentificacion]);

  // Observaciones
  const [observaciones, setObservaciones] = useState('');

  // ==========================================
  // CAMPOS COMPLETOS PERSONA MORAL
  // ==========================================
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [tipoSocietario, setTipoSocietario] = useState('S.A. DE C.V.');
  const [rfcMoral, setRfcMoral] = useState('');
  const [nacionalidadMoral, setNacionalidadMoral] = useState('Mexicana');
  const [paisConstitucion, setPaisConstitucion] = useState('México');
  const [fechaConstitucion, setFechaConstitucion] = useState('');
  const [duracionMoral, setDuracionMoral] = useState('Indefinida');
  const [objetoSocial, setObjetoSocial] = useState('');
  const [escrituraConstitutiva, setEscrituraConstitutiva] = useState('');
  const [fechaEscritura, setFechaEscritura] = useState('');
  const [notarioNombre, setNotarioNombre] = useState('');
  const [numeroNotaria, setNumeroNotaria] = useState('');
  const [municipioNotaria, setMunicipioNotaria] = useState('');
  const [estadoNotaria, setEstadoNotaria] = useState('');
  const [folioMercantil, setFolioMercantil] = useState('');
  const [fechaInscripcion, setFechaInscripcion] = useState('');
  const [domicilioSocialFiscal, setDomicilioSocialFiscal] = useState('');
  const [actividadEconomicaMoral, setActividadEconomicaMoral] = useState('');
  const [giroMoral, setGiroMoral] = useState('');
  const [telefonoMoral, setTelefonoMoral] = useState('');
  const [correoMoral, setCorreoMoral] = useState('');
  const [representanteNombre, setRepresentanteNombre] = useState('');
  const [instrumentoRepresentacion, setInstrumentoRepresentacion] = useState('');
  const [observacionesMoral, setObservacionesMoral] = useState('');

  // Trazabilidad por campo
  const [camposExtraidosIA, setCamposExtraidosIA] = useState<Record<string, boolean>>({});

  const resetearFormularioLocal = () => {
    setCargas([]);
    setTratamiento('');
    setNombre('');
    setApellidoPaterno('');
    setApellidoMaterno('');
    setAliases([]);
    setCurp('');
    setRfc('');
    setFechaNacimiento('');
    setLugarNacimiento('');
    setSexo('MASCULINO');
    setEstadoCivil('');
    setRegimenMatrimonial('');
    setEscolaridad('');
    setOcupacion('');
    setActividadEconomica('');
    setGiro('');
    setTelefono('');
    setCorreo('');
    setFolioIdentificacion('');
    setAutoridadEmisora('Instituto Nacional Electoral');
    setFechaExpedicionIdentificacion('');
    setFechaVencimientoIdentificacion('');
    setDomicilioCalle('');
    setDomicilioExterior('');
    setDomicilioInterior('');
    setDomicilioColonia('');
    setDomicilioCp('');
    setDomicilioMunicipio('');
    setDomicilioCiudad('');
    setDomicilioEstado('');
    setDomicilioReferencias('');
    setDocumentoSoporteDomicilio('');
    setDomFiscalCalle('');
    setDomFiscalExterior('');
    setDomFiscalInterior('');
    setDomFiscalColonia('');
    setDomFiscalCp('');
    setDomFiscalMunicipio('');
    setDomFiscalCiudad('');
    setDomFiscalEstado('');
    setDomFiscalReferencias('');
    setDomFiscalDocumento('Constancia de Situación Fiscal (CSF)');
    setObservaciones('');
    setCamposExtraidosIA({});
    setResumenIA(null);
    setErrorIA(null);
    setNotaCurpFechaNac(null);
  };

  useEffect(() => {
    if (sessionCreationStartedRef.current) return;
    sessionCreationStartedRef.current = true;
    void inicializarSesion();
  }, []);

  const inicializarSesion = async () => {
    const mode = searchParams.get('mode');
    const sessionFromUrl = searchParams.get('sessionId');

    // MODO CONTINUAR BORRADOR: Sólo recuperar cuando se especifique explícitamente mode=continue y un UUID en la URL
    if (mode === 'continue' && sessionFromUrl && UUID_REGEX.test(sessionFromUrl)) {
      await cargarSesionActual(sessionFromUrl);
      return;
    }

    // MODO NUEVO COMPARECIENTE (Por defecto):
    // 1. Eliminar referencias de sesión anterior en storage local
    localStorage.removeItem('pravia_alta_session_id');
    localStorage.removeItem('comparecienteAltaSessionId');
    sessionStorage.removeItem('pravia_alta_session_id');
    sessionStorage.removeItem('comparecienteAltaSessionId');

    // 2. Limpiar todo el estado local del formulario
    resetearFormularioLocal();

    // 3. Crear siempre una nueva sesión con un UUID nuevo
    await crearNuevaSesion();
  };

  // REGLA 1 & REGLA 4: CREAR SESIÓN VALIDANDO EL UUID ESTRICTO DE RESPUESTA
  const crearNuevaSesion = async () => {
    setEstadoSesion('PREPARANDO');
    setErrorSesionDetalle(null);

    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const endpointUrl = '/comparecientes/altas';

    try {
      const data = await api.post(endpointUrl, {
        tipo_persona: tipoPersona,
        idempotency_key: idempotencyKey,
        origen_expediente_id: expedienteId || null
      });
      const sessionData = data?.session ?? data?.sesion;
      const newSessionId = sessionData?.id;

      // VALIDACIÓN STRICTA DEL UUID
      if (typeof newSessionId !== 'string' || !UUID_REGEX.test(newSessionId)) {
        console.error('[ALTA COMPARECIENTE] Respuesta inválida al crear sesión:', data);
        throw new Error(`El backend no devolvió un UUID válido de sesión. Recibido: ${String(newSessionId)}`);
      }

      setSessionId(newSessionId);
      localStorage.setItem('pravia_alta_session_id', newSessionId);
      localStorage.setItem('comparecienteAltaSessionId', newSessionId);
      setEstadoSesion('ACTIVA');
      setCargas(sessionData.cargasTemporales || []);
    } catch (err: any) {
      console.error('[ALTA COMPARECIENTE] Error al crear sesión:', err);
      setEstadoSesion('ERROR');
      setErrorSesionDetalle({
        endpoint: `/api${endpointUrl}`,
        mensaje: err.message || 'Error de conexión con el servidor backend'
      });
    }
  };

  const handleReintentarSesion = () => {
    sessionCreationStartedRef.current = false;
    localStorage.removeItem('pravia_alta_session_id');
    localStorage.removeItem('comparecienteAltaSessionId');
    sessionStorage.removeItem('pravia_alta_session_id');
    sessionStorage.removeItem('comparecienteAltaSessionId');
    crearNuevaSesion();
  };

  const handleCancelarSesion = async () => {
    const confirmar = await requestConfirmation({
      title: 'Cancelar alta de compareciente',
      description: 'Se descartará la sesión de captura y se programará la limpieza de sus documentos temporales. Los registros maestros existentes no se modificarán.',
      confirmLabel: 'Cancelar alta',
      tone: 'danger',
    });
    if (!confirmar) return;

    try {
      const sid = sessionId || localStorage.getItem('pravia_alta_session_id');
      if (sid && UUID_REGEX.test(sid)) {
        await api.delete(`/comparecientes/altas/${sid}`);
      }
    } catch (err) {
      console.error('Error al cancelar sesión:', err);
    } finally {
      localStorage.removeItem('pravia_alta_session_id');
      localStorage.removeItem('comparecienteAltaSessionId');
      sessionStorage.removeItem('pravia_alta_session_id');
      sessionStorage.removeItem('comparecienteAltaSessionId');
      resetearFormularioLocal();
      navigate('/comparecientes');
    }
  };

  const cargarSesionActual = async (targetId?: string) => {
    const sid = targetId || sessionId || localStorage.getItem('pravia_alta_session_id');
    if (!sid || !UUID_REGEX.test(sid)) {
      await crearNuevaSesion();
      return;
    }

    const endpointUrl = `/comparecientes/altas/${sid}`;
    try {
      const data = await api.get(endpointUrl);
      const sessionData = data?.session ?? data?.sesion;
      const verifiedId = sessionData?.id;

      if (typeof verifiedId === 'string' && UUID_REGEX.test(verifiedId)) {
        setSessionId(verifiedId);
        setEstadoSesion('ACTIVA');
        setErrorSesionDetalle(null);
        const docs: CargaTemporalBackend[] = sessionData.cargasTemporales || [];
        setCargas(docs);

        setIntegrarMap((prev) => {
          const map = { ...prev };
          docs.forEach((d) => {
            if (map[d.id] === undefined) map[d.id] = true;
          });
          return map;
        });
      } else {
        localStorage.removeItem('pravia_alta_session_id');
        await crearNuevaSesion();
      }
    } catch (err: any) {
      console.error('[ALTA COMPARECIENTE] Error al cargar sesión:', err);
      setEstadoSesion('ERROR');
      setErrorSesionDetalle({
        endpoint: endpointUrl,
        mensaje: err.message || 'Fallo de conexión al cargar la sesión'
      });
    }
  };

  // REGLA 6: CONTRATO UNIFICADO CON UN SOLO CAMPO 'archivo' Y MANEJO DE ERRORES INDIVIDUAL
  const subirArchivosTemporales = async (files: File[]) => {
    let sid = sessionId || localStorage.getItem('pravia_alta_session_id');
    if (!sid || !UUID_REGEX.test(sid) || estadoSesion !== 'ACTIVA') {
      await crearNuevaSesion();
      sid = localStorage.getItem('pravia_alta_session_id');
    }
    if (!sid || !UUID_REGEX.test(sid)) return;

    setSubiendoArchivos(true);
    setFeedbackMsg(null);

    for (const file of files) {
      const tempOptimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const itemOptimista: CargaTemporalBackend = {
        id: tempOptimisticId,
        nombre_original: file.name,
        tipo_documento: detectarClasificacion(file.name),
        tamano_bytes: file.size,
        mime_type: file.type,
        estado: 'Subiendo...',
        created_at: new Date().toISOString(),
        fileObject: file
      };

      setCargas((prev) => [...prev, itemOptimista]);

      try {
        const formData = new FormData();
        // UNICO CAMPO 'archivo' SEGUN EL CONTRATO UNIFICADO
        formData.append('archivo', file);
        formData.append('tipo_documento', detectarClasificacion(file.name));

        const data = await api.upload(`/comparecientes/altas/${sid}/documentos`, formData);

        if (!data.ok && !data.success) {
          const errMsg = data.error || data.message || 'No fue posible guardar el documento.';
          setCargas((prev) =>
            prev.map((item) =>
              item.id === tempOptimisticId
                ? { ...item, estado: 'Error al cargar', error_mensaje: errMsg }
                : item
            )
          );
        } else {
          setCargas((prev) => prev.filter((item) => item.id !== tempOptimisticId));
          await cargarSesionActual(sid);
        }
      } catch (err: any) {
        console.error('[ALTA COMPARECIENTE] Error en petición POST:', err);
        setCargas((prev) =>
          prev.map((item) =>
            item.id === tempOptimisticId
              ? { ...item, estado: 'Error al cargar', error_mensaje: err.message }
              : item
          )
        );
      }
    }
    setSubiendoArchivos(false);
  };

  // REGLA 11: REINTENTAR CARGA DE UN ARCHIVO INDIVIDUAL QUE FALLÓ
  const handleReintentarArchivo = async (cargaItem: CargaTemporalBackend) => {
    if (!cargaItem.fileObject) return;
    setCargas((prev) => prev.filter((item) => item.id !== cargaItem.id));
    await subirArchivosTemporales([cargaItem.fileObject]);
  };

  const handleQuitarArchivoFallido = (cargaId: string) => {
    setCargas((prev) => prev.filter((item) => item.id !== cargaId));
  };

  const handleSelectFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    try {
      await subirArchivosTemporales(selectedFiles);
    } catch (error) {
      console.error('[ALTA COMPARECIENTE] Error en selección:', error);
    } finally {
      event.target.value = '';
    }
  };

  const detectarClasificacion = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('frente') || (n.includes('ine') && !n.includes('reverso'))) return 'INE_FRENTE';
    if (n.includes('reverso')) return 'INE_REVERSO';
    if (n.includes('pasaporte')) return 'PASAPORTE';
    if (n.includes('curp')) return 'CURP';
    if (n.includes('csf') || n.includes('situacion') || n.includes('fiscal')) return 'CONSTANCIA_FISCAL';
    if (n.includes('domicilio') || n.includes('luz') || n.includes('comprobante')) return 'COMPROBANTE_DOMICILIO';
    if (n.includes('constitutiva')) return 'ACTA_CONSTITUTIVA';
    if (n.includes('nacimiento')) return 'ACTA_NACIMIENTO';
    if (n.includes('migratorio')) return 'DOCUMENTO_MIGRATORIO';
    if (n.includes('poder')) return 'PODER';
    return 'OTRO';
  };

  const handleCambiarClasificacion = async (cargaId: string, nuevoTipo: string) => {
    setCargas((prev) =>
      prev.map((item) => (item.id === cargaId ? { ...item, tipo_documento: nuevoTipo } : item))
    );

    if (sessionId && UUID_REGEX.test(sessionId)) {
      try {
        await api.put(`/comparecientes/altas/${sessionId}/documentos/${cargaId}/clasificar`, { tipo_documento: nuevoTipo });
      } catch (err) {
        console.error('Error actualizando clasificación:', err);
      }
    }
  };

  const handleToggleIntegrar = (id: string) => {
    setIntegrarMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ACCIONES INDIVIDUALES
  const cerrarVisor = () => {
    if (docVisorSeleccionado?.blobUrl) {
      URL.revokeObjectURL(docVisorSeleccionado.blobUrl);
    }
    setDocVisorSeleccionado(null);
  };

  const visualizarTemporal = async (id: string) => {
    const doc = cargas.find((d) => d.id === id);
    if (!doc) return;

    const sid = sessionId || localStorage.getItem('pravia_alta_session_id');
    if (!sid) return;

    // Mostrar modal con indicador de carga inmediatamente
    setDocVisorSeleccionado({
      id: doc.id,
      nombre: doc.nombre_original,
      url: '',
      cargando: true
    });

    try {
      const blob = await api.blob(`/comparecientes/altas/${sid}/documentos/${doc.id}/stream`);
      const blobUrl = URL.createObjectURL(blob);
      setDocVisorSeleccionado({
        id: doc.id,
        nombre: doc.nombre_original,
        url: blobUrl,
        blobUrl,
        cargando: false
      });
    } catch (err: any) {
      console.error('[VISOR INTERNO] Error cargando documento:', err);
      setDocVisorSeleccionado(null);
      setFeedbackMsg({ tipo: 'error', texto: `No se pudo cargar el documento: ${err.message}` });
    }
  };

  const descargarTemporal = (id: string) => {
    const doc = cargas.find((d) => d.id === id);
    if (doc && doc.url_firmada) {
      const a = document.createElement('a');
      a.href = doc.url_firmada;
      a.download = doc.nombre_original;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const eliminarTemporal = async (id: string) => {
    const sid = sessionId || localStorage.getItem('pravia_alta_session_id');
    if (!sid || !UUID_REGEX.test(sid)) return;

    try {
      await api.delete(`/comparecientes/altas/${sid}/documentos/${id}`);
      await cargarSesionActual(sid);
    } catch (err) {
      console.error('[ALTA COMPARECIENTE] Error eliminando temporal:', err);
    }
  };

  // ALIAS MULTIPLES
  const handleAgregarAlias = () => {
    if (nuevoAliasInput.trim()) {
      setAliases((prev) => [...prev, nuevoAliasInput.trim()]);
      setNuevoAliasInput('');
    }
  };

  const handleEliminarAlias = (index: number) => {
    setAliases((prev) => prev.filter((_, i) => i !== index));
  };

  // REGLA 8 & 9 & 10: EXTRACCIÓN MEDIANTE IA VALIDADAS CONTRA DOCUMENTOS EXITOSOS EN BACKEND
  const docsExitosos = cargas.filter((c) => c.estado === 'TEMPORAL' || c.estado === 'PROCESADO' || c.estado === 'Listo para analizar');
  const docsFallidos = cargas.filter((c) => c.estado === 'Error al cargar');

  const deshabilitarBotonIA =
    estadoSesion !== 'ACTIVA' ||
    docsExitosos.length === 0 ||
    subiendoArchivos ||
    procesandoIA;

  const ejecutarExtraccionIA = async () => {
    if (docsExitosos.length === 0 || !sessionId || !UUID_REGEX.test(sessionId)) {
      setFeedbackMsg({ tipo: 'error', texto: 'No hay documentos cargados correctamente para analizar.' });
      return;
    }

    setProcesandoIA(true);
    setErrorIA(null);

    try {
      setPasoIA('Leyendo documentos...');
      await new Promise((r) => setTimeout(r, 300));
      setPasoIA('Extrayendo datos...');
      await new Promise((r) => setTimeout(r, 300));
      setPasoIA('Comparando información...');

      const payloadDocs = docsExitosos.map((c) => ({
        id: c.id,
        tipo_documento: c.tipo_documento
      }));

      const data = await api.post(`/comparecientes/altas/${sessionId}/extraer`, {
        documentos: payloadDocs,
        tipo_persona: tipoPersona
      });
      setPasoIA('Prellenando formulario...');
      await new Promise((r) => setTimeout(r, 300));

      if ((data.ok || data.success) && data.borrador_actualizado) {
        const b = data.borrador_actualizado;
        const resIA = data.resultado || {};

        if (resIA.tipo_persona_detectado) setTipoPersona(resIA.tipo_persona_detectado);

        const detectados: Record<string, boolean> = {};

        if (b.nombre) { setNombre(b.nombre); detectados.nombre = true; }
        if (b.apellido_paterno) { setApellidoPaterno(b.apellido_paterno); detectados.apellidoPaterno = true; }
        if (b.apellido_materno) { setApellidoMaterno(b.apellido_materno); detectados.apellidoMaterno = true; }
        if (b.curp) { setCurp(b.curp); detectados.curp = true; }
        if (b.rfc) { setRfc(b.rfc); setRfcMoral(b.rfc); detectados.rfc = true; }
        if (b.razon_social) { setRazonSocial(b.razon_social); detectados.razonSocial = true; }
        if (b.folio_mercantil) { setFolioMercantil(b.folio_mercantil); detectados.folioMercantil = true; }
        if (b.actividad_economica) { setActividadEconomica(b.actividad_economica); detectados.actividadEconomica = true; }
        if (b.ocupacion) { setOcupacion(b.ocupacion); detectados.ocupacion = true; }
        if (b.giro) { setGiro(b.giro); } else { setGiro(''); }
        if (b.telefono) { setTelefono(b.telefono); detectados.telefono = true; }
        if (b.correo || b.correo_electronico) { setCorreo(b.correo || b.correo_electronico); detectados.correo = true; }

        const toInputDate = (str: string | undefined): string => {
          if (!str) return '';
          const s = str.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m) {
            const [, d, mon, y] = m;
            return `${y}-${mon.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          return s;
        };

        // Datos Personales
        if (b.fecha_nacimiento) {
          setFechaNacimiento(toInputDate(b.fecha_nacimiento));
          detectados.fechaNacimiento = true;
          if (b._fecha_nacimiento_fuente) {
            setNotaCurpFechaNac(b._fecha_nacimiento_fuente);
          }
        }
        if (b.lugar_nacimiento) { setLugarNacimiento(b.lugar_nacimiento); detectados.lugarNacimiento = true; }
        if (b.pais_nacimiento) { setPaisNacimiento(b.pais_nacimiento); detectados.paisNacimiento = true; }
        if (b.nacionalidad) { setNacionalidad(b.nacionalidad); detectados.nacionalidad = true; }
        if (b.estado_civil) {
          const ecVal = b.estado_civil.toUpperCase();
          if (ecVal.includes('SOLTERO') || ecVal.includes('SOLTERA')) {
            setEstadoCivil('SOLTERO');
          } else if (ecVal.includes('CASADO') || ecVal.includes('CASADA')) {
            setEstadoCivil('CASADO');
          }
          detectados.estadoCivil = true;
        }
        if (b.sexo) { setSexo(b.sexo); detectados.sexo = true; }

        // Identificación Oficial
        if (b.folio_identificacion) { setFolioIdentificacion(b.folio_identificacion); detectados.folioIdentificacion = true; }
        if (b.autoridad_emisora) { setAutoridadEmisora(b.autoridad_emisora); detectados.autoridadEmisora = true; }
        if (b.fecha_expedicion_identificacion) { setFechaExpedicionIdentificacion(toInputDate(b.fecha_expedicion_identificacion)); }
        if (b.fecha_vencimiento_identificacion) { setFechaVencimientoIdentificacion(toInputDate(b.fecha_vencimiento_identificacion)); }

        // Domicilio PARTICULAR (de Comprobante de Domicilio)
        if (b.dom_particular_calle) { setDomicilioCalle(b.dom_particular_calle); detectados.domicilioCalle = true; }
        if (b.dom_particular_exterior) { setDomicilioExterior(b.dom_particular_exterior); }
        if (b.dom_particular_interior) { setDomicilioInterior(b.dom_particular_interior); }
        if (b.dom_particular_colonia) { setDomicilioColonia(b.dom_particular_colonia); detectados.domicilioColonia = true; }
        if (b.dom_particular_cp) { setDomicilioCp(b.dom_particular_cp); detectados.domicilioCp = true; }
        if (b.dom_particular_municipio) { setDomicilioMunicipio(b.dom_particular_municipio); detectados.domicilioMunicipio = true; }
        if (b.dom_particular_estado) { setDomicilioEstado(b.dom_particular_estado); detectados.domicilioEstado = true; }
        if (b.dom_particular_pais) { setDomicilioPais(b.dom_particular_pais); }
        if (b.dom_particular_fuente) { setDocumentoSoporteDomicilio(b.dom_particular_fuente); }

        // Domicilio FISCAL (de Constancia de Situación Fiscal - CSF)
        if (b.dom_fiscal_calle) { setDomFiscalCalle(b.dom_fiscal_calle); detectados.domFiscalCalle = true; }
        if (b.dom_fiscal_exterior) { setDomFiscalExterior(b.dom_fiscal_exterior); }
        if (b.dom_fiscal_interior) { setDomFiscalInterior(b.dom_fiscal_interior); }
        if (b.dom_fiscal_colonia) { setDomFiscalColonia(b.dom_fiscal_colonia); detectados.domFiscalColonia = true; }
        if (b.dom_fiscal_cp) { setDomFiscalCp(b.dom_fiscal_cp); detectados.domFiscalCp = true; }
        if (b.dom_fiscal_municipio) { setDomFiscalMunicipio(b.dom_fiscal_municipio); detectados.domFiscalMunicipio = true; }
        if (b.dom_fiscal_estado) { setDomFiscalEstado(b.dom_fiscal_estado); detectados.domFiscalEstado = true; }
        if (b.dom_fiscal_pais) { setDomFiscalPais(b.dom_fiscal_pais); }
        if (b.dom_fiscal_fuente) { setDomFiscalDocumento(b.dom_fiscal_fuente); }

        setCamposExtraidosIA(detectados);
        setResumenIA({
          proveedor: resIA.proveedor || 'OpenAI',
          modelo: resIA.modelo || 'gpt-5.4-nano',
          resumen: resIA.resumen_ejecutivo || 'Extracción documental procesada correctamente.',
          alertas: resIA.alertas,
          conflictos: data.conflictos || []
        });

        setFeedbackMsg(data.conflictos?.length
          ? { tipo: 'info', texto: `La extracción encontró ${data.conflictos.length} conflicto(s). Revísalos antes de guardar.` }
          : { tipo: 'success', texto: 'Información extraída y prellenada con éxito por IA.' });
      } else {
        const errorMsg = data.error || data.message || 'No fue posible ejecutar la extracción documental con IA. Los campos permanecen sin cambios.';
        setErrorIA(errorMsg);
        setFeedbackMsg({ tipo: 'error', texto: errorMsg });
      }
    } catch (err: any) {
      console.error('Error durante extracción IA:', err);
      const msg = err.message || 'No fue posible ejecutar la extracción documental con IA. Los campos permanecen sin cambios.';
      setErrorIA(msg);
      setFeedbackMsg({ tipo: 'error', texto: msg });
    } finally {
      setProcesandoIA(false);
      setPasoIA('');
    }
  };

  // CONFIRMAR Y GUARDAR COMPARECIENTE
  const handleConfirmarAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setFeedbackMsg(null);

    try {
      const sid = sessionId || localStorage.getItem('pravia_alta_session_id');
      if (!sid || !UUID_REGEX.test(sid)) {
        throw new Error('No existe un UUID de sesión válido para confirmar.');
      }

      const idsIntegrar = docsExitosos.filter((c) => integrarMap[c.id] !== false).map((c) => c.id);

      const payload = {
        tipo_persona: tipoPersona,
        tratamiento,
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        aliases,
        curp,
        rfc: tipoPersona === 'FISICA' ? rfc : rfcMoral,
        sexo,
        fecha_nacimiento: fechaNacimiento || undefined,
        lugar_nacimiento: lugarNacimiento,
        pais_nacimiento: paisNacimiento,
        nacionalidad,
        estado_civil: estadoCivil || undefined,
        regimen_matrimonial: estadoCivil === 'CASADO' ? regimenMatrimonial : undefined,
        escolaridad,
        ocupacion,
        actividad_economica: tipoPersona === 'FISICA' ? actividadEconomica : actividadEconomicaMoral,
        giro: tipoPersona === 'FISICA' ? giro : giroMoral,
        pep_estado: pepEstado,
        relacion_pep: relacionPep,
        telefono: tipoPersona === 'FISICA' ? telefono : telefonoMoral,
        correo: tipoPersona === 'FISICA' ? correo : correoMoral,

        // Identificación
        tipo_identificacion: tipoIdentificacion,
        folio_identificacion: folioIdentificacion,
        autoridad_emisora: autoridadEmisora,
        pais_emisor: paisEmisor,
        fecha_expedicion_identificacion: fechaExpedicionIdentificacion || undefined,
        fecha_vencimiento_identificacion: fechaVencimientoIdentificacion || undefined,
        identificacion_principal: identificacionPrincipal,

        // Domicilio Particular
        dom_particular_calle: domicilioCalle,
        dom_particular_exterior: domicilioExterior,
        dom_particular_interior: domicilioInterior,
        dom_particular_colonia: domicilioColonia,
        dom_particular_cp: domicilioCp,
        dom_particular_municipio: domicilioMunicipio,
        dom_particular_estado: domicilioEstado,
        dom_particular_pais: domicilioPais,
        dom_particular_referencias: domicilioReferencias,
        dom_particular_documento: documentoSoporteDomicilio,

        // Domicilio Fiscal
        dom_fiscal_calle: domFiscalCalle,
        dom_fiscal_exterior: domFiscalExterior,
        dom_fiscal_interior: domFiscalInterior,
        dom_fiscal_colonia: domFiscalColonia,
        dom_fiscal_cp: domFiscalCp,
        dom_fiscal_municipio: domFiscalMunicipio,
        dom_fiscal_estado: domFiscalEstado,
        dom_fiscal_pais: domFiscalPais,
        dom_fiscal_referencias: domFiscalReferencias,
        dom_fiscal_documento: domFiscalDocumento,

        // Compatibilidad general
        domicilio_pais: domicilioPais,
        domicilio_estado: domicilioEstado,
        domicilio_municipio: domicilioMunicipio,
        domicilio_ciudad: domicilioCiudad,
        domicilio_colonia: domicilioColonia,
        domicilio_calle: domicilioCalle,
        domicilio_exterior: domicilioExterior,
        domicilio_interior: domicilioInterior,
        domicilio_cp: domicilioCp,
        domicilio_referencias: domicilioReferencias,
        tipo_domicilio: tipoDomicilio,
        documento_soporte_domicilio: documentoSoporteDomicilio,
        observaciones: tipoPersona === 'FISICA' ? observaciones : observacionesMoral,

        // Moral
        razon_social: razonSocial,
        nombre_comercial: nombreComercial,
        tipo_societario: tipoSocietario,
        nacionalidad_moral: nacionalidadMoral,
        pais_constitucion: paisConstitucion,
        fecha_constitucion: fechaConstitucion || undefined,
        duracion_moral: duracionMoral,
        objeto_social_resumido: objetoSocial,
        escritura_constitutiva: escrituraConstitutiva,
        fecha_escritura: fechaEscritura || undefined,
        notario_nombre: notarioNombre,
        numero_notaria: numeroNotaria,
        municipio_notaria: municipioNotaria,
        estado_notaria: estadoNotaria,
        folio_mercantil: folioMercantil,
        fecha_inscripcion: fechaInscripcion || undefined,
        domicilio_social_fiscal: domicilioSocialFiscal,
        representante_nombre: representanteNombre,
        instrumento_representacion: instrumentoRepresentacion,

        documentos_integrar: idsIntegrar
      };

      const data = await api.post(`/comparecientes/altas/${sid}/confirmar`, payload);
      if ((data.ok || data.success) && data.compareciente) {
        localStorage.removeItem('pravia_alta_session_id');
        localStorage.removeItem('comparecienteAltaSessionId');
        sessionStorage.removeItem('pravia_alta_session_id');
        sessionStorage.removeItem('comparecienteAltaSessionId');
        resetearFormularioLocal();
        setModalConfirmacion({
          comparecienteId: data.compareciente.id,
          docsIntegrados: data.docs_integrados_count || idsIntegrar.length
        });
      } else {
        throw new Error(data.error || data.message || 'No fue posible registrar el compareciente.');
      }
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'error', texto: `Falló el guardado: ${err.message}` });
    } finally {
      setGuardando(false);
    }
  };

  const nombreCompletoCalculado = `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 lg:p-10 space-y-8">
      {/* Header Notarial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/comparecientes')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Catálogo de Comparecientes
          </button>
          <h1 className="text-3xl font-serif font-bold text-slate-100 flex items-center gap-3">
            <User className="w-8 h-8 text-amber-500" />
            Alta de Compareciente
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Formulario Notarial Completo con Bandeja Documental Sesionada y Extracción Asistida por IA.
          </p>
        </div>

        {/* REGLA 2: MOSTRAR DISCRETAMENTE EL UUID COMPLETO VALIDADO EN PANTALLA */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Modo: {searchParams.get('mode') === 'continue' ? 'CONTINUAR BORRADOR' : 'NUEVO'}
          </span>
          {estadoSesion === 'PREPARANDO' && (
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Preparando sesión...
            </span>
          )}
          {estadoSesion === 'ACTIVA' && (
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sesión actual: {sessionId}
            </span>
          )}
          {estadoSesion === 'ERROR' && (
            <button
              onClick={handleReintentarSesion}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-2 cursor-pointer hover:bg-rose-500/20"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Error en sesión · Reintentar
            </button>
          )}
        </div>
      </div>

      {/* BANNER DE ERROR TRANSPARENTE CON CAUSA CONCRETA DEL BACKEND */}
      {errorSesionDetalle && (
        <div className="p-4 rounded-xl border bg-rose-950/40 border-rose-500/50 text-rose-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-sm text-rose-400">
              <AlertTriangle className="w-5 h-5" /> No se pudo crear la sesión de alta.
            </span>
            <button
              onClick={handleReintentarSesion}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg font-semibold cursor-pointer transition-colors"
            >
              Reintentar Iniciar Sesión
            </button>
          </div>
          <div className="font-mono bg-slate-950/80 p-3 rounded-lg border border-rose-900/40 space-y-1">
            <p><strong>HTTP Status:</strong> {errorSesionDetalle.httpStatus ? errorSesionDetalle.httpStatus : 'Error de Red'}</p>
            <p><strong>Endpoint:</strong> {errorSesionDetalle.endpoint}</p>
            <p><strong>Detalle Backend:</strong> {errorSesionDetalle.mensaje}</p>
          </div>
        </div>
      )}

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            feedbackMsg.tipo === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : feedbackMsg.tipo === 'info'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedbackMsg.tipo === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedbackMsg.texto}</span>
        </div>
      )}

      {/* DISEÑO AMPLIO DE DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* COLUMNA IZQUIERDA: GESTIÓN DOCUMENTAL Y BANDEJA V2 */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-sm sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Documentos para Extracción</h2>
                  <p className="text-xs text-slate-400">Archivos sesionados en backend sin apertura automática.</p>
                </div>
              </div>
            </div>

            {/* Selector de Archivos Aislado con Input Ref */}
            <div className="p-6 bg-slate-900/60 border border-slate-700/60 rounded-xl text-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xml,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleSelectFiles}
                style={{ display: "none" }}
              />

              <button
                type="button"
                disabled={estadoSesion !== 'ACTIVA'}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (estadoSesion === 'ACTIVA') {
                    fileInputRef.current?.click();
                  }
                }}
                className={`px-6 py-3 rounded-xl font-bold text-sm shadow-md cursor-pointer transition-colors flex items-center gap-2 mx-auto ${
                  estadoSesion === 'ACTIVA'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {subiendoArchivos ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Subiendo documentos...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-slate-950" />
                    <span>{estadoSesion === 'ACTIVA' ? 'Seleccionar documentos' : 'Preparando sesión...'}</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400">
                Formatos permitidos: PDF, PNG, JPG, JPEG, DOC, DOCX (máx. 25 MB)
              </p>
            </div>

            {/* REGLA 8: BANDEJA DE DOCUMENTOS CARGADOS CON CONTADORES DUALES */}
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" /> DOCUMENTOS CARGADOS PARA ESTA ALTA
                </h3>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    Listos: {docsExitosos.length}
                  </span>
                  {docsFallidos.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30">
                      Errores: {docsFallidos.length}
                    </span>
                  )}
                </div>
              </div>

              {cargas.length === 0 ? (
                <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  No hay documentos cargados en la sesión actual.
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {cargas.map((documento) => (
                    <div
                      key={documento.id}
                      className={`bg-slate-900 border rounded-xl p-3.5 flex flex-col gap-3 text-xs ${
                        documento.estado === 'Error al cargar'
                          ? 'border-rose-500/50 bg-rose-950/10'
                          : 'border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {documento.estado !== 'Error al cargar' && (
                          <input
                            type="checkbox"
                            checked={integrarMap[documento.id] !== false}
                            onChange={() => handleToggleIntegrar(documento.id)}
                            className="w-4 h-4 accent-amber-500 rounded cursor-pointer shrink-0"
                            title="Integrar al archivo documental del compareciente"
                          />
                        )}
                        <div className={`p-2 rounded-lg shrink-0 ${documento.estado === 'Error al cargar' ? 'bg-rose-900/40 text-rose-400' : 'bg-slate-800 text-amber-400'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate min-w-0 flex-1">
                          <strong className="block text-slate-200 truncate">{documento.nombre_original}</strong>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{(documento.tamano_bytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span
                              className={`font-medium ${
                                documento.estado === 'Error al cargar' ? 'text-rose-400 font-bold' : 'text-amber-400'
                              }`}
                            >
                              {documento.estado === 'TEMPORAL' ? 'Listo para analizar' : documento.estado}
                            </span>
                          </div>
                          {documento.error_mensaje && (
                            <p className="text-[10px] text-rose-400 mt-1 font-mono">{documento.error_mensaje}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                        {documento.estado === 'Error al cargar' ? (
                          /* REGLA 11: ACCIONES PARA FILAS FALLIDAS */
                          <div className="flex items-center justify-end gap-2 w-full">
                            {documento.fileObject && (
                              <button
                                type="button"
                                onClick={() => handleReintentarArchivo(documento)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" /> Reintentar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleQuitarArchivoFallido(documento.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] font-medium cursor-pointer"
                            >
                              Quitar
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Clasificación */}
                            <select
                              value={documento.tipo_documento}
                              onChange={(e) => handleCambiarClasificacion(documento.id, e.target.value)}
                              className="bg-slate-800 border border-slate-700 text-[11px] text-amber-400 rounded-lg px-2 py-1 focus:outline-none cursor-pointer truncate max-w-[140px]"
                            >
                              {CLASIFICACIONES_DISPONIBLES.map((c) => (
                                <option key={c.clave} value={c.clave} className="bg-slate-900 text-slate-200">
                                  {c.label}
                                </option>
                              ))}
                            </select>

                            {/* Botones de Acción */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => visualizarTemporal(documento.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 font-medium text-[11px] cursor-pointer"
                              >
                                Visualizar
                              </button>

                              <button
                                type="button"
                                onClick={() => descargarTemporal(documento.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 font-medium text-[11px] cursor-pointer"
                              >
                                Descargar
                              </button>

                              <button
                                type="button"
                                onClick={() => eliminarTemporal(documento.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                title="Eliminar de la sesión"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* REGLA 10: BOTÓN EXTRACCIÓN CON IA HABILITADO SÓLO CON DOCUMENTOS EXITOSOS */}
            <div className="pt-4 border-t border-slate-700/60 space-y-2">
              <button
                type="button"
                onClick={ejecutarExtraccionIA}
                disabled={deshabilitarBotonIA}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                  deshabilitarBotonIA
                    ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold shadow-amber-500/20'
                }`}
              >
                {procesandoIA ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{pasoIA || 'Procesando con IA...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className={`w-4.5 h-4.5 ${deshabilitarBotonIA ? 'text-slate-500' : 'text-slate-950'}`} />
                    <span>✨ Extraer información con IA</span>
                  </>
                )}
              </button>

              {/* REGLA 10: EXPLICACIÓN DE POR QUÉ ESTÁ DESHABILITADO */}
              {deshabilitarBotonIA && (
                <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-500/70" />
                  <span>
                    {estadoSesion !== 'ACTIVA'
                      ? 'Preparando sesión en backend...'
                      : docsExitosos.length === 0
                      ? 'No hay documentos cargados correctamente para analizar.'
                      : subiendoArchivos
                      ? 'Subiendo documentos al servidor...'
                      : 'Extracción en progreso...'}
                  </span>
                </div>
              )}

              {/* MOSTRAR ERRORES CONCRETOS DE EXTRACCIÓN SI FALLA */}
              {errorIA && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-xs text-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> No fue posible extraer la información
                  </p>
                  <p className="text-[11px] text-rose-200/90 font-mono">{errorIA}</p>
                </div>
              )}
            </div>

            {resumenIA && (
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Resumen de IA ({resumenIA.modelo})
                  </span>
                  <span className="text-[10px] text-slate-400">{resumenIA.proveedor}</span>
                </div>
                <p className="text-slate-300">{resumenIA.resumen}</p>
                {Boolean(resumenIA.conflictos?.length) && (
                  <div className="mt-3 space-y-2 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3">
                    <p className="flex items-center gap-2 font-semibold text-rose-300"><AlertTriangle className="h-4 w-4" />Conflictos que requieren decisión humana</p>
                    {resumenIA.conflictos?.map((conflicto) => (
                      <div key={conflicto.campo} className="border-t border-rose-500/20 pt-2 text-[11px] text-rose-100">
                        <strong className="uppercase">{conflicto.campo.replace(/_/g, ' ')}</strong>
                        <ul className="mt-1 space-y-1">{conflicto.alternativas.map((item, index) => <li key={`${item.fuente}-${index}`}>{item.valor} · {item.fuente}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO COMPLETO APROBADO */}
        <div className="lg:col-span-7 space-y-8">
          <form onSubmit={handleConfirmarAlta} className="space-y-8">
            {/* Tabs Tipo de Persona */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              <button
                type="button"
                onClick={() => setTipoPersona('FISICA')}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  tipoPersona === 'FISICA'
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-md font-bold'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                Persona Física
              </button>

              <button
                type="button"
                onClick={() => setTipoPersona('MORAL')}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  tipoPersona === 'MORAL'
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-md font-bold'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Persona Moral
              </button>
            </div>

            {/* SECCIÓN FORMULARIO COMPLETO PERSONA FÍSICA */}
            {tipoPersona === 'FISICA' && (
              <div className="space-y-8">
                {/* INFORMACIÓN GENERAL Y ALIAS */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <User className="w-5 h-5 text-amber-400" />
                    Información General e Identidad
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Tratamiento</label>
                      <select
                        value={tratamiento}
                        onChange={(e) => setTratamiento(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        {TRATAMIENTOS_DISPONIBLES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                        Nombre(s) *
                        {camposExtraidosIA.nombre && <span className="text-[10px] text-amber-400 font-bold">IA</span>}
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                        Primer Apellido *
                        {camposExtraidosIA.apellidoPaterno && <span className="text-[10px] text-amber-400 font-bold">IA</span>}
                      </label>
                      <input
                        type="text"
                        required
                        value={apellidoPaterno}
                        onChange={(e) => setApellidoPaterno(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                        Segundo Apellido
                        {camposExtraidosIA.apellidoMaterno && <span className="text-[10px] text-amber-400 font-bold">IA</span>}
                      </label>
                      <input
                        type="text"
                        value={apellidoMaterno}
                        onChange={(e) => setApellidoMaterno(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre Completo Calculado</label>
                      <input
                        type="text"
                        readOnly
                        value={nombreCompletoCalculado}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-amber-400 font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Sección Alias */}
                  <div className="pt-2 space-y-3">
                    <label className="block text-xs font-medium text-slate-400">Alias o Nombres Conocidos</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nuevoAliasInput}
                        onChange={(e) => setNuevoAliasInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAgregarAlias}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Alias
                      </button>
                    </div>

                    {aliases.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {aliases.map((alias, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-slate-800 border border-slate-700 text-amber-400 rounded-lg text-xs flex items-center gap-2"
                          >
                            {alias}
                            <button
                              type="button"
                              onClick={() => handleEliminarAlias(idx)}
                              className="text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PEP en 3 Estados */}
                  <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                    <label className="block text-xs font-medium text-amber-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> Persona Políticamente Expuesta (PEP)
                    </label>
                    <div className="flex items-center gap-6 text-sm text-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pepOption"
                          value="PENDIENTE"
                          checked={pepEstado === 'PENDIENTE'}
                          onChange={() => setPepEstado('PENDIENTE')}
                          className="accent-amber-500"
                        />
                        <span>Pendiente</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pepOption"
                          value="NO"
                          checked={pepEstado === 'NO'}
                          onChange={() => setPepEstado('NO')}
                          className="accent-amber-500"
                        />
                        <span>No</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pepOption"
                          value="SI"
                          checked={pepEstado === 'SI'}
                          onChange={() => setPepEstado('SI')}
                          className="accent-amber-500"
                        />
                        <span>Sí</span>
                      </label>
                    </div>

                    {pepEstado === 'SI' && (
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Cargo o Relación PEP</label>
                        <input
                          type="text"
                          value={relacionPep}
                          onChange={(e) => setRelacionPep(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIVIDAD Y OCUPACIÓN */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                    Actividad Económica y Ocupación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Actividad Económica</label>
                      <input
                        type="text"
                        value={actividadEconomica}
                        onChange={(e) => setActividadEconomica(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Ocupación o Profesión</label>
                      <input
                        type="text"
                        value={ocupacion}
                        onChange={(e) => setOcupacion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Giro</label>
                      <input
                        type="text"
                        value={giro}
                        onChange={(e) => setGiro(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* IDENTIFICADORES Y DATOS PERSONALES */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    Identificadores y Datos Personales
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                        RFC
                        {camposExtraidosIA.rfc && <span className="text-[10px] text-amber-400 font-bold">IA</span>}
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        value={rfc}
                        onChange={(e) => setRfc(e.target.value.toUpperCase())}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                        CURP
                        {camposExtraidosIA.curp && <span className="text-[10px] text-amber-400 font-bold">IA</span>}
                      </label>
                      <input
                        type="text"
                        maxLength={18}
                        value={curp}
                        onChange={(e) => setCurp(e.target.value.toUpperCase())}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Fecha de Nacimiento</span>
                        {camposExtraidosIA.fechaNacimiento && <span className="text-[10px] text-amber-400 font-bold">IA</span>}
                      </label>
                      <input
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                      {notaCurpFechaNac && (
                        <span className="text-[10px] text-amber-400/90 block mt-1 font-mono">
                          ⚠️ {notaCurpFechaNac}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Lugar de Nacimiento</label>
                      <input
                        type="text"
                        value={lugarNacimiento}
                        onChange={(e) => setLugarNacimiento(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">País de Nacimiento</label>
                      <input
                        type="text"
                        value={paisNacimiento}
                        onChange={(e) => setPaisNacimiento(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Nacionalidad</label>
                      <input
                        type="text"
                        value={nacionalidad}
                        onChange={(e) => setNacionalidad(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* ESTADO CIVIL SÓLO SOLTERO Y CASADO */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado Civil</label>
                      <select
                        value={estadoCivil}
                        onChange={(event) => {
                          const value = event.target.value as 'SOLTERO' | 'CASADO' | '';
                          setEstadoCivil(value);
                          if (value !== 'CASADO') {
                            setRegimenMatrimonial('');
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">Seleccionar</option>
                        {ESTADOS_CIVILES.map((estado) => (
                          <option key={estado.value} value={estado.value}>
                            {estado.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* RÉGIMEN MATRIMONIAL DESHABILITADO Y LIMPIO SI ES SOLTERO */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Régimen Matrimonial</label>
                      <select
                        disabled={estadoCivil !== 'CASADO'}
                        value={regimenMatrimonial}
                        onChange={(e) => setRegimenMatrimonial(e.target.value)}
                        className={`w-full bg-slate-900 border rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none ${
                          estadoCivil !== 'CASADO'
                            ? 'border-slate-800 text-slate-600 cursor-not-allowed bg-slate-950'
                            : 'border-slate-700 focus:border-amber-500'
                        }`}
                      >
                        {estadoCivil === 'CASADO' ? (
                          <>
                            <option value="SEPARACION_DE_BIENES">Separación de Bienes</option>
                            <option value="SOCIEDAD_CONYUGAL">Sociedad Conyugal</option>
                            <option value="SOCIEDAD_LEGAL">Sociedad Legal</option>
                          </>
                        ) : (
                          <option value="">No aplica (Soltero/a)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Escolaridad</label>
                      <select
                        value={escolaridad}
                        onChange={(e) => setEscolaridad(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">Seleccionar</option>
                        <option value="Primaria">Primaria</option>
                        <option value="Secundaria">Secundaria</option>
                        <option value="Preparatoria">Preparatoria</option>
                        <option value="Carrera Técnica">Carrera Técnica</option>
                        <option value="Licenciatura">Licenciatura</option>
                        <option value="Especialidad">Especialidad</option>
                        <option value="Maestría">Maestría</option>
                        <option value="Doctorado">Doctorado</option>
                        <option value="Otra">Otra</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* IDENTIFICACIÓN OFICIAL */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <FileText className="w-5 h-5 text-amber-400" />
                    Identificación Oficial
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo de Identificación</label>
                      <select
                        value={tipoIdentificacion}
                        onChange={(e) => setTipoIdentificacion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="INE">INE</option>
                        <option value="PASAPORTE">Pasaporte</option>
                        <option value="CEDULA_PROFESIONAL">Cédula Profesional</option>
                        <option value="CARTILLA_MILITAR">Cartilla Militar</option>
                        <option value="DOCUMENTO_MIGRATORIO">Documento Migratorio</option>
                        <option value="OTRA">Otra</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Folio de Identificación</label>
                      <input
                        type="text"
                        value={folioIdentificacion}
                        onChange={(e) => setFolioIdentificacion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Autoridad Emisora</label>
                      <input
                        type="text"
                        value={autoridadEmisora}
                        onChange={(e) => setAutoridadEmisora(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">País Emisor</label>
                      <input
                        type="text"
                        value={paisEmisor}
                        onChange={(e) => setPaisEmisor(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha de Expedición</label>
                      <input
                        type="date"
                        value={fechaExpedicionIdentificacion}
                        onChange={(e) => setFechaExpedicionIdentificacion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        value={fechaVencimientoIdentificacion}
                        onChange={(e) => setFechaVencimientoIdentificacion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3 flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="checkIdentificacionPrincipal"
                        checked={identificacionPrincipal}
                        onChange={(e) => setIdentificacionPrincipal(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <label htmlFor="checkIdentificacionPrincipal" className="text-xs text-slate-300 cursor-pointer">
                        Marcar como Identificación Principal del Compareciente
                      </label>
                    </div>
                  </div>
                </div>

                {/* CONTACTO */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <User className="w-5 h-5 text-amber-400" />
                    Datos de Contacto
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Teléfono</label>
                      <input
                        type="text"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo Electrónico</label>
                      <input
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DOMICILIO PARTICULAR (Comprobante de Domicilio / CFE / Agua) */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-amber-400" />
                      Domicilio Particular
                    </h3>
                    <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      Fuente: Comprobante de Domicilio (CFE / Agua / Teléfono)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Calle</label>
                      <input
                        type="text"
                        value={domicilioCalle}
                        onChange={(e) => setDomicilioCalle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Número Exterior</label>
                      <input
                        type="text"
                        value={domicilioExterior}
                        onChange={(e) => setDomicilioExterior(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Número Interior</label>
                      <input
                        type="text"
                        value={domicilioInterior}
                        onChange={(e) => setDomicilioInterior(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Colonia</label>
                      <input
                        type="text"
                        value={domicilioColonia}
                        onChange={(e) => setDomicilioColonia(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Código Postal</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={domicilioCp}
                        onChange={(e) => setDomicilioCp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Municipio / Alcaldía</label>
                      <input
                        type="text"
                        value={domicilioMunicipio}
                        onChange={(e) => setDomicilioMunicipio(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Ciudad / Localidad</label>
                      <input
                        type="text"
                        value={domicilioCiudad}
                        onChange={(e) => setDomicilioCiudad(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado</label>
                      <input
                        type="text"
                        value={domicilioEstado}
                        onChange={(e) => setDomicilioEstado(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">País</label>
                      <input
                        type="text"
                        value={domicilioPais}
                        onChange={(e) => setDomicilioPais(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Documento Soporte</label>
                      <input
                        type="text"
                        value={documentoSoporteDomicilio}
                        onChange={(e) => setDocumentoSoporteDomicilio(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DOMICILIO FISCAL (Constancia de Situación Fiscal - CSF) */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      Domicilio Fiscal
                    </h3>
                    <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                      Fuente: Constancia de Situación Fiscal (CSF)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Calle Fiscal</label>
                      <input
                        type="text"
                        value={domFiscalCalle}
                        onChange={(e) => setDomFiscalCalle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Número Exterior</label>
                      <input
                        type="text"
                        value={domFiscalExterior}
                        onChange={(e) => setDomFiscalExterior(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Número Interior</label>
                      <input
                        type="text"
                        value={domFiscalInterior}
                        onChange={(e) => setDomFiscalInterior(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Colonia</label>
                      <input
                        type="text"
                        value={domFiscalColonia}
                        onChange={(e) => setDomFiscalColonia(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Código Postal</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={domFiscalCp}
                        onChange={(e) => setDomFiscalCp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Municipio / Alcaldía</label>
                      <input
                        type="text"
                        value={domFiscalMunicipio}
                        onChange={(e) => setDomFiscalMunicipio(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Ciudad / Localidad</label>
                      <input
                        type="text"
                        value={domFiscalCiudad}
                        onChange={(e) => setDomFiscalCiudad(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado</label>
                      <input
                        type="text"
                        value={domFiscalEstado}
                        onChange={(e) => setDomFiscalEstado(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">País</label>
                      <input
                        type="text"
                        value={domFiscalPais}
                        onChange={(e) => setDomFiscalPais(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Documento Soporte</label>
                      <input
                        type="text"
                        value={domFiscalDocumento}
                        onChange={(e) => setDomFiscalDocumento(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-4">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                    Observaciones Notariales
                  </h3>

                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 focus:border-amber-500 focus:outline-none resize-y"
                  />
                </div>
              </div>
            )}

            {/* SECCIÓN FORMULARIO COMPLETO PERSONA MORAL */}
            {tipoPersona === 'MORAL' && (
              <div className="space-y-8">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <Building2 className="w-5 h-5 text-amber-400" />
                    Datos de la Persona Moral
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Razón Social *</label>
                      <input
                        type="text"
                        required
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre Comercial</label>
                      <input
                        type="text"
                        value={nombreComercial}
                        onChange={(e) => setNombreComercial(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo Societario</label>
                      <select
                        value={tipoSocietario}
                        onChange={(e) => setTipoSocietario(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="S.A. DE C.V.">S.A. DE C.V.</option>
                        <option value="S. DE R.L. DE C.V.">S. DE R.L. DE C.V.</option>
                        <option value="S.C.">S.C.</option>
                        <option value="A.C.">A.C.</option>
                        <option value="S.A.P.I. DE C.V.">S.A.P.I. DE C.V.</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">RFC Moral</label>
                      <input
                        type="text"
                        maxLength={12}
                        value={rfcMoral}
                        onChange={(e) => setRfcMoral(e.target.value.toUpperCase())}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Nacionalidad</label>
                      <input
                        type="text"
                        value={nacionalidadMoral}
                        onChange={(e) => setNacionalidadMoral(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">País de Constitución</label>
                      <input
                        type="text"
                        value={paisConstitucion}
                        onChange={(e) => setPaisConstitucion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha de Constitución</label>
                      <input
                        type="date"
                        value={fechaConstitucion}
                        onChange={(e) => setFechaConstitucion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Duración</label>
                      <input
                        type="text"
                        value={duracionMoral}
                        onChange={(e) => setDuracionMoral(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Indefinida / 99 Años"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Objeto Social Resumido</label>
                      <textarea
                        rows={2}
                        value={objetoSocial}
                        onChange={(e) => setObjetoSocial(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:border-amber-500 focus:outline-none resize-y"
                        placeholder="Desarrollo inmobiliario, compraventa y arrendamiento..."
                      />
                    </div>
                  </div>
                </div>

                {/* ESCRITURA CONSTITUTIVA Y REGISTRO MERCANTIL */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <FileText className="w-5 h-5 text-amber-400" />
                    Escritura Constitutiva y Registro Mercantil
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Escritura Constitutiva No.</label>
                      <input
                        type="text"
                        value={escrituraConstitutiva}
                        onChange={(e) => setEscrituraConstitutiva(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Ej. 14,892"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha de Escritura</label>
                      <input
                        type="date"
                        value={fechaEscritura}
                        onChange={(e) => setFechaEscritura(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del Notario / Corredor</label>
                      <input
                        type="text"
                        value={notarioNombre}
                        onChange={(e) => setNotarioNombre(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Lic. José Manuel Richard"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">No. de Notaría / Correduría</label>
                      <input
                        type="text"
                        value={numeroNotaria}
                        onChange={(e) => setNumeroNotaria(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="4"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Municipio de la Notaría</label>
                      <input
                        type="text"
                        value={municipioNotaria}
                        onChange={(e) => setMunicipioNotaria(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Tepic"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Estado de la Notaría</label>
                      <input
                        type="text"
                        value={estadoNotaria}
                        onChange={(e) => setEstadoNotaria(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Nayarit"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Folio Mercantil / RPC</label>
                      <input
                        type="text"
                        value={folioMercantil}
                        onChange={(e) => setFolioMercantil(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="N-2022019482"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha de Inscripción</label>
                      <input
                        type="date"
                        value={fechaInscripcion}
                        onChange={(e) => setFechaInscripcion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DOMICILIO SOCIAL Y REPRESENTANTE */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 lg:p-8 space-y-6">
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-700/60 pb-3">
                    <MapPin className="w-5 h-5 text-amber-400" />
                    Domicilio Social y Representación Legal
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Domicilio Social y Fiscal</label>
                      <input
                        type="text"
                        value={domicilioSocialFiscal}
                        onChange={(e) => setDomicilioSocialFiscal(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Av. Paseo de la Reforma 123, Juárez, CDMX"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Teléfono</label>
                      <input
                        type="text"
                        value={telefonoMoral}
                        onChange={(e) => setTelefonoMoral(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="55 1234 5678"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo Electrónico</label>
                      <input
                        type="email"
                        value={correoMoral}
                        onChange={(e) => setCorreoMoral(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="contacto@empresa.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Representante Legal</label>
                      <input
                        type="text"
                        value={representanteNombre}
                        onChange={(e) => setRepresentanteNombre(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Lic. José Manuel Richard García"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Instrumento de Representación</label>
                      <input
                        type="text"
                        value={instrumentoRepresentacion}
                        onChange={(e) => setInstrumentoRepresentacion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                        placeholder="Poder Notarial Escritura 15,200"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Observaciones Notariales</label>
                      <textarea
                        rows={3}
                        value={observacionesMoral}
                        onChange={(e) => setObservacionesMoral(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:border-amber-500 focus:outline-none resize-y"
                        placeholder="Anotaciones especiales para la persona moral..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOTÓN GUARDAR COMPARECIENTE */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCancelarSesion}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                {guardando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Guardando Compareciente...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar y Registrar Compareciente</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* VISOR MODAL INTERNO DE DOCUMENTOS */}
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
                onClick={cerrarVisor}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[400px]">
              {docVisorSeleccionado.cargando ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  <span className="text-sm">Cargando documento desde el servidor...</span>
                </div>
              ) : docVisorSeleccionado.url ? (
                <iframe
                  src={docVisorSeleccionado.url}
                  title={docVisorSeleccionado.nombre}
                  className="w-full h-[70vh] rounded-lg border border-slate-800"
                />
              ) : (
                <div className="text-slate-400 text-xs">No se pudo cargar el documento.</div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 text-xs">
              <span className="text-slate-400">Visor Interno PRAVIA OS</span>
              <button
                type="button"
                onClick={cerrarVisor}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN POSTERIOR */}
      {modalConfirmacion && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-serif font-bold text-slate-100">Compareciente Creado Correctamente</h3>
              <p className="text-xs text-slate-400 mt-1">El registro maestro y sus documentos han sido integrados al Archivo Documental.</p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/comparecientes/${modalConfirmacion.comparecienteId}`)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md font-extrabold"
              >
                <User className="w-4 h-4" /> Abrir Ficha del Compareciente
              </button>

              <button
                type="button"
                onClick={() => navigate(`/comparecientes/${modalConfirmacion.comparecienteId}?tab=documentos`)}
                className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" /> Ver Archivo Documental
              </button>

              <button
                type="button"
                onClick={() => navigate('/comparecientes')}
                className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
              >
                Volver al Catálogo
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmationDialog}
    </div>
  );
}
