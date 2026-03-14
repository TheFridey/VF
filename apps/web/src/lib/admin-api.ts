import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const isServer = typeof window === 'undefined';
const API_BASE = isServer
  ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1`
  : '/api';

type ResolveReportPayload = {
  status: 'DISMISSED' | 'ACTION_TAKEN';
  resolution: string;
  userAction?: 'WARNING' | 'SUSPEND_7_DAYS' | 'SUSPEND_30_DAYS' | 'PERMANENT_BAN';
};

class AdminApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.client.interceptors.request.use((config) => {
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

    this.client.interceptors.response.use(
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
  }

  async getDashboardStats() {
    const response = await this.client.get('/admin/dashboard');
    return response.data;
  }

  async getSystemHealth() {
    const response = await this.client.get('/admin/health');
    return response.data;
  }

  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.client.get('/admin/users', { params });
    return response.data;
  }

  async getUser(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserStatus(userId: string, data: { status: string; reason?: string; expiresAt?: string }) {
    const response = await this.client.patch(`/admin/users/${userId}/status`, data);
    return response.data;
  }

  async updateUserRole(userId: string, data: { role: string }) {
    const response = await this.client.patch(`/admin/users/${userId}/role`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async getVerificationRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const response = await this.client.get('/admin/verification', { params });
    return response.data;
  }

  async getVerificationRequest(requestId: string) {
    const response = await this.client.get(`/admin/verification/${requestId}`);
    return response.data;
  }

  async approveVerification(requestId: string, notes?: string) {
    const response = await this.client.post(`/verification/${requestId}/approve`, { notes });
    return response.data;
  }

  async rejectVerification(requestId: string, reason: string) {
    const response = await this.client.post(`/verification/${requestId}/reject`, { reason });
    return response.data;
  }

  async getReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    reason?: string;
  }) {
    const response = await this.client.get('/moderation/reports', { params });
    return response.data;
  }

  async getReport(reportId: string) {
    const response = await this.client.get(`/moderation/reports/${reportId}`);
    return response.data;
  }

  async resolveReport(reportId: string, data: ResolveReportPayload) {
    const response = await this.client.post(`/moderation/reports/${reportId}/resolve`, data);
    return response.data;
  }

  async getModerationStats() {
    const response = await this.client.get('/moderation/stats');
    return response.data;
  }

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/admin/audit-logs', { params });
    return response.data;
  }

  async getForumThreads(params?: { page?: number; limit?: number; categoryId?: string }) {
    const response = await this.client.get('/admin/bia/threads', { params });
    return response.data;
  }

  async setThreadLocked(threadId: string, locked: boolean) {
    const response = await this.client.patch(`/admin/bia/threads/${threadId}`, { isLocked: locked });
    return response.data;
  }

  async deleteThread(threadId: string) {
    const response = await this.client.delete(`/admin/bia/threads/${threadId}`);
    return response.data;
  }

  async getBusinessListings(params?: { page?: number; limit?: number; approved?: boolean }) {
    const response = await this.client.get('/admin/bia/listings', { params });
    return response.data;
  }

  async setListingApproved(listingId: string, approved: boolean) {
    const response = await this.client.patch(`/admin/bia/listings/${listingId}`, { isApproved: approved });
    return response.data;
  }

  async getSettings() {
    const response = await this.client.get('/admin/settings');
    return response.data;
  }

  async updateSettings(data: unknown) {
    const response = await this.client.patch('/admin/settings', data);
    return response.data;
  }
}

export const adminApi = new AdminApiClient();
