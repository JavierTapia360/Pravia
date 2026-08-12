import { api } from './api';

export const miDiaService = {
  getDashboard: (userId?: string) => api.get(`/mi-dia${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`),
};

