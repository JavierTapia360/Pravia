import { create } from 'zustand';
import { api } from '../services/api';

export interface NotariaContacto {
  id?: string;
  nombre: string;
  cargo: string;
  telefono?: string;
  whatsapp?: string;
  correo?: string;
  observaciones?: string;
  activo?: boolean;
}

export interface Notaria {
  id: string;
  numero_notaria?: string;
  nombre: string;
  notario_titular?: string;
  entidad_federativa: string;
  municipio: string;
  demarcacion?: string;
  direccion?: string;
  codigo_postal?: string;
  telefono?: string;
  whatsapp?: string;
  correo_general?: string;
  correo_proyectos?: string;
  pagina_web?: string;
  contacto_principal?: string;
  horario?: string;
  dias_atencion?: string;
  tiempo_respuesta?: string;
  tiempo_presupuesto?: string;
  tiempo_firma?: string;
  instrucciones_especiales?: string;
  observaciones_generales?: string;
  requisitos_frecuentes?: string;
  tipos_acto_json?: string[];
  instituciones_json?: string[];
  municipios_atendidos_json?: string[];
  activa: boolean;
  predeterminada: boolean;
  color_identificador?: string;
  contactos?: NotariaContacto[];
  _count?: {
    cotizaciones: number;
    expedientes: number;
  };
  created_at?: string;
}

interface NotariasState {
  notarias: Notaria[];
  loading: boolean;
  fetchNotarias: (params?: { search?: string; activa?: boolean }) => Promise<void>;
  createNotaria: (data: Partial<Notaria>) => Promise<Notaria>;
  updateNotaria: (id: string, data: Partial<Notaria>) => Promise<Notaria>;
  setPredeterminada: (id: string) => Promise<void>;
  archiveNotaria: (id: string) => Promise<void>;
}

export const useNotariasStore = create<NotariasState>((set, get) => ({
  notarias: [],
  loading: false,

  fetchNotarias: async (params) => {
    set({ loading: true });
    try {
      let url = '/notarias';
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append('search', params.search);
      if (params?.activa !== undefined) searchParams.append('activa', String(params.activa));

      if (searchParams.toString()) url += `?${searchParams.toString()}`;

      const res = await api.get(url);
      set({ notarias: Array.isArray(res) ? res : [] });
    } catch (e) {
      set({ notarias: [] });
    } finally {
      set({ loading: false });
    }
  },

  createNotaria: async (data) => {
    const res = await api.post('/notarias', data);
    await get().fetchNotarias();
    return res;
  },

  updateNotaria: async (id, data) => {
    const res = await api.put(`/notarias/${id}`, data);
    await get().fetchNotarias();
    return res;
  },

  setPredeterminada: async (id) => {
    await api.patch(`/notarias/${id}/predeterminada`, {});
    await get().fetchNotarias();
  },

  archiveNotaria: async (id) => {
    await api.patch(`/notarias/${id}/archivar`, {});
    await get().fetchNotarias();
  }
}));
