import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, Clock, User, Building2, FileText, CheckCircle2, AlertCircle, 
  Send, DollarSign, History, ChevronRight, Upload, Copy, Mail, Plus,
  ShieldCheck, Download, Lock, Check, AlertTriangle, FileSpreadsheet, Eye, Layers, Trash2, Phone, MessageSquare, ArrowRightLeft,
  Receipt, BadgeCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface CotizacionDetailProps {
  cotizacionId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const CONCEPTOS_CATALOGO = [
  'Honorarios de la notaría',
  'ISR',
  'ISABI / Traslado de Dominio',
  'Derechos registrales (RPPyC)',
  'Derechos catastrales',
  'Avalúo comercial/fiscal',
  'Certificados (CLG, Libertad de Gravamen)',
  'Gastos de gestoría',
  'IVA',
  'Otros gastos'
];

function EstadoBadge({ estado }: { estado: string }) {
  let badgeStyle = { backgroundColor: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
  let label = estado ? estado.replace(/_/g, ' ') : 'BORRADOR';

  switch (estado) {
    case 'BORRADOR':
      badgeStyle = { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
      break;
    case 'ENVIADA_NOTARIA':
      badgeStyle = { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)' };
      break;
    case 'PRESUPUESTO_RECIBIDO':
    case 'EN_REVISION_ABOGADO':
      badgeStyle = { backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.3)' };
      break;
    case 'ENVIADA_CLIENTE':
    case 'EN_NEGOCIACION':
      badgeStyle = { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' };
      break;
    case 'ACEPTADA':
    case 'CONVERTIDA_EXPEDIENTE':
      badgeStyle = { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' };
      break;
    case 'RECHAZADA':
    case 'VENCIDA':
      badgeStyle = { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' };
      break;
  }

  return (
    <span style={{
      padding: 'var(--space-1) var(--space-3)',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      ...badgeStyle
    }}>
      {label}
    </span>
  );
}

function formatDateMilestone(dateString?: string | null) {
  if (!dateString) return 'Pendiente';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Pendiente';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function CotizacionDetail({ cotizacionId, onClose, onUpdate }: CotizacionDetailProps) {
  const navigate = useNavigate();
  const userRole = useAuthStore((state) => state.user?.rol);
  const canValidateAdvance = userRole === 'DIRECCION' || userRole === 'ADMINISTRACION';

  const [cotizacion, setCotizacion] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'solicitud' | 'presupuesto' | 'documentos' | 'seguimiento' | 'bitacora'>('resumen');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Acciones
  const [isChangingEstado, setIsChangingEstado] = useState(false);
  const [newEstado, setNewEstado] = useState('');

  // Modales de Conversión a Expediente
  const [showConversionConfirmModal, setShowConversionConfirmModal] = useState(false);
  const [isConvertingExpediente, setIsConvertingExpediente] = useState(false);
  const [conversionSuccessResult, setConversionSuccessResult] = useState<any | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [isRegisteringAdvance, setIsRegisteringAdvance] = useState(false);
  const [validatingAdvanceId, setValidatingAdvanceId] = useState<string | null>(null);

  // Budget form state (dynamic rubros)
  const [budgetItems, setBudgetItems] = useState<Array<{ id: string, concepto: string, monto: number }>>([
    { id: '1', concepto: 'Honorarios de la notaría', monto: 0 },
    { id: '2', concepto: 'Derechos registrales (RPPyC)', monto: 0 },
    { id: '3', concepto: 'ISR', monto: 0 },
    { id: '4', concepto: 'ISABI / Traslado de Dominio', monto: 0 },
    { id: '5', concepto: 'Gastos de gestoría', monto: 0 },
    { id: '6', concepto: 'IVA', monto: 0 },
  ]);

  // Sección Independiente: Participación PRAVIA (Uso Interno) - Únicamente Importe ($)
  const [praviaMonto, setPraviaMonto] = useState<number>(0);
  const [praviaMontoInput, setPraviaMontoInput] = useState<string>('0');
  const [isSavingPravia, setIsSavingPravia] = useState<boolean>(false);

  // Estado de Depuración y Diagnóstico de Extracción PDF
  const [extractionDebug, setExtractionDebug] = useState<any>(null);
  const [showRawTextModal, setShowRawTextModal] = useState<boolean>(false);

  // Estado de Documentos Heredados por Filtro
  const [docFilterTab, setDocFilterTab] = useState<'TODOS' | 'PROSPECTO' | 'COTIZACION'>('TODOS');
  const [cotizacionDocumentos, setCotizacionDocumentos] = useState<any[]>([]);

  const [selectedConceptoToAdd, setSelectedConceptoToAdd] = useState(CONCEPTOS_CATALOGO[0]);
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isExtractingIA, setIsExtractingIA] = useState(false);

  // Módulo de Seguimiento Commercial
  const [seguimientosList, setSeguimientosList] = useState<any[]>([]);
  const [isAddingSeguimiento, setIsAddingSeguimiento] = useState(false);
  const [isSavingSeguimiento, setIsSavingSeguimiento] = useState(false);
  const [seguimientoTipo, setSeguimientoTipo] = useState('llamada');
  const [seguimientoDestinatario, setSeguimientoDestinatario] = useState('cliente');
  const [seguimientoResumen, setSeguimientoResumen] = useState('');
  const [seguimientoResultado, setSeguimientoResultado] = useState('');
  const [seguimientoProximaAccion, setSeguimientoProximaAccion] = useState('');
  const [seguimientoResponsable, setSeguimientoResponsable] = useState('');
  const [seguimientoFechaProximo, setSeguimientoFechaProximo] = useState('');

  // Modales de Documentos
  const [previewDocument, setPreviewDocument] = useState<{ url: string, doc: any } | null>(null);
  const [deleteDocumentConfirm, setDeleteDocumentConfirm] = useState<any | null>(null);

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadCotizacion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get(`/cotizaciones/${cotizacionId}`);
      setCotizacion(data);

      const versiones = Array.isArray(data?.versiones) ? data.versiones : [];
      let initialMonto = Number(data?.honorarios_pravia || 0);

      if (versiones.length > 0) {
        const v = versiones[0];
        if (v?.desglose_notaria?.rubros) {
          setBudgetItems(v.desglose_notaria.rubros);
        }
        if (v.honorarios_pravia !== null && v.honorarios_pravia !== undefined) {
          initialMonto = Number(v.honorarios_pravia);
        }
      }

      setPraviaMonto(initialMonto);
      setPraviaMontoInput(String(initialMonto));

      // Cargar documentos heredados de prospecto y cotización
      try {
        const docsData = await api.get(`/cotizaciones/${cotizacionId}/documentos`);
        if (Array.isArray(docsData)) setCotizacionDocumentos(docsData);
      } catch (dErr) {
        console.warn('Carga de documentos cotización omitida silenciosamente:', dErr);
      }

      // Cargar seguimientos
      try {
        const segs = await api.get(`/cotizaciones/${cotizacionId}/seguimientos`);
        if (Array.isArray(segs)) {
          setSeguimientosList(segs);
        }
      } catch (sErr) {
        console.warn('Carga de seguimientos omitida silenciosamente:', sErr);
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Error al cargar la cotización');
    } finally {
      setIsLoading(false);
    }
  }, [cotizacionId]);

  useEffect(() => {
    setCotizacion(null);
    setError(null);
    loadCotizacion();
  }, [cotizacionId, loadCotizacion]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Total Presupuesto Cliente (Suma de rubros notariales)
  const totalNotariaCalculated = budgetItems.reduce((acc, i) => acc + Number(i.monto || 0), 0);
  const totalClienteCalculated = totalNotariaCalculated; // Total Cliente = Total Presupuesto Notaría

  const handlePraviaMontoUserChange = (valStr: string) => {
    setPraviaMontoInput(valStr);
    const num = parseFloat(valStr) || 0;
    setPraviaMonto(num);
  };

  const handleSavePraviaParticipation = async () => {
    setIsSavingPravia(true);
    try {
      await api.put(`/cotizaciones/${cotizacionId}/participacion-pravia`, {
        monto: praviaMonto
      });
      setToastMessage('Participación PRAVIA guardada correctamente.');
      loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(`Error al guardar participación PRAVIA: ${err?.detail || err?.message}`);
    } finally {
      setIsSavingPravia(false);
    }
  };

  const handleOpenPdf = async (documentoId: string) => {
    try {
      const res = await api.get(`/documentos/${documentoId}/url`);
      if (res?.url) {
        window.open(res.url, '_blank');
      } else {
        setToastMessage('No se pudo obtener la URL firmada del documento');
      }
    } catch (err: any) {
      setToastMessage(`Error al abrir PDF: ${err?.detail || err?.message || 'No disponible'}`);
    }
  };

  const handleExtraerIA = async () => {
    const presupuestoDocs = Array.isArray(cotizacion?.documentos)
      ? cotizacion.documentos.filter((d: any) => d.tipo === 'PRESUPUESTO_NOTARIA' || d.categoria === 'PROYECTO')
      : [];
    const currentPdfDoc = presupuestoDocs[0] || null;

    if (!currentPdfDoc && !fileInputRef.current?.files?.[0]) {
      setToastMessage('Primero debes cargar un archivo PDF de presupuesto de notaría.');
      return;
    }

    setIsExtractingIA(true);
    try {
      let extracted: any = null;

      if (currentPdfDoc) {
        extracted = await api.post('/cotizaciones/extraer-presupuesto', {
          documentoId: currentPdfDoc.id,
          cotizacionId: cotizacionId
        });
      } else if (fileInputRef.current?.files?.[0]) {
        const formData = new FormData();
        formData.append('archivo', fileInputRef.current.files[0]);
        extracted = await api.upload('/cotizaciones/extraer-presupuesto', formData);
      }

      if (extracted?.rubros && Array.isArray(extracted.rubros) && extracted.rubros.length > 0) {
        setBudgetItems(extracted.rubros);
        if (extracted.debug) setExtractionDebug(extracted.debug);
        const newTotalNotaria = extracted.rubros.reduce((sum: number, r: any) => sum + Number(r.monto || 0), 0);
        setToastMessage(`✨ Extracción IA completada. ${extracted.rubros.length} rubros cargados (Total: $${newTotalNotaria.toLocaleString('es-MX', { minimumFractionDigits: 2 })}).`);
      } else {
        if (extracted?.debug) setExtractionDebug(extracted.debug);
        setToastMessage('No se detectaron montos en el PDF. Revisa el documento o captura los conceptos manualmente.');
      }
    } catch (err: any) {
      setToastMessage(`Extracción IA: ${err?.detail || err?.message || 'Procesamiento manual activo'}`);
    } finally {
      setIsExtractingIA(false);
    }
  };

  const handlePdfSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setToastMessage('Solo se permiten archivos PDF.');
      event.target.value = '';
      return;
    }

    setIsUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('tipo', 'PRESUPUESTO_NOTARIA');
      formData.append('categoria', 'PROYECTO');
      formData.append('cotizacion_id', cotizacionId);
      formData.append('user_id', cotizacion?.user_id || '8127559a-e44f-4f44-97de-cbebc68d7cd3');

      await api.upload('/documentos', formData);

      try {
        const iaFormData = new FormData();
        iaFormData.append('archivo', file);
        const extracted = await api.upload('/cotizaciones/extraer-presupuesto', iaFormData);
        if (extracted?.rubros && Array.isArray(extracted.rubros)) {
          setBudgetItems(extracted.rubros);
          if (extracted.debug) setExtractionDebug(extracted.debug);
        }
      } catch (iaErr) {
        console.warn('Extracción IA silenciosa no completada:', iaErr);
      }

      setToastMessage('Presupuesto PDF cargado e integrado correctamente');
      await loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(err?.detail || err?.message || 'Error al subir el presupuesto PDF');
    } finally {
      setIsUploadingPdf(false);
      event.target.value = '';
    }
  };

  // Actions Handlers
  const handleEstadoChange = async () => {
    if (!newEstado) return;
    try {
      await api.put(`/cotizaciones/${cotizacionId}/estado`, { estado: newEstado });
      setIsChangingEstado(false);
      setToastMessage(`Estado actualizado a ${newEstado.replace(/_/g, ' ')}`);
      loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(err?.detail || err?.message || 'Error al cambiar estado.');
    }
  };

  const handleRegisterAdvance = async () => {
    const amount = Number(advanceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setToastMessage('Captura un monto de anticipo mayor a cero.');
      return;
    }
    setIsRegisteringAdvance(true);
    try {
      await api.post(`/cotizaciones/${cotizacionId}/anticipo`, { monto: amount });
      setAdvanceAmount('');
      setToastMessage('Anticipo registrado; requiere validación administrativa.');
      await loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(err?.detail || err?.message || 'No fue posible registrar el anticipo.');
    } finally {
      setIsRegisteringAdvance(false);
    }
  };

  const handleValidateAdvance = async (paymentId: string) => {
    setValidatingAdvanceId(paymentId);
    try {
      await api.post(`/cotizaciones/pago/${paymentId}/validar`, {});
      setToastMessage('Anticipo validado correctamente.');
      await loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(err?.detail || err?.message || 'No fue posible validar el anticipo.');
    } finally {
      setValidatingAdvanceId(null);
    }
  };

  const handleGuardarNuevaVersion = async (autoAprobar: boolean = false) => {
    setIsSubmittingVersion(true);
    try {
      const totalNotaria = budgetItems.reduce((acc, i) => acc + Number(i.monto || 0), 0);

      await api.post(`/cotizaciones/${cotizacionId}/versiones`, {
        desglose_notaria: { rubros: budgetItems },
        total_notaria: totalNotaria,
        honorarios_pravia: praviaMonto,
        total_cliente: totalNotaria,
        aprobada: autoAprobar,
        notas: autoAprobar ? 'Versión aprobada e inmutable' : 'Borrador de versión de presupuesto'
      });

      setToastMessage(autoAprobar ? 'Versión de presupuesto aprobada.' : 'Borrador de versión guardado.');
      loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(`Error al guardar versión: ${err?.detail || err?.message}`);
    } finally {
      setIsSubmittingVersion(false);
    }
  };

  const isAlreadyConverted = cotizacion?.estado === 'CONVERTIDA_EXPEDIENTE' || Boolean(cotizacion?.expediente);
  const hasApprovedVersion = Array.isArray(cotizacion?.versiones) && cotizacion.versiones.some((v: any) => v.aprobada === true);
  const quoteAdvances = Array.isArray(cotizacion?.pagos)
    ? cotizacion.pagos.filter((payment: any) => payment.categoria_ingreso === 'ANTICIPO_NOTARIA')
    : [];
  const validatedAdvanceTotal = quoteAdvances
    .filter((payment: any) => payment.estatus === 'VALIDADO')
    .reduce((sum: number, payment: any) => sum + Number(payment.monto || 0), 0);
  const hasValidatedAdvance = validatedAdvanceTotal > 0;
  const canConvertToExpediente = cotizacion?.conversion?.eligible ?? (
    !isAlreadyConverted
    && cotizacion?.estado === 'ACEPTADA'
    && hasApprovedVersion
    && hasValidatedAdvance
    && Boolean(cotizacion?.prospecto_id)
  );
  const allowedTransitions: string[] = Array.isArray(cotizacion?.transiciones_permitidas)
    ? cotizacion.transiciones_permitidas
    : [];

  const handleConvertExpedienteClick = () => {
    if (isAlreadyConverted) {
      const expId = cotizacion?.expediente?.id || cotizacion?.expediente_id;
      if (expId) {
        onClose();
        navigate(`/expedientes/${expId}`);
      } else {
        setToastMessage('El expediente ya fue aperturado previamente.');
      }
      return;
    }

    if (!canConvertToExpediente) {
      const failures = cotizacion?.conversion?.failures;
      setToastMessage(Array.isArray(failures) && failures.length
        ? failures.join(' ')
        : 'La cotización requiere aceptación, versión aprobada y anticipo validado antes de convertirse.');
      return;
    }

    setShowConversionConfirmModal(true);
  };

  const executeConversionToExpediente = async () => {
    setIsConvertingExpediente(true);
    try {
      const res = await api.post('/expedientes/convertir-cotizacion', { cotizacion_id: cotizacionId });
      const createdExp = res?.data || res;
      setConversionSuccessResult(createdExp);
      setShowConversionConfirmModal(false);
      setToastMessage(`Expediente ${createdExp.numero_pravia || ''} aperturado correctamente.`);
      loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(err?.detail || err?.message || 'Error al convertir a expediente');
    } finally {
      setIsConvertingExpediente(false);
    }
  };

  // Document Actions: Visualizar, Descargar Directa, Eliminar Transparente
  const handlePreviewDocument = async (doc: any) => {
    try {
      const res = await api.get(`/documentos/${doc.id}/url`);
      if (res?.url) {
        setPreviewDocument({ url: res.url, doc });
      } else {
        setToastMessage('No se pudo obtener la URL del documento');
      }
    } catch (err: any) {
      setToastMessage(err?.detail || err?.message || 'Error al obtener documento');
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const res = await api.get(`/documentos/${doc.id}/url`);
      if (res?.url) {
        setToastMessage('Iniciando descarga...');
        const response = await fetch(res.url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.nombre_original || 'documento.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        setToastMessage('Descarga completada');
      }
    } catch (err: any) {
      setToastMessage(`Error al descargar: ${err?.detail || err?.message}`);
    }
  };

  const handleConfirmDeleteDocument = async (docId: string) => {
    try {
      await api.delete(`/documentos/${docId}`);
      setToastMessage('Documento eliminado correctamente.');
      setDeleteDocumentConfirm(null);
      loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(`Error al eliminar documento: ${err?.detail || err?.message}`);
    }
  };

  // Seguimiento Handler
  const handleCreateSeguimiento = async () => {
    if (!seguimientoResumen.trim()) {
      setToastMessage('Escribe un resumen para el seguimiento.');
      return;
    }
    setIsSavingSeguimiento(true);
    try {
      await api.post(`/cotizaciones/${cotizacionId}/seguimientos`, {
        tipo: seguimientoTipo,
        destinatario: seguimientoDestinatario,
        resumen: seguimientoResumen,
        resultado: seguimientoResultado,
        proxima_accion: seguimientoProximaAccion,
        responsable: seguimientoResponsable,
        fecha_proximo_seguimiento: seguimientoFechaProximo ? new Date(seguimientoFechaProximo).toISOString() : null,
        user_id: cotizacion?.user_id
      });

      setToastMessage('📋 Seguimiento registrado correctamente');
      setIsAddingSeguimiento(false);
      setSeguimientoResumen('');
      setSeguimientoResultado('');
      setSeguimientoProximaAccion('');
      setSeguimientoResponsable('');
      setSeguimientoFechaProximo('');
      loadCotizacion();
      onUpdate();
    } catch (err: any) {
      setToastMessage(err?.detail || err?.message || 'Error al guardar seguimiento');
    } finally {
      setIsSavingSeguimiento(false);
    }
  };

  // Concept Item Handlers
  const handleAddConcepto = () => {
    setBudgetItems([...budgetItems, { id: Date.now().toString(), concepto: selectedConceptoToAdd, monto: 0 }]);
  };
  const handleItemMontoChange = (id: string, val: number) => {
    setBudgetItems(budgetItems.map(i => i.id === id ? { ...i, monto: val } : i));
  };
  const handleItemConceptoChange = (id: string, conceptName: string) => {
    setBudgetItems(budgetItems.map(i => i.id === id ? { ...i, concepto: conceptName } : i));
  };
  const handleRemoveItem = (id: string) => {
    setBudgetItems(budgetItems.filter(i => i.id !== id));
  };

  // Loading Guard
  if (isLoading || !cotizacion) {
    return createPortal(
      <div className="quote-detail-backdrop" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        zIndex: 99999,
        backgroundColor: 'rgba(15, 15, 35, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <div className="quote-detail-panel" style={{
          width: 'min(980px, 100vw)',
          height: '100vh',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8)'
        }}>
          {error ? (
            <div style={{ textAlign: 'center', color: 'var(--color-danger)' }}>
              <AlertCircle size={40} style={{ margin: '0 auto var(--space-3)' }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{error}</p>
              <button onClick={onClose} className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>Cerrar</button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto var(--space-3)' }} />
              <p style={{ fontSize: '0.85rem' }}>Cargando detalle de cotización...</p>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // Normalized Arrays & Computation
  const versiones = Array.isArray(cotizacion.versiones) ? cotizacion.versiones : [];
  const documentos = Array.isArray(cotizacion.documentos) ? cotizacion.documentos : [];

  // Deduplicación Documental por ID / storage_key único
  const uniqueDocumentosMap = new Map();
  documentos.forEach((d: any) => {
    const key = d.storage_key || d.id;
    if (!uniqueDocumentosMap.has(key)) {
      uniqueDocumentosMap.set(key, d);
    }
  });
  const uniqueDocumentos = Array.from(uniqueDocumentosMap.values());

  const currentVersion = versiones[0] || null;
  const isVersionApproved = currentVersion?.aprobada === true;

  const isRetrasada = Boolean(cotizacion.fecha_limite_respuesta_notaria && new Date(cotizacion.fecha_limite_respuesta_notaria) < new Date());

  // Proxima accion
  let nextActionRole = 'Abogado';
  let nextActionText = 'Revisar la propuesta y enviar al cliente.';
  if (cotizacion.estado === 'ACEPTADA') {
    nextActionRole = 'Recepción / Abogado';
    nextActionText = 'Aperturar formalmente el Expediente con los datos del trámite.';
  } else if (cotizacion.estado === 'ENVIADA_CLIENTE') {
    nextActionRole = 'Abogado / Comercial';
    nextActionText = 'Dar seguimiento a la decisión del cliente.';
  } else if (cotizacion.estado === 'PRESUPUESTO_RECIBIDO') {
    nextActionRole = 'Abogado';
    nextActionText = 'Ajustar la versión del presupuesto y marcarla como APROBADA.';
  } else if (cotizacion.estado === 'ENVIADA_NOTARIA') {
    nextActionRole = 'Notaría';
    nextActionText = 'Notaría debe emitir el presupuesto desglosado.';
  }

  const etapasTimeline = [
    { label: 'Borrador', done: true },
    { label: 'Enviada Notaría', done: ['ENVIADA_NOTARIA', 'PRESUPUESTO_RECIBIDO', 'EN_REVISION_ABOGADO', 'ENVIADA_CLIENTE', 'EN_NEGOCIACION', 'ACEPTADA', 'CONVERTIDA_EXPEDIENTE'].includes(cotizacion.estado) },
    { label: 'Presupuesto Recibido', done: ['PRESUPUESTO_RECIBIDO', 'EN_REVISION_ABOGADO', 'ENVIADA_CLIENTE', 'EN_NEGOCIACION', 'ACEPTADA', 'CONVERTIDA_EXPEDIENTE'].includes(cotizacion.estado) },
    { label: 'Enviada Cliente', done: ['ENVIADA_CLIENTE', 'EN_NEGOCIACION', 'ACEPTADA', 'CONVERTIDA_EXPEDIENTE'].includes(cotizacion.estado) },
    { label: 'Aceptada', done: ['ACEPTADA', 'CONVERTIDA_EXPEDIENTE'].includes(cotizacion.estado) },
    { label: 'Expediente', done: cotizacion.estado === 'CONVERTIDA_EXPEDIENTE' }
  ];

  return createPortal(
    <div className="quote-detail-backdrop" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw', height: '100vh',
      zIndex: 99999,
      backgroundColor: 'rgba(15, 15, 35, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div className="quote-detail-panel" style={{
        width: 'min(980px, 100vw)',
        height: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Toast Popup Notification */}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            top: 'var(--space-4)',
            right: 'var(--space-6)',
            zIndex: 100000,
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--color-primary)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}>
            <span>{toastMessage}</span>
            <button type="button" onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
          </div>
        )}

        {/* ── 1. ENCABEZADO FIJO (CON METRICAS CONSERVADAS: CLIENTE & PRAVIA) ── */}
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          flexShrink: 0
        }}>
          {/* Fila 1: Identificación y Estado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {cotizacion.numero_solicitud || cotizacion.numero_cotizacion || `COT-${cotizacion.id.slice(0,6)}`}
              </span>
              <span className={hasApprovedVersion ? 'badge badge-success' : 'badge badge-info'} style={{ fontSize: '0.75rem' }}>
                v{cotizacion.version_actual} ({hasApprovedVersion ? 'Aprobada' : 'Borrador'})
              </span>
              <EstadoBadge estado={cotizacion.estado} />
              {isRetrasada && (
                <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                  <AlertTriangle size={12} aria-hidden="true" /> Retrasada
                </span>
              )}
            </div>

            <button 
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-full)' }}
              title="Cerrar panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Fila 2: Datos del Trámite */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            alignItems: 'center', 
            gap: 'var(--space-4)', 
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            paddingTop: 'var(--space-1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <User size={15} style={{ color: 'var(--color-primary-light)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Cliente:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{cotizacion.prospecto?.nombre || 'Cliente no asignado'}</strong>
            </div>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FileText size={15} style={{ color: 'var(--color-primary-light)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Acto:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{cotizacion.prospecto?.tipo_acto || 'No especificado'}</strong>
            </div>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Building2 size={15} style={{ color: 'var(--color-primary-light)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Notaría:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{cotizacion.notaria?.nombre || 'Sin notaría'}</strong>
            </div>
          </div>

          {/* Fila 3: Tarjetas de Métricas Rápidas (ÚNICAMENTE ESTADO, PRAVIA Y CLIENTE) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-1)'
          }}>
            <div className="glass-card" style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-primary)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Estado Actual</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {cotizacion.estado.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-primary)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Participación PRAVIA (Interna)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                ${praviaMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="glass-card" style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-primary)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Total Presupuesto Cliente</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-success)' }}>
                ${totalClienteCalculated.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. BARRA DE ACCIONES Y BOTONES DEL SISTEMA ── */}
        <div style={{
          padding: 'var(--space-3) var(--space-6)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setIsChangingEstado(!isChangingEstado)}
              className="btn btn-secondary"
              disabled={allowedTransitions.length === 0}
              title={allowedTransitions.length === 0 ? 'No hay transiciones manuales disponibles desde el estado actual' : undefined}
              style={{ fontSize: '0.75rem' }}
            >
              <RefreshCwIcon size={14} style={{ marginRight: '4px' }} /> Cambiar Estado
            </button>

            <button 
              onClick={() => setActiveTab('presupuesto')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
            >
              <FileText size={14} style={{ marginRight: '4px' }} /> Cargar/Editar Presupuesto
            </button>

            <button 
              onClick={() => { setActiveTab('seguimiento'); setIsAddingSeguimiento(true); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
            >
              <MessageSquare size={14} style={{ marginRight: '4px' }} /> Registrar Seguimiento
            </button>
          </div>

          <div>
            {isAlreadyConverted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '0.75rem', padding: '4px 10px', fontWeight: 700 }}>
                  ✓ Convertida ({cotizacion?.expediente?.numero_pravia || 'EXP'})
                </span>
                <button
                  onClick={() => {
                    const expId = cotizacion?.expediente?.id || cotizacion?.expediente_id;
                    if (expId) {
                      onClose();
                      navigate(`/expedientes/${expId}`);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <FileText size={15} style={{ marginRight: '6px' }} /> Abrir Expediente
                </button>
              </div>
            ) : (
              <button
                onClick={handleConvertExpedienteClick}
                className="btn btn-primary"
                disabled={!canConvertToExpediente}
                title={!canConvertToExpediente ? 'Requiere aceptación, presupuesto aprobado y anticipo validado' : undefined}
                style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 700
                }}
              >
                <FileSpreadsheet size={15} style={{ marginRight: '6px' }} /> Convertir a Expediente
              </button>
            )}
          </div>
        </div>

        {/* Modal de Cambio de Estado */}
        {isChangingEstado && (
          <div style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <select
              value={newEstado}
              onChange={e => setNewEstado(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.8rem', padding: 'var(--space-2)' }}
            >
              <option value="">Seleccionar siguiente estado</option>
              {allowedTransitions.map((transition) => (
                <option value={transition} key={transition}>{transition.replace(/_/g, ' ')}</option>
              ))}
            </select>

            <button onClick={handleEstadoChange} className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
              Confirmar Cambio
            </button>
            <button onClick={() => setIsChangingEstado(false)} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
              Cancelar
            </button>
          </div>
        )}

        {/* ── 3. NAVEGACIÓN POR 6 PESTAÑAS ── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          overflowX: 'auto',
          flexShrink: 0
        }}>
          {[
            { id: 'resumen', label: '1. Resumen' },
            { id: 'solicitud', label: '2. Solicitud' },
            { id: 'presupuesto', label: '3. Presupuesto' },
            { id: 'documentos', label: `4. Documentos (${uniqueDocumentos.length})` },
            { id: 'seguimiento', label: `5. Seguimiento (${seguimientosList.length})` },
            { id: 'bitacora', label: '6. Bitácora' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: 'var(--space-3) var(--space-5)',
                fontSize: '0.8rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--color-primary-light)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 4. CONTENIDO CON SCROLL INTERNO CONTROLADO ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 'var(--space-6)'
        }}>

          {/* 3.1 PESTAÑA RESUMEN */}
          {activeTab === 'resumen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              
              {/* Línea de tiempo (Timeline de 6 Etapas) */}
              <div className="glass-card" style={{ padding: 'var(--space-5)' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
                  Línea de Tiempo del Trámite
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, minmax(80px, 1fr))',
                  gap: 'var(--space-2)',
                  textAlign: 'center'
                }}>
                  {etapasTimeline.map((etapa, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{
                        width: '28px', height: '28px',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700,
                        backgroundColor: etapa.done ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                        color: etapa.done ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border-color)'
                      }}>
                        {etapa.done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: etapa.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {etapa.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid 2 Columnas Responsivo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-6)' }}>
                
                {/* Bloque: Próxima Acción */}
                <div className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-primary-light)' }}>
                    <AlertCircle size={18} />
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                      Próxima Acción y Responsable
                    </h4>
                  </div>
                  <div style={{ padding: 'var(--space-3)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Responsable: {nextActionRole}</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 'var(--space-1) 0 0 0' }}>
                      {nextActionText}
                    </p>
                  </div>
                </div>

                {/* Bloque: Hitos y Tiempos Registrados Automáticamente */}
                <div className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
                    Hitos y Tiempos del Flujo
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Creación de Cotización:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateMilestone(cotizacion.created_at)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Envío a Notaría:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateMilestone(cotizacion.fecha_solicitud_notaria)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Recepción del Presupuesto:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateMilestone(cotizacion.fecha_presupuesto_recibido)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Envío al Cliente:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateMilestone(cotizacion.fecha_enviada_cliente)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Aprobación de Versión:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateMilestone(cotizacion.fecha_aprobacion_version)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Aceptación del Cliente:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateMilestone(cotizacion.fecha_aceptacion_cliente)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Conversión a Expediente:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDateMilestone(cotizacion.fecha_conversion_expediente)}</strong>
                    </div>
                  </div>
                </div>

                {/* Bloque: Resumen Financiero Comercial */}
                <div className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
                    Resumen Financiero Comercial
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Presupuesto Cliente:</span>
                      <strong style={{ color: 'var(--color-success)', fontSize: '0.95rem' }}>${totalClienteCalculated.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Participación PRAVIA (Interna):</span>
                      <strong style={{ color: 'var(--color-primary-light)' }}>${praviaMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Anticipo Validado:</span>
                      <strong style={{ color: hasValidatedAdvance ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        ${validatedAdvanceTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Bloque: Anticipo y validación administrativa */}
                <div className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>
                      <Receipt size={16} aria-hidden="true" /> Anticipo del Cliente
                    </h4>
                    <span className={`badge ${hasValidatedAdvance ? 'badge-success' : 'badge-warning'}`}>
                      {hasValidatedAdvance ? 'Validado' : 'Pendiente'}
                    </span>
                  </div>

                  {quoteAdvances.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {quoteAdvances.map((payment: any) => (
                        <div key={payment.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                              {Number(payment.monto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                            </strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                              {payment.estatus} · {formatDateMilestone(payment.fecha_pago || payment.fecha_registro)}
                            </span>
                          </div>
                          {payment.estatus === 'RECIBIDO' && canValidateAdvance && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={validatingAdvanceId === payment.id}
                              onClick={() => handleValidateAdvance(payment.id)}
                            >
                              <BadgeCheck size={15} aria-hidden="true" />
                              {validatingAdvanceId === payment.id ? 'Validando…' : 'Validar'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                      Aún no se ha registrado un anticipo para esta cotización.
                    </p>
                  )}

                  {cotizacion?.estado === 'ACEPTADA' && !isAlreadyConverted && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'end', flexWrap: 'wrap' }}>
                      <label style={{ flex: '1 1 180px', display: 'grid', gap: 'var(--space-1)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        Monto recibido (MXN)
                        <input
                          className="input-field"
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          value={advanceAmount}
                          onChange={(event) => setAdvanceAmount(event.target.value)}
                          placeholder="0.00"
                        />
                      </label>
                      <button type="button" className="btn btn-primary" disabled={isRegisteringAdvance || !advanceAmount} onClick={handleRegisterAdvance}>
                        {isRegisteringAdvance ? 'Registrando…' : 'Registrar anticipo'}
                      </button>
                    </div>
                  )}
                  {cotizacion?.estado !== 'ACEPTADA' && !isAlreadyConverted && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
                      El registro se habilita después de la aceptación del cliente.
                    </p>
                  )}
                </div>

                {/* Bloque: Requisitos para Expediente */}
                <div className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
                    Requisitos para Convertir a Expediente
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: cotizacion?.estado === 'ACEPTADA' ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {cotizacion?.estado === 'ACEPTADA' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
                      <span>Cotización Aceptada por Cliente</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: hasApprovedVersion ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {hasApprovedVersion ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
                      <span>Versión de Presupuesto Aprobada</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: hasValidatedAdvance ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {hasValidatedAdvance ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
                      <span>Anticipo Validado por Administración</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: !isAlreadyConverted ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {!isAlreadyConverted ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
                      <span>No Convertida Previamente</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 3.2 PESTAÑA SOLICITUD */}
          {activeTab === 'solicitud' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '800px', margin: '0 auto' }}>
              <div className="glass-card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Solicitud Enviada a la Notaría</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solicitud: {cotizacion.numero_solicitud || '—'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Notaría Destinataria</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{cotizacion.notaria?.nombre || 'No asignada'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Correo Electrónico</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{cotizacion.notaria?.email || 'Sin correo'}</strong>
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: 'var(--space-2)' }}>Cuerpo de la Solicitud</span>
                  <div style={{
                    padding: 'var(--space-4)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {cotizacion.cuerpo_correo_notaria || 'Sin cuerpo de correo.'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)' }}>
                  <button 
                    onClick={() => navigator.clipboard.writeText(cotizacion.cuerpo_correo_notaria || '')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Copy size={14} style={{ marginRight: '4px' }} /> Copiar Cuerpo
                  </button>
                  <button 
                    onClick={() => window.open(`mailto:${cotizacion.notaria?.email || ''}?subject=${encodeURIComponent(cotizacion.numero_solicitud || '')}&body=${encodeURIComponent(cotizacion.cuerpo_correo_notaria || '')}`)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Mail size={14} style={{ marginRight: '4px' }} /> Abrir Cliente de Correo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3.3 PESTAÑA PRESUPUESTO */}
          {activeTab === 'presupuesto' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--space-6)' }}>
              
              {/* Columna Izquierda: Visor PDF & Versiones */}
              <div className="glass-card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Visor de Presupuesto PDF</h4>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                      v{cotizacion?.version_actual || '—'}
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfSelected}
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    disabled={isUploadingPdf}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-8)',
                      textAlign: 'center',
                      background: 'var(--bg-primary)',
                      marginBottom: 'var(--space-4)',
                      cursor: isUploadingPdf ? 'not-allowed' : 'pointer',
                      opacity: isUploadingPdf ? 0.6 : 1,
                      display: 'block'
                    }}
                  >
                    <Upload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-2)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-light)', display: 'block' }}>
                      {isUploadingPdf ? 'Subiendo presupuesto PDF...' : 'Cargar presupuesto PDF de Notaría'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PDF original enviado por la notaría</span>
                  </button>

                  {/* Documento PDF Cargado */}
                  {documentos.filter((d: any) => d.tipo === 'PRESUPUESTO_NOTARIA' || d.categoria === 'PROYECTO').length > 0 && (
                    <div style={{
                      padding: 'var(--space-3)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <FileText size={18} style={{ color: 'var(--color-primary-light)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                          {documentos.filter((d: any) => d.tipo === 'PRESUPUESTO_NOTARIA' || d.categoria === 'PROYECTO')[0].nombre_original}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>Cargado: {new Date(documentos.filter((d: any) => d.tipo === 'PRESUPUESTO_NOTARIA' || d.categoria === 'PROYECTO')[0].fecha_carga).toLocaleDateString('es-MX')}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenPdf(documentos.filter((d: any) => d.tipo === 'PRESUPUESTO_NOTARIA' || d.categoria === 'PROYECTO')[0].id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          <Eye size={12} style={{ marginRight: '4px' }} /> Ver PDF
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', display: 'block' }}>Historial de Versiones</span>
                    {(!versiones || versiones.length === 0) ? (
                      documentos.filter((d: any) => d.tipo === 'PRESUPUESTO_NOTARIA' || d.categoria === 'PROYECTO').length > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Versión v1 (Borrador)</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{documentos.filter((d: any) => d.tipo === 'PRESUPUESTO_NOTARIA' || d.categoria === 'PROYECTO')[0].nombre_original}</span>
                          </div>
                          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Borrador</span>
                        </div>
                      ) : (
                        <div style={{ padding: 'var(--space-3)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          No existe todavía ningún presupuesto cargado.
                        </div>
                      )
                    ) : (
                      versiones.map((v: any) => (
                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 500 }}>Versión v{v.version}</span>
                          <span className={v.aprobada ? 'badge badge-success' : 'badge badge-info'} style={{ fontSize: '0.7rem' }}>
                            {v.aprobada ? '✓ Aprobada' : 'Borrador'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {isVersionApproved && (
                  <div style={{ padding: 'var(--space-3)', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 'var(--radius-md)', color: '#fbbf24', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Lock size={16} style={{ flexShrink: 0 }} />
                    <span>Esta versión v{cotizacion.version_actual} está APROBADA y congelada. Para modificar montos use "Crear Nueva Versión".</span>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Formulario de Rubros Intacto & Sección Interna PRAVIA Editable */}
              <div className="glass-card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                
                {/* Desglose de Montos del Presupuesto (Intacto) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Desglose de Montos (Presupuesto Notarial)</h4>
                    <button 
                      type="button"
                      disabled={isExtractingIA || isVersionApproved}
                      onClick={handleExtraerIA}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: 'var(--space-1) var(--space-3)', opacity: isExtractingIA ? 0.6 : 1 }}
                    >
                      {isExtractingIA ? 'Extrayendo con IA...' : 'Extraer con IA'}
                    </button>
                  </div>

                  {/* Concept items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '240px', overflowY: 'auto', paddingRight: 'var(--space-1)' }}>
                    {budgetItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input 
                          type="text" 
                          disabled={isVersionApproved}
                          value={item.concepto}
                          onChange={e => handleItemConceptoChange(item.id, e.target.value)}
                          className="input-field"
                          style={{ flex: 1, padding: 'var(--space-2)', fontSize: '0.8rem' }}
                        />
                        <input 
                          type="number"
                          disabled={isVersionApproved}
                          value={item.monto}
                          onChange={e => handleItemMontoChange(item.id, parseFloat(e.target.value) || 0)}
                          className="input-field"
                          style={{ width: '120px', padding: 'var(--space-2)', fontSize: '0.8rem', textAlign: 'right', fontWeight: 600 }}
                        />
                        {!isVersionApproved && (
                          <button onClick={() => handleRemoveItem(item.id)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 var(--space-1)' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {!isVersionApproved && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
                      <select 
                        value={selectedConceptoToAdd}
                        onChange={e => setSelectedConceptoToAdd(e.target.value)}
                        className="input-field"
                        style={{ flex: 1, padding: 'var(--space-2)', fontSize: '0.8rem' }}
                      >
                        {CONCEPTOS_CATALOGO.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={handleAddConcepto} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>
                        + Rubro
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 800 }}>
                    <span style={{ color: 'var(--text-primary)' }}>Total Presupuesto Cliente:</span>
                    <span style={{ color: 'var(--color-success)' }}>${totalClienteCalculated.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Advertencia Operativa de Validación Matemática (Únicamente si la suma no coincide) */}
                {extractionDebug && extractionDebug.suma_valida === false && (
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                  }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: 'block', fontWeight: 700 }}>Requiere revisión manual</strong>
                      <span>{extractionDebug.mensaje_validacion}</span>
                    </div>
                  </div>
                )}

                {/* ── SECCIÓN INDEPENDIENTE: Participación PRAVIA (Uso Interno) ── */}
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)'
                }}>
                  <h5 style={{ fontSize: '0.8rem', fontWeight: 700, margin: 0, color: 'var(--color-primary-light)', textTransform: 'uppercase' }}>
                    Participación PRAVIA (Uso Interno)
                  </h5>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-1)' }}>
                      Participación PRAVIA ($)
                    </label>
                    <input
                      type="number"
                      disabled={false}
                      readOnly={false}
                      value={praviaMontoInput}
                      onChange={e => handlePraviaMontoUserChange(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', padding: 'var(--space-2)', fontSize: '0.9rem', fontWeight: 700, textAlign: 'right' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-1)' }}>
                    <button
                      type="button"
                      onClick={handleSavePraviaParticipation}
                      disabled={isSavingPravia}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: 'var(--space-1) var(--space-4)' }}
                    >
                      {isSavingPravia ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>

                {/* Botones de Versión */}
                {!isVersionApproved && (
                  <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)' }}>
                    <button 
                      onClick={() => handleGuardarNuevaVersion(false)}
                      disabled={isSubmittingVersion}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Guardar Borrador V{cotizacion.version_actual}
                    </button>
                    <button 
                      onClick={() => handleGuardarNuevaVersion(true)}
                      disabled={isSubmittingVersion}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <CheckCircle2 size={16} style={{ marginRight: '4px' }} /> Aprobar Versión V{cotizacion.version_actual}
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* 3.4 PESTAÑA DOCUMENTOS (Heredados de Prospecto + Subidos en Cotización) */}
          {activeTab === 'documentos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Documentos Vinculados ({(cotizacionDocumentos.length > 0 ? cotizacionDocumentos : uniqueDocumentos).length})
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Trazabilidad continua: Prospecto → Cotización → Expediente
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {/* Pestañas de Filtro por Origen */}
                  <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setDocFilterTab('TODOS')}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 700,
                        backgroundColor: docFilterTab === 'TODOS' ? 'var(--color-primary)' : 'transparent',
                        color: docFilterTab === 'TODOS' ? '#fff' : 'var(--text-muted)'
                      }}
                    >
                      Todos ({cotizacionDocumentos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocFilterTab('PROSPECTO')}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 700,
                        backgroundColor: docFilterTab === 'PROSPECTO' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                        color: docFilterTab === 'PROSPECTO' ? '#38bdf8' : 'var(--text-muted)'
                      }}
                    >
                      Del Prospecto ({cotizacionDocumentos.filter(d => d.origen_modulo === 'PROSPECTO').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocFilterTab('COTIZACION')}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 700,
                        backgroundColor: docFilterTab === 'COTIZACION' ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                        color: docFilterTab === 'COTIZACION' ? '#fbbf24' : 'var(--text-muted)'
                      }}
                    >
                      De Cotización ({cotizacionDocumentos.filter(d => d.origen_modulo === 'COTIZACION').length})
                    </button>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Cargar Archivo
                  </button>
                </div>
              </div>

              {cotizacionDocumentos.length === 0 && uniqueDocumentos.length === 0 ? (
                <div className="glass-card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No existen documentos vinculados en esta cotización.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                  {(cotizacionDocumentos.length > 0 ? cotizacionDocumentos : uniqueDocumentos)
                    .filter((doc: any) => {
                      if (docFilterTab === 'PROSPECTO') return doc.origen_modulo === 'PROSPECTO';
                      if (docFilterTab === 'COTIZACION') return doc.origen_modulo === 'COTIZACION';
                      return true;
                    })
                    .map((doc: any) => {
                      const isFromProspecto = doc.origen_modulo === 'PROSPECTO';
                      return (
                        <div key={doc.id} className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <FileText size={20} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                  {doc.nombre_original}
                                </span>
                              </div>

                              <span 
                                className="badge" 
                                style={{ 
                                  fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                                  backgroundColor: isFromProspecto ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                  color: isFromProspecto ? '#38bdf8' : '#fbbf24',
                                  border: isFromProspecto ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)'
                                }}
                              >
                                {isFromProspecto ? 'Origen: Prospecto' : 'Origen: Cotización'}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                              <span>Categoría: <strong>{doc.tipo || doc.categoria || 'Documento'}</strong></span>
                              <span>Cargado: {doc.fecha_carga ? new Date(doc.fecha_carga).toLocaleDateString('es-MX') : '—'}</span>
                              <span>Por: {doc.subido_por?.nombre || 'Usuario'}</span>
                            </div>
                          </div>

                          {/* Acciones de Documento */}
                          <div style={{ display: 'flex', gap: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
                            <button
                              onClick={() => handlePreviewDocument(doc)}
                              className="btn btn-secondary"
                              style={{ flex: 1, fontSize: '0.7rem', padding: 'var(--space-1) var(--space-2)' }}
                              title="Visualizar en visor interno modal"
                            >
                              <Eye size={13} style={{ marginRight: '3px' }} /> Visualizar
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              className="btn btn-secondary"
                              style={{ flex: 1, fontSize: '0.7rem', padding: 'var(--space-1) var(--space-2)' }}
                              title="Descargar archivo directamente al equipo"
                            >
                              <Download size={13} style={{ marginRight: '3px' }} /> Descargar
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`¿Desvincular "${doc.nombre_original}" de la Cotización? No se eliminará del Prospecto ni del almacenamiento.`)) {
                                  try {
                                    await api.delete(`/cotizaciones/${cotizacionId}/documentos/${doc.id}`);
                                    setToastMessage('Documento desvinculado de la cotización exitosamente.');
                                    loadCotizacion();
                                  } catch (err: any) {
                                    setToastMessage('Error al desvincular documento.');
                                  }
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.7rem', padding: 'var(--space-1) var(--space-2)', color: 'var(--color-danger)' }}
                              title="Desvincular de la cotización sin eliminar del prospecto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* 3.5 PESTAÑA SEGUIMIENTO (Modulo Interactivo Comercial) */}
          {activeTab === 'seguimiento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '850px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Línea de Tiempo de Seguimientos Comerciales
                </h4>
                <button
                  onClick={() => setIsAddingSeguimiento(true)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.75rem' }}
                >
                  <MessageSquare size={14} style={{ marginRight: '4px' }} /> + Registrar Seguimiento
                </button>
              </div>

              {/* Formulario Modal / En Línea de Registro de Seguimiento */}
              {isAddingSeguimiento && (
                <div className="glass-card" style={{ padding: 'var(--space-5)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-primary-light)' }}>
                    Nuevo Registro de Seguimiento
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Tipo de Contacto</label>
                      <select value={seguimientoTipo} onChange={e => setSeguimientoTipo(e.target.value)} className="input-field" style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }}>
                        <option value="llamada">Llamada Telefónica</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="correo">Correo Electrónico</option>
                        <option value="reunion">Reunión Presencial</option>
                        <option value="nota">Nota Interna</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Destinatario</label>
                      <select value={seguimientoDestinatario} onChange={e => setSeguimientoDestinatario(e.target.value)} className="input-field" style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }}>
                        <option value="cliente">Cliente</option>
                        <option value="notaria">Notaría</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Resumen del Contacto *</label>
                    <textarea
                      rows={2}
                      value={seguimientoResumen}
                      onChange={e => setSeguimientoResumen(e.target.value)}
                      placeholder="Detalle de lo conversado o comunicado..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Resultado / Acuerdo</label>
                      <input type="text" value={seguimientoResultado} onChange={e => setSeguimientoResultado(e.target.value)} placeholder="Ej: Cliente revisando presupuesto" className="input-field" style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Próxima Acción Sugerida</label>
                      <input type="text" value={seguimientoProximaAccion} onChange={e => setSeguimientoProximaAccion(e.target.value)} placeholder="Ej: Llamar para resolver dudas" className="input-field" style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Responsable</label>
                      <input type="text" value={seguimientoResponsable} onChange={e => setSeguimientoResponsable(e.target.value)} placeholder="Nombre del responsable" className="input-field" style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Fecha Próximo Seguimiento</label>
                      <input type="date" value={seguimientoFechaProximo} onChange={e => setSeguimientoFechaProximo(e.target.value)} className="input-field" style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-2)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)' }}>
                    <button onClick={() => setIsAddingSeguimiento(false)} className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>Cancelar</button>
                    <button onClick={handleCreateSeguimiento} disabled={isSavingSeguimiento} className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Guardar Seguimiento</button>
                  </div>
                </div>
              )}

              {/* Lista timeline de Seguimientos */}
              {seguimientosList.length === 0 ? (
                <div className="glass-card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No existen seguimientos comerciales registrados. Presiona "+ Registrar Seguimiento" para agregar uno.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {seguimientosList.map((seg: any) => (
                    <div key={seg.id} className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>{seg.tipo}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hacia: <strong>{seg.destinatario}</strong></span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(seg.created_at).toLocaleString('es-MX')} por {seg.usuario?.nombre || 'Abogado'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>{seg.resumen}</p>
                      {seg.proxima_accion && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', paddingTop: 'var(--space-1)' }}>
                          👉 <strong>Próxima Acción:</strong> {seg.proxima_accion} {seg.fecha_proximo_seguimiento && `(${new Date(seg.fecha_proximo_seguimiento).toLocaleDateString('es-MX')})`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3.6 PESTAÑA BITÁCORA */}
          {activeTab === 'bitacora' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Historial Audit del Trámite</h4>
              <div className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                <div style={{ padding: 'var(--space-2)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>Solicitud Registrada:</strong> {new Date(cotizacion.created_at).toLocaleString('es-MX')}
                </div>
                {versiones.map((v: any) => (
                  <div key={v.id} style={{ padding: 'var(--space-2)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Versión v{v.version}:</strong> {v.aprobada ? '✓ APROBADA' : 'Borrador'} — Total Cliente: ${Number(v.total_cliente || 0).toLocaleString('es-MX')} ({new Date(v.created_at).toLocaleString('es-MX')})
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal 1: Previsualización de Documento */}
      {previewDocument && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100001,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)'
        }}>
          <div className="glass-card" style={{ width: '90vw', height: '90vh', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Visualizando: {previewDocument.doc.nombre_original}</span>
              <button onClick={() => setPreviewDocument(null)} className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-3)' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, background: '#1e1e1e' }}>
              {previewDocument.doc.mime_type?.includes('image') ? (
                <img src={previewDocument.url} alt={previewDocument.doc.nombre_original} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
              ) : (
                <iframe src={previewDocument.url} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmación de Eliminación Transparente */}
      {deleteDocumentConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100001,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)'
        }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: 'var(--space-6)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-danger)' }}>
              <AlertTriangle size={24} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>¿Estás seguro de eliminar este documento?</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Esta acción no podrá deshacerse. El archivo <strong>{deleteDocumentConfirm.nombre_original}</strong> será retirado.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)' }}>
              <button onClick={() => setDeleteDocumentConfirm(null)} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal 3: Confirmación Transaccional de Conversión a Expediente */}
      {showConversionConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100005,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)'
        }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: 'var(--space-6)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-primary-light)' }}>
              <ArrowRightLeft size={24} />
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Apertura Transaccional de Expediente</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Continuidad documental e id de presupuesto</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Cliente / Prospecto:</span> <strong style={{ color: 'var(--text-primary)' }}>{cotizacion?.prospecto?.nombre || cotizacion?.cliente_alias || 'Cliente'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Tipo de Acto:</span> <strong style={{ color: 'var(--text-primary)' }}>{cotizacion?.prospecto?.tipo_acto || 'No definido'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Notaría Asignada:</span> <strong style={{ color: 'var(--text-primary)' }}>{cotizacion?.notaria?.nombre || 'No asignada'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Presupuesto Total:</span> <strong style={{ color: 'var(--color-success)' }}>${Number(cotizacion?.total_cliente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Anticipo Validado:</span> <strong style={{ color: 'var(--color-success)' }}>${validatedAdvanceTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Participación PRAVIA:</span> <strong style={{ color: '#fbbf24' }}>${Number(cotizacion?.honorarios_pravia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Trazabilidad Documental:</span> <strong style={{ color: '#38bdf8' }}>{cotizacionDocumentos.length || uniqueDocumentos.length} documento(s) vinculados</strong></div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Al confirmar, el sistema aperturará el expediente, heredará los datos y documentos sin duplicación física y cambiará el estado de la cotización a <strong>CONVERTIDA_EXPEDIENTE</strong>.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)' }}>
              <button 
                disabled={isConvertingExpediente} 
                onClick={() => setShowConversionConfirmModal(false)} 
                className="btn btn-secondary" 
                style={{ fontSize: '0.8rem' }}
              >
                Cancelar
              </button>
              <button 
                disabled={isConvertingExpediente} 
                onClick={executeConversionToExpediente} 
                className="btn btn-primary" 
                style={{ fontSize: '0.8rem', fontWeight: 700 }}
              >
                {!isConvertingExpediente && <CheckCircle2 size={15} aria-hidden="true" />}
                {isConvertingExpediente ? 'Aperturando Expediente...' : 'Confirmar Conversión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Éxito con Botón Destacado "Abrir Expediente" */}
      {conversionSuccessResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100006,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)'
        }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '100%', padding: 'var(--space-6)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', margin: '0 auto' }}>
              <CheckCircle2 size={28} />
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ¡Expediente Aperturado con Éxito!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Se ha generado el folio operativo oficial:
              </p>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80', letterSpacing: '1px', marginTop: '6px' }}>
                {conversionSuccessResult.numero_pravia || 'EXP-2026-XXXX'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', paddingTop: 'var(--space-2)' }}>
              <button 
                onClick={() => setConversionSuccessResult(null)} 
                className="btn btn-secondary" 
                style={{ fontSize: '0.8rem' }}
              >
                Permanecer en Cotización
              </button>
              <button 
                onClick={() => {
                  const expId = conversionSuccessResult.id;
                  setConversionSuccessResult(null);
                  onClose();
                  navigate(`/expedientes/${expId}`);
                }} 
                className="btn btn-primary" 
                style={{ fontSize: '0.85rem', fontWeight: 700, padding: 'var(--space-2) var(--space-5)' }}
              >
                📂 Abrir Expediente {conversionSuccessResult.numero_pravia}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}

function RefreshCwIcon({ size = 16, style = {} }: { size?: number, style?: any }) {
  return <History size={size} style={style} />;
}
