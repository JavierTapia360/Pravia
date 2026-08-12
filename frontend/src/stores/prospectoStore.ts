import { create } from 'zustand';
import { api } from '../services/api';

export interface Prospecto {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  tipo_acto?: string;
  necesidad?: string;
  ciudad?: string;
  fuente?: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  estado: string;
  created_at: string;
  atendido_por?: { nombre: string };
  cotizacion?: { id: string; estado: string } | null;
  seguimientos?: Seguimiento[];
}

export interface Seguimiento {
  id: string;
  tipo: string;
  contenido: string;
  proxima_accion?: string;
  fecha_proximo_seguimiento?: string;
  created_at: string;
  usuario?: { nombre: string };
}

interface ProspectoState {
  prospectos: Prospecto[];
  isLoading: boolean;
  selectedProspecto: Prospecto | null;

  fetchProspectos: () => Promise<void>;
  fetchProspectoById: (id: string) => Promise<void>;
  createProspecto: (data: Partial<Prospecto>) => Promise<void>;   // throws on error
  updateProspecto: (id: string, data: Partial<Prospecto>) => Promise<void>;
  archiveProspecto: (id: string, motivo: string) => Promise<void>;
  addSeguimiento: (id: string, data: Partial<Seguimiento>) => Promise<void>;
  setSelectedProspecto: (prospecto: Prospecto | null) => void;
}

export const useProspectoStore = create<ProspectoState>((set, get) => ({
  prospectos: [],
  isLoading: false,
  selectedProspecto: null,

  fetchProspectos: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get('/prospectos');
      set({ prospectos: data, isLoading: false });
    } catch (error) {
      console.error('fetchProspectos error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  fetchProspectoById: async (id: string) => {
    try {
      const data = await api.get(`/prospectos/${id}`);
      set({ selectedProspecto: data });
    } catch (error) {
      console.error('fetchProspectoById error:', error);
      throw error;
    }
  },

  // Throws on error so callers can show feedback
  createProspecto: async (data: Partial<Prospecto>) => {
    const newProspecto = await api.post('/prospectos', data);  // throws ApiError on failure
    await get().fetchProspectos(); // Refresh full list with relations
    return newProspecto;
  },

  updateProspecto: async (id: string, data: Partial<Prospecto>) => {
    await api.put(`/prospectos/${id}`, data);
    if (get().selectedProspecto?.id === id) {
      await get().fetchProspectoById(id);
    }
    await get().fetchProspectos();
  },

  archiveProspecto: async (id: string, motivo: string) => {
    await api.delete(`/prospectos/${id}`, { motivo });
    set((state) => ({
      prospectos: state.prospectos.filter(p => p.id !== id),
      selectedProspecto: state.selectedProspecto?.id === id ? null : state.selectedProspecto
    }));
  },

  addSeguimiento: async (id: string, data: Partial<Seguimiento>) => {
    await api.post(`/prospectos/${id}/seguimientos`, data);
    await get().fetchProspectoById(id);
    await get().fetchProspectos();
  },

  setSelectedProspecto: (prospecto) => set({ selectedProspecto: prospecto })
}));
