import { api } from './api';

export interface ComplianceRule {
  id: string; tipo: 'UIF' | 'ISR'; clave: string; version: string; nombre: string; estatus: string;
  vigencia_desde: string; fuente_nombre: string; fuente_url: string; parametros: any; cuestionario: any[]; notas?: string | null;
}
export interface ComplianceReview {
  id: string; tipo: 'UIF' | 'ISR'; estatus: string; fecha_operacion?: string | null; rule_version_snapshot: string;
  cuestionario_json: Record<string, any>; resultado_json?: any; explicacion?: string | null; updated_at: string;
  expediente: { id: string; numero_pravia: string; cliente_alias?: string | null; estatus: string };
  ruleSet: ComplianceRule;
  evidencias: Array<{ id: string; tipo_evidencia: string; documento: { id: string; nombre_original: string; tipo: string; estatus: string } }>;
}
export interface ComplianceCatalogs {
  reglas: ComplianceRule[];
  expedientes: Array<{ id: string; numero_pravia: string; cliente_alias?: string | null; estatus: string; valor_operacion?: string | number | null }>;
  usuarios: Array<{ id: string; nombre: string; apellido: string; rol: string }>;
  documentos: Array<{ id: string; nombre_original: string; tipo: string; estatus: string; expediente_id?: string | null; expedienteVinculos: Array<{ expediente_id: string }> }>;
}

export const complianceService = {
  catalogs: () => api.get('/cumplimiento/catalogos') as Promise<ComplianceCatalogs>,
  list: (tipo = 'TODOS') => api.get(`/cumplimiento/revisiones?tipo=${encodeURIComponent(tipo)}`).then((data) => data.revisiones) as Promise<ComplianceReview[]>,
  create: (data: any) => api.post('/cumplimiento/revisiones', data).then((result) => result.revision) as Promise<ComplianceReview>,
  evaluate: (id: string, data: any) => api.post(`/cumplimiento/revisiones/${id}/evaluar`, data).then((result) => result.revision) as Promise<ComplianceReview>,
  review: (id: string, data: any) => api.post(`/cumplimiento/revisiones/${id}/revisar`, data).then((result) => result.revision) as Promise<ComplianceReview>,
  addEvidence: (id: string, data: any) => api.post(`/cumplimiento/revisiones/${id}/evidencias`, data).then((result) => result.evidencia),
};
