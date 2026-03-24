import axios from 'axios';
import { useAuthStore } from './auth-store';

const isServer = typeof window === 'undefined';
const API_BASE = isServer
  ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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
  if (typeof document !== 'undefined') {
    const csrfToken = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('csrf-token='))
      ?.split('=')[1];

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (
      response.data !== null &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'timestamp' in response.data
    ) {
      response.data = response.data.data;
    }

    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  },
);

export const adminApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getHealth: async () => {
    const response = await api.get('/admin/health');
    return response.data;
  },

  getAnalytics: async (params?: { days?: number }) => {
    const response = await api.get('/admin/analytics', { params: cleanParams(params) });
    return response.data;
  },

  getUsers: async (params?: { page?: number; limit?: number; status?: string; role?: string; search?: string }) => {
    const response = await api.get('/admin/users', { params: cleanParams(params) });
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  getUserDetails: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserStatus: async (userId: string, status: string, reason?: string) => {
    const response = await api.patch(`/admin/users/${userId}/status`, { status, reason });
    return response.data;
  },

  bulkUpdateUserStatus: async (data: { userIds: string[]; status: string; reason?: string }) => {
    const response = await api.patch('/admin/users/bulk-status', data);
    return response.data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  grantUserMembership: async (
    userId: string,
    data: {
      tier: 'BIA_BASIC' | 'BIA_PLUS';
      duration: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
    },
  ) => {
    const response = await api.patch(`/admin/users/${userId}/membership`, data);
    return response.data;
  },

  getPendingVerifications: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/verification/admin/pending', { params: cleanParams(params) });
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

  bulkReviewVerifications: async (data: { requestIds: string[]; decision: 'APPROVE' | 'REJECT'; notes?: string }) => {
    const response = await api.post('/verification/admin/requests/bulk-review', data);
    return response.data;
  },

  getReports: async (params?: { status?: string }) => {
    const response = await api.get('/moderation/reports', { params: cleanParams(params) });
    return response.data;
  },

  resolveReport: async (
    reportId: string,
    data: {
      status: 'DISMISSED' | 'ACTION_TAKEN';
      resolution: string;
      userAction?: 'WARNING' | 'SUSPEND_7_DAYS' | 'SUSPEND_30_DAYS' | 'PERMANENT_BAN';
    },
  ) => {
    const response = await api.post(`/moderation/reports/${reportId}/resolve`, data);
    return response.data;
  },

  bulkResolveReports: async (
    data: {
      reportIds: string[];
      status: 'DISMISSED' | 'ACTION_TAKEN';
      resolution: string;
      userAction?: 'WARNING' | 'SUSPEND_7_DAYS' | 'SUSPEND_30_DAYS' | 'PERMANENT_BAN';
    },
  ) => {
    const response = await api.post('/moderation/reports/bulk-resolve', data);
    return response.data;
  },

  getModerationStats: async () => {
    const response = await api.get('/moderation/stats');
    return response.data;
  },

  getForumThreads: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/admin/bia/threads', { params });
    return response.data;
  },

  setThreadLocked: async (threadId: string, locked: boolean) => {
    const response = await api.patch(`/admin/bia/threads/${threadId}`, { isLocked: locked });
    return response.data;
  },

  deleteThread: async (threadId: string) => {
    const response = await api.delete(`/admin/bia/threads/${threadId}`);
    return response.data;
  },

  getBusinessListings: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/admin/bia/listings', { params });
    return response.data;
  },

  setListingApproved: async (listingId: string, approved: boolean) => {
    const response = await api.patch(`/admin/bia/listings/${listingId}`, { isApproved: approved });
    return response.data;
  },

  getAuditLogs: async (params?: { page?: number; limit?: number; userId?: string; action?: string }) => {
    const response = await api.get('/admin/audit-logs', { params: cleanParams(params) });
    return response.data;
  },

  getBlogPosts: async (params?: { page?: number; limit?: number; status?: string; tag?: string }) => {
    const response = await api.get('/blog/admin/posts', { params: cleanParams(params) });
    return response.data;
  },

  getBlogPost: async (postId: string) => {
    const response = await api.get(`/blog/admin/posts/${postId}`);
    return response.data;
  },

  createBlogPost: async (data: Record<string, unknown>) => {
    const response = await api.post('/blog/posts', data);
    return response.data;
  },

  updateBlogPost: async (postId: string, data: Record<string, unknown>) => {
    const response = await api.put(`/blog/posts/${postId}`, data);
    return response.data;
  },

  deleteBlogPost: async (postId: string) => {
    const response = await api.delete(`/blog/posts/${postId}`);
    return response.data;
  },

  getBlogAnalytics: async (postId: string, params?: { days?: number }) => {
    const response = await api.get(`/blog/admin/posts/${postId}/analytics`, {
      params: cleanParams(params),
    });
    return response.data;
  },
};
