// Same-origin by default: Vite proxies `/api` in development and production can
// either serve both layers together or set VITE_API_URL explicitly.
import { getAccessToken, refreshAccessToken } from './authToken';
import { canWriteToServer } from './connectivity';
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: string) {
    super(message);
  }
}

const handleResponse = async (res: globalThis.Response) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error || `HTTP ${res.status}`;
    const detail = body?.detail || '';
    throw new ApiError(res.status, msg, detail);
  }
  return body;
};

const request = async (endpoint: string, init: RequestInit = {}, retry = true): Promise<any> => {
  const method = String(init.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method) && !canWriteToServer()) {
    throw new ApiError(0, 'Sin conexión al servidor. La operación no se realizó.');
  }
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${endpoint}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && !endpoint.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(endpoint, init, false);
  }
  return handleResponse(response);
};

export const api = {
  get: async (endpoint: string) => {
    return request(endpoint);
  },
  
  post: async (endpoint: string, data: any) => {
    return request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  
  put: async (endpoint: string, data: any) => {
    return request(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  patch: async (endpoint: string, data: any) => {
    return request(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  
  delete: async (endpoint: string, data?: any) => {
    return request(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
  },

  upload: async (endpoint: string, formData: FormData) => {
    return request(endpoint, {
      method: 'POST',
      body: formData
    });
  }
};

export { ApiError };
