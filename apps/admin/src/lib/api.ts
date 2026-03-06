import axios from 'axios';
import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Helper to filter out empty/undefined params
const cleanParams = (params?: Record<string, any>) => {
  if (!params) return undefined;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  // Auth
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getHealth: async () => {
    const response = await api.get('/admin/health');
    return response.data;
  },

  // Users
  getUsers: async (params?: { page?: number; limit?: number; status?: string; role?: string; search?: string }) => {
    const response = await api.get('/admin/users', { params: cleanParams(params) });
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserStatus: async (userId: string, status: string) => {
    const response = await api.patch(`/admin/users/${userId}/status`, { status });
    return response.data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  // Verification
  getPendingVerifications: async () => {
    const response = await api.get('/verification/admin/pending');
    return response.data;
  },

  getVerificationRequest: async (requestId: string) => {
    const response = await api.get(`/verification/admin/requests/${requestId}`);
    return response.data;
  },

  approveVerification: async (requestId: string, notes?: string) => {
    const response = await api.patch(`/verification/admin/requests/${requestId}/approve`, { notes });
    return response.data;
  },

  rejectVerification: async (requestId: string, reason: string) => {
    const response = await api.patch(`/verification/admin/requests/${requestId}/reject`, { reason });
    return response.data;
  },

  // Reports
  getReports: async (params?: { status?: string }) => {
    const response = await api.get('/moderation/reports', { params: cleanParams(params) });
    return response.data;
  },

  resolveReport: async (reportId: string, resolution: string, action?: string) => {
    const response = await api.post(`/moderation/reports/${reportId}/resolve`, { resolution, action });
    return response.data;
  },

  getModerationStats: async () => {
    const response = await api.get('/moderation/stats');
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (params?: { page?: number; limit?: number; userId?: string; action?: string }) => {
    const response = await api.get('/admin/audit-logs', { params: cleanParams(params) });
    return response.data;
  },
};
