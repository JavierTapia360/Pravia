import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Sparkles, Upload, Eye, Download, AlertTriangle, Cpu, X, Check, Edit3, 
  CheckCircle2, Loader2, Clock, AlertCircle, ArrowRight, RotateCcw, FileCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';

interface ProyectoVersion {
  id: string;
  version_numero: number;
  nombre_original: string;
  es_vigente: boolean;
  es_version_final: boolean;
  nota_version?: string;
  cargado_por_nombre: string;
  size_bytes?: number;
  created_at: string;
}

interface MatrizItem {
  campo: string;
  etiqueta: string;
  valor_detectado: string;
  fuente: string;
  confianza: string;
  estatus: string;
  obligatorio: boolean;
}

interface Props {
  expedienteId: string;
}

interface ActiveGenState {
  expedienteId: string;
  isGenerating: boolean;
  stageIndex: number;
  stageName: string;
  percent: number;
  startTime: number;
  completedVersion?: any;
  errorDetail?: string;
  isFinished: boolean;
}

const STAGES = [
  { id: 1, name: 'Preparando documentos del expediente...', targetPercent: 15 },
  { id: 2, name: 'Extrayendo información y matrices de datos...', targetPercent: 30 },
  { id: 3, name: 'Validando datos confirmados del proyecto...', targetPercent: 50 },
  { id: 4, name: 'Aplicando la plantilla persistente asignada al expediente...', targetPercent: 70 },
  { id: 5, name: 'Generando archivo DOCX inmutable V(n+1)...', targetPercent: 85 },
  { id: 6, name: 'Guardando nueva versión e inmutabilidad...', targetPercent: 95 },
  { id: 7, name: 'Generación completada exitosamente', targetPercent: 100 }
];

