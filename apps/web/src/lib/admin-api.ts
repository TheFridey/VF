import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class AdminApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.client.interceptors.request.use((config) => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Dashboard
  async getDashboardStats() {
    const response = await this.client.get('/admin/dashboard');
    return response.data;
  }

  async getSystemHealth() {
    const response = await this.client.get('/admin/health');
    return response.data;
  }

  // Users
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

  // Verification
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

  // Reports
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

  async resolveReport(reportId: string, data: {
    action: 'DISMISSED' | 'WARNING' | 'SUSPEND_7_DAYS' | 'SUSPEND_30_DAYS' | 'PERMANENT_BAN';
    notes?: string;
  }) {
    const response = await this.client.post(`/moderation/reports/${reportId}/resolve`, data);
    return response.data;
  }

  async getModerationStats() {
    const response = await this.client.get('/moderation/stats');
    return response.data;
  }

  // Audit Logs
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

  // Settings
  async getSettings() {
    const response = await this.client.get('/admin/settings');
    return response.data;
  }

  async updateSettings(data: any) {
    const response = await this.client.patch('/admin/settings', data);
    return response.data;
  }
}

export const adminApi = new AdminApiClient();
