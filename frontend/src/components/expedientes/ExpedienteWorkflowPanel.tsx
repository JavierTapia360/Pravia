import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  CircleCheck,
  FileEdit,
  Landmark,
  Loader2,
  PackageCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  expediente: any;
  actorUserId: string;
  onUpdated: () => Promise<void>;
}

const PHASES = [
  { label: 'Proyecto', icon: FileEdit, statuses: ['ABIERTO', 'EN_INTEGRACION', 'EN_PROCESO', 'PENDIENTE_CLIENTE', 'PENDIENTE_NOTARIA'] },
  { label: 'Firma', icon: CalendarCheck, statuses: ['FIRMA_PROGRAMADA', 'FIRMADO'] },
  { label: 'Postfirma', icon: Landmark, statuses: ['POST_FIRMA'] },
  { label: 'Entrega', icon: PackageCheck, statuses: ['LISTO_ENTREGA', 'ENTREGADO'] },
];

const phaseIndexFor = (status: string) => PHASES.findIndex((phase) => phase.statuses.includes(status));

export function ExpedienteWorkflowPanel({ expediente, actorUserId, onUpdated }: Props) {
  const { addToast } = useToastStore();
  const transitions = expediente.workflow?.transitions || [];
  const [targetStatus, setTargetStatus] = useState(transitions[0]?.status || '');
  const [notes, setNotes] = useState('');
  const [signatureDate, setSignatureDate] = useState('');
  const [signaturePlace, setSignaturePlace] = useState('');
  const [authorizePendingBalance, setAuthorizePendingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTargetStatus(transitions[0]?.status || '');
    setNotes('');
    setSignatureDate('');
    setSignaturePlace('');
    setAuthorizePendingBalance(false);
  }, [expediente.id, expediente.version]);

  const selectedTransition = useMemo(
    () => transitions.find((transition: any) => transition.status === targetStatus),
    [targetStatus, transitions],
  );
  const currentPhase = phaseIndexFor(expediente.estatus);
  const isFinal = expediente.estatus === 'ENTREGADO' || expediente.estatus === 'CANCELADO';
  const isExceptional = expediente.estatus === 'SUSPENDIDO' || expediente.estatus === 'CANCELADO';

  const execute = async (payload: Record<string, unknown>, successMessage: string) => {
    if (!actorUserId) {
      addToast('Asigna un abogado responsable antes de avanzar el expediente.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/expedientes/${expediente.id}/transicion-estatus`, {
        expected_version: expediente.version,
        user_id: actorUserId,
        ...payload,
      });
      await onUpdated();
      addToast(successMessage, 'success');
    } catch (error: any) {
      addToast(error.detail || error.message || 'No fue posible avanzar el expediente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async () => {
    if (!selectedTransition) return;
    if (selectedTransition.requires_signature_data && (!signatureDate || !signaturePlace.trim())) {
      addToast('Indica fecha, hora y lugar para programar la firma.', 'error');
      return;
    }
    if (selectedTransition.requires_notes && !notes.trim()) {
      addToast('Agrega las observaciones requeridas para esta transición.', 'error');
      return;
    }
    await execute({
      nuevo_estatus: selectedTransition.status,
      nueva_etapa_clave: selectedTransition.stage?.clave || undefined,
      notas: notes.trim() || undefined,
      datos_firma: selectedTransition.requires_signature_data
        ? {
            fecha_firma: new Date(signatureDate).toISOString(),
            lugar: signaturePlace.trim(),
            autoriza_saldo_pendiente: authorizePendingBalance,
          }
        : undefined,
    }, `Expediente actualizado a ${selectedTransition.label}.`);
  };

  const handleAdvanceStage = async () => {
    const nextStage = expediente.workflow?.next_stage;
    if (!nextStage) return;
    await execute({
      nueva_etapa_clave: nextStage.clave,
      notas: notes.trim() || undefined,
    }, `Etapa iniciada: ${nextStage.nombre}.`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5" aria-labelledby="workflow-heading">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Ciclo del expediente</p>
          <h2 id="workflow-heading" className="text-lg font-extrabold text-slate-950 mt-1">Proyecto, firma, postfirma y entrega</h2>
          <p className="text-sm text-slate-600 mt-1">Los avances son secuenciales, auditados y protegidos contra cambios concurrentes.</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 min-w-56">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Estado actual</span>
          <p className="font-extrabold text-blue-950 mt-1">{expediente.workflow?.current_status_label || expediente.estatus}</p>
          <p className="text-xs text-blue-800 mt-1">{expediente.etapa_actual_nombre || 'Sin etapa activa'}</p>
        </div>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-4 gap-2" aria-label="Fases del expediente">
        {PHASES.map((phase, index) => {
          const Icon = phase.icon;
          const completed = currentPhase > index || expediente.estatus === 'ENTREGADO';
          const current = currentPhase === index;
          return (
            <li key={phase.label} className={`rounded-xl border p-3 flex items-center gap-3 ${
              completed ? 'border-emerald-200 bg-emerald-50' : current ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
            }`}>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${completed ? 'bg-emerald-700 text-white' : current ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {completed ? <CircleCheck size={18} /> : <Icon size={18} />}
              </span>
              <div>
                <span className="text-[11px] font-bold text-slate-500">Fase {index + 1}</span>
                <p className="text-sm font-bold text-slate-900">{phase.label}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {isExceptional && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>{expediente.estatus === 'CANCELADO' ? 'Este expediente está cerrado. Solo Dirección puede reabrirlo mediante el procedimiento excepcional.' : 'El expediente está suspendido; selecciona una reanudación permitida o documenta su cancelación.'}</p>
        </div>
      )}

      {!isFinal && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-4 border-t border-slate-200 pt-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div>
              <h3 className="font-bold text-slate-950">Siguiente etapa operativa</h3>
              <p className="text-sm text-slate-600 mt-1">
                {expediente.workflow?.next_stage?.nombre || 'No hay otra etapa dentro del estado actual.'}
              </p>
            </div>
            {expediente.workflow?.next_stage && (
              <button type="button" onClick={handleAdvanceStage} disabled={submitting} className="min-h-11 w-full rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={17} className="animate-spin" /> : <ChevronRight size={17} />}
                Avanzar etapa
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1" htmlFor="workflow-target">Cambio de estado permitido</label>
              <select id="workflow-target" value={targetStatus} onChange={(event) => setTargetStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800">
                {transitions.map((transition: any) => <option key={transition.status} value={transition.status}>{transition.label}</option>)}
              </select>
            </div>

            {selectedTransition?.requires_signature_data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <label className="text-sm font-semibold text-slate-800">Fecha y hora de firma *
                  <input type="datetime-local" value={signatureDate} onChange={(event) => setSignatureDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800" />
                </label>
                <label className="text-sm font-semibold text-slate-800">Lugar *
                  <input type="text" value={signaturePlace} onChange={(event) => setSignaturePlace(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800" />
                </label>
                <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={authorizePendingBalance} onChange={(event) => setAuthorizePendingBalance(event.target.checked)} className="mt-0.5 w-5 h-5 rounded border-slate-300 text-blue-900 focus:ring-blue-800" />
                  Registrar autorización operativa si existe saldo pendiente. Esto no modifica ni liquida movimientos financieros.
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1" htmlFor="workflow-notes">
                Observaciones {selectedTransition?.requires_notes ? '*' : '(opcional)'}
              </label>
              <textarea id="workflow-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 resize-y" />
            </div>

            <button type="button" onClick={handleTransition} disabled={submitting || !selectedTransition} className="min-h-11 w-full rounded-xl bg-amber-700 hover:bg-amber-800 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={17} className="animate-spin" /> : <ChevronRight size={17} />}
              Confirmar transición
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
