import { create } from 'zustand';
import { api } from '../services/api';

export interface ExpedienteItem {
  id: string;
  numero_pravia: string;
  numero_notaria?: string;
  numero_escritura?: string;
  version: number;
  tipo_acto_id: string;
  subtipo_acto?: string;
  abogado_id: string;
  gestor_id?: string;
  creador_id: string;
  cotizacion_id?: string;
  notaria_id?: string;
  cliente_alias: string;
  descripcion?: string;
  valor_operacion?: number;
  datos_operacion?: any;
  estatus: string;
  expediente_etapa_actual_id?: string;
  etapa_actual_nombre?: string;
  avance_documental: number;
  avance_operativo: number;
  avance_financiero: number;
  avance_general: number;
  proxima_accion?: string;
  fecha_limite_accion?: string;
  fecha_apertura: string;
  fecha_estimada_firma?: string;
  created_at: string;
  updated_at: string;
  tipo_acto?: { id: string; nombre: string };
  abogado?: { id: string; nombre: string; apellido: string };
  etapaActual?: { id: string; nombre_snapshot: string; fecha_inicio: string };
  _count?: {
    comparecientes: number;
    requisitos_docs: number;
    movimientosFinancieros: number;
  };
}

export interface ExpedienteDetail extends ExpedienteItem {
  gestor?: { id: string; nombre: string; apellido: string };
  creador?: { id: string; nombre: string; apellido: string };
  notaria?: { id: string; nombre: string; ciudad?: string };
  cotizacion?: { id: string; numero_cotizacion: string; total_cliente: number; honorarios_pravia?: number; total_notaria?: number; notaria?: { id: string; nombre: string } };
  etapas: Array<{
    id: string;
    clave_snapshot: string;
    nombre_snapshot: string;
    orden_snapshot: number;
    duracion_esperada_snapshot?: number;
    fecha_inicio: string;
    fecha_fin?: string;
    completada: boolean;
    observaciones?: string;
  }>;
  comparecientes: Array<{
    id: string;
    rol_juridico: string;
    comparece_por: string;
    comparece_por_propio_derecho?: boolean;
    porcentaje_participacion?: number;
    es_beneficiario_controlador: boolean;
    es_proveedor_recursos: boolean;
    datos_validados: boolean;
    compareciente: {
      id: string;
      nombre: string;
      apellido_paterno?: string;
      apellido_materno?: string;
      razon_social?: string;
      rfc?: string;
      curp?: string;
      tipo_persona: string;
    };
    representado?: {
      id: string;
      nombre: string;
      razon_social?: string;
    };
  }>;
  requisitos_docs: Array<{
    id: string;
    nombre: string;
    categoria: string;
    obligatorio: boolean;
    estatus: string;
    observaciones?: string;
    documentoVinculos: Array<{
      documento: {
        id: string;
        nombre_original: string;
        mime_type: string;
        fecha_carga: string;
      };
    }>;
  }>;
  expedienteDocumentos: Array<{
    id: string;
    tipo_vinculo: string;
    fecha_vinculo: string;
    documento: {
      id: string;
      nombre_original: string;
      categoria: string;
      mime_type: string;
      size_bytes: number;
    };
  }>;
  movimientosFinancieros: Array<{
    id: string;
    tipo_movimiento: string;
    naturaleza: string;
    categoria: string;
    concepto: string;
    monto: number;
    fecha_movimiento: string;
    forma_pago?: string;
    referencia?: string;
    comprobante_url?: string;
    factura_url?: string;
    estatus: string;
    capturado_por: { id: string; nombre: string; apellido: string };
    validado_por?: { id: string; nombre: string; apellido: string };
    movimiento_origen_id?: string;
    motivo_reversion?: string;
  }>;
  actividades: Array<{
    id: string;
    tipo: string;
    tipo_actividad?: string;
    titulo: string;
    descripcion: string;
    created_at: string;
    usuario: { id: string; nombre: string; apellido: string };
  }>;
  tareas: Array<{
    id: string;
    titulo: string;
    descripcion?: string;
    prioridad: string;
    estatus: string;
    fecha_limite?: string;
    asignado_a: { id: string; nombre: string; apellido: string };
  }>;
}

