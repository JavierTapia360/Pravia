import { api } from './api';

export interface AIUsageLog {
  id: string;
  modelo: string;
  operacion: string;
  estatus: string;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
  duracion_ms: number;
  costo_estimado_usd: string | number;
  documentos_enviados: number;
  escalamiento_utilizado: boolean;
  created_at: string;
  usuario?: { id: string; nombre: string; apellido: string } | null;
  expediente?: { id: string; numero_pravia: string; cliente_alias?: string | null } | null;
}

export interface AIDashboard {
  configuracion: {
    provider: string;
    modelo_principal: string;
    modelo_escalamiento: string;
    api_key_configurada: boolean;
    razonamiento: string;
    escalamiento_habilitado: boolean;
  };
  metricas: {
    solicitudes: number;
    fallidas: number;
    documentos: number;
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens: number;
    total_tokens: number;
    costo_estimado_usd: number;
    escalaciones: number;
  };
  por_modelo: Array<{ modelo: string; solicitudes: number; tokens: number; costo_usd: number }>;
  operaciones: string[];
  usuarios: Array<{ id: string; nombre: string; apellido: string }>;
  solicitudes_recientes: AIUsageLog[];
}

export const aiService = {
  dashboard: (filters: { periodo: string; usuario_id?: string; operacion?: string }) => {
    const params = new URLSearchParams({ periodo: filters.periodo });
    if (filters.usuario_id && filters.usuario_id !== 'TODOS') params.set('usuario_id', filters.usuario_id);
    if (filters.operacion && filters.operacion !== 'TODAS') params.set('operacion', filters.operacion);
    return api.get(`/ia/dashboard?${params.toString()}`) as Promise<AIDashboard>;
  },
};
