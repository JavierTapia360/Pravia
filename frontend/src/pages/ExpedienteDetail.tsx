import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Folder, ArrowLeft, Clock, CheckCircle2, DollarSign, Users, FileText, 
  History, Plus, ShieldCheck, AlertCircle, RefreshCw, Archive, Edit2, Check, X,
  Building, Calendar, FileSpreadsheet, Lock, AlertTriangle, Download, Eye, Trash2, 
  Search, Filter, FolderPlus, FolderMinus, UploadCloud, Save, RotateCcw, AlertOctagon,
  ArrowUpRight, ArrowDownRight, Wallet, Receipt, CreditCard, ChevronRight, Layers, FileEdit,
  FolderDown, CheckSquare, Square, MoveRight, HelpCircle, ExternalLink, Paperclip, MoreVertical, ShieldAlert,
  FileCode, FileCheck, Upload, Code, FolderOutput, Sparkles, FileType, CheckSquare2, FileCheck2, Cpu
} from 'lucide-react';
import { useExpedienteStore } from '../stores/expedienteStore';
import { useToastStore } from '../stores/toastStore';
import { api } from '../services/api';
import { ProyectoEscrituraIA } from '../components/expedientes/ProyectoEscrituraIA';
import { ModalNuevoCompareciente } from '../components/comparecientes/ModalNuevoCompareciente';
import { ModalVincularCompareciente } from '../components/comparecientes/ModalVincularCompareciente';
import { ExpedienteFinanzasTab } from '../components/expedientes/ExpedienteFinanzasTab';
import { ExpedienteWorkflowPanel } from '../components/expedientes/ExpedienteWorkflowPanel';

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

const PLANTILLAS_CARPETAS_POR_ACTO: Record<string, string[]> = {
  'Compraventa Inmobiliaria': [
    'Administrativo', 'Comprador', 'Vendedor', 'Inmueble', 'Otros'
  ],
  'Fideicomiso': [
    'Administrativo', 'Fideicomitente', 'Fideicomisario', 'Fiduciario', 'Inmueble', 'Otros'
  ],
  'Constitución de Hipoteca': [
    'Administrativo', 'Acreditante', 'Acreditado', 'Acreedor Hipotecario', 'Inmueble', 'Otros'
  ],
  'Cancelación de Hipoteca': [
    'Administrativo', 'Acreedor Hipotecario', 'Acreditado', 'Inmueble', 'Otros'
  ],
  'Donación': [
    'Administrativo', 'Donante', 'Donatario', 'Inmueble', 'Otros'
  ],
  'Subdivisión de Predios': [
    'Administrativo', 'Propietario', 'Inmueble', 'Plano Subdivisión', 'Otros'
  ]
};

interface NotariaRubro {
  id: string;
  concepto: string;
  monto: number;
}

