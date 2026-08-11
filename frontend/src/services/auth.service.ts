import { getAccessToken } from './authToken';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export type AppRole = 'DIRECCION' | 'ADMINISTRACION' | 'ABOGADO' | 'RECEPCION' | 'GESTORIA' | 'CONSULTA';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: AppRole;
  activo: boolean;
  requires_password_change: boolean;
  permissions: string[];
}

export interface AuthPayload {
  access_token: string;
  expires_in: number;
  user: AuthUser;
}

async function responseBody(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No fue posible completar la autenticación.');
  return body;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthPayload> => responseBody(await fetch(`${API_URL}/auth/login`, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  })),
  refresh: async (): Promise<AuthPayload> => responseBody(await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
  })),
  logout: async () => {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
  },
  changePassword: async (currentPassword: string, newPassword: string) => responseBody(await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST', credentials: 'include', headers: {
      'content-type': 'application/json', ...(getAccessToken() ? { authorization: `Bearer ${getAccessToken()}` } : {}),
    }, body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })),
  requestRecovery: async (email: string) => responseBody(await fetch(`${API_URL}/auth/request-recovery`, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }),
  })),
  resetPassword: async (token: string, newPassword: string) => responseBody(await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, new_password: newPassword }),
  })),
};
