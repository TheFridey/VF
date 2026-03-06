import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refreshToken,
              });
              
              const { accessToken, refreshToken: newRefreshToken } = response.data;
              useAuthStore.getState().setTokens(accessToken, newRefreshToken);
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            useAuthStore.getState().logout();
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: { email: string; password: string; userType: 'veteran' }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(data: { token: string; password: string }) {
    const response = await this.client.post('/auth/reset-password', data);
    return response.data;
  }

  async verifyEmail(token: string) {
    const response = await this.client.get(`/auth/verify-email?token=${token}`);
    return response.data;
  }

  // Profile endpoints
  async getProfile() {
    const response = await this.client.get('/profiles/me');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.patch('/profiles/me', data);
    return response.data;
  }

  async uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await this.client.post('/profiles/me/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getPublicProfile(userId: string) {
    const response = await this.client.get(`/profiles/${userId}`);
    return response.data;
  }

  // Veteran endpoints
  async getVeteranDetails() {
    const response = await this.client.get('/veterans/me');
    return response.data;
  }

  async updateVeteranDetails(data: any) {
    const response = await this.client.put('/veterans/me', data);
    return response.data;
  }

  async getServicePeriods() {
    const response = await this.client.get('/veterans/me/service-periods');
    return response.data;
  }

  async addServicePeriod(data: any) {
    const response = await this.client.post('/veterans/me/service-periods', data);
    return response.data;
  }

  async updateServicePeriod(periodId: string, data: any) {
    const response = await this.client.patch(`/veterans/me/service-periods/${periodId}`, data);
    return response.data;
  }

  async deleteServicePeriod(periodId: string) {
    const response = await this.client.delete(`/veterans/me/service-periods/${periodId}`);
    return response.data;
  }

  // Brothers endpoints
  async searchBrothers(params?: any) {
    const response = await this.client.get('/brothers/search', { params });
    return response.data;
  }

  async sendConnectionRequest(userId: string, message?: string) {
    const response = await this.client.post(`/brothers/${userId}/connect`, { message });
    return response.data;
  }

  async getConnectionRequests() {
    const response = await this.client.get('/brothers/requests');
    return response.data;
  }

  async respondToConnection(requestId: string, accept: boolean) {
    const response = await this.client.post(`/brothers/requests/${requestId}/respond`, { accept });
    return response.data;
  }

  // Matches endpoints
  async getMatches() {
    const response = await this.client.get('/matches');
    return response.data;
  }

  async unmatch(matchId: string) {
    const response = await this.client.delete(`/matches/${matchId}`);
    return response.data;
  }

  // Messaging endpoints
  async getConversations() {
    const response = await this.client.get('/messaging/conversations');
    return response.data;
  }

  async getMessages(matchId: string, params?: { before?: string; limit?: number }) {
    const response = await this.client.get(`/messaging/${matchId}`, { params });
    return response.data;
  }

  async sendMessage(matchId: string, content: string) {
    const response = await this.client.post('/messaging', { matchId, content });
    return response.data;
  }

  async markMessagesAsRead(matchId: string) {
    const response = await this.client.post(`/messaging/${matchId}/read`);
    return response.data;
  }

  async getUnreadCounts() {
    const response = await this.client.get('/messaging/unread');
    return response.data;
  }

  // Moderation endpoints
  async reportUser(data: { reportedUserId: string; reason: string; description?: string }) {
    const response = await this.client.post('/moderation/reports', data);
    return response.data;
  }

  async blockUser(userId: string, reason?: string) {
    const response = await this.client.post('/moderation/blocks', { blockedUserId: userId, reason });
    return response.data;
  }

  async unblockUser(userId: string) {
    const response = await this.client.delete(`/moderation/blocks/${userId}`);
    return response.data;
  }

  async getBlockedUsers() {
    const response = await this.client.get('/moderation/blocks');
    return response.data;
  }

  // Verification endpoints
  async submitVerification(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('evidence', file));
    const response = await this.client.post('/verification/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getVerificationStatus() {
    const response = await this.client.get('/verification/status');
    return response.data;
  }

  // GDPR endpoints
  async deleteAccount() {
    const response = await this.client.delete('/users/me');
    return response.data;
  }

  async exportUserData() {
    const response = await this.client.get('/users/me/export');
    return response.data;
  }

  // Photo endpoints
  async getMyPhotos() {
    const response = await this.client.get('/uploads/photos');
    return response.data;
  }

  async uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post('/uploads/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deletePhoto(photoId: string) {
    const response = await this.client.delete(`/uploads/photos/${photoId}`);
    return response.data;
  }

  async setPrimaryPhoto(photoId: string) {
    const response = await this.client.patch(`/uploads/photos/${photoId}/primary`);
    return response.data;
  }

  async reorderPhotos(photoIds: string[]) {
    const response = await this.client.patch('/uploads/photos/reorder', { photoIds });
    return response.data;
  }

  // Subscription endpoints
  async getSubscription() {
    const response = await this.client.get('/subscriptions/me');
    return response.data;
  }

  async createCheckoutSession(priceId: string) {
    const response = await this.client.post('/subscriptions/checkout', { priceId });
    return response.data;
  }

  async createPortalSession() {
    const response = await this.client.post('/subscriptions/portal');
    return response.data;
  }

  async cancelSubscription() {
    const response = await this.client.post('/subscriptions/cancel');
    return response.data;
  }
}

export const api = new ApiClient();