interface ExpedienteState {
  expedientes: ExpedienteItem[];
  selectedExpediente: ExpedienteDetail | null;
  loading: boolean;
  error: string | null;
  filters: {
    estatus: string;
    search: string;
  };
  setFilters: (filters: Partial<{ estatus: string; search: string }>) => void;
  fetchExpedientes: () => Promise<void>;
  fetchExpedienteById: (id: string) => Promise<void>;
  createExpediente: (data: any) => Promise<ExpedienteItem>;
  convertCotizacionToExpediente: (data: { cotizacion_id: string; abogado_id: string }) => Promise<ExpedienteItem>;
  transitionEstatus: (id: string, expected_version: number, nuevo_estatus: string, notas?: string) => Promise<void>;
  addMovimientoFinanciero: (id: string, data: any) => Promise<void>;
  reverseMovimientoFinanciero: (id: string, movimientoId: string, motivo_reversion: string) => Promise<void>;
  archiveExpediente: (id: string, motivo_archivo?: string) => Promise<void>;
}

export const useExpedienteStore = create<ExpedienteState>((set, get) => ({
  expedientes: [],
  selectedExpediente: null,
  loading: false,
  error: null,
  filters: {
    estatus: '',
    search: ''
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    get().fetchExpedientes();
  },

  fetchExpedientes: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.estatus) params.append('estatus', filters.estatus);
      if (filters.search) params.append('search', filters.search);

      const res = await api.get(`/expedientes?${params.toString()}`);
      set({ expedientes: res.data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error al cargar expedientes', loading: false });
    }
  },

  fetchExpedienteById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(`/expedientes/${id}`);
      set({ selectedExpediente: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error al cargar expediente', loading: false });
    }
  },

  createExpediente: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const newExp = await api.post('/expedientes', data);
      await get().fetchExpedientes();
      set({ loading: false });
      return newExp;
    } catch (err: any) {
      set({ error: err.message || 'Error al crear expediente', loading: false });
      throw err;
    }
  },

  convertCotizacionToExpediente: async (data) => {
    set({ loading: true, error: null });
    try {
      const newExp = await api.post('/expedientes/convertir-cotizacion', data);
      await get().fetchExpedientes();
      set({ loading: false });
      return newExp;
    } catch (err: any) {
      set({ error: err.message || 'Error al convertir cotización', loading: false });
      throw err;
    }
  },

  transitionEstatus: async (id, expected_version, nuevo_estatus, notas) => {
    try {
      await api.post(`/expedientes/${id}/transicion-estatus`, {
        expected_version,
        nuevo_estatus,
        notas
      });
      await get().fetchExpedienteById(id);
    } catch (err: any) {
      set({ error: err.message || 'Error en la transición de estatus' });
      throw err;
    }
  },

  addMovimientoFinanciero: async (id, data) => {
    try {
      await api.post(`/expedientes/${id}/movimientos`, data);
      await get().fetchExpedienteById(id);
    } catch (err: any) {
      set({ error: err.message || 'Error al registrar movimiento' });
      throw err;
    }
  },

  reverseMovimientoFinanciero: async (id, movimientoId, motivo_reversion) => {
    try {
      await api.post(`/expedientes/${id}/movimientos/${movimientoId}/revertir`, { motivo_reversion });
      await get().fetchExpedienteById(id);
    } catch (err: any) {
      set({ error: err.message || 'Error al revertir movimiento' });
      throw err;
    }
  },

  archiveExpediente: async (id, motivo_archivo) => {
    try {
      await api.post(`/expedientes/${id}/archivar`, { motivo_archivo });
      await get().fetchExpedientes();
      set({ selectedExpediente: null });
    } catch (err: any) {
      set({ error: err.message || 'Error al archivar expediente' });
      throw err;
    }
  }
}));
