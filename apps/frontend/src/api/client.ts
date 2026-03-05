import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token from localStorage before each request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── API helpers ─────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    http.post<{ accessToken: string; user: { id: string; email: string; role: string } }>(
      '/auth/login',
      { email, password },
    ),
  me: () => http.get('/me'),
};

export const dashboardApi = {
  summary: () => http.get('/dashboard/summary'),
  trucks: (params?: Record<string, string>) =>
    http.get('/dashboard/trucks', { params }),
};

export const tripsApi = {
  list: (params?: Record<string, string>) => http.get('/trips', { params }),
  get: (id: string) => http.get(`/trips/${id}`),
  create: (data: Record<string, unknown>) => http.post('/trips', data),
  updateStatus: (id: string, status: string) =>
    http.post(`/trips/${id}/status`, { status }),
  suggestTruck: (data: { originTerminalId: string; plannedStartAt: string }) =>
    http.post('/trips/suggest-truck', data),
};

export const terminalsApi = {
  list: () => http.get('/terminals'),
  queue: () => http.get('/terminals/queue'),
  action: (terminalId: string, tripId: string, action: string) =>
    http.post(`/terminals/${terminalId}/action`, { tripId, action }),
};

export const trucksApi = {
  list: (params?: Record<string, string>) => http.get('/trucks', { params }),
};

export const driversApi = {
  list: () => http.get('/drivers'),
};

export const alertsApi = {
  list: (all = false) => http.get('/alerts', { params: { all: String(all) } }),
  ack: (id: string) => http.post(`/alerts/${id}/ack`),
};
