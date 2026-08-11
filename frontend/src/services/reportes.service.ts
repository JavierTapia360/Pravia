import { api } from './api';

const query = (params: Record<string, string>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value && search.set(key, value));
  return search.toString();
};

export const reportesService = {
  getSummary: (params: Record<string, string>) => api.get(`/reportes/resumen?${query(params)}`),
  getCatalogs: () => api.get('/reportes/catalogos'),
};

