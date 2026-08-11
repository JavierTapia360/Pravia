import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, FileCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useExpedienteStore } from '../../stores/expedienteStore';
import { useToastStore } from '../../stores/toastStore';
import { api } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpedienteConvertModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { convertCotizacionToExpediente } = useExpedienteStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [selectedCotizacionId, setSelectedCotizacionId] = useState('');
  const [showDiagnosticTab, setShowDiagnosticTab] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCotizaciones();
    }
  }, [isOpen]);

  const loadCotizaciones = async () => {
    try {
      // Fetch all cotizaciones to render diagnostic status
      const res = await api.get('/cotizaciones');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setCotizaciones(list);
    } catch (e) {
      setCotizaciones([]);
    }
  };

  if (!isOpen) return null;

  // Classify cotizaciones: Eligible vs Diagnostic Non-Eligible
  const getEligibility = (cot: any) => {
    if (cot.expediente || cot.estado === 'CONVERTIDA_EXPEDIENTE') {
      return { eligible: false, reason: 'Ya fue convertida previamente a un expediente' };
    }
    if (cot.estado === 'CANCELADA' || cot.estado === 'RECHAZADA') {
      return { eligible: false, reason: 'La cotización está cancelada o rechazada' };
    }
    if (cot.estado !== 'ACEPTADA') {
      return { eligible: false, reason: `Falta aceptación por el cliente (Estado actual: ${cot.estado})` };
    }
    const hasApprovedVersion = cot.versiones && cot.versiones.some((v: any) => v.aprobada === true);
    if (!hasApprovedVersion) {
      return { eligible: false, reason: 'No tiene una versión del presupuesto marcada como aprobada' };
    }
    return { eligible: true, reason: 'Elegible para conversión' };
  };

  const eligibleCotizaciones = cotizaciones.filter(c => getEligibility(c).eligible);
  const nonEligibleCotizaciones = cotizaciones.filter(c => !getEligibility(c).eligible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCotizacionId) {
      addToast('Selecciona una cotización aceptada', 'error');
      return;
    }

    setLoading(true);
    try {
      await convertCotizacionToExpediente({
        cotizacion_id: selectedCotizacionId,
        abogado_id: '3448a30a-fb2b-47e0-bdf1-30ef1dcfbc15'
      });
      addToast('Cotización convertida a expediente exitosamente en PRAVIA OS', 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Error al convertir cotización', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Convertir Cotización a Expediente</h3>
              <p className="text-xs text-slate-400">Traspaso autorizado de presupuestos aceptados hacia PRAVIA OS</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab selector between Eligible vs Diagnostic list */}
        <div className="flex items-center border-b border-white/10 px-6 bg-slate-950/30 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setShowDiagnosticTab(false)}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              !showDiagnosticTab ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 size={15} />
            Elegibles para Conversión ({eligibleCotizaciones.length})
          </button>
          <button
            type="button"
            onClick={() => setShowDiagnosticTab(true)}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              showDiagnosticTab ? 'border-gold text-gold font-bold' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <AlertCircle size={15} />
            Diagnóstico / No Elegibles ({nonEligibleCotizaciones.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {!showDiagnosticTab ? (
            <div>
              {eligibleCotizaciones.length === 0 ? (
                <div className="bg-slate-950/60 border border-white/10 rounded-xl p-8 text-center space-y-2">
                  <FileCheck size={32} className="mx-auto text-slate-500" />
                  <p className="text-sm font-semibold text-white">No hay cotizaciones pendientes de conversión</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Revisa la pestaña <strong>"Diagnóstico / No Elegibles"</strong> para conocer las causas por las cuales las cotizaciones existentes no han sido autorizadas para conversión.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {eligibleCotizaciones.map((cot) => (
                    <label
                      key={cot.id}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedCotizacionId === cot.id
                          ? 'bg-gold/10 border-gold text-white shadow-md'
                          : 'bg-slate-950/60 border-white/10 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <input
                          type="radio"
                          name="cotizacion"
                          value={cot.id}
                          checked={selectedCotizacionId === cot.id}
                          onChange={() => setSelectedCotizacionId(cot.id)}
                          className="text-gold focus:ring-gold"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-mono">
                              {cot.numero_cotizacion || cot.numero_solicitud || 'Cotización'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              ACEPTADA
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Cliente: <strong className="text-slate-200">{cot.prospecto?.nombre || 'Prospecto'}</strong> • Acto: {cot.prospecto?.tipo_acto || 'No especificado'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-gold">
                          ${Number(cot.total_cliente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[10px] text-slate-400">Total Cliente</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Diagnostic tab listing non-eligible quotes with concrete error causes */
            <div className="space-y-2.5">
              {nonEligibleCotizaciones.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay cotizaciones registradas en diagnóstico.</p>
              ) : (
                nonEligibleCotizaciones.map((cot) => {
                  const diag = getEligibility(cot);
                  return (
                    <div key={cot.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {cot.numero_cotizacion || cot.numero_solicitud || 'Cotización'} — {cot.prospecto?.nombre || 'Cliente'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                          {cot.estado}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-1">
                        <XCircle size={14} className="shrink-0" />
                        <span>Causa de Inelegibilidad: {diag.reason}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCotizacionId || showDiagnosticTab}
              className="bg-gold hover:bg-gold-light text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Converting...' : 'Confirmar Conversión a Expediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