export const ProyectoEscrituraIA: React.FC<Props> = ({ expedienteId }) => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [versiones, setVersiones] = useState<ProyectoVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Matrix confirmation modal state
  const [showMatrixModal, setShowMatrixModal] = useState<boolean>(false);
  const [matrixData, setMatrixData] = useState<MatrizItem[]>([]);
  const [matrixLoading, setMatrixLoading] = useState<boolean>(false);
  const [uploadingManual, setUploadingManual] = useState<boolean>(false);

  // Persistent Generation Progress State
  const [showProgressModal, setShowProgressModal] = useState<boolean>(false);
  const [genProgress, setGenProgress] = useState<ActiveGenState>({
    expedienteId,
    isGenerating: false,
    stageIndex: 0,
    stageName: STAGES[0].name,
    percent: 0,
    startTime: Date.now(),
    isFinished: false
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Check localStorage for active generation job on mount/reload
  useEffect(() => {
    fetchProyectoData();
    const savedJob = localStorage.getItem(`pravia_gen_job_${expedienteId}`);
    if (savedJob) {
      try {
        const parsed: ActiveGenState = JSON.parse(savedJob);
        if (parsed.isGenerating || parsed.isFinished || parsed.errorDetail) {
          setGenProgress(parsed);
          setShowProgressModal(true);
        }
      } catch (e) {}
    }
  }, [expedienteId]);

  // Elapsed timer ticker
  useEffect(() => {
    if (genProgress.isGenerating && !genProgress.isFinished && !genProgress.errorDetail) {
      timerRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - genProgress.startTime) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [genProgress.isGenerating, genProgress.isFinished, genProgress.errorDetail, genProgress.startTime]);

  const saveGenStateToStorage = (state: ActiveGenState) => {
    localStorage.setItem(`pravia_gen_job_${expedienteId}`, JSON.stringify(state));
  };

  const clearGenStateFromStorage = () => {
    localStorage.removeItem(`pravia_gen_job_${expedienteId}`);
  };

  const fetchProyectoData = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/expedientes/${expedienteId}/proyecto`);
      const list: ProyectoVersion[] = [];
      if (data.vigente) list.push(data.vigente);
      if (data.historial && Array.isArray(data.historial)) {
        list.push(...data.historial.filter((h: any) => h.id !== data.vigente?.id));
      }
      setVersiones(list);
    } catch (e) {
      console.error('Error al cargar versiones del proyecto:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGenerarIA = async () => {
    setShowMatrixModal(true);
    setMatrixLoading(true);
    try {
      const data = await api.get(`/expedientes/${expedienteId}/proyecto/matriz-datos`);
      setMatrixData(data.matriz || []);
    } catch (e) {
      console.error('Error al cargar matriz de datos:', e);
    } finally {
      setMatrixLoading(false);
    }
  };

  const handleUpdateMatrixItem = (campo: string, nuevoValor: string, nuevoEstatus: string) => {
    setMatrixData(prev =>
      prev.map(item => item.campo === campo ? { ...item, valor_detectado: nuevoValor, estatus: nuevoEstatus } : item)
    );
  };

  // Main Transactional Generation Handler with Real Stages and Verification
  const handleConfirmarGeneracionIA = async () => {
    // 1. Lock Matrix Modal & Initialize Progress State
    setShowMatrixModal(false);
    const startT = Date.now();
    const initialProgress: ActiveGenState = {
      expedienteId,
      isGenerating: true,
      stageIndex: 0,
      stageName: STAGES[0].name,
      percent: 15,
      startTime: startT,
      isFinished: false
    };

    setGenProgress(initialProgress);
    setShowProgressModal(true);
    saveGenStateToStorage(initialProgress);

    // 2. Timeline Step Simulator while Backend Executes
    let currentStage = 0;
    const stageInterval = setInterval(() => {
      if (currentStage < STAGES.length - 2) {
        currentStage++;
        const updated: ActiveGenState = {
          ...initialProgress,
          stageIndex: currentStage,
          stageName: STAGES[currentStage].name,
          percent: STAGES[currentStage].targetPercent
        };
        setGenProgress(updated);
        saveGenStateToStorage(updated);
      }
    }, 800);

    try {
      // 3. Real Backend API Call
      const resData = await api.post(`/expedientes/${expedienteId}/proyecto/generar-ia`, { matriz_confirmada: matrixData });
      clearInterval(stageInterval);

      if (!resData.version && !resData.success) {
        const errorMsg = resData.error || resData.detail || 'Faltan datos obligatorios o la plantilla notarial presenta fallas.';
        const failedState: ActiveGenState = {
          expedienteId,
          isGenerating: false,
          stageIndex: currentStage,
          stageName: 'Falla en la generación del proyecto',
          percent: 0,
          startTime: startT,
          errorDetail: errorMsg,
          isFinished: false
        };
        setGenProgress(failedState);
        saveGenStateToStorage(failedState);
        return;
      }

      // 4. Verification of Version Payload
      const newVer = resData.version;
      if (!newVer || !newVer.id) {
        throw new Error('El backend no devolvió una versión verificable.');
      }

      // 5. Complete Progress & Reload Data
      const successState: ActiveGenState = {
        expedienteId,
        isGenerating: false,
        stageIndex: STAGES.length - 1,
        stageName: STAGES[STAGES.length - 1].name,
        percent: 100,
        startTime: startT,
        completedVersion: newVer,
        isFinished: true
      };

      setGenProgress(successState);
      saveGenStateToStorage(successState);
      await fetchProyectoData();

    } catch (err: any) {
      clearInterval(stageInterval);
      const errorMsg = err.message || 'Error de conexión o timeout al generar proyecto con IA';
      const failedState: ActiveGenState = {
        expedienteId,
        isGenerating: false,
        stageIndex: currentStage,
        stageName: 'Error de servidor durante la generación',
        percent: 0,
        startTime: startT,
        errorDetail: errorMsg,
        isFinished: false
      };
      setGenProgress(failedState);
      saveGenStateToStorage(failedState);
    }
  };

  const handleCloseProgressModal = () => {
    setShowProgressModal(false);
    clearGenStateFromStorage();
  };

  const handleUploadManualFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingManual(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nota_version', 'Carga manual realizada por el abogado');

    try {
      await api.upload(`/expedientes/${expedienteId}/proyecto/upload`, formData);
      await fetchProyectoData();
    } catch (err) {
      addToast('No fue posible conectar con el servidor.', 'error');
    } finally {
      setUploadingManual(false);
    }
  };

  const downloadVersion = async (version: ProyectoVersion | any) => {
    const blob = await api.blob(`/expedientes/${expedienteId}/proyecto/versions/${version.id}/descargar`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = version.nombre_original || `proyecto-v${version.version_numero || ''}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const missingRequired = matrixData.filter(m => m.obligatorio && (!m.valor_detectado || m.valor_detectado.includes('PENDIENTE') || m.estatus === 'PENDIENTE'));
  const nextVersionNum = versiones.length > 0 ? Math.max(...versiones.map(v => v.version_numero)) + 1 : 1;

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* BANNER PROMINENTE DE PROCESO ACTIVO (REQUERIMIENTO 7: PERSISTENTE TRAS F5) */}
      {(genProgress.isGenerating || genProgress.isFinished || genProgress.errorDetail) && !showProgressModal && (
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-xl transition-all ${
          genProgress.errorDetail 
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-200' 
            : genProgress.isFinished 
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' 
            : 'bg-gold/10 border-gold/40 text-gold'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              genProgress.errorDetail ? 'bg-rose-500/20 text-rose-300' : genProgress.isFinished ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gold/20 text-gold'
            }`}>
              {genProgress.isGenerating ? <Loader2 size={20} className="animate-spin" /> : genProgress.isFinished ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {genProgress.isGenerating ? '⚡ Generación de Proyecto en Proceso' : genProgress.isFinished ? '🎉 Proyecto Generado Exitosamente' : '❌ Falla en la Generación de Proyecto'}
                </span>
                <span className="text-[10px] font-mono opacity-80">
                  (Iniciada: {new Date(genProgress.startTime).toLocaleTimeString()})
                </span>
              </div>
              <p className="text-xs font-semibold mt-0.5 text-white">
                Etapa: {genProgress.stageName} {genProgress.isGenerating && `(${genProgress.percent}%)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowProgressModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-white/20 hover:border-gold text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Eye size={15} className="text-gold" />
            <span>Ver Estado / Resultado del Proceso</span>
          </button>
        </div>
      )}

      {/* CABECERA Y TRES ACCIONES DESTACADAS */}
      <div className="bg-dark-bg border border-dark-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-gold animate-pulse" />
              Proyecto de Escritura e Inteligencia Artificial
            </h4>
            <p className="text-xs text-muted">Generación asistida con plantilla notarial y control de versiones</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* BOTÓN 1: Cargar proyecto existente */}
            <label className="flex items-center gap-2 bg-dark-card hover:bg-dark-border border border-dark-border text-white text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm">
              <Upload size={16} className="text-muted" />
              {uploadingManual ? 'Cargando...' : '1. Cargar Proyecto Existente (.docx)'}
              <input type="file" accept=".docx" onChange={handleUploadManualFile} className="hidden" disabled={uploadingManual} />
            </label>

            {/* BOTÓN 2: Generar proyecto con IA (PROMINENTE Y VISIBLE) */}
            <button
              type="button"
              disabled={genProgress.isGenerating}
              onClick={handleOpenGenerarIA}
              className={`flex items-center gap-2.5 bg-gradient-to-r from-gold via-amber-400 to-gold hover:from-gold-light hover:to-gold text-dark-bg font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-gold/20 hover:scale-[1.02] active:scale-95 transition-all border border-gold/50 ${
                genProgress.isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Cpu size={18} />
              {genProgress.isGenerating ? `Generando proyecto V${nextVersionNum}...` : '2. ⚡ GENERAR PROYECTO CON IA'}
            </button>

            {/* BOTÓN 3: Analizar proyecto con IA */}
            <button
              type="button"
              onClick={async () => {
                await api.post(`/expedientes/${expedienteId}/proyecto/analizar-ia`, {});
                addToast('Reporte de observaciones jurídicas generado con éxito.', 'success');
              }}
              className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all"
            >
              <Sparkles size={16} />
              3. Analizar con IA (Reporte)
            </button>
          </div>
        </div>
      </div>

      {/* HISTORIAL DE VERSIONES DEL PROYECTO */}
      <div className="space-y-3">
        <h5 className="text-xs font-bold text-muted uppercase tracking-wider">Historial de Versiones del Proyecto</h5>

        {loading ? (
          <p className="text-xs text-muted text-center py-6">Cargando historial de versiones...</p>
        ) : versiones.length === 0 ? (
          <div className="text-center py-12 bg-dark-bg/40 border border-dark-border rounded-2xl">
            <FileText size={36} className="mx-auto text-muted mb-2" />
            <p className="text-sm font-semibold text-white">Sin proyectos de escritura generados</p>
            <p className="text-xs text-muted mt-1">Presiona "2. ⚡ GENERAR PROYECTO CON IA" para abrir la matriz de datos y construir el borrador.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versiones.map((v) => (
              <div
                key={v.id}
                className={`bg-dark-bg border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all ${
                  v.es_vigente ? 'border-gold shadow-lg shadow-gold/5' : 'border-dark-border'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gold bg-gold/10 px-2.5 py-0.5 rounded border border-gold/30 uppercase">
                      Versión {v.version_numero}
                    </span>
                    {v.es_vigente && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                        Vigente
                      </span>
                    )}
                    <span className="text-sm font-bold text-white">{v.nombre_original}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {v.nota_version || 'Sin nota de versión'} • Por: <strong className="text-white">{v.cargado_por_nombre}</strong> • {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/expedientes/${expedienteId}/proyecto/${v.id}`)}
                    className="flex items-center gap-1.5 bg-dark-card hover:bg-dark-border text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-dark-border transition-all"
                  >
                    <Eye size={15} className="text-gold" />
                    Visualizar en PRAVIA OS
                  </button>

                  <button
                    type="button"
                    onClick={() => void downloadVersion(v)}
                    className="flex items-center gap-1.5 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-semibold px-3.5 py-2 rounded-xl border border-gold/30 transition-all"
                  >
                    <Download size={15} />
                    Descargar .docx
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: PANTALLA "DATOS DETECTADOS PARA EL PROYECTO" (MATRIZ) */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-70 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-bg/60">
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="text-gold" size={22} />
                  Datos Detectados para el Proyecto (Confirmación Humana Previa)
                </h4>
                <p className="text-xs text-muted">Fuentes documentales reales vinculadas al Expediente 0005-2026</p>
              </div>
              <button type="button" onClick={() => setShowMatrixModal(false)} className="text-muted hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {matrixLoading ? (
                <p className="text-center text-sm text-muted py-12">Analizando documentos activos del expediente...</p>
              ) : (
                <div className="space-y-4">
                  {missingRequired.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                      <AlertTriangle className="text-amber-400 flex-shrink-0" size={22} />
                      <p className="text-xs text-amber-200 font-semibold leading-relaxed">
                        Se requieren confirmar los campos marcados como <strong>[PENDIENTE DE CONFIRMAR]</strong>. Ingresa el valor correspondiente en la casilla editable para habilitar la generación.
                      </p>
                    </div>
                  )}

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-dark-border text-muted uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3">Campo Requerido</th>
                        <th className="py-3 px-3">Valor Detectado / Editar</th>
                        <th className="py-3 px-3">Documento Fuente Real</th>
                        <th className="py-3 px-3">Confianza</th>
                        <th className="py-3 px-3 text-right">Estatus / Confirmación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/40">
                      {matrixData.map((item) => {
                        const isPending = !item.valor_detectado || item.valor_detectado.includes('PENDIENTE') || item.estatus === 'PENDIENTE';
                        return (
                          <tr key={item.campo} className="hover:bg-dark-bg/50">
                            <td className="py-3 px-3 font-bold text-white">
                              {item.etiqueta}
                              {item.obligatorio && <span className="text-rose-400 ml-1">*</span>}
                            </td>
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={item.valor_detectado}
                                onChange={(e) => handleUpdateMatrixItem(item.campo, e.target.value, e.target.value.includes('PENDIENTE') ? 'PENDIENTE' : 'CONFIRMADO')}
                                className={`border rounded-lg px-3 py-1.5 text-xs w-full focus:outline-none transition-colors ${
                                  isPending
                                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 focus:border-rose-400'
                                    : 'bg-dark-bg border-dark-border text-white focus:border-gold'
                                }`}
                              />
                            </td>
                            <td className="py-3 px-3 text-muted">{item.fuente}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                item.confianza === 'Alta' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {item.confianza}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleUpdateMatrixItem(item.campo, item.valor_detectado, item.estatus === 'CONFIRMADO' ? 'PENDIENTE' : 'CONFIRMADO')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  !isPending && item.estatus === 'CONFIRMADO'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {!isPending && item.estatus === 'CONFIRMADO' ? '✓ Confirmado' : '⚡ Pendiente'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-dark-border flex justify-end gap-3 bg-dark-bg/60">
              <button type="button" onClick={() => setShowMatrixModal(false)} className="px-4 py-2 text-xs font-semibold text-muted hover:text-white">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarGeneracionIA}
                disabled={missingRequired.length > 0}
                className="bg-gold hover:bg-gold-light text-dark-bg font-extrabold text-xs px-5 py-2.5 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-gold/10"
              >
                <Sparkles size={16} />
                Confirmar y Generar Proyecto con IA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ESTADO REAL Y PROGRESO PERSISTENTE DE GENERACIÓN CON IA (REQUERIMIENTO 1, 2, 3, 5, 6) */}
      {showProgressModal && (
        <div className="fixed inset-0 z-80 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-950 border border-gold/40 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative space-y-6 p-6">
            
            {/* CABECERA CON TIMER DE TIEMPO TRANSCURRIDO */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-md ${
                  genProgress.errorDetail 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                    : genProgress.isFinished 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-gold/10 text-gold border border-gold/30'
                }`}>
                  {genProgress.isGenerating ? (
                    <Loader2 size={24} className="animate-spin text-gold" />
                  ) : genProgress.isFinished ? (
                    <CheckCircle2 size={26} className="text-emerald-400" />
                  ) : (
                    <AlertCircle size={26} className="text-rose-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>
                      {genProgress.isGenerating ? `Generando Proyecto V${nextVersionNum} con IA...` : genProgress.isFinished ? '🎉 Proyecto Generado Exitosamente' : '❌ Falla en la Generación de Proyecto'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Motor Notarial PRAVIA OS • Generación Inmutable</p>
                </div>
              </div>

              {/* TIMER REQUERIDO */}
              <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-mono text-gold shadow-inner">
                <Clock size={14} />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>

            {/* VISTA 1: PROCESANDO CON TIMELINE Y BARRA DE PROGRESO */}
            {genProgress.isGenerating && (
              <div className="space-y-6 py-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white uppercase tracking-wider">{genProgress.stageName}</span>
                    <span className="font-extrabold font-mono text-gold text-sm">{genProgress.percent}%</span>
                  </div>

                  {/* BARRA DE PROGRESO DE ALTA ESTÉTICA */}
                  <div className="w-full bg-slate-900 border border-white/10 rounded-full h-3.5 overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-amber-500 via-gold to-yellow-300 h-full rounded-full transition-all duration-500 shadow-md shadow-gold/30"
                      style={{ width: `${genProgress.percent}%` }}
                    />
                  </div>
                </div>

                {/* TIMELINE DE ETAPAS DEL PROCESO */}
                <div className="space-y-2 bg-slate-900/80 border border-white/5 rounded-2xl p-4 max-h-56 overflow-y-auto">
                  {STAGES.map((stg, idx) => {
                    const isCompleted = genProgress.percent > stg.targetPercent || genProgress.isFinished;
                    const isCurrent = genProgress.stageIndex === idx && !isCompleted;
                    return (
                      <div key={stg.id} className="flex items-center gap-3 text-xs py-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isCurrent ? 'bg-gold/20 text-gold' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isCompleted ? <Check size={12} /> : isCurrent ? <Loader2 size={12} className="animate-spin" /> : stg.id}
                        </div>
                        <span className={`font-semibold ${isCompleted ? 'text-slate-300' : isCurrent ? 'text-gold font-bold' : 'text-slate-500'}`}>
                          {stg.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VISTA 2: FALLA O ERROR DETALLADO (REQUERIMIENTO 5) */}
            {genProgress.errorDetail && (
              <div className="space-y-4 py-2">
                <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-5 space-y-2">
                  <h5 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <AlertTriangle size={18} /> Error en la Generación del Proyecto con IA
                  </h5>
                  <p className="text-xs text-rose-200 font-semibold leading-relaxed">
                    {genProgress.errorDetail}
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseProgressModal}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    Cerrar y Revisar Expediente
                  </button>
                </div>
              </div>
            )}

            {/* VISTA 3: FINALIZACIÓN EXITOSA CON ACCIONES DIRECTAS (REQUERIMIENTO 6) */}
            {genProgress.isFinished && genProgress.completedVersion && (
              <div className="space-y-6 py-2">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                      Versión Creada: V{genProgress.completedVersion.version_numero}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {(genProgress.completedVersion.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  <h5 className="text-base font-bold text-white">
                    {genProgress.completedVersion.nombre_original}
                  </h5>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    El borrador fue construido con la plantilla versionada asignada al expediente y los valores confirmados en la matriz de datos. Requiere revisión profesional antes de marcarlo como final.
                  </p>
                </div>

                {/* BOTONES DE ACCIÓN EXPORTABLES REQUERIDOS EN REQUERIMIENTO 6 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseProgressModal();
                      navigate(`/expedientes/${expedienteId}/proyecto/${genProgress.completedVersion.id}`);
                    }}
                    className="py-3 px-4 rounded-xl bg-gold hover:bg-gold-light text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
                  >
                    <Eye size={16} />
                    <span>Visualizar Proyecto en PRAVIA OS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void downloadVersion(genProgress.completedVersion);
                      handleCloseProgressModal();
                    }}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-white/20"
                  >
                    <Download size={16} className="text-emerald-400" />
                    <span>Descargar Archivo .docx</span>
                  </button>
                </div>

                <div className="flex justify-end border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseProgressModal}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white font-bold text-xs"
                  >
                    Volver al Expediente
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
