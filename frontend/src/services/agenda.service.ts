import { api } from './api';

export type AgendaView = 'dia' | 'semana' | 'mes' | 'lista';
export type AgendaEventStatus = 'ACTIVO' | 'COMPLETADO' | 'CANCELADO';

export interface AgendaEvent {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  todo_el_dia: boolean;
  user_id?: string | null;
  expediente_id?: string | null;
  compareciente_id?: string | null;
  recordatorios?: number[] | null;
  estatus: AgendaEventStatus;
  color: string;
  responsable_nombre: string;
  compareciente_nombre?: string | null;
  expediente?: { id: string; numero_pravia: string; cliente_alias?: string | null; estatus: string } | null;
  motivo_cancelacion?: string | null;
}

export interface AgendaTask {
  id: string;
  titulo: string;
  descripcion?: string | null;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  estatus: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';
  fecha_limite?: string | null;
  expediente_id?: string | null;
  asignado_a_id: string;
  asignado_a?: { id: string; nombre: string; apellido: string };
  expediente?: { id: string; numero_pravia: string; cliente_alias?: string | null } | null;
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && search.set(key, value));
  return search.toString();
};

export const agendaService = {
  list: (params: Record<string, string | undefined>) => api.get(`/agenda?${query(params)}`),
  catalogs: () => api.get('/agenda/catalogos'),
  create: (payload: Record<string, unknown>) => api.post('/agenda', payload),
  update: (id: string, payload: Record<string, unknown>) => api.patch(`/agenda/${id}`, payload),
  cancel: (id: string, payload: { actor_user_id: string; motivo_cancelacion: string }) => api.post(`/agenda/${id}/cancelar`, payload),
  listTasks: (params: Record<string, string | undefined> = {}) => api.get(`/agenda/tareas?${query(params)}`),
  createTask: (payload: Record<string, unknown>) => api.post('/agenda/tareas', payload),
  updateTask: (id: string, payload: Record<string, unknown>) => api.patch(`/agenda/tareas/${id}`, payload),
};

