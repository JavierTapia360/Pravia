import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Receipt,
  Plus,
  Paperclip,
  FileText,
  FileCode,
  Archive,
  RotateCcw,
  Eye,
  Download,
  UploadCloud,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';

interface MovimientoItem {
  id: string;
  tipo_movimiento: string;
  naturaleza: 'INGRESO' | 'EGRESO';
  categoria: string;
  concepto: string;
  monto: number;
  fecha_movimiento: string;
  forma_pago?: string;
  referencia?: string;
  comprobante_url?: string;
  factura_url?: string;
  estatus: string;
  capturado_por?: { id: string; nombre: string; apellido: string };
  validado_por?: { id: string; nombre: string; apellido: string };
}

interface ExpedienteFinanzasTabProps {
  expedienteId: string;
  actorUserId: string;
  onUpdate?: () => void;
}

export const ExpedienteFinanzasTab: React.FC<ExpedienteFinanzasTabProps> = ({
  expedienteId,
  actorUserId,
  onUpdate
}) => {
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [expData, setExpData] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([]);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Modales
  const [showNuevoMovModal, setShowNuevoMovModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showAdjuntoModal, setShowAdjuntoModal] = useState(false);
  const [xmlViewerData, setXmlViewerData] = useState<{ title: string; text: string } | null>(null);

  // Formulario Nuevo Movimiento
  const [movForm, setMovForm] = useState({
    tipo_movimiento: 'ANTICIPO',
    naturaleza: 'INGRESO' as 'INGRESO' | 'EGRESO',
    categoria: 'CLIENTE_FONDOS',
    concepto: '',
    monto: '',
    fecha_movimiento: new Date().toISOString().split('T')[0],
    forma_pago: 'TRANSFERENCIA',
    referencia: '',
    estatus: 'VALIDADO'
  });

  // Archivos seleccionados durante la creación
  const [fileComprobante, setFileComprobante] = useState<File | null>(null);
  const [fileFacturaPdf, setFileFacturaPdf] = useState<File | null>(null);
  const [fileFacturaXml, setFileFacturaXml] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reversión auditable
  const [selectedMovId, setSelectedMovId] = useState('');
  const [reverseReason, setReverseReason] = useState('');

  // Cargar/Sustituir Adjunto Modal State
  const [selectedAdjuntoMovId, setSelectedAdjuntoMovId] = useState('');
  const [tipoAdjuntoUpload, setTipoAdjuntoUpload] = useState<'COMPROBANTE' | 'FACTURA_PDF' | 'FACTURA_XML'>('COMPROBANTE');
  const [newAdjuntoFile, setNewAdjuntoFile] = useState<File | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorDetail(null);
    try {
      const res = await api.get(`/expedientes/${expedienteId}`);
      setExpData(res);
      // Filtrar movimientos eliminados/cancelados/revertidos para que NUNCA aparezcan en la interfaz
      const activeMovs = (res.movimientosFinancieros || []).filter(
        (m: MovimientoItem) => !['CANCELADO', 'REVERTIDO'].includes(m.estatus)
      );
      setMovimientos(activeMovs);
    } catch (err: any) {
      console.error('[ExpedienteFinanzasTab] Error al cargar expediente:', err);
      const exactMsg = err.detail || err.message || 'Error de conexión con el servidor';
      setErrorDetail(`Status: ${err.status || 500} - ${exactMsg}`);
      addToast(err.message || 'Error al cargar información financiera', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expedienteId) {
      loadData();
    }
  }, [expedienteId]);

  // Cálculos dinámicos
  const presupuestoOperativo = expData?.datos_operacion?.presupuesto;
  const totalPresupuestado = Number(
    presupuestoOperativo?.total_cliente ?? expData?.cotizacion?.total_cliente ?? expData?.valor_operacion ?? 0
  );

  const activeLedger = movimientos.filter(
    (m) => ['VALIDADO', 'RECIBIDO'].includes(m.estatus) && m.categoria !== 'REVERSO'
  );
  const totalCobrado = activeLedger
    .filter((m) => m.naturaleza === 'INGRESO')
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const devoluciones = activeLedger
    .filter((m) => m.tipo_movimiento === 'DEVOLUCION' || m.categoria === 'DEVOLUCION')
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const cobradoNeto = Math.max(0, totalCobrado - devoluciones);
  const saldoPendiente = Math.max(0, totalPresupuestado - cobradoNeto);

  const totalEgresado = activeLedger
    .filter((m) => m.naturaleza === 'EGRESO')
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const participacionPraviaTotal = Number(
    presupuestoOperativo?.honorarios_pravia ?? expData?.cotizacion?.honorarios_pravia ?? 0
  );
  const praviaCobradoEfectivo = activeLedger
    .filter((m) => m.naturaleza === 'INGRESO' && m.categoria === 'HONORARIOS_PRAVIA')
    .reduce((sum, m) => sum + Number(m.monto), 0);
  const tercerosPresupuestados = Math.max(0, totalPresupuestado - participacionPraviaTotal);
  const egresosTerceros = activeLedger
    .filter((m) => m.naturaleza === 'EGRESO' && ['NOTARIA', 'IMPUESTOS_DERECHOS', 'TERCEROS'].includes(m.categoria))
    .reduce((sum, m) => sum + Number(m.monto), 0);
  const saldoTerceros = Math.max(0, tercerosPresupuestados - egresosTerceros);
  const fondosRetenidos = Math.max(0, cobradoNeto - praviaCobradoEfectivo - egresosTerceros);

  // Handler: Crear Movimiento Financiero
  const handleCreateMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);

    if (!movForm.concepto.trim()) {
      addToast('Ingresa un concepto descriptivo para el movimiento', 'error');
      return;
    }
    if (!movForm.monto || Number(movForm.monto) <= 0) {
      addToast('Ingresa un monto válido mayor a $0 MXN', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tipo_movimiento: movForm.tipo_movimiento,
        naturaleza: movForm.naturaleza,
        categoria: movForm.categoria || (movForm.naturaleza === 'EGRESO' ? 'TERCEROS' : 'NOTARIA'),
        concepto: movForm.concepto.trim(),
        monto: Number(movForm.monto),
        fecha_movimiento: movForm.fecha_movimiento,
        forma_pago: movForm.forma_pago,
        referencia: movForm.referencia,
        user_id: actorUserId,
      };

      const newMov = await api.post(`/expedientes/${expedienteId}/movimientos`, payload);

      const movId = newMov?.id || newMov?.movimiento?.id;
      let uploadErrors: string[] = [];

      if (movId) {
        if (fileComprobante) {
          try {
            const fd = new FormData();
            fd.append('file', fileComprobante);
            fd.append('tipo_adjunto', 'COMPROBANTE');
            fd.append('user_id', actorUserId);
            await api.upload(`/expedientes/${expedienteId}/movimientos/${movId}/adjuntos/upload`, fd);
          } catch (err: any) {
            uploadErrors.push(`Comprobante: ${err.message || 'Error de subida'}`);
          }
        }
        if (fileFacturaPdf) {
          try {
            const fd = new FormData();
            fd.append('file', fileFacturaPdf);
            fd.append('tipo_adjunto', 'FACTURA_PDF');
            fd.append('user_id', actorUserId);
            await api.upload(`/expedientes/${expedienteId}/movimientos/${movId}/adjuntos/upload`, fd);
          } catch (err: any) {
            uploadErrors.push(`Factura PDF: ${err.message || 'Error de subida'}`);
          }
        }
        if (fileFacturaXml) {
          try {
            const fd = new FormData();
            fd.append('file', fileFacturaXml);
            fd.append('tipo_adjunto', 'FACTURA_XML');
            fd.append('user_id', actorUserId);
            await api.upload(`/expedientes/${expedienteId}/movimientos/${movId}/adjuntos/upload`, fd);
          } catch (err: any) {
            uploadErrors.push(`Factura XML: ${err.message || 'Error de subida'}`);
          }
        }
      }

      if (uploadErrors.length > 0) {
        addToast(`Movimiento creado pero falló adjunto: ${uploadErrors.join('; ')}`, 'warning');
      } else {
        addToast('Movimiento financiero registrado exitosamente', 'success');
      }

      setShowNuevoMovModal(false);
      setMovForm({
        tipo_movimiento: 'ANTICIPO',
        naturaleza: 'INGRESO',
        categoria: 'CLIENTE_FONDOS',
        concepto: '',
        monto: '',
        fecha_movimiento: new Date().toISOString().split('T')[0],
        forma_pago: 'TRANSFERENCIA',
        referencia: '',
        estatus: 'VALIDADO'
      });
      setFileComprobante(null);
      setFileFacturaPdf(null);
      setFileFacturaXml(null);

      await loadData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error('[ExpedienteFinanzasTab] Error exacto al crear movimiento:', err);
      const exactMsg = err.detail || err.message || 'Error al conectar con el servidor';
      setErrorDetail(`Status: ${err.status || 500} - ${exactMsg}`);
      addToast(`Error al guardar: ${exactMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Subir / Sustituir Adjunto Específico
  const handleUploadAdjunto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjuntoMovId || !newAdjuntoFile) {
      addToast('Selecciona un archivo válido', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', newAdjuntoFile);
      fd.append('tipo_adjunto', tipoAdjuntoUpload);
      fd.append('user_id', actorUserId);

      await api.upload(
        `/expedientes/${expedienteId}/movimientos/${selectedAdjuntoMovId}/adjuntos/upload`,
        fd
      );

      addToast(`Archivo (${tipoAdjuntoUpload}) subido exitosamente`, 'success');
      setShowAdjuntoModal(false);
      setNewAdjuntoFile(null);
      await loadData();
    } catch (err: any) {
      console.error('[ExpedienteFinanzasTab] Error al cargar adjunto:', err);
      const exactMsg = err.detail || err.message || 'Error al subir archivo';
      setErrorDetail(`Status: ${err.status || 500} - ${exactMsg}`);
      addToast(exactMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // El vínculo deja de ser vigente, pero el archivo permanece en el historial.
  const handleArchiveAdjunto = async (movId: string, tipo: 'COMPROBANTE' | 'FACTURA_PDF' | 'FACTURA_XML') => {
    if (!window.confirm(`¿Archivar el archivo ${tipo}? El historial se conservará.`)) return;
    try {
      await api.patch(`/expedientes/${expedienteId}/movimientos/${movId}/adjunto`, {
        tipo_adjunto: tipo,
        accion: 'ARCHIVAR',
        user_id: actorUserId,
      });
      addToast(`Adjunto ${tipo} archivado; el historial fue conservado`, 'info');
      await loadData();
    } catch (err: any) {
      addToast(err.detail || err.message || 'Error al archivar adjunto', 'error');
    }
  };

  const handleReverseMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);

    if (!selectedMovId) return;
    if (!reverseReason.trim()) {
      addToast('Explica el motivo de la reversión', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/expedientes/${expedienteId}/movimientos/${selectedMovId}/revertir`, {
        motivo_reversion: reverseReason.trim(),
        user_id: actorUserId,
      });
      addToast('Movimiento revertido con contramovimiento y bitácora', 'success');
      setShowReverseModal(false);
      setSelectedMovId('');
      setReverseReason('');
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error('[ExpedienteFinanzasTab] Error al revertir movimiento:', err);
      const exactMsg = err.detail || err.message || 'Error al revertir movimiento';
      setErrorDetail(`Status: ${err.status || 500} - ${exactMsg}`);
      addToast(`Error: ${exactMsg}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
  };

  return (
    <div className="space-y-6">

      {/* Alerta de Error Diagnóstico si ocurre alguno */}
      {errorDetail && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold">Diagnóstico de Error Backend: </span>
              <span>{errorDetail}</span>
            </div>
          </div>
          <button type="button" onClick={() => setErrorDetail(null)} className="text-rose-400 hover:text-white font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 1. ENCABEZADO FINANCIERO DEL EXPEDIENTE ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        
        {/* Total Presupuestado Cliente */}
        <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Presupuestado</span>
          <p className="text-lg font-black text-white font-mono">{formatCurrency(totalPresupuestado)}</p>
          <p className="text-[10px] text-slate-400">Total cliente</p>
        </div>

        {/* Total Cobrado */}
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Total Cobrado</span>
          <p className="text-lg font-black text-emerald-400 font-mono">{formatCurrency(cobradoNeto)}</p>
          <p className="text-[10px] text-emerald-500">Ingresos validados</p>
        </div>

        {/* Saldo Pendiente */}
        <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Saldo Pendiente</span>
          <p className="text-lg font-black text-rose-400 font-mono">{formatCurrency(saldoPendiente)}</p>
          <p className="text-[10px] text-rose-500">Adeudo por cobrar</p>
        </div>

        {/* Participación PRAVIA */}
        <div className="p-4 rounded-xl bg-slate-900 border border-gold/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Part. PRAVIA</span>
          <p className="text-lg font-black text-gold font-mono">{formatCurrency(participacionPraviaTotal)}</p>
          <p className="text-[10px] text-slate-400">Honorarios pactados</p>
        </div>

        {/* Honorarios PRAVIA Cobrados */}
        <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Honorarios Cobrados</span>
          <p className="text-lg font-black text-indigo-400 font-mono">{formatCurrency(praviaCobradoEfectivo)}</p>
          <p className="text-[10px] text-indigo-500">Ingreso real firma</p>
        </div>

        {/* Total Egresado */}
        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Total Egresado</span>
          <p className="text-lg font-black text-amber-400 font-mono">{formatCurrency(totalEgresado)}</p>
          <p className="text-[10px] text-amber-500">Notaría y terceros</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Saldo Terceros</span>
          <p className="text-lg font-black text-cyan-400 font-mono">{formatCurrency(saldoTerceros)}</p>
          <p className="text-[10px] text-slate-400">Por pagar del presupuesto</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-violet-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Fondos Retenidos</span>
          <p className="text-lg font-black text-violet-400 font-mono">{formatCurrency(fondosRetenidos)}</p>
          <p className="text-[10px] text-slate-400">Dinero bajo resguardo</p>
        </div>

      </div>

      {/* ── 2. BOTONERA PRINCIPAL ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-white/10">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gold" />
            Libro de Movimientos Financieros del Expediente
          </h3>
          <p className="text-xs text-slate-400">
            Registro de ingresos, egresos y control independiente de 3 adjuntos por renglón.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNuevoMovModal(true)}
          className="px-4 py-2 bg-gold hover:bg-gold-light text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Registrar Movimiento
        </button>
      </div>

      {/* ── 3. TABLA DE MOVIMIENTOS ACTIVO ──────────────────────────────── */}
      <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
        {movimientos.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Wallet className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No hay movimientos financieros activos en este expediente.</p>
            <p className="text-xs text-slate-500">Presiona "+ Registrar Movimiento" para añadir ingresos o egresos con sus comprobantes y facturas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Tipo / Nat.</th>
                  <th className="py-3 px-3">Concepto / Cat.</th>
                  <th className="py-3 px-3 text-right">Monto</th>
                  <th className="py-3 px-3">Forma / Ref.</th>
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3 text-center">COMPROBANTE</th>
                  <th className="py-3 px-3 text-center">FACTURA PDF</th>
                  <th className="py-3 px-3 text-center">FACTURA XML</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {movimientos.map((m) => {
                  let refData: any = {};
                  try {
                    if (m.referencia && m.referencia.startsWith('{')) refData = JSON.parse(m.referencia);
                    else if (m.referencia) refData = { nota: m.referencia };
                  } catch (e) {
                    refData = { nota: m.referencia };
                  }

                  const hasComprobante = !!(m.comprobante_url || refData.comprobante_nombre || refData.comprobante_file);
                  const hasFacturaPdf = !!(m.factura_url || refData.factura_pdf_nombre || refData.factura_pdf_file);
                  const hasFacturaXml = !!(refData.factura_xml_file || refData.factura_xml_nombre || refData.factura_xml_text);

                  return (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      
                      {/* Fecha */}
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {new Date(m.fecha_movimiento).toLocaleDateString('es-MX')}
                      </td>

                      {/* Tipo / Nat */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.naturaleza === 'INGRESO'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {m.naturaleza} · {m.tipo_movimiento}
                        </span>
                      </td>

                      {/* Concepto */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{m.concepto}</div>
                        <div className="text-[10px] text-slate-400">{m.categoria}</div>
                      </td>

                      {/* Monto */}
                      <td className={`py-3 px-3 text-right font-mono font-extrabold text-sm whitespace-nowrap ${
                        m.naturaleza === 'INGRESO' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {formatCurrency(Number(m.monto))}
                      </td>

                      {/* Forma / Ref */}
                      <td className="py-3 px-3 text-slate-300">
                        <div>{m.forma_pago || 'Efectivo'}</div>
                        {refData.nota && <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{refData.nota}</div>}
                      </td>

                      {/* Usuario */}
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {m.capturado_por ? `${m.capturado_por.nombre} ${m.capturado_por.apellido}` : 'Sistema'}
                      </td>

                      {/* 1. COMPROBANTE DE PAGO */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasComprobante ? (
                          <div className="flex items-center justify-center gap-1.5 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/30">
                            <a
                              href={`/api/expedientes/${expedienteId}/movimientos/${m.id}/adjuntos/COMPROBANTE/visualizar`}
                              target="_blank"
                              rel="noreferrer"
                              title="Visualizar Comprobante"
                              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`/api/expedientes/${expedienteId}/movimientos/${m.id}/adjuntos/COMPROBANTE/descargar`}
                              title="Descargar Comprobante"
                              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-300 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdjuntoMovId(m.id);
                                setTipoAdjuntoUpload('COMPROBANTE');
                                setShowAdjuntoModal(true);
                              }}
                              title="Sustituir Comprobante"
                              className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-all cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveAdjunto(m.id, 'COMPROBANTE')}
                              title="Archivar comprobante (conserva historial)"
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAdjuntoMovId(m.id);
                              setTipoAdjuntoUpload('COMPROBANTE');
                              setShowAdjuntoModal(true);
                            }}
                            title="Subir Comprobante de Pago"
                            className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-gold text-slate-400 hover:text-gold transition-all cursor-pointer inline-flex items-center gap-1 text-[10px]"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-gold" />
                            Cargar
                          </button>
                        )}
                      </td>

                      {/* 2. FACTURA PDF */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasFacturaPdf ? (
                          <div className="flex items-center justify-center gap-1.5 bg-blue-950/40 p-1.5 rounded-lg border border-blue-500/30">
                            <a
                              href={`/api/expedientes/${expedienteId}/movimientos/${m.id}/adjuntos/FACTURA_PDF/visualizar`}
                              target="_blank"
                              rel="noreferrer"
                              title="Visualizar Factura PDF"
                              className="p-1 rounded hover:bg-blue-500/20 text-blue-400 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`/api/expedientes/${expedienteId}/movimientos/${m.id}/adjuntos/FACTURA_PDF/descargar`}
                              title="Descargar Factura PDF"
                              className="p-1 rounded hover:bg-blue-500/20 text-blue-300 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdjuntoMovId(m.id);
                                setTipoAdjuntoUpload('FACTURA_PDF');
                                setShowAdjuntoModal(true);
                              }}
                              title="Sustituir Factura PDF"
                              className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-all cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveAdjunto(m.id, 'FACTURA_PDF')}
                              title="Archivar factura PDF (conserva historial)"
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAdjuntoMovId(m.id);
                              setTipoAdjuntoUpload('FACTURA_PDF');
                              setShowAdjuntoModal(true);
                            }}
                            title="Subir Factura PDF"
                            className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-blue-400 text-slate-400 hover:text-blue-400 transition-all cursor-pointer inline-flex items-center gap-1 text-[10px]"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                            Cargar
                          </button>
                        )}
                      </td>

                      {/* 3. FACTURA XML */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasFacturaXml ? (
                          <div className="flex items-center justify-center gap-1.5 bg-purple-950/40 p-1.5 rounded-lg border border-purple-500/30">
                            <button
                              type="button"
                              onClick={() => setXmlViewerData({
                                title: `Factura XML - ${m.concepto}`,
                                text: refData.factura_xml_text || '<xml>Factura XML Registrada</xml>'
                              })}
                              title="Visualizar XML como Texto"
                              className="p-1 rounded hover:bg-purple-500/20 text-purple-400 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/api/expedientes/${expedienteId}/movimientos/${m.id}/adjuntos/FACTURA_XML/descargar`}
                              title="Descargar Factura XML"
                              className="p-1 rounded hover:bg-purple-500/20 text-purple-300 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdjuntoMovId(m.id);
                                setTipoAdjuntoUpload('FACTURA_XML');
                                setShowAdjuntoModal(true);
                              }}
                              title="Sustituir Factura XML"
                              className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-all cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveAdjunto(m.id, 'FACTURA_XML')}
                              title="Archivar factura XML (conserva historial)"
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAdjuntoMovId(m.id);
                              setTipoAdjuntoUpload('FACTURA_XML');
                              setShowAdjuntoModal(true);
                            }}
                            title="Subir Factura XML (.xml)"
                            className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-purple-400 text-slate-400 hover:text-purple-400 transition-all cursor-pointer inline-flex items-center gap-1 text-[10px]"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
                            Cargar
                          </button>
                        )}
                      </td>

                      {/* Acciones Movimiento */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMovId(m.id);
                              setShowReverseModal(true);
                            }}
                            title="Revertir movimiento con motivo"
                            className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 1: REGISTRAR NUEVO MOVIMIENTO FINANCIERO ───────────────── */}
      {showNuevoMovModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-gold" />
                Registrar Movimiento Financiero
              </h3>
              <button type="button" onClick={() => setShowNuevoMovModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovimiento} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Naturaleza</label>
                  <select
                    value={movForm.naturaleza}
                    onChange={(e) => {
                      const nextNature = e.target.value as 'INGRESO' | 'EGRESO';
                      setMovForm({
                        ...movForm,
                        naturaleza: nextNature,
                        tipo_movimiento: nextNature === 'EGRESO' ? 'EGRESO_TERCEROS' : 'ANTICIPO',
                        categoria: nextNature === 'EGRESO' ? 'TERCEROS' : 'CLIENTE_FONDOS',
                      });
                    }}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="INGRESO">INGRESO (Cobro al cliente)</option>
                    <option value="EGRESO">EGRESO (Pago Notaría / Terceros)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Tipo de Movimiento</label>
                  <select
                    value={movForm.tipo_movimiento}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      const isExpense = ['EGRESO_NOTARIA', 'EGRESO_TERCEROS', 'DEVOLUCION'].includes(nextType);
                      setMovForm({
                        ...movForm,
                        tipo_movimiento: nextType,
                        naturaleza: isExpense ? 'EGRESO' : 'INGRESO',
                        categoria: nextType === 'EGRESO_NOTARIA'
                          ? 'NOTARIA'
                          : nextType === 'DEVOLUCION'
                            ? 'DEVOLUCION'
                            : isExpense
                              ? 'TERCEROS'
                              : 'CLIENTE_FONDOS',
                      });
                    }}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="ANTICIPO">ANTICIPO (50%)</option>
                    <option value="ABONO">ABONO / PAGO PARCIAL</option>
                    <option value="PAGO_CONTRA_FIRMA">LIQUIDACIÓN / CONTRA FIRMA</option>
                    <option value="PAGO_UNICO">PAGO ÚNICO</option>
                    <option value="EGRESO_NOTARIA">PAGO A NOTARÍA</option>
                    <option value="EGRESO_TERCEROS">DERECHOS / TERCEROS</option>
                    <option value="DEVOLUCION">DEVOLUCIÓN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={movForm.categoria}
                    onChange={(e) => setMovForm({ ...movForm, categoria: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {movForm.naturaleza === 'INGRESO' ? (
                      <>
                        <option value="CLIENTE_FONDOS">Fondos recibidos del cliente</option>
                        <option value="HONORARIOS_PRAVIA">Honorarios PRAVIA recibidos</option>
                      </>
                    ) : (
                      <>
                        <option value="NOTARIA">Pago a notaría</option>
                        <option value="IMPUESTOS_DERECHOS">Impuestos y derechos</option>
                        <option value="TERCEROS">Pago a terceros</option>
                        <option value="PRAVIA">Gasto interno PRAVIA</option>
                        <option value="DEVOLUCION">Devolución al cliente</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Monto ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={movForm.monto}
                    onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-gold/40 rounded-xl px-3 py-2 text-gold font-mono font-bold text-sm text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Concepto Detallado</label>
                <input
                  type="text"
                  required
                  value={movForm.concepto}
                  onChange={(e) => setMovForm({ ...movForm, concepto: e.target.value })}
                  placeholder="Ej. Anticipo 50% escritura compraventa"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Método de Pago</label>
                  <select
                    value={movForm.forma_pago}
                    onChange={(e) => setMovForm({ ...movForm, forma_pago: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="TRANSFERENCIA">SPEI / Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque Nominativo</option>
                    <option value="TARJETA">Tarjeta Débito/Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={movForm.fecha_movimiento}
                    onChange={(e) => setMovForm({ ...movForm, fecha_movimiento: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Referencia / Observaciones</label>
                <input
                  type="text"
                  value={movForm.referencia}
                  onChange={(e) => setMovForm({ ...movForm, referencia: e.target.value })}
                  placeholder="No. de rastreo SPEI, banco u observaciones"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* SELECCIÓN Y VISUALIZACIÓN DE LOS 3 ADJUNTOS DURANTE LA CREACIÓN */}
              <div className="border-t border-white/10 pt-3 space-y-3">
                <p className="font-bold text-gold text-[11px]">Archivos Adjuntos Iniciales (Opcional):</p>

                {/* Comprobante */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> Comprobante de Pago
                    </span>
                    {fileComprobante && (
                      <button type="button" onClick={() => setFileComprobante(null)} className="text-rose-400 text-[10px] hover:underline">
                        Quitar
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileComprobante(e.target.files?.[0] || null)}
                    className="w-full text-[10px] text-slate-400"
                  />
                  {fileComprobante && <p className="text-[10px] font-mono text-emerald-300 truncate">Seleccionado: {fileComprobante.name}</p>}
                </div>

                {/* Factura PDF */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Factura PDF (.pdf)
                    </span>
                    {fileFacturaPdf && (
                      <button type="button" onClick={() => setFileFacturaPdf(null)} className="text-rose-400 text-[10px] hover:underline">
                        Quitar
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFileFacturaPdf(e.target.files?.[0] || null)}
                    className="w-full text-[10px] text-slate-400"
                  />
                  {fileFacturaPdf && <p className="text-[10px] font-mono text-blue-300 truncate">Seleccionado: {fileFacturaPdf.name}</p>}
                </div>

                {/* Factura XML */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                      <FileCode className="w-3 h-3" /> Factura XML (.xml)
                    </span>
                    {fileFacturaXml && (
                      <button type="button" onClick={() => setFileFacturaXml(null)} className="text-rose-400 text-[10px] hover:underline">
                        Quitar
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={(e) => setFileFacturaXml(e.target.files?.[0] || null)}
                    className="w-full text-[10px] text-slate-400"
                  />
                  {fileFacturaXml && <p className="text-[10px] font-mono text-purple-300 truncate">Seleccionado: {fileFacturaXml.name}</p>}
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNuevoMovModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gold hover:bg-gold-light text-slate-950 font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CARGAR / SUSTITUIR ADJUNTO ESPECÍFICO ────────────────── */}
      {showAdjuntoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Cargar / Sustituir Archivo ({tipoAdjuntoUpload})</h3>
              <button type="button" onClick={() => setShowAdjuntoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadAdjunto} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Seleccionar nuevo archivo</label>
                <input
                  type="file"
                  required
                  accept={
                    tipoAdjuntoUpload === 'COMPROBANTE'
                      ? '.pdf,.jpg,.jpeg,.png'
                      : tipoAdjuntoUpload === 'FACTURA_PDF'
                      ? '.pdf'
                      : '.xml'
                  }
                  onChange={(e) => setNewAdjuntoFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowAdjuntoModal(false)} className="px-4 py-2 text-slate-400 font-bold">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gold text-slate-950 font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Subiendo...' : 'Subir Archivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: REVERSIÓN AUDITABLE ─────────────────────────────────── */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base">Revertir movimiento</h3>
              <button type="button" onClick={() => setShowReverseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReverseMovimiento} className="space-y-4 text-xs">
              <p className="text-slate-200 text-sm font-medium">
                Se generará un contramovimiento y se conservará la trazabilidad completa.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Motivo de la reversión</label>
                <textarea
                  required
                  minLength={5}
                  value={reverseReason}
                  onChange={(event) => setReverseReason(event.target.value)}
                  placeholder="Explica por qué debe revertirse este movimiento"
                  className="w-full min-h-24 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white resize-y"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Revirtiendo...' : 'Confirmar reversión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: VISOR XML ───────────────────────────────────────────── */}
      {xmlViewerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-purple-400 text-base flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                {xmlViewerData.title}
              </h3>
              <button type="button" onClick={() => setXmlViewerData(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="p-4 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-purple-300 overflow-x-auto max-h-96">
              {xmlViewerData.text}
            </pre>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setXmlViewerData(null)} className="px-4 py-2 bg-purple-500 text-white font-bold rounded-xl text-xs">
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
