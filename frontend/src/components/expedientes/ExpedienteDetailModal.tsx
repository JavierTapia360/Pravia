import React, { useState } from 'react';
import { 
  X, Folder, Clock, CheckCircle2, DollarSign, Users, FileText, 
  History, Plus, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, Archive, Sparkles
} from 'lucide-react';
import { useExpedienteStore } from '../../stores/expedienteStore';
import { useToastStore } from '../../stores/toastStore';
import { ProyectoEscrituraIA } from './ProyectoEscrituraIA';
import { ProyectoDocumentViewerEditor } from './ProyectoDocumentViewerEditor';
import { ExpedienteFinanzasTab } from './ExpedienteFinanzasTab';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpedienteDetailModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { selectedExpediente, transitionEstatus, addMovimientoFinanciero, reverseMovimientoFinanciero, archiveExpediente } = useExpedienteStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'etapas' | 'comparecientes' | 'documentos' | 'proyecto' | 'finanzas' | 'actividad' | 'tareas'>('etapas');
  const [expDocOriginFilter, setExpDocOriginFilter] = useState<'TODOS' | 'PROSPECTO' | 'COTIZACION' | 'EXPEDIENTE'>('TODOS');
  const [viewerVersionId, setViewerVersionId] = useState<string | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [targetEstatus, setTargetEstatus] = useState('');

  // Form para nuevo movimiento financiero
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [movForm, setMovForm] = useState({
    tipo_movimiento: 'ANTICIPO',
    naturaleza: 'INGRESO',
    concepto: '',
    monto: '',
    referencia: ''
  });

  // Form para reverso financiero
  const [showReversoModal, setShowReversoModal] = useState(false);
  const [selectedMovId, setSelectedMovId] = useState('');
  const [motivoReversion, setMotivoReversion] = useState('');

  if (!isOpen || !selectedExpediente) return null;

  const exp = selectedExpediente;

  // Manejo de Transición de Estado con Control de Concurrencia
  const handleExecuteTransition = async () => {
    if (!targetEstatus) return;
    try {
      await transitionEstatus(exp.id, exp.version, targetEstatus, transitionNotes);
      addToast(`Estatus actualizado a ${targetEstatus}`, 'success');
      setShowTransitionModal(false);
      setTransitionNotes('');
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes('409') || err.message?.includes('version')) {
        addToast('Conflicto de Concurrencia: El expediente fue modificado por otro usuario. Se actualizaron los datos.', 'warning');
      } else {
        addToast(err.message || 'Error al ejecutar transición', 'error');
      }
    }
  };

  // Agregar Movimiento Financiero
  const handleAddMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movForm.concepto || !movForm.monto) {
      addToast('Ingresa concepto y monto', 'error');
      return;
    }

    try {
      await addMovimientoFinanciero(exp.id, {
        ...movForm,
        monto: Number(movForm.monto)
      });
      addToast('Movimiento financiero registrado exitosamente', 'success');
      setShowMovimientoModal(false);
      setMovForm({ tipo_movimiento: 'ANTICIPO', naturaleza: 'INGRESO', concepto: '', monto: '', referencia: '' });
    } catch (err: any) {
      addToast(err.message || 'Error al registrar movimiento', 'error');
    }
  };

  // Revertir Movimiento Financiero
  const handleExecuteReverso = async () => {
    if (!motivoReversion) {
      addToast('Ingresa el motivo del reverso', 'error');
      return;
    }

    try {
      await reverseMovimientoFinanciero(exp.id, selectedMovId, motivoReversion);
      addToast('Movimiento revertido exitosamente', 'success');
      setShowReversoModal(false);
      setMotivoReversion('');
    } catch (err: any) {
      addToast(err.message || 'Error al revertir movimiento', 'error');
    }
  };

  // Archivar Expediente
  const handleArchive = async () => {
    if (!confirm('¿Confirmas que deseas archivar este expediente?')) return;
    try {
      await archiveExpediente(exp.id, 'Archivado manualmente por el usuario');
      addToast('Expediente archivado', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Error al archivar', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-5xl my-auto overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-fade-in">
        
        {/* TOP HEADER */}
        <div className="bg-dark-bg/90 border-b border-dark-border px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold font-bold">
              <Folder size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                  {exp.numero_pravia}
                </span>
                <span className="text-xs font-mono text-muted">v{exp.version}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  exp.estatus === 'ENTREGADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  exp.estatus === 'FIRMA_PROGRAMADA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-gold/10 text-gold border-gold/20'
                }`}>
                  {exp.estatus}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{exp.cliente_alias}</h2>
              <p className="text-xs text-muted">
                {exp.tipo_acto?.nombre || 'Compraventa'} • Abogado: {exp.abogado ? `${exp.abogado.nombre} ${exp.abogado.apellido}` : 'Asignado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              title="Archivar Expediente"
              className="p-2 rounded-lg bg-dark-bg hover:bg-rose-500/10 border border-dark-border text-muted hover:text-rose-400 transition-colors"
            >
              <Archive size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-dark-bg hover:bg-dark-border border border-dark-border text-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* METRICS & AVANCE BAR */}
        <div className="bg-dark-bg/40 border-b border-dark-border px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-dark-card/60 border border-dark-border rounded-xl p-2.5">
            <p className="text-[10px] text-muted uppercase font-medium">Avance General</p>
            <p className="text-lg font-extrabold text-gold">{exp.avance_general}%</p>
          </div>
          <div className="bg-dark-card/60 border border-dark-border rounded-xl p-2.5">
            <p className="text-[10px] text-muted uppercase font-medium">Avance Operativo</p>
            <p className="text-lg font-bold text-blue-400">{exp.avance_operativo}%</p>
          </div>
          <div className="bg-dark-card/60 border border-dark-border rounded-xl p-2.5">
            <p className="text-[10px] text-muted uppercase font-medium">Avance Documental</p>
            <p className="text-lg font-bold text-emerald-400">{exp.avance_documental}%</p>
          </div>
          <div className="bg-dark-card/60 border border-dark-border rounded-xl p-2.5">
            <p className="text-[10px] text-muted uppercase font-medium">Avance Financiero</p>
            <p className="text-lg font-bold text-amber-400">{exp.avance_financiero}%</p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center border-b border-dark-border px-6 overflow-x-auto bg-dark-card">
          <button
            onClick={() => setActiveTab('etapas')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'etapas' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <Clock size={16} />
            Flujo de Etapas ({exp.etapas?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('comparecientes')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'comparecientes' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <Users size={16} />
            Comparecientes ({exp.comparecientes?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('documentos')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'documentos' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <FileText size={16} />
            Requisitos ({exp.requisitos_docs?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('proyecto')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'proyecto' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <Sparkles size={16} />
            Proyecto de Escritura e IA
          </button>

          <button
            onClick={() => setActiveTab('finanzas')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'finanzas' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <DollarSign size={16} />
            Movimientos ({exp.movimientosFinancieros?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('actividad')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'actividad' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <History size={16} />
            Actividades
          </button>
        </div>

        {/* TAB CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: FLUJO DE ETAPAS */}
          {activeTab === 'etapas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white">Línea de Vida Operativa del Expediente</h4>
                  <p className="text-xs text-muted">Secuencia y tiempos estandarizados por Tipo de Acto</p>
                </div>
                <button
                  onClick={() => {
                    setTargetEstatus('EN_PROCESO');
                    setShowTransitionModal(true);
                  }}
                  className="flex items-center gap-2 bg-gold hover:bg-gold-light text-dark-bg text-xs font-bold px-3 py-2 rounded-lg transition-all"
                >
                  <ArrowRight size={14} />
                  Avanzar Estatus
                </button>
              </div>

              <div className="space-y-3">
                {exp.etapas && exp.etapas.length > 0 ? (
                  exp.etapas.map((etapa, index) => {
                    const isCurrent = exp.expediente_etapa_actual_id === etapa.id;
                    return (
                      <div
                        key={etapa.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          etapa.completada
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-white'
                            : isCurrent
                            ? 'bg-gold/10 border-gold shadow-lg shadow-gold/5'
                            : 'bg-dark-bg/60 border-dark-border text-muted'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            etapa.completada ? 'bg-emerald-500 text-dark-bg' :
                            isCurrent ? 'bg-gold text-dark-bg animate-pulse' : 'bg-dark-border text-muted'
                          }`}>
                            {etapa.completada ? <CheckCircle2 size={16} /> : index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                              {etapa.nombre_snapshot}
                              {isCurrent && (
                                <span className="text-[10px] bg-gold text-dark-bg px-2 py-0.5 rounded-full font-bold uppercase">
                                  Etapa Actual
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted mt-0.5">
                              Duración estimada: {etapa.duracion_esperada_snapshot || 3} días | Inicio: {new Date(etapa.fecha_inicio).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                            etapa.completada ? 'text-emerald-400 bg-emerald-500/10' :
                            isCurrent ? 'text-gold bg-gold/10' : 'text-muted bg-dark-bg'
                          }`}>
                            {etapa.completada ? 'COMPLETADA' : isCurrent ? 'EN EJECUCIÓN' : 'PENDIENTE'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted text-center py-6">No hay etapas registradas aún.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COMPARECIENTES */}
          {activeTab === 'comparecientes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white">Comparecientes e Intervinientes</h4>
                  <p className="text-xs text-muted">Vínculos reutilizables hacia el maestro de personas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exp.comparecientes && exp.comparecientes.length > 0 ? (
                  exp.comparecientes.map((c) => (
                    <div key={c.id} className="bg-dark-bg border border-dark-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gold uppercase px-2 py-0.5 bg-gold/10 rounded border border-gold/20">
                          {c.rol_juridico}
                        </span>
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <ShieldCheck size={14} /> Datos Validados
                        </span>
                      </div>
                      <h5 className="text-base font-bold text-white">
                        {c.compareciente.razon_social || `${c.compareciente.nombre} ${c.compareciente.apellido_paterno || ''}`}
                      </h5>
                      <p className="text-xs text-muted">
                        RFC: {c.compareciente.rfc || 'No registrado'} | CURP: {c.compareciente.curp || 'N/A'}
                      </p>
                      {c.porcentaje_participacion && (
                        <p className="text-xs text-gold font-medium">Participación: {c.porcentaje_participacion}%</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 bg-dark-bg/40 border border-dark-border rounded-xl">
                    <Users size={32} className="mx-auto text-muted mb-2" />
                    <p className="text-sm text-muted">Sin comparecientes vinculados a este expediente.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTOS (Archivo Documental con Filtros por Origen) */}
          {activeTab === 'documentos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-base font-bold text-white">Archivo Documental y Trazabilidad</h4>
                  <p className="text-xs text-muted">Documentos heredados por vínculo: Prospecto → Cotización → Expediente</p>
                </div>

                {/* Filtros por Origen */}
                <div className="flex bg-dark-bg p-1 rounded-lg border border-dark-border text-xs">
                  <button
                    type="button"
                    onClick={() => setExpDocOriginFilter('TODOS')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      expDocOriginFilter === 'TODOS' ? 'bg-gold text-dark-bg' : 'text-muted hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpDocOriginFilter('PROSPECTO')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      expDocOriginFilter === 'PROSPECTO' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-muted hover:text-white'
                    }`}
                  >
                    Prospecto
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpDocOriginFilter('COTIZACION')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      expDocOriginFilter === 'COTIZACION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-muted hover:text-white'
                    }`}
                  >
                    Cotización
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpDocOriginFilter('EXPEDIENTE')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      expDocOriginFilter === 'EXPEDIENTE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-muted hover:text-white'
                    }`}
                  >
                    Expediente
                  </button>
                </div>
              </div>

              {/* Lista de Documentos Vinculados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(() => {
                  const docsList = exp.expedienteDocumentos && exp.expedienteDocumentos.length > 0 
                    ? exp.expedienteDocumentos.map((ed: any) => ({
                        id: ed.documento?.id || ed.id,
                        nombre: ed.documento?.nombre_original || 'Documento',
                        carpeta: ed.tipo_vinculo || ed.documento?.categoria || 'Administrativo',
                        origen: ed.documento?.prospecto_id ? 'Prospecto' : ed.documento?.cotizacion_id ? 'Cotización' : 'Expediente',
                        origenKey: ed.documento?.prospecto_id ? 'PROSPECTO' : ed.documento?.cotizacion_id ? 'COTIZACION' : 'EXPEDIENTE',
                        fecha: ed.fecha_vinculo || ed.documento?.fecha_carga,
                        url: ed.documento?.storage_key
                      }))
                    : ((exp as any).documentos || []).map((d: any) => ({
                        id: d.id,
                        nombre: d.nombre_original || 'Documento',
                        carpeta: d.categoria || 'Administrativo',
                        origen: d.prospecto_id ? 'Prospecto' : d.cotizacion_id ? 'Cotización' : 'Expediente',
                        origenKey: d.prospecto_id ? 'PROSPECTO' : d.cotizacion_id ? 'COTIZACION' : 'EXPEDIENTE',
                        fecha: d.fecha_carga,
                        url: d.storage_key
                      }));

                  const filteredDocs = docsList.filter((d: any) => {
                    if (expDocOriginFilter === 'PROSPECTO') return d.origenKey === 'PROSPECTO';
                    if (expDocOriginFilter === 'COTIZACION') return d.origenKey === 'COTIZACION';
                    if (expDocOriginFilter === 'EXPEDIENTE') return d.origenKey === 'EXPEDIENTE';
                    return true;
                  });

                  if (filteredDocs.length === 0) {
                    return (
                      <div className="col-span-2 text-center py-8 bg-dark-bg/40 border border-dark-border rounded-xl">
                        <FileText size={32} className="mx-auto text-muted mb-2" />
                        <p className="text-sm text-muted">Sin documentos registrados para este filtro.</p>
                      </div>
                    );
                  }

                  return filteredDocs.map((doc: any) => (
                    <div key={doc.id} className="bg-dark-bg border border-dark-border rounded-xl p-4 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-gold flex-shrink-0" />
                            <span className="text-sm font-bold text-white break-all">{doc.nombre}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase flex-shrink-0 ${
                            doc.origenKey === 'PROSPECTO' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
                            doc.origenKey === 'COTIZACION' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            Origen: {doc.origen}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-2 space-y-0.5">
                          <p>Carpeta: <strong className="text-white">{doc.carpeta}</strong></p>
                          <p>Fecha: {doc.fecha ? new Date(doc.fecha).toLocaleDateString() : '—'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-dark-border">
                        <a
                          href={`/api/expedientes/${exp.id}/documentos/${doc.id}/visualizar`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center py-1 px-2 bg-dark-border/50 hover:bg-dark-border text-white text-xs font-semibold rounded-lg transition-all"
                        >
                          Visualizar
                        </a>
                        <a
                          href={`/api/expedientes/${exp.id}/documentos/${doc.id}/descargar`}
                          download
                          className="flex-1 text-center py-1 px-2 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-semibold rounded-lg transition-all"
                        >
                          Descargar
                        </a>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Checklist adicional de requisitos */}
              {exp.requisitos_docs && exp.requisitos_docs.length > 0 && (
                <div className="pt-4 border-t border-dark-border space-y-2">
                  <h5 className="text-xs font-bold text-muted uppercase">Checklist de Requisitos</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {exp.requisitos_docs.map((req) => (
                      <div key={req.id} className="bg-dark-bg/60 border border-dark-border rounded-lg p-2.5 flex items-center justify-between">
                        <span className="text-xs text-white font-medium">{req.nombre}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          req.estatus === 'VALIDADO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {req.estatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROYECTO DE ESCRITURA E IA */}
          {activeTab === 'proyecto' && (
            <ProyectoEscrituraIA expedienteId={exp.id} />
          )}

          {/* TAB 5: FINANZAS */}
          {activeTab === 'finanzas' && (
            <ExpedienteFinanzasTab expedienteId={exp.id} />
          )}

          {/* TAB 5: ACTIVIDAD */}
          {activeTab === 'actividad' && (
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white">Historial de Auditoría y Cambios Operativos</h4>
              {exp.actividades && exp.actividades.length > 0 ? (
                exp.actividades.map((act) => (
                  <div key={act.id} className="bg-dark-bg border border-dark-border rounded-xl p-3 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold mt-2" />
                    <div>
                      <p className="text-sm font-bold text-white">{act.titulo}</p>
                      <p className="text-xs text-muted">{act.descripcion}</p>
                      <span className="text-[10px] text-muted mt-1 block">
                        Por: {act.usuario ? `${act.usuario.nombre} ${act.usuario.apellido}` : 'Sistema'} • {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted text-center py-6">Sin registros de actividad.</p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL SECUNDARIO: TRANSICIÓN ESTATUS */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-lg font-bold text-white">Ejecutar Transición de Estatus</h4>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">Nuevo Estatus</label>
              <select
                value={targetEstatus}
                onChange={(e) => setTargetEstatus(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gold"
              >
                <option value="EN_INTEGRACION">EN INTEGRACIÓN</option>
                <option value="EN_PROCESO">EN PROCESO</option>
                <option value="PENDIENTE_NOTARIA">PENDIENTE NOTARÍA</option>
                <option value="FIRMA_PROGRAMADA">FIRMA PROGRAMADA</option>
                <option value="FIRMADO">FIRMADO</option>
                <option value="POST_FIRMA">POST FIRMA</option>
                <option value="ENTREGADO">ENTREGADO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">Notas / Justificación</label>
              <textarea
                rows={3}
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Ingresa notas o motivo de la transición..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowTransitionModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">
                Cancelar
              </button>
              <button onClick={handleExecuteTransition} className="bg-gold text-dark-bg font-bold text-sm px-4 py-2 rounded-xl">
                Confirmar Transición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SECUNDARIO: REGISTRO MOVIMIENTO */}
      {showMovimientoModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <form onSubmit={handleAddMovimiento} className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-lg font-bold text-white">Registrar Movimiento Financiero</h4>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-1">Concepto *</label>
              <input
                type="text"
                value={movForm.concepto}
                onChange={(e) => setMovForm({ ...movForm, concepto: e.target.value })}
                placeholder="Ej. Anticipo de honorarios 50%"
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Monto ($) *</label>
                <input
                  type="number"
                  value={movForm.monto}
                  onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Naturaleza</label>
                <select
                  value={movForm.naturaleza}
                  onChange={(e) => setMovForm({ ...movForm, naturaleza: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-gold"
                >
                  <option value="INGRESO">INGRESO (+)</option>
                  <option value="EGRESO">EGRESO (-)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowMovimientoModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">
                Cancelar
              </button>
              <button type="submit" className="bg-emerald-500 text-dark-bg font-bold text-sm px-4 py-2 rounded-xl">
                Guardar Movimiento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SECUNDARIO: REVERSO FINANCIERO */}
      {showReversoModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-lg font-bold text-white">Revertir Movimiento Financiero</h4>
            <p className="text-xs text-muted">Se generará un movimiento de compensación inmutable.</p>
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">Motivo de Reverso *</label>
              <textarea
                rows={3}
                value={motivoReversion}
                onChange={(e) => setMotivoReversion(e.target.value)}
                placeholder="Ingresa la razón del reverso..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowReversoModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">
                Cancelar
              </button>
              <button onClick={handleExecuteReverso} className="bg-rose-500 text-white font-bold text-sm px-4 py-2 rounded-xl">
                Ejecutar Reverso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISOR Y EDITOR DE DOCUMENTO .DOCX INTEGRADO EN PRAVIA OS */}
      {viewerVersionId && (
        <ProyectoDocumentViewerEditor
          expedienteId={exp.id}
          versionId={viewerVersionId}
          onClose={() => setViewerVersionId(null)}
        />
      )}
    </div>
  );
};
