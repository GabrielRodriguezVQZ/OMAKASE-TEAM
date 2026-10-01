import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const patientsApi = {
  getAll: () => api.get('/patients'),
  getById: (id: string) => api.get(`/patients/${id}`),
  create: (data: any) => api.post('/patients', data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
};

export const surgeriesApi = {
  getAll: () => api.get('/surgeries'),
  getById: (id: string) => api.get(`/surgeries/${id}`),
  create: (data: any) => api.post('/surgeries', data),
  update: (id: string, data: any) => api.put(`/surgeries/${id}`, data),
  delete: (id: string) => api.delete(`/surgeries/${id}`),
  addTeamMember: (id: string, data: any) => api.post(`/surgeries/${id}/team`, data),
  updateTeamMember: (id: string, teamId: string, data: any) =>
    api.put(`/surgeries/${id}/team/${teamId}`, data),
  getChecklist: (id: string) => api.get(`/surgeries/${id}/checklist`),
  updateChecklistItem: (id: string, itemId: string, data: any) =>
    api.put(`/surgeries/${id}/checklist/${itemId}`, data),
  registerTime: (id: string, data: any) => api.post(`/surgeries/${id}/times`, data),
  getTimes: (id: string) => api.get(`/surgeries/${id}/times`),
  sendToQuirfano: (id: string) => api.post(`/surgeries/${id}/enviar-quirfano`),
  getTrazabilidad: (id: string) => api.get(`/surgeries/${id}/trazabilidad`),
};

export const alertsApi = {
  getBySurgery: (surgeryId: string) => api.get(`/alerts/surgery/${surgeryId}`),
  validate: (surgeryId: string) => api.post(`/alerts/validate/${surgeryId}`),
  resolve: (alertId: string, userId: string) => api.post(`/alerts/${alertId}/resolve`, { userId }),
};

export const dashboardApi = {
  getResumen: () => api.get('/dashboard/resumen'),
  getDuracionEstimada: (procedimiento: string) => api.post('/dashboard/analytics/duracion-estimada', { procedimiento }),
  getOmisionesFrecuentes: () => api.get('/dashboard/analytics/omisiones-frecuentes'),
};

export default api;