export default function ExpedienteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedExpediente, fetchExpedienteById, addMovimientoFinanciero } = useExpedienteStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  
  const tabQuery = searchParams.get('tab');
  const initialTab = (tabQuery === 'financiero' || tabQuery === 'finanzas')
    ? 'finanzas'
    : (['comparecientes', 'proyecto', 'archivo', 'presupuesto', 'finanzas', 'actividades'].includes(tabQuery || '')
        ? (tabQuery as any)
        : 'proyecto');

  const [activeTab, setActiveTab] = useState<'comparecientes' | 'proyecto' | 'archivo' | 'presupuesto' | 'finanzas' | 'actividades'>(initialTab);

  // Catalogs
  const [abogadosList, setAbogadosList] = useState<any[]>([]);
  const [notariasList, setNotariasList] = useState<any[]>([]);
  const [tiposActoList, setTiposActoList] = useState<any[]>([]);

  // Compareciente Modals State
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [showNuevoCompModal, setShowNuevoCompModal] = useState(false);

  // Direct Editable Header State
  const [nombreIdentificacion, setNombreIdentificacion] = useState('');
  const [tipoActoNombre, setTipoActoNombre] = useState('');
  const [numeroEscritura, setNumeroEscritura] = useState('');
  const [abogadoId, setAbogadoId] = useState('');
  const [notariaId, setNotariaId] = useState('');

  // Unsaved Changes Tracking
  const [initialHeaderState, setInitialHeaderState] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Proyecto de Escritura & IA State
  const [proyectoVigente, setProyectoVigente] = useState<any | null>(null);
  const [proyectoHistorial, setProyectoHistorial] = useState<any[]>([]);
  const [ultimoReporteIA, setUltimoReporteIA] = useState<any | null>(null);
  const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);
  const [showUploadProyectoModal, setShowUploadProyectoModal] = useState(false);
  const [proyectoFileToUpload, setProyectoFileToUpload] = useState<File | null>(null);
  const [proyectoNotaVersion, setProyectoNotaVersion] = useState('');
  const proyectoInputRef = useRef<HTMLInputElement>(null);

  // Folders & Document Management
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('Todas');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Checkbox Multiple Selection State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Document Edit & Move Modals State
  const [editDocModalState, setEditDocModalState] = useState<{ id: string; nombre: string; carpeta: string } | null>(null);

  // Real File Input & Document Modal state
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocFiles, setSelectedDocFiles] = useState<File[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    nombre: '',
    categoria: 'REGISTRO',
    carpeta: 'Administrativo',
    observaciones: ''
  });

  // Presupuesto Operativo
  const [budgetItems, setBudgetItems] = useState<NotariaRubro[]>([]);
  const [selectedConceptoToAdd, setSelectedConceptoToAdd] = useState(CONCEPTOS_CATALOGO[0]);
  const [praviaMonto, setPraviaMonto] = useState<number>(0);
  const [praviaMontoInput, setPraviaMontoInput] = useState<string>('0');

  // Finanzas Movimientos
  const comprobanteInputRef = useRef<HTMLInputElement>(null);
  const facturaPdfInputRef = useRef<HTMLInputElement>(null);
  const facturaXmlInputRef = useRef<HTMLInputElement>(null);

  const [fileComprobante, setFileComprobante] = useState<File | null>(null);
  const [fileFacturaPdf, setFileFacturaPdf] = useState<File | null>(null);
  const [fileFacturaXml, setFileFacturaXml] = useState<File | null>(null);

  const [isSubmittingMovimiento, setIsSubmittingMovimiento] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [movForm, setMovForm] = useState({
    tipo_movimiento: 'ANTICIPO',
    naturaleza: 'INGRESO',
    categoria: 'NOTARIA',
    concepto: '',
    monto: '',
    referencia: ''
  });

  const [selectedMovDetail, setSelectedMovDetail] = useState<any | null>(null);

  const [manageAdjuntoState, setManageAdjuntoState] = useState<{
    movimientoId: string;
    movimientoConcepto: string;
    tipo: 'COMPROBANTE' | 'FACTURA_PDF' | 'FACTURA_XML';
    archivoExistenteNombre?: string;
  } | null>(null);

  const [newAdjuntoFile, setNewAdjuntoFile] = useState<File | null>(null);
  const [isUpdatingAdjunto, setIsUpdatingAdjunto] = useState(false);
  const singleAdjuntoInputRef = useRef<HTMLInputElement>(null);

  const [xmlViewerData, setXmlViewerData] = useState<{ title: string; text: string } | null>(null);

  const [isSubmittingDeleteMov, setIsSubmittingDeleteMov] = useState(false);
  const [showDeleteMovModal, setShowDeleteMovModal] = useState(false);
  const [deleteMovId, setDeleteMovId] = useState('');
  const [motivoEliminacionMov, setMotivoEliminacionMov] = useState('');

  const [isSubmittingReverso, setIsSubmittingReverso] = useState(false);
  const [showReversoModal, setShowReversoModal] = useState(false);
  const [selectedMovId, setSelectedMovId] = useState('');
  const [motivoReversion, setMotivoReversion] = useState('');

  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');

  const loadProyectoData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/expedientes/${id}/proyecto`);
      setProyectoVigente(res.vigente);
      setProyectoHistorial(res.historial || []);
      setUltimoReporteIA(res.ultimoReporte);
    } catch (e) {
      // Fallback
    }
  }, [id]);

  const loadCatalogs = async () => {
    try {
      const [usersRes, notariasRes, tiposRes] = await Promise.all([
        api.get('/users').catch(() => []),
        api.get('/notarias').catch(() => []),
        api.get('/expedientes/tipos-acto').catch(() => []),
      ]);
      setAbogadosList(Array.isArray(usersRes) ? usersRes : []);
      setNotariasList(Array.isArray(notariasRes) ? notariasRes : []);
      setTiposActoList(Array.isArray(tiposRes) ? tiposRes : []);
    } catch (e) {
      setAbogadosList([]);
      setNotariasList([]);
      setTiposActoList([]);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await fetchExpedienteById(id!);
      await loadProyectoData();
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al cargar expediente', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, fetchExpedienteById, loadProyectoData, addToast]);

  useEffect(() => {
    if (id) {
      loadData();
      loadCatalogs();
    }
  }, [id, loadData]);

  const exp = selectedExpediente;

  useEffect(() => {
    if (exp) {
      if (isDirty) return;
      const actNombre = exp.tipo_acto?.nombre || '';
      const templateFolders = PLANTILLAS_CARPETAS_POR_ACTO[actNombre] || ['Administrativo', 'Otros'];
      setCarpetas(templateFolders);

      const cot = exp.cotizacion as any;
      const datosOps = (exp.datos_operacion as any) || {};

      let rubrosEncontrados: NotariaRubro[] = [];
      let honorariosPraviaEncontrados = 0;

      if (datosOps.presupuesto && Array.isArray(datosOps.presupuesto.rubros)) {
        rubrosEncontrados = datosOps.presupuesto.rubros.map((r: any, idx: number) => ({
          id: r.id || `rubro_${idx}`,
          concepto: r.concepto || 'Rubro Notarial',
          monto: Number(r.monto || 0)
        }));
        if (datosOps.presupuesto.honorarios_pravia !== undefined) {
          honorariosPraviaEncontrados = Number(datosOps.presupuesto.honorarios_pravia);
        }
      } else if (cot && cot.versiones && Array.isArray(cot.versiones) && cot.versiones.length > 0) {
        const v = cot.versiones[0];
        if (v.desglose_notaria && Array.isArray(v.desglose_notaria.rubros)) {
          rubrosEncontrados = v.desglose_notaria.rubros.map((r: any, idx: number) => ({
            id: r.id || `rubro_${idx}`,
            concepto: r.concepto || r.nombre_original || 'Rubro Notarial',
            monto: Number(r.monto || 0)
          }));
        }
        if (v.honorarios_pravia !== undefined) honorariosPraviaEncontrados = Number(v.honorarios_pravia);
      }

      const init = {
        cliente_alias: exp.cliente_alias || '',
        tipo_acto_nombre: actNombre,
        numero_escritura: exp.numero_notaria || datosOps.numero_escritura || '',
        abogado_id: exp.abogado_id || '',
        notaria_id: exp.notaria_id || '',
        budgetItems: JSON.parse(JSON.stringify(rubrosEncontrados)),
        praviaMonto: honorariosPraviaEncontrados
      };

      setInitialHeaderState(init);
      setNombreIdentificacion(init.cliente_alias);
      setTipoActoNombre(init.tipo_acto_nombre);
      setNumeroEscritura(init.numero_escritura);
      setAbogadoId(init.abogado_id);
      setNotariaId(init.notaria_id);
      setBudgetItems(rubrosEncontrados);
      setPraviaMonto(honorariosPraviaEncontrados);
      setPraviaMontoInput(String(honorariosPraviaEncontrados));
      setIsDirty(false);
    }
  }, [exp]);

  useEffect(() => {
    if (tipoActoNombre) {
      const template = PLANTILLAS_CARPETAS_POR_ACTO[tipoActoNombre] || ['Administrativo', 'Otros'];
      setCarpetas(template);
    }
  }, [tipoActoNombre]);

  // DETECCION DE CAMBIOS CENTRALIZADA (hasUnsavedChanges = isDirty)
  useEffect(() => {
    if (!initialHeaderState) return;

    const headerChanged = (
      (nombreIdentificacion || '').trim() !== (initialHeaderState.cliente_alias || '').trim() ||
      (tipoActoNombre || '').trim() !== (initialHeaderState.tipo_acto_nombre || '').trim() ||
      (numeroEscritura || '').trim() !== (initialHeaderState.numero_escritura || '').trim() ||
      (abogadoId || '') !== (initialHeaderState.abogado_id || '') ||
      (notariaId || '') !== (initialHeaderState.notaria_id || '')
    );

    const parsedPraviaInput = Number(praviaMontoInput);
    const currentPraviaNum = Number.isFinite(parsedPraviaInput) ? parsedPraviaInput : praviaMonto;
    const praviaChanged = currentPraviaNum !== Number(initialHeaderState.praviaMonto);

    const currentRubrosStr = JSON.stringify(
      budgetItems.map(r => ({ concepto: String(r.concepto || '').trim(), monto: Number(r.monto || 0) }))
    );
    const initialRubrosStr = JSON.stringify(
      (initialHeaderState.budgetItems || []).map((r: any) => ({ concepto: String(r.concepto || '').trim(), monto: Number(r.monto || 0) }))
    );

    const budgetChanged = currentRubrosStr !== initialRubrosStr || praviaChanged;

    setIsDirty(headerChanged || budgetChanged);
  }, [
    nombreIdentificacion,
    tipoActoNombre,
    numeroEscritura,
    abogadoId,
    notariaId,
    budgetItems,
    praviaMonto,
    praviaMontoInput,
    initialHeaderState
  ]);

  // PREVENCIÓN DE PÉRDIDA DE CAMBIOS AL CERRAR O RECARGAR LA PESTAÑA
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Hay cambios sin guardar. ¿Deseas salir sin guardar?';
        return 'Hay cambios sin guardar. ¿Deseas salir sin guardar?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Intercepta navegación interna por enlaces del shell mientras esta pantalla conserva cambios.
  useEffect(() => {
    if (!isDirty) return;
    const handleDocumentNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.origin !== window.location.origin) return;
      const destination = `${anchor.pathname}${anchor.search}${anchor.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (destination === current) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(destination);
      setShowUnsavedModal(true);
    };
    document.addEventListener('click', handleDocumentNavigation, true);
    return () => document.removeEventListener('click', handleDocumentNavigation, true);
  }, [isDirty]);

  const handleSafeNavigation = (targetPath: string) => {
    if (isDirty) {
      setPendingNavigation(targetPath);
      setShowUnsavedModal(true);
    } else {
      navigate(targetPath);
    }
  };

  const handleConfirmLeaveWithoutSaving = () => {
    setShowUnsavedModal(false);
    setIsDirty(false);
    if (pendingNavigation) navigate(pendingNavigation);
  };

  const handleSaveHeaderEdits = async (): Promise<boolean> => {
    if (!exp || !isDirty || isSavingChanges) return false;
    setIsSavingChanges(true);
    try {
      const parsedPraviaInput = Number(praviaMontoInput);
      const parsedPravia = Number.isFinite(parsedPraviaInput) ? parsedPraviaInput : praviaMonto;

      const payload = {
        cliente_alias: nombreIdentificacion,
        tipo_acto_nombre: tipoActoNombre,
        numero_escritura: numeroEscritura,
        abogado_id: abogadoId || null,
        notaria_id: notariaId || null,
        budget_items: budgetItems,
        honorarios_pravia: parsedPravia,
        version: exp.version,
      };

      const res = await api.patch(`/expedientes/${exp.id}`, payload);

      if (res?.error) {
        throw new Error(res.detail || res.error || 'Error al guardar cambios');
      }

      setPraviaMonto(parsedPravia);
      addToast('Cambios del expediente guardados exitosamente', 'success');

      // Actualizar baseline original para deshabilitar botón únicamente tras guardar con éxito
      const newBaseline = {
        cliente_alias: nombreIdentificacion,
        tipo_acto_nombre: tipoActoNombre,
        numero_escritura: numeroEscritura,
        abogado_id: abogadoId || '',
        notaria_id: notariaId || '',
        budgetItems: JSON.parse(JSON.stringify(budgetItems)),
        praviaMonto: parsedPravia
      };
      setInitialHeaderState(newBaseline);
      setIsDirty(false);

      try {
        await loadData();
      } catch {
        addToast('Los cambios se guardaron, pero no fue posible recargar el expediente.', 'warning');
      }
      return true;
    } catch (err: any) {
      console.error('[EXPEDIENTE_SAVE_ERROR]', err);
      const exactMsg = err.detail || err.message || 'Error al guardar cambios en el expediente';
      addToast(exactMsg, 'error');
      return false;
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleResetHeaderEdits = () => {
    if (!initialHeaderState) return;
    setNombreIdentificacion(initialHeaderState.cliente_alias);
    setTipoActoNombre(initialHeaderState.tipo_acto_nombre);
    setNumeroEscritura(initialHeaderState.numero_escritura);
    setAbogadoId(initialHeaderState.abogado_id);
    setNotariaId(initialHeaderState.notaria_id);
    setBudgetItems(JSON.parse(JSON.stringify(initialHeaderState.budgetItems || [])));
    setPraviaMonto(initialHeaderState.praviaMonto || 0);
    setPraviaMontoInput(String(initialHeaderState.praviaMonto || 0));
    setIsDirty(false);
  };

  // PROYECTO DE ESCRITURA HANDLERS
  const handleUploadProyectoVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exp || !proyectoFileToUpload) return;
    try {
      const formData = new FormData();
      formData.append('file', proyectoFileToUpload);
      if (proyectoNotaVersion) formData.append('nota_version', proyectoNotaVersion);
      formData.append('usuario_id', abogadoId || exp.abogado_id);

      const res = await fetch(`/api/expedientes/${exp.id}/proyecto/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Error al subir versión del proyecto');

      addToast(`Nueva versión V${proyectoVigente ? proyectoVigente.version_numero + 1 : 2} cargada exitosamente`, 'success');
      setShowUploadProyectoModal(false);
      setProyectoFileToUpload(null);
      setProyectoNotaVersion('');
      await loadProyectoData();
    } catch (err: any) {
      addToast(err.message || 'Error al subir versión de proyecto', 'error');
    }
  };

  const handleRestoreVersionVigente = async (verId: string, verNum: number) => {
    if (!exp) return;
    try {
      await api.patch(`/expedientes/${exp.id}/proyecto/versions/${verId}`, {
        accion: 'RESTAURAR_VIGENTE',
        usuario_id: abogadoId || exp.abogado_id,
      });
      addToast(`Versión V${verNum} restaurada como Proyecto Vigente`, 'success');
      await loadProyectoData();
    } catch (e) {
      addToast('Error al restaurar versión', 'error');
    }
  };

  const handleVisualizarProyectoVersion = (verId: string, nombre: string) => {
    if (!exp) return;
    const url = `/api/expedientes/${exp.id}/proyecto/versions/${verId}/visualizar`;
    window.open(url, '_blank');
  };

  const handleDescargarProyectoVersion = async (verId: string, nombre: string) => {
    if (!exp) return;
    try {
      const url = `/api/expedientes/${exp.id}/proyecto/versions/${verId}/descargar`;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(blobUrl);
      addToast(`Descargado "${nombre}"`, 'success');
    } catch (e) {
      addToast('Error al descargar versión de proyecto', 'error');
    }
  };

  const handleAnalizarIA = async () => {
    if (!exp) return;
    setIsAnalyzingIA(true);
    try {
      const res = await api.post(`/expedientes/${exp.id}/proyecto/analizar-ia`, {});
      setUltimoReporteIA(res);
      addToast('Análisis de Inteligencia Artificial completado exitosamente', 'success');
      await loadProyectoData();
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al ejecutar análisis de IA', 'error');
    } finally {
      setIsAnalyzingIA(false);
    }
  };

  const handleVisualizarReporteIA = () => {
    if (!exp) return;
    const url = `/api/expedientes/${exp.id}/proyecto/reporte-ia/visualizar`;
    window.open(url, '_blank');
  };

  const handleDescargarReporteIADocx = async () => {
    if (!exp) return;
    try {
      const url = `/api/expedientes/${exp.id}/proyecto/reporte-ia/descargar`;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = ultimoReporteIA?.nombre_reporte || 'Observaciones_IA.docx';
      a.click();
      URL.revokeObjectURL(blobUrl);
      addToast('Reporte Word (.docx) de IA descargado exitosamente', 'success');
    } catch (e) {
      addToast('Error al descargar reporte Word de IA', 'error');
    }
  };

  // ZIP DOWNLOAD HANDLER FOR FOLDERS
  const handleDescargarCarpetaZip = async (folderName: string) => {
    if (!exp) return;
    try {
      const url = `/api/expedientes/${exp.id}/documentos/descargar-zip?carpeta=${encodeURIComponent(folderName)}`;
      addToast(`Generando archivo ZIP para carpeta "${folderName}"...`, 'info');
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        addToast(errJson.error || 'Error al generar descarga de ZIP', 'error');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = folderName === 'Todas' ? `Expediente_${exp.numero_pravia.replace('EXP-', '')}.zip` : `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      addToast(`Descargado "${a.download}" exitosamente`, 'success');
    } catch (e) {
      addToast('Error al descargar archivo ZIP', 'error');
    }
  };

  // COTIZACIONES BUDGET HANDLERS
  const handleItemConceptoChange = (itemId: string, newConcepto: string) => {
    setBudgetItems(budgetItems.map(i => i.id === itemId ? { ...i, concepto: newConcepto } : i));
  };

  const handleItemMontoChange = (itemId: string, newMonto: number) => {
    setBudgetItems(budgetItems.map(i => i.id === itemId ? { ...i, monto: newMonto } : i));
  };

  const handleRemoveItem = (itemId: string) => {
    setBudgetItems(budgetItems.filter(i => i.id !== itemId));
    addToast('Rubro eliminado del presupuesto notarial', 'success');
  };

  const handleAddConcepto = () => {
    const newItem: NotariaRubro = {
      id: `rubro_${Date.now()}`,
      concepto: selectedConceptoToAdd,
      monto: 0
    };
    setBudgetItems([...budgetItems, newItem]);
    addToast(`Rubro "${selectedConceptoToAdd}" agregado`, 'success');
  };

  const handleSavePraviaParticipation = () => {
    const parsedInput = Number(praviaMontoInput);
    const parsed = Number.isFinite(parsedInput) ? parsedInput : 0;
    setPraviaMonto(parsed);
    addToast(`Participación PRAVIA actualizada: $${parsed.toLocaleString('es-MX')}`, 'success');
  };

  const totalNotariaCalculated = budgetItems.reduce((acc, i) => acc + Number(i.monto || 0), 0);
  const totalClienteCalculated = totalNotariaCalculated;

  // Real File Input & Drag & Drop Handlers for Documents
  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedDocFiles([...selectedDocFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveSelectedDocFile = (index: number) => {
    setSelectedDocFiles(selectedDocFiles.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Real binary upload function following strict verification rules
  const uploadSingleFileBinary = async (file: File, targetCarpeta: string, categoria: string, observaciones?: string) => {
    if (!exp) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('carpeta', targetCarpeta);
    formData.append('categoria', categoria);
    if (observaciones) formData.append('observaciones', observaciones);

    const response = await fetch(`/api/expedientes/${exp.id}/documentos`, {
      method: 'POST',
      body: formData
    });

    const resData = await response.json().catch(() => ({}));
    if (!response.ok || !resData.success || !resData.documento?.id) {
      throw new Error(resData.error || resData.detail || 'Error al subir archivo al almacenamiento.');
    }

    return resData.documento;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!exp) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const targetFolder = selectedFolder === 'Todas' ? 'Administrativo' : selectedFolder;
    let uploadedCount = 0;

    for (const file of files) {
      try {
        const docRes = await uploadSingleFileBinary(file, targetFolder, 'REGISTRO', `Cargado por arrastre (${(file.size / 1024).toFixed(1)} KB)`);
        if (docRes && docRes.id) {
          uploadedCount++;
        }
      } catch (err: any) {
        addToast(err.message || `Error al subir ${file.name}`, 'error');
      }
    }

    if (uploadedCount > 0) {
      await loadData();
      addToast(`${uploadedCount} archivo(s) cargado(s) y verificado(s) en ${targetFolder}`, 'success');
    }
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    if (carpetas.includes(newFolderName.trim())) {
      addToast('La carpeta ya existe', 'error');
      return;
    }
    setCarpetas([...carpetas, newFolderName.trim()]);
    setNewFolderName('');
    setShowAddFolderInput(false);
    addToast(`Carpeta "${newFolderName.trim()}" creada`, 'success');
  };

  const handleDeleteFolder = (folderName: string) => {
    if (folderName === 'Todas') {
      addToast('No se puede eliminar la vista general "Todas"', 'error');
      return;
    }

    const docsInFolder = rawDocs.filter(d => getDocCarpeta(d) === folderName);

    if (docsInFolder.length > 0) {
      addToast(`La carpeta "${folderName}" contiene ${docsInFolder.length} documento(s). Mueve o elimínalos primero.`, 'warning');
      return;
    }

    if (!confirm(`¿Confirmas que deseas eliminar la carpeta "${folderName}"?`)) return;

    setCarpetas(carpetas.filter(f => f !== folderName));
    if (selectedFolder === folderName) setSelectedFolder('Todas');
    addToast(`Carpeta "${folderName}" eliminada exitosamente`, 'success');
  };

  const handleToggleSelectDoc = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(selectedDocIds.filter(i => i !== docId));
    } else {
      setSelectedDocIds([...selectedDocIds, docId]);
    }
  };

  const handleSelectAllDocs = (docsList: any[]) => {
    if (selectedDocIds.length === docsList.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(docsList.map(d => d.id));
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (!exp) return;
    for (const docId of selectedDocIds) {
      try {
        await api.delete(`/expedientes/${exp.id}/documentos/${docId}`);
      } catch (e) {}
    }
    addToast(`${selectedDocIds.length} documento(s) eliminado(s) exitosamente`, 'success');
    setSelectedDocIds([]);
    setShowBulkDeleteModal(false);
    loadData();
  };

  const handleAddDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exp) return;
    
    const targetFolder = docForm.carpeta || (selectedFolder === 'Todas' ? 'Administrativo' : selectedFolder);
    let uploadedCount = 0;

    if (selectedDocFiles.length > 0) {
      for (const file of selectedDocFiles) {
        try {
          const docRes = await uploadSingleFileBinary(file, targetFolder, docForm.categoria || 'REGISTRO', docForm.observaciones);
          if (docRes && docRes.id) {
            uploadedCount++;
          }
        } catch (err: any) {
          addToast(err.message || `Error al subir ${file.name}`, 'error');
        }
      }

      if (uploadedCount > 0) {
        setShowDocModal(false);
        setSelectedDocFiles([]);
        setDocForm({ nombre: '', categoria: 'REGISTRO', carpeta: 'Administrativo', observaciones: '' });
        
        await loadData();
        addToast(`${uploadedCount} documento(s) cargado(s) exitosamente y verificado(s) en el archivo`, 'success');
      }
      return;
    }

    addToast('Selecciona por lo menos un archivo real para cargarlo al expediente', 'error');
  };

  const handleDeleteDocumento = async (docId: string) => {
    if (!exp) return;
    if (!confirm('¿Confirmas que deseas eliminar este documento del archivo?')) return;
    try {
      await api.delete(`/expedientes/${exp.id}/documentos/${docId}`);
      addToast('Documento eliminado del archivo con bitácora registrada', 'success');
      await loadData();
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al eliminar documento del archivo', 'error');
    }
  };

  const handleSaveEditDocumento = async () => {
    if (!exp || !editDocModalState) return;
    try {
      await api.patch(`/expedientes/${exp.id}/documentos/${editDocModalState.id}`, {
        nombre: editDocModalState.nombre,
        carpeta: editDocModalState.carpeta
      });
      addToast('Documento actualizado exitosamente', 'success');
      setEditDocModalState(null);
      await loadData();
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al actualizar documento', 'error');
    }
  };

  // STREAM & DOWNLOAD FOR ARCHIVO DOCUMENTAL
  const handleVisualizarDoc = async (docId: string, docNombre: string) => {
    if (!exp) return;
    try {
      const backendUrl = `/api/expedientes/${exp.id}/documentos/${docId}/visualizar`;
      const res = await fetch(backendUrl);
      if (!res.ok) {
        addToast('El archivo no se encuentra en el almacenamiento', 'error');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      addToast('Error al abrir documento', 'error');
    }
  };

  const handleDescargarDoc = async (docId: string, docNombre: string) => {
    if (!exp) return;
    try {
      const backendUrl = `/api/expedientes/${exp.id}/documentos/${docId}/descargar`;
      const res = await fetch(backendUrl);
      if (!res.ok) {
        addToast('No fue posible descargar el archivo', 'error');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = docNombre;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      addToast(`Descargado "${docNombre}" exitosamente`, 'success');
    } catch (e) {
      addToast('No fue posible descargar el archivo', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-gold mb-3" />
        <p className="text-sm font-semibold text-white">Cargando expediente en PRAVIA OS...</p>
      </div>
    );
  }

  if (!exp) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle size={48} className="mx-auto text-amber-400" />
        <h2 className="text-xl font-bold text-white">Expediente no encontrado</h2>
        <button type="button" onClick={() => navigate('/expedientes')} className="px-4 py-2 bg-gold text-slate-950 font-bold text-xs rounded-xl">
          Volver a Expedientes
        </button>
      </div>
    );
  }

  const folioHumano = exp.numero_pravia ? exp.numero_pravia.replace('EXP-', '').split('-').reverse().join('-') : 'Sin folio';
  const tipoActoNombreActual = exp.tipo_acto?.nombre || tipoActoNombre;

  const getDocCarpeta = (doc: any): string => {
    if (doc.carpeta) return doc.carpeta;
    if (doc.observaciones) {
      const match = doc.observaciones.match(/\[Carpeta: (.*?)\]/);
      if (match && match[1]) return match[1];
    }
    return 'Administrativo';
  };

  const rawDocs = (exp.expedienteDocumentos && exp.expedienteDocumentos.length > 0)
    ? exp.expedienteDocumentos.map((ed: any) => ({
        id: ed.documento?.id || ed.id,
        nombre: ed.documento?.nombre_original || ed.nombre,
        categoria: ed.documento?.categoria || 'PROYECTO',
        estatus: ed.estatus || 'ACTIVO',
        carpeta: ed.tipo_vinculo || 'Administrativo',
        observaciones: ed.observaciones || ed.documento?.observaciones || ''
      }))
    : (exp.requisitos_docs || []);

  const displayCarpetas = Array.from(
    new Set([
      ...carpetas,
      ...rawDocs.map((d: any) => getDocCarpeta(d)).filter(Boolean)
    ])
  );

  const currentDocsList = rawDocs.filter((doc: any) => {
    const c = getDocCarpeta(doc);
    if (selectedFolder === 'Todas') return true;
    return c === selectedFolder;
  });

  const filteredActividades = (exp.actividades || []).filter(act => {
    if (activityFilter && act.tipo !== activityFilter) return false;
    if (activitySearch) {
      const q = activitySearch.toLowerCase();
      return (
        act.titulo?.toLowerCase().includes(q) ||
        act.descripcion?.toLowerCase().includes(q) ||
        act.usuario?.nombre?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full mx-auto fade-in">
      
      {/* TOP NAVIGATION LINK WITH DIRTY WARNING */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => handleSafeNavigation('/expedientes')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-gold transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Volver al Módulo de Expedientes</span>
        </button>

        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToast('Existen cambios sin guardar en la ficha general', 'warning');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
            >
              <AlertOctagon size={14} /> Cambios sin guardar
            </button>
          )}

          {exp.cotizacion_id && (
            <button
              type="button"
              onClick={() => handleSafeNavigation('/cotizaciones')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 px-3 py-1 rounded-lg border border-sky-500/20"
            >
              <span>Ver cotización de origen{exp.cotizacion?.numero_cotizacion ? ` (${exp.cotizacion.numero_cotizacion})` : ''}</span>
              <ExternalLink size={12} />
            </button>
          )}

          <span className="text-xs font-mono font-extrabold text-gold px-3 py-1 rounded-lg bg-gold/10 border border-gold/20">
            Folio: {folioHumano}
          </span>
          <span className={`badge-status ${exp.estatus === 'ENTREGADO' ? 'badge-entregado' : 'badge-abierto'}`}>
            {exp.estatus}
          </span>
        </div>
      </div>

      {/* 1. ENCABEZADO SUPERIOR: FICHA GENERAL */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shadow-md shrink-0">
              <Folder size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Expediente {folioHumano}
                </h1>
                <span className="text-xs font-mono text-slate-400">v{exp.version}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Edición de Ficha General directa • Bitácora inmutable en PRAVIA OS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end lg:self-auto">
            {isDirty && (
              <button
                type="button"
                onClick={handleResetHeaderEdits}
                className="h-10 px-4 rounded-xl bg-slate-800 border border-white/10 hover:border-slate-600 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw size={15} />
                <span>Cancelar</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveHeaderEdits}
              disabled={!isDirty || isSavingChanges}
              className={`h-10 px-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all ${
                isDirty && !isSavingChanges
                  ? 'bg-gold hover:bg-gold-light text-slate-950 scale-105' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <Save size={16} />
              <span>{isSavingChanges ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Grid for Direct Field Modification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Folio Humano Visible</span>
            <p className="text-base font-extrabold font-mono text-gold">{folioHumano}</p>
          </div>

          <div className="bg-slate-950/70 border border-gold/40 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider block flex items-center justify-between">
              <span>Identificación (Alias)</span>
              <FileEdit size={12} />
            </span>
            <input
              type="text"
              value={nombreIdentificacion}
              onChange={(e) => setNombreIdentificacion(e.target.value)}
              className="w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-gold"
              placeholder="Ej. Compraventa Javier"
            />
          </div>

          <div className="bg-slate-950/70 border border-gold/40 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider block flex items-center justify-between">
              <span>Tipo de Acto</span>
              <FileEdit size={12} />
            </span>
            <select
              value={tipoActoNombre}
              onChange={(e) => setTipoActoNombre(e.target.value)}
              className="w-full bg-slate-900 border border-white/20 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-gold cursor-pointer"
            >
              {!tipoActoNombre && <option value="">Seleccionar tipo de acto</option>}
              {tipoActoNombre && !tiposActoList.some((tipo) => tipo.nombre === tipoActoNombre) && (
                <option value={tipoActoNombre}>{tipoActoNombre} (actual)</option>
              )}
              {tiposActoList.map((tipo) => (
                <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aperturado Por</span>
            <p className="text-xs font-bold text-slate-300">{exp.creador ? `${exp.creador.nombre} ${exp.creador.apellido}` : 'Sistema PRAVIA OS'}</p>
          </div>

          <div className="bg-slate-950/70 border border-gold/40 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider block flex items-center justify-between">
              <span>Abogado Encargado</span>
              <FileEdit size={12} />
            </span>
            <select
              value={abogadoId}
              onChange={(e) => setAbogadoId(e.target.value)}
              className="w-full bg-slate-900 border border-white/20 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-gold cursor-pointer"
            >
              <option value="">Seleccionar Abogado</option>
              {abogadosList.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha de Apertura</span>
            <p className="text-xs font-semibold text-slate-300">{new Date(exp.fecha_apertura).toLocaleString()}</p>
          </div>

          <div className="bg-slate-950/70 border border-gold/40 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider block flex items-center justify-between">
              <span>Número de Escritura</span>
              <FileEdit size={12} />
            </span>
            <input
              type="text"
              placeholder="Ej. 45,892"
              value={numeroEscritura}
              onChange={(e) => setNumeroEscritura(e.target.value)}
              className="w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gold font-mono focus:outline-none focus:border-gold"
            />
          </div>

          <div className="bg-slate-950/70 border border-gold/40 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-gold uppercase tracking-wider block flex items-center justify-between">
              <span>Notaría Asignada</span>
              <FileEdit size={12} />
            </span>
            <select
              value={notariaId}
              onChange={(e) => setNotariaId(e.target.value)}
              className="w-full bg-slate-900 border border-white/20 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-gold cursor-pointer"
            >
              <option value="">Sin notaría asignada</option>
              {notariasList.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section aria-label="Progreso y siguiente acción" className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-white">Progreso del expediente</h2>
              <p className="text-xs text-slate-400 mt-0.5">Avance calculado a partir de requisitos y operación registrados.</p>
            </div>
            <span className="text-xs font-bold text-gold">{Math.max(0, Math.min(100, exp.avance_general || 0))}% general</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Documental', exp.avance_documental],
              ['Operativo', exp.avance_operativo],
              ['Financiero', exp.avance_financiero],
              ['General', exp.avance_general],
            ].map(([label, rawValue]) => {
              const value = Math.max(0, Math.min(100, Number(rawValue || 0)));
              return (
                <div key={String(label)} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-bold text-slate-300">{label}</span>
                    <span className="font-mono text-white">{value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${value}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Siguiente acción</span>
            <p className="font-bold text-white mt-1">{exp.proxima_accion || 'Sin siguiente acción registrada'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Etapa</span>
            <p className="font-semibold text-slate-200 mt-1">{exp.etapa_actual_nombre || 'Sin etapa activa'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Fecha límite</span>
            <p className="font-semibold text-slate-200 mt-1">
              {exp.fecha_limite_accion ? new Date(exp.fecha_limite_accion).toLocaleDateString('es-MX') : 'Sin fecha límite'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Gestor</span>
            <p className="font-semibold text-slate-200 mt-1">{exp.gestor ? `${exp.gestor.nombre} ${exp.gestor.apellido}` : 'Sin asignar'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Subtipo</span>
            <p className="font-semibold text-slate-200 mt-1">{exp.subtipo_acto || 'Sin subtipo'}</p>
          </div>
        </div>
      </section>

      <ExpedienteWorkflowPanel
        expediente={exp}
        actorUserId={abogadoId || exp.abogado_id || ''}
        onUpdated={loadData}
      />

      {/* 2. NAVEGACIÓN PRINCIPAL POR PESTAÑAS */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        <div className="flex items-center border-b border-white/10 px-6 bg-slate-950/80 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('comparecientes')}
            className={`py-4 px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'comparecientes' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users size={16} />
            Comparecientes
          </button>

          {/* NUEVA PESTAÑA DESTACADA: PROYECTO DE ESCRITURA Y ANÁLISIS IA */}
          <button
            type="button"
            onClick={() => setActiveTab('proyecto')}
            className={`py-4 px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'proyecto' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={16} className="text-gold" />
            Proyecto de Escritura & IA
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archivo')}
            className={`py-4 px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'archivo' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText size={16} />
            Archivo Documental ({rawDocs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presupuesto')}
            className={`py-4 px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'presupuesto' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet size={16} />
            Presupuesto Operativo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finanzas')}
            className={`py-4 px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'finanzas' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign size={16} />
            Finanzas y Movimientos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('actividades')}
            className={`py-4 px-6 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'actividades' ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History size={16} />
            Bitácora de Actividades ({exp.actividades?.length || 0})
          </button>
        </div>

        {/* 3. CUERPO DE LA SECCIÓN SELECCIONADA */}
        <div className="p-6 space-y-6">

          {/* PESTAÑA: COMPARECIENTES OPERATIVOS MEDIANTE TARJETAS VISUALES (DIRECTIVA 7) */}
          {activeTab === 'comparecientes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Partes Comparecientes en el Expediente</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30 font-bold">
                      {exp.comparecientes?.length || 0} Registrados
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Participación contextual notarial de Personas Físicas y Morales con sus representantes legales
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowVincularModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/10 flex items-center gap-1.5"
                  >
                    <Users size={14} className="text-gold" /> Vincular Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSafeNavigation(`/comparecientes/nuevo?expedienteId=${exp.id}`)}
                    className="px-4 py-2 rounded-xl bg-gold hover:bg-gold-light text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus size={14} /> + Crear Nuevo Compareciente
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(exp.comparecientes || []).map((vinculo: any) => {
                  const persona = vinculo.compareciente || {};
                  const fisica = persona.personaFisica || {};
                  const moral = persona.personaMoral || {};
                  const esMoral = persona.tipo_persona === 'MORAL' || Boolean(moral.razon_social);
                  const nombre = moral.razon_social
                    || fisica.nombre_completo_calculado
                    || [fisica.nombres || persona.nombre, fisica.apellido_paterno || persona.apellido_paterno, fisica.apellido_materno || persona.apellido_materno].filter(Boolean).join(' ')
                    || persona.nombre_busqueda
                    || 'Compareciente sin nombre';
                  const rol = vinculo.caracter?.nombre || vinculo.rol_juridico || 'COMPARECIENTE';
                  const rfc = moral.rfc || fisica.rfc || persona.rfc;
                  const curp = fisica.curp || persona.curp;
                  const comparecePor = vinculo.comparece_por_propio_derecho
                    ? 'Por su propio derecho'
                    : (vinculo.comparece_por || 'Forma de comparecencia pendiente');

                  return (
                    <div key={vinculo.id} className="p-6 rounded-2xl bg-slate-950/80 border border-gold/30 hover:border-gold/60 transition-all space-y-4 shadow-lg">
                      <div className="flex items-center justify-between gap-3">
                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gold/20 text-gold border border-gold/40">
                          {rol}
                        </span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${vinculo.datos_validados ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {vinculo.datos_validados ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          {vinculo.datos_validados ? 'Datos validados' : 'Validación pendiente'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-medium text-slate-400 uppercase">{esMoral ? 'Persona Moral' : 'Persona Física'}</span>
                        <h4 className="text-lg font-black text-white leading-tight mt-0.5">{nombre}</h4>
                        {(rfc || curp) && (
                          <p className="text-xs text-slate-400 font-mono mt-1">
                            {[rfc && `RFC: ${rfc}`, curp && `CURP: ${curp}`].filter(Boolean).join(' | ')}
                          </p>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Forma de comparecencia</span>
                        <p className="text-xs font-extrabold text-white">{comparecePor}</p>
                        {vinculo.porcentaje_participacion != null && (
                          <p className="text-[11px] text-slate-400">Participación: {vinculo.porcentaje_participacion}%</p>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => handleSafeNavigation(`/comparecientes/${persona.id}?fromExpediente=${exp.id}`)}
                          disabled={!persona.id}
                          className="px-3 py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold text-xs font-bold border border-gold/30 flex items-center gap-1 disabled:opacity-40"
                        >
                          Ver Ficha Maestra <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(exp.comparecientes || []).length === 0 && (
                  <div className="md:col-span-2 p-10 text-center rounded-2xl bg-slate-950/80 border border-white/10">
                    <Users size={34} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-semibold text-white">No hay comparecientes vinculados a este expediente.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA: PROYECTO DE ESCRITURA Y ANÁLISIS IA (COMPONENT INTEGRADO) */}
          {activeTab === 'proyecto' && (
            <ProyectoEscrituraIA expedienteId={exp.id} />
          )}

          {/* PESTAÑA: ARCHIVO DOCUMENTAL (CON BOTÓN DE DESCARGA ZIP POR CARPETA) */}
          {activeTab === 'archivo' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Archivo Documental del Expediente</span>
                    <span className="text-xs px-3 py-1 rounded-full bg-gold/10 text-gold border border-gold/30 font-extrabold font-mono shadow-sm">
                      Acto: {tipoActoNombreActual}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Carpetas simplificadas para Compraventa: Administrativo, Comprador, Vendedor, Inmueble, Otros</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* BOTÓN DE DESCARGA ZIP REQUERIDO */}
                  <button
                    type="button"
                    onClick={() => handleDescargarCarpetaZip(selectedFolder)}
                    className="h-10 px-3.5 rounded-xl bg-slate-800 border border-white/10 hover:border-emerald-500 text-emerald-400 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download size={16} /> Descargar {selectedFolder}.zip
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddFolderInput(!showAddFolderInput)}
                    className="h-10 px-3.5 rounded-xl bg-slate-800 border border-white/10 hover:border-gold text-slate-200 text-xs font-bold flex items-center gap-1.5"
                  >
                    <FolderPlus size={16} className="text-gold" /> Nueva Carpeta
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDocModal(true)}
                    className="h-10 px-4 rounded-xl bg-gold hover:bg-gold-light text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Plus size={16} /> Cargar Documento
                  </button>
                </div>
              </div>

              {showAddFolderInput && (
                <div className="p-3 bg-slate-950 border border-gold/30 rounded-xl flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Nombre de la nueva carpeta..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={handleAddFolder}
                    className="px-4 py-1.5 bg-gold text-slate-950 font-bold text-xs rounded-lg"
                  >
                    Crear Carpeta
                  </button>
                </div>
              )}

              {/* Folders Navigation Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setSelectedFolder('Todas')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedFolder === 'Todas' ? 'bg-gold text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Folder size={15} /> Todas ({rawDocs.length})
                </button>

                {displayCarpetas.map((folder) => {
                  const countInFolder = rawDocs.filter(d => getDocCarpeta(d) === folder).length;
                  return (
                    <div key={folder} className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedFolder(folder)}
                        className={`px-3 py-2 rounded-l-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          selectedFolder === folder ? 'bg-gold text-slate-950 shadow-md' : 'bg-slate-950 border border-white/10 text-slate-300 hover:border-gold/40'
                        }`}
                      >
                        <Folder size={14} className={selectedFolder === folder ? 'text-slate-950' : 'text-gold'} />
                        <span>{folder}</span>
                        <span className="text-[10px] font-mono opacity-80">({countInFolder})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(folder)}
                        title={`Eliminar carpeta "${folder}"`}
                        className="px-2 py-2 rounded-r-xl bg-slate-950 border-y border-r border-white/10 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Drag and Drop Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-gold bg-gold/10 scale-[1.01]' 
                    : 'border-white/10 bg-slate-950/40 hover:border-gold/30'
                }`}
              >
                <UploadCloud size={36} className="mx-auto text-gold mb-2" />
                <p className="text-xs font-bold text-white">Arrastra y suelta archivos aquí para cargarlos en la carpeta <strong className="text-gold">{selectedFolder}</strong></p>
                <p className="text-[11px] text-slate-400 mt-1">Soporta selección de múltiples archivos en formato PDF, XML, PNG, JPG</p>
              </div>

              {/* Document Table (Strictly Filtered by Folder) */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
                {currentDocsList.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedDocIds.length === currentDocsList.length && currentDocsList.length > 0}
                            onChange={() => handleSelectAllDocs(currentDocsList)}
                            className="rounded border-white/20 bg-slate-900 text-gold focus:ring-gold cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-5">Documento</th>
                        <th className="py-3.5 px-5">Carpeta Exacta</th>
                        <th className="py-3.5 px-5">Categoría</th>
                        <th className="py-3.5 px-5">Estatus</th>
                        <th className="py-3.5 px-5">Fecha de Carga</th>
                        <th className="py-3.5 px-5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {currentDocsList.map((doc) => {
                        const folderAssigned = getDocCarpeta(doc);
                        return (
                          <tr key={doc.id} className={`hover:bg-white/5 transition-colors ${selectedDocIds.includes(doc.id) ? 'bg-gold/5' : ''}`}>
                            <td className="py-4 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedDocIds.includes(doc.id)}
                                onChange={() => handleToggleSelectDoc(doc.id)}
                                className="rounded border-white/20 bg-slate-900 text-gold focus:ring-gold cursor-pointer"
                              />
                            </td>
                            <td className="py-4 px-5 font-bold text-white flex items-center gap-2">
                              <FileText size={16} className="text-gold shrink-0" />
                              <span>{doc.nombre}</span>
                            </td>
                            <td className="py-4 px-5 text-slate-300">
                              <span className="px-2.5 py-0.5 rounded-full bg-gold/10 text-gold font-semibold text-[11px] border border-gold/20">
                                {folderAssigned}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-slate-300">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                                {doc.categoria}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`badge-status ${doc.estatus === 'VALIDADO' ? 'badge-entregado' : 'badge-proceso'}`}>
                                {doc.estatus}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-slate-400 font-mono">
                              {new Date(exp.created_at).toLocaleDateString()}
                            </td>
                            
                            {/* INDIVIDUAL ROW ACTIONS (EXCLUSIVAMENTE EL ARCHIVO CORRECTO) */}
                            <td className="py-4 px-5 text-right space-x-1.5">
                              <button 
                                type="button" 
                                title="Visualizar Documento Correcto" 
                                onClick={() => handleVisualizarDoc(doc.id, doc.nombre)}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                type="button" 
                                title="Descargar Documento Correcto" 
                                onClick={() => handleDescargarDoc(doc.id, doc.nombre)}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                              >
                                <Download size={14} />
                              </button>
                              <button 
                                type="button" 
                                title="Mover a carpeta o Renombrar" 
                                onClick={() => setEditDocModalState({ id: doc.id, nombre: doc.nombre, carpeta: folderAssigned })}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-gold"
                              >
                                <FolderOutput size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteDocumento(doc.id)}
                                title="Eliminar Documento" 
                                className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <FileText size={36} className="mx-auto text-slate-600 mb-1" />
                    <p className="text-sm font-semibold text-white">No existen documentos cargados en la carpeta "{selectedFolder}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA: PRESUPUESTO OPERATIVO */}
          {activeTab === 'presupuesto' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/10">
                    <div>
                      <h4 className="text-base font-bold text-white">Desglose de Montos (Presupuesto Notarial)</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Presupuesto operativo del expediente{exp.cotizacion?.numero_cotizacion ? `, originado en ${exp.cotizacion.numero_cotizacion}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-gold bg-gold/10 px-3 py-1 rounded-lg border border-gold/20 font-bold">
                      {budgetItems.length} rubro(s)
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                    {budgetItems.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-slate-400">
                        No hay rubros operativos registrados. Agrega el primero desde el catálogo inferior.
                      </div>
                    )}
                    {budgetItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          value={item.concepto}
                          onChange={(e) => handleItemConceptoChange(item.id, e.target.value)}
                          className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-gold"
                        />
                        <input 
                          type="number"
                          value={item.monto}
                          onChange={(e) => handleItemMontoChange(item.id, parseFloat(e.target.value) || 0)}
                          className="w-36 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-extrabold text-right text-white focus:outline-none focus:border-gold font-mono"
                        />
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label={`Eliminar rubro ${item.concepto}`}
                          className="text-slate-400 hover:text-rose-400 p-2 text-xs font-bold transition-colors"
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-white/10">
                    <select 
                      value={selectedConceptoToAdd}
                      onChange={(e) => setSelectedConceptoToAdd(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-gold cursor-pointer"
                    >
                      {CONCEPTOS_CATALOGO.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button 
                      type="button"
                      onClick={handleAddConcepto} 
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      + Rubro
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/10 text-base font-extrabold">
                    <span className="text-white">Total Presupuesto Cliente:</span>
                    <span className="text-xl text-emerald-400 font-mono">${totalClienteCalculated.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="p-5 bg-slate-950/80 border border-gold/30 rounded-2xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-gold uppercase tracking-wider">
                      Participación PRAVIA (Uso Interno - Casilla Independiente)
                    </h5>
                  </div>
                  <input
                    type="number"
                    value={praviaMontoInput}
                    onChange={(e) => setPraviaMontoInput(e.target.value)}
                    className="w-full bg-slate-900 border border-gold/50 rounded-xl px-4 py-2.5 text-base font-extrabold text-right text-gold font-mono focus:outline-none focus:border-gold"
                  />
                  <p className="text-[11px] text-gold/80 italic text-right mt-1 font-medium">
                    Cualquier ajuste en montos, rubros o participación activará automáticamente el botón superior "Guardar Cambios".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA: FINANZAS Y MOVIMIENTOS RECONSTRUIDA */}
          {activeTab === 'finanzas' && (
            <ExpedienteFinanzasTab expedienteId={exp.id} onUpdate={loadData} />
          )}

          {/* PESTAÑA: BITÁCORA */}
          {activeTab === 'actividades' && (
            <div className="space-y-4">
              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
                {filteredActividades.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-5">Fecha y Hora</th>
                        <th className="py-3.5 px-5">Usuario</th>
                        <th className="py-3.5 px-5">Tipo</th>
                        <th className="py-3.5 px-5">Descripción Detallada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredActividades.map((act) => (
                        <tr key={act.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-5 text-slate-300 whitespace-nowrap font-mono">
                            {new Date(act.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-5 font-bold text-white whitespace-nowrap">
                            {act.usuario ? `${act.usuario.nombre} ${act.usuario.apellido}` : 'Sistema PRAVIA OS'}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 font-bold text-gold border border-gold/20 text-[11px]">
                              {act.tipo}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-slate-200">
                            <p className="font-bold text-white">{act.titulo}</p>
                            <p className="text-slate-400 mt-0.5">{act.descripcion}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">Sin registros en la bitácora de actividades.</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: CARGAR NUEVA VERSIÓN DEL PROYECTO */}
      {showUploadProyectoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleUploadProyectoVersion} className="bg-slate-900 border border-gold/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-lg font-bold text-white">Cargar Nueva Versión del Proyecto</h4>
            
            <input
              type="file"
              ref={proyectoInputRef}
              accept=".docx,.pdf"
              onChange={(e) => e.target.files && setProyectoFileToUpload(e.target.files[0])}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => proyectoInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed border-gold/40 hover:border-gold rounded-xl bg-slate-950 text-center space-y-2 transition-all"
            >
              <UploadCloud size={32} className="mx-auto text-gold" />
              <span className="text-xs font-bold text-white block">Seleccionar archivo (.docx / .pdf)</span>
            </button>

            {proyectoFileToUpload && (
              <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400 font-mono">
                <span className="truncate font-semibold">{proyectoFileToUpload.name}</span>
                <button type="button" onClick={() => setProyectoFileToUpload(null)} className="text-rose-400 font-bold">✕</button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nota de Versión (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Corrección de medidas según avalúo"
                value={proyectoNotaVersion}
                onChange={(e) => setProyectoNotaVersion(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowUploadProyectoModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!proyectoFileToUpload}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-md ${
                  !proyectoFileToUpload ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gold text-slate-950 hover:bg-gold-light'
                }`}
              >
                Subir Proyecto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDITAR DOCUMENTO */}
      {editDocModalState && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-gold/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-lg font-bold text-white">Editar Documento del Archivo</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nombre del Documento *</label>
              <input
                type="text"
                value={editDocModalState.nombre}
                onChange={(e) => setEditDocModalState({ ...editDocModalState, nombre: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Mover a Carpeta</label>
              <select
                value={editDocModalState.carpeta}
                onChange={(e) => setEditDocModalState({ ...editDocModalState, carpeta: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold cursor-pointer"
              >
                {carpetas.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setEditDocModalState(null)} className="px-4 py-2 text-xs font-semibold text-slate-400">
                Cancelar
              </button>
              <button type="button" onClick={handleSaveEditDocumento} className="px-4 py-2 bg-gold text-slate-950 font-bold text-xs rounded-xl shadow-md">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARGAR DOCUMENTO */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleAddDocumento} className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-lg font-bold text-white">Cargar Documento al Archivo</h4>
            <input
              type="file"
              ref={docFileInputRef}
              multiple
              onChange={handleDocFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => docFileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gold/40 hover:border-gold rounded-xl bg-slate-950 text-center space-y-1 transition-all"
            >
              <UploadCloud size={28} className="mx-auto text-gold" />
              <span className="text-xs font-bold text-white block">Seleccionar archivo(s) desde el equipo</span>
            </button>
            {selectedDocFiles.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-950 p-3 rounded-xl border border-white/10 text-xs">
                {selectedDocFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-200 py-1 border-b border-white/5 last:border-none">
                    <span className="truncate font-semibold max-w-[200px]">{file.name}</span>
                    <button type="button" onClick={() => handleRemoveSelectedDocFile(idx)} className="text-rose-400 font-bold">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Carpeta Destino</label>
                <select
                  value={docForm.carpeta}
                  onChange={(e) => setDocForm({ ...docForm, carpeta: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold cursor-pointer"
                >
                  {carpetas.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Categoría</label>
                <select
                  value={docForm.categoria}
                  onChange={(e) => setDocForm({ ...docForm, categoria: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold cursor-pointer"
                >
                  <option value="REGISTRO">Registro y Catastro</option>
                  <option value="PROYECTO">Proyecto / Protocolo</option>
                  <option value="EXPEDIENTE">Identificación / UIF</option>
                  <option value="FIRMA">Documentos de Firma</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setShowDocModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 bg-gold text-slate-950 font-bold text-xs rounded-xl shadow-md">
                Guardar Documento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: VINCULAR COMPARECIENTE EXISTENTE */}
      <ModalVincularCompareciente
        isOpen={showVincularModal}
        expedienteId={exp.id}
        expedienteFolio="0005-2026"
        onClose={() => setShowVincularModal(false)}
        onSuccess={() => {
          loadData();
          addToast('Compareciente vinculado exitosamente al expediente', 'success');
        }}
      />

      {/* MODAL: CREAR NUEVO COMPARECIENTE */}
      <ModalNuevoCompareciente
        isOpen={showNuevoCompModal}
        onClose={() => setShowNuevoCompModal(false)}
        onSuccess={(nuevo) => {
          loadData();
          addToast(`Persona creada exitosamente en catálogo maestro`, 'success');
        }}
      />

      {/* MODAL ADVERTENCIA: CAMBIOS SIN GUARDAR */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-base">Hay cambios sin guardar</h3>
            </div>
            <p className="text-slate-300 text-xs">
              Has realizado modificaciones en la ficha o presupuesto del expediente. ¿Deseas salir sin guardar los cambios?
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveWithoutSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Salir sin guardar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const saved = await handleSaveHeaderEdits();
                  if (saved) {
                    setShowUnsavedModal(false);
                    if (pendingNavigation) navigate(pendingNavigation);
                  }
                }}
                className="px-4 py-2 bg-gold hover:bg-gold-light text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Guardar y Salir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
