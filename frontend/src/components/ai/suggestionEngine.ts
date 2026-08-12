export type SuggestionTrigger = 'DOCUMENTO_DUPLICADO' | 'REQUISITO_FALTANTE' | 'FIRMA_PROXIMA' | 'COTIZACION_ESTANCADA' | 'SALDO_VENCIDO' | 'TAREA_VENCIDA' | 'CONFLICTO_DOCUMENTAL';
export type SuggestionPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PraviaSuggestion {
  id: string;
  trigger: SuggestionTrigger;
  context: { entity_type?: string; entity_id?: string };
  title: string;
  reason: string;
  priority: SuggestionPriority;
  confidence: number;
  action: { label: string; query: string };
}

type SuggestionState = Record<string, { dismissed_at?: string; snoozed_until?: string; last_shown_at?: string }>;
const STORAGE_KEY = 'pravia_ai_suggestions_v1';

function readState(): SuggestionState {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function writeState(state: SuggestionState) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

export function isSuggestionVisible(suggestion: PraviaSuggestion, mode: 'proactive' | 'balanced' | 'discreet') {
  if (mode === 'discreet') return false;
  if (mode === 'balanced' && suggestion.priority === 'LOW') return false;
  const current = readState()[suggestion.id];
  if (current?.dismissed_at) return false;
  if (current?.snoozed_until && new Date(current.snoozed_until) > new Date()) return false;
  if (current?.last_shown_at && Date.now() - new Date(current.last_shown_at).getTime() < 24 * 60 * 60 * 1000) return false;
  return true;
}

export function markSuggestionShown(id: string) { const state = readState(); state[id] = { ...state[id], last_shown_at: new Date().toISOString() }; writeState(state); }
export function dismissSuggestion(id: string) { const state = readState(); state[id] = { ...state[id], dismissed_at: new Date().toISOString() }; writeState(state); }
export function snoozeSuggestion(id: string, hours = 24) { const state = readState(); state[id] = { ...state[id], snoozed_until: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(), last_shown_at: undefined }; writeState(state); }

export function suggestionFromPendingItems(data: any): PraviaSuggestion | null {
  const missing = Array.isArray(data?.requisitos_documentales) ? data.requisitos_documentales : [];
  const overdue = [...(Array.isArray(data?.tareas) ? data.tareas : []), ...(Array.isArray(data?.gestiones_externas) ? data.gestiones_externas : [])]
    .filter((item) => item.fecha_limite && new Date(item.fecha_limite) < new Date());
  const entityId = data?.expediente_id;
  if (missing.length) return { id: `REQUISITO_FALTANTE:${entityId}`, trigger: 'REQUISITO_FALTANTE', context: { entity_type: 'expediente', entity_id: entityId }, title: `${missing.length} requisito${missing.length === 1 ? '' : 's'} pendiente${missing.length === 1 ? '' : 's'}`, reason: `El expediente ${data.folio || ''} tiene documentación obligatoria por completar o validar.`, priority: missing.some((item: any) => ['RECHAZADO', 'VENCIDO'].includes(item.estatus)) ? 'HIGH' : 'MEDIUM', confidence: 1, action: { label: 'Revisar pendientes', query: '¿Qué falta en este expediente?' } };
  if (overdue.length) return { id: `TAREA_VENCIDA:${entityId}`, trigger: 'TAREA_VENCIDA', context: { entity_type: 'expediente', entity_id: entityId }, title: `${overdue.length} seguimiento${overdue.length === 1 ? '' : 's'} vencido${overdue.length === 1 ? '' : 's'}`, reason: 'Hay tareas o gestiones con fecha límite anterior a hoy.', priority: 'HIGH', confidence: 1, action: { label: 'Ver seguimientos', query: 'Muéstrame los pendientes vencidos' } };
  return null;
}
