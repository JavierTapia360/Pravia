// Same-origin by default: Vite proxies `/api` in development and production can
// either serve both layers together or set VITE_API_URL explicitly.
import { getAccessToken, refreshAccessToken } from './authToken';
import { canWriteToServer } from './connectivity';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 30_000;
const activeRequests = new Set<AbortController>();

type ErrorBody = {
  code?: string;
  error?: string;
  detail?: string;
  correlation_id?: string;
};

export class ApiError extends Error {
  readonly name = 'ApiError';

  constructor(
    public status: number,
    message: string,
    public code = 'REQUEST_FAILED',
    public correlationId?: string,
    public detail?: string,
  ) {
    super(message);
  }
}

const messageForStatus = (status: number) => {
  if (status === 0) return 'No fue posible comunicarse con el servidor.';
  if (status === 401) return 'Tu sesión terminó. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No encontramos el recurso solicitado.';
  if (status === 409) return 'La información cambió mientras trabajabas. Actualiza e intenta de nuevo.';
  if (status === 413) return 'El archivo o contenido excede el tamaño permitido.';
  if (status === 429) return 'Hay demasiadas solicitudes. Espera un momento e intenta de nuevo.';
  if (status >= 500) return 'No fue posible completar la solicitud. Intenta de nuevo.';
  return 'La solicitud no pudo procesarse.';
};

const parseErrorBody = async (response: Response): Promise<ErrorBody> => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};
  return response.json().catch(() => ({}));
};

const toApiError = async (response: Response) => {
  const body = await parseErrorBody(response);
  const correlationId = body.correlation_id || response.headers.get('x-correlation-id') || undefined;
  const safeServerMessage = response.status < 500 && typeof body.error === 'string' && body.error.trim()
    ? body.error.trim()
    : messageForStatus(response.status);
  return new ApiError(
    response.status,
    safeServerMessage,
    body.code || `HTTP_${response.status}`,
    correlationId,
    response.status < 500 ? body.detail : undefined,
  );
};

const createCorrelationId = () => globalThis.crypto?.randomUUID?.()
  || `pravia-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const abortPrivateRequests = () => {
  activeRequests.forEach((controller) => controller.abort('SESSION_INVALIDATED'));
  activeRequests.clear();
};

const execute = async (
  endpoint: string,
  init: RequestInit = {},
  retry = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> => {
  const method = String(init.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method) && !canWriteToServer()) {
    throw new ApiError(0, 'Sin conexión al servidor. La operación no se realizó.', 'OFFLINE');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort('REQUEST_TIMEOUT'), timeoutMs);
  const externalSignal = init.signal;
  const abortFromExternalSignal = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromExternalSignal();
  else externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });

  const headers = new Headers(init.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('X-Correlation-ID')) headers.set('X-Correlation-ID', createCorrelationId());
  activeRequests.add(controller);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });

    if (response.status === 401 && retry && !endpoint.startsWith('/auth/')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return execute(endpoint, init, false, timeoutMs);
      abortPrivateRequests();
    }

    if (!response.ok) throw await toApiError(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      const sessionEnded = controller.signal.reason === 'SESSION_INVALIDATED';
      throw new ApiError(
        sessionEnded ? 401 : 0,
        sessionEnded ? messageForStatus(401) : 'La solicitud tardó demasiado o fue cancelada.',
        sessionEnded ? 'AUTH_REQUIRED' : 'REQUEST_ABORTED',
      );
    }
    throw new ApiError(0, messageForStatus(0), 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
    activeRequests.delete(controller);
  }
};

const parseSuccess = async (response: Response) => {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  if (contentType.startsWith('text/')) return response.text();
  return response.blob();
};

const request = async <T = unknown>(endpoint: string, init: RequestInit = {}, timeoutMs?: number): Promise<T> =>
  parseSuccess(await execute(endpoint, init, true, timeoutMs)) as Promise<T>;

export const api = {
  get: <T = any>(endpoint: string, signal?: AbortSignal) => request<T>(endpoint, { signal }),
  post: <T = any>(endpoint: string, data?: unknown) => request<T>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  }),
  put: <T = any>(endpoint: string, data: unknown) => request<T>(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  patch: <T = any>(endpoint: string, data: unknown) => request<T>(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  delete: <T = any>(endpoint: string, data?: unknown) => request<T>(endpoint, {
    method: 'DELETE',
    headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  }),
  upload: <T = any>(endpoint: string, formData: FormData, timeoutMs = 120_000) => request<T>(endpoint, {
    method: 'POST',
    body: formData,
  }, timeoutMs),
  response: (endpoint: string, init: RequestInit = {}, timeoutMs = 120_000) => execute(endpoint, init, true, timeoutMs),
  blob: async (endpoint: string, init: RequestInit = {}, timeoutMs = 120_000) =>
    (await execute(endpoint, init, true, timeoutMs)).blob(),
};

export const invalidatePrivateRequests = abortPrivateRequests;
