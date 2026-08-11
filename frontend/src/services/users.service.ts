import { api } from './api';
import type { AppRole } from './auth.service';

export interface ManagedUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: AppRole;
  activo: boolean;
  requires_password_change: boolean;
  last_login_at?: string | null;
  locked_until?: string | null;
  created_at: string;
}

export const usersService = {
  list: (): Promise<ManagedUser[]> => api.get('/users'),
  create: (input: Record<string, unknown>) => api.post('/users', input),
  update: (id: string, input: Record<string, unknown>) => api.patch(`/users/${id}`, input),
  setTemporaryPassword: (id: string, temporaryPassword: string) => api.post(`/users/${id}/temporary-password`, { temporary_password: temporaryPassword }),
};
