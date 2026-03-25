/**
 * API client — cookie-based auth.
 *
 * Tokens live in HttpOnly cookies (access_token, refresh_token).
 * The browser sends them automatically on every request via withCredentials.
 * No token is ever read or stored by JavaScript — XSS cannot steal credentials.
 *
 * The 401 → refresh → retry interceptor is still here but it uses the
 * refresh_token cookie (sent automatically) rather than reading from Zustand.
 */
import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import type { PartnershipEnquiryPayload } from '@/lib/partnership-enquiry';

// ── API base URL ─────────────────────────────────────────────────────────────
// In the browser we MUST route through the Next.js rewrite proxy (/api/*)
// rather than directly to the API server (localhost:3000).
//
// Why: cookies (access_token, refresh_token, session) are scoped to the
// origin that sets them.  If the browser POSTs directly to localhost:3000,
// those cookies are stored under localhost:3000 and are never sent to
// localhost:3001 (the Next.js frontend) — so Next.js middleware can't see
// them and redirects every /app/* route back to /auth/login.
//
// Routing through /api/* means Next.js forwards the request server-side and
// the Set-Cookie headers in the response are attributed to localhost:3001,
// which is the same origin as the frontend. Middleware and the browser's
// withCredentials requests all work correctly.
//
// On the server (SSR/middleware) we use the direct URL — no browser involved.
const isServer = typeof window === 'undefined';
const API_BASE = isServer
  ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1`
  : '/api'; // Next.js rewrite: /api/* → localhost:3000/api/v1/*

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: Array<(ok: boolean) => void> = [];
  private refreshBlockedUntil = 0;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: { 'Content-Type': 'application/json' },
      // withCredentials sends HttpOnly cookies on every request
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // ── CSRF token injection ────────────────────────────────────────────────
    // Read the csrf-token cookie (not HttpOnly — readable by JS) and echo it
    // in the X-CSRF-Token header on every mutating request.
    // The server's CsrfMiddleware validates the header matches the cookie.
    this.client.interceptors.request.use(
      (config) => {
        if (typeof document !== 'undefined') {
          const csrfToken = document.cookie
            .split('; ')
            .find((c) => c.startsWith('csrf-token='))
            ?.split('=')[1];
          if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // ── TransformInterceptor envelope unwrap ────────────────────────────────
    // The NestJS TransformInterceptor wraps every successful response body in
    //   { data: <actual payload>, timestamp: "2026-..." }
    // Unwrap it here once so every caller in every page receives the actual
    // payload directly.  Without this, response.accessToken, response.user,
    // response.conversations, etc. are all undefined — causing silent hangs.
    this.client.interceptors.response.use(
      (response) => {
        if (
          response.config.url?.includes('/auth/login') ||
          response.config.url?.includes('/auth/me') ||
          response.config.url?.includes('/auth/refresh')
        ) {
          this.refreshBlockedUntil = 0;
        }

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
      // Error path handled by the 401-refresh interceptor below
      (error) => Promise.reject(error),
    );

    // 401 → trigger silent token refresh via refresh_token cookie, then retry.
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as typeof error.config & { _retry?: boolean };

        // Never retry refresh for auth endpoints — a 401 on login/refresh/register
        // means the credentials are wrong, not that the access token expired.
        const url = originalRequest?.url ?? '';
        const hasStoredUser = !!useAuthStore.getState().user;
        const refreshBlocked = Date.now() < this.refreshBlockedUntil;
        const isAuthEndpoint = url.includes('/auth/login') ||
                               url.includes('/auth/refresh') ||
                               url.includes('/auth/register');

        if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
          if (!hasStoredUser || refreshBlocked) {
            this.invalidateSession();
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            // Queue subsequent 401s while refresh is in flight
            return new Promise((resolve, reject) => {
              this.refreshQueue.push((ok) => {
                if (ok && originalRequest) {
                  resolve(this.client(originalRequest));
                } else {
                  reject(error);
                }
              });
            });
          }

          originalRequest!._retry = true;
          this.isRefreshing = true;

          try {
            // POST /auth/refresh — sends refresh_token cookie automatically,
            // backend sets new access_token cookie in response.
            await this.client.post('/auth/refresh', {});
            this.refreshBlockedUntil = 0;
            this.refreshQueue.forEach((cb) => cb(true));
            this.refreshQueue = [];
            return this.client(originalRequest!);
          } catch {
            this.refreshBlockedUntil = Date.now() + 10_000;
            this.refreshQueue.forEach((cb) => cb(false));
            this.refreshQueue = [];
            this.invalidateSession();
            return Promise.reject(error);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      },
    );
  }

  private invalidateSession() {
    useAuthStore.getState().logout();

    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/auth/login')) return;

    window.location.replace('/auth/login');
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  async register(data: { email: string; password: string; userType: 'veteran'; referralCode?: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async createSocketToken() {
    const response = await this.client.post('/auth/socket-token');
    return response.data;
  }

  async verifyEmail(token: string) {
    const response = await this.client.post('/auth/verify-email', { token });
    return response.data;
  }

  async resendVerification(email: string) {
    const response = await this.client.post('/auth/resend-verification', { email });
    return response.data;
  }

  async resendVerificationEmail(email: string) {
    return this.resendVerification(email);
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(
    tokenOrPayload: string | { token: string; password: string },
    password?: string,
  ) {
    const payload =
      typeof tokenOrPayload === 'string'
        ? { token: tokenOrPayload, password: password ?? '' }
        : tokenOrPayload;

    const response = await this.client.post('/auth/reset-password', payload);
    return response.data;
  }

  // ── Profile ─────────────────────────────────────────────────────────────────
  async submitContactForm(data: {
    name: string;
    email: string;
    subject: 'general' | 'support' | 'verification' | 'privacy' | 'feedback' | 'business' | 'other';
    message: string;
  }) {
    const response = await this.client.post('/email/contact', data);
    return response.data;
  }

  async submitPartnershipEnquiry(data: PartnershipEnquiryPayload) {
    const response = await this.client.post('/email/partnerships', data);
    return response.data;
  }

  async getMyProfile() {
    const response = await this.client.get('/profiles/me');
    return response.data;
  }

  async getProfile() {
    return this.getMyProfile();
  }

  async updateProfile(data: Record<string, unknown>) {
    const response = await this.client.put('/profiles/me', data);
    return response.data;
  }

  async uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post('/profiles/me/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getPublicProfile(userId: string) {
    const response = await this.client.get(`/profiles/${userId}`);
    return response.data;
  }

  // ── Veterans ─────────────────────────────────────────────────────────────────
  async getVeteranDetails() {
    const response = await this.client.get('/veterans/me');
    return response.data;
  }

  async updateVeteranDetails(data: Record<string, unknown>) {
    const response = await this.client.put('/veterans/me', data);
    return response.data;
  }

  async getServicePeriods() {
    const response = await this.client.get('/veterans/me/service-periods');
    return response.data;
  }

  async addServicePeriod(data: Record<string, unknown>) {
    const response = await this.client.post('/veterans/me/service-periods', data);
    return response.data;
  }

  async updateServicePeriod(periodId: string, data: Record<string, unknown>) {
    const response = await this.client.patch(`/veterans/me/service-periods/${periodId}`, data);
    return response.data;
  }

  async deleteServicePeriod(periodId: string) {
    const response = await this.client.delete(`/veterans/me/service-periods/${periodId}`);
    return response.data;
  }

  // ── Brothers ──────────────────────────────────────────────────────────────────
  async searchBrothers(params?: Record<string, unknown>) {
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

  // ── Connections ───────────────────────────────────────────────────────────────
  async getConnections() {
    const response = await this.client.get('/connections');
    return response.data;
  }

  async removeConnection(connectionId: string) {
    const response = await this.client.delete(`/connections/${connectionId}`);
    return response.data;
  }


  // ── Messaging ─────────────────────────────────────────────────────────────────
  async getConversations() {
    const response = await this.client.get('/messaging/conversations');
    return response.data;
  }

  async getMessages(connectionId: string, params?: { before?: string; limit?: number }) {
    const response = await this.client.get(`/messaging/${connectionId}`, { params });
    return response.data;
  }

  async sendMessage(connectionId: string, content: string) {
    const response = await this.client.post('/messaging', { connectionId, content });
    return response.data;
  }

  async markMessagesAsRead(connectionId: string) {
    const response = await this.client.post(`/messaging/${connectionId}/read`);
    return response.data;
  }

  async getUnreadCounts() {
    const response = await this.client.get('/messaging/unread');
    return response.data;
  }

  // —— Notifications ————————————————————————————————————————————————————————————————
  async getPushVapidKey() {
    const response = await this.client.get('/notifications/vapid-key');
    return response.data;
  }

  async subscribeToPushNotifications(subscription: PushSubscriptionJSON) {
    const response = await this.client.post('/notifications/subscribe', subscription);
    return response.data;
  }

  async unsubscribeFromPushNotifications(endpoint: string) {
    const response = await this.client.delete('/notifications/unsubscribe', {
      data: { endpoint },
    });
    return response.data;
  }

  // ── Moderation ────────────────────────────────────────────────────────────────
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

  // ── Verification ──────────────────────────────────────────────────────────────
  async submitVerification(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await this.client.post('/verification/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getVerificationStatus() {
    const response = await this.client.get('/verification/status');
    return response.data;
  }

  // ── GDPR ──────────────────────────────────────────────────────────────────────
  async deleteAccount() {
    const response = await this.client.delete('/users/me');
    return response.data;
  }

  async exportUserData() {
    const response = await this.client.get('/users/me/export');
    return response.data;
  }

  // ── Photos ────────────────────────────────────────────────────────────────────
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

  // ── Subscriptions ─────────────────────────────────────────────────────────────
  async getSubscription() {
    const response = await this.client.get('/subscriptions/me');
    return response.data;
  }

  async getReferralSummary() {
    const response = await this.client.get('/subscriptions/referrals');
    return response.data;
  }

  async getReferralHub() {
    const response = await this.client.get('/referrals/me');
    return response.data;
  }

  async ensureReferralCode() {
    const response = await this.client.post('/referrals/me/code');
    return response.data;
  }

  async recordReferralShare(data: { channel: string; surface?: string; connectionId?: string }) {
    const response = await this.client.post('/referrals/share', data);
    return response.data;
  }

  async getSubscriptionPrices() {
    const response = await this.client.get('/subscriptions/prices');
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

  // ── BIA Forums ────────────────────────────────────────────────────────────────
  async getBiaForumCategories() {
    const response = await this.client.get('/bia/forums');
    return response.data;
  }

  async getForumThreads(slug: string, page = 1) {
    const response = await this.client.get(`/bia/forums/${slug}/threads`, { params: { page } });
    return response.data;
  }

  async createForumThread(slug: string, data: { title: string; content: string }) {
    const response = await this.client.post(`/bia/forums/${slug}/threads`, data);
    return response.data;
  }

  async getForumThread(threadId: string, page = 1) {
    const response = await this.client.get(`/bia/threads/${threadId}`, { params: { page } });
    return response.data;
  }

  async createForumPost(threadId: string, content: string) {
    const response = await this.client.post(`/bia/threads/${threadId}/posts`, { content });
    return response.data;
  }

  // ── BIA Business Directory ────────────────────────────────────────────────────
  async getBusinessDirectory(category?: string) {
    const response = await this.client.get('/bia/directory', { params: category ? { category } : undefined });
    return response.data;
  }

  async getMyBusinessListing() {
    const response = await this.client.get('/bia/directory/mine');
    return response.data;
  }

  async createBusinessListing(data: Record<string, unknown>) {
    const response = await this.client.post('/bia/directory', data);
    return response.data;
  }

  async createBusinessJobListing(data: Record<string, unknown>) {
    const response = await this.client.post('/bia/directory/jobs', data);
    return response.data;
  }

  async updateBusinessJobListingStatus(jobId: string, isActive: boolean) {
    const response = await this.client.patch(`/bia/directory/jobs/${jobId}`, { isActive });
    return response.data;
  }

  async applyToBusinessJobListing(jobId: string, data: { message?: string; file: File }) {
    const formData = new FormData();
    if (data.message) formData.append('message', data.message);
    formData.append('file', data.file);

    const response = await this.client.post(`/bia/directory/jobs/${jobId}/apply`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // ── BIA Mentorship ────────────────────────────────────────────────────────────
  async getMentors() {
    const response = await this.client.get('/bia/mentorship');
    return response.data;
  }

  async getMentorRequests() {
    const response = await this.client.get('/bia/mentorship/requests');
    return response.data;
  }

  async createMentorProfile(data: Record<string, unknown>) {
    const response = await this.client.post('/bia/mentorship/profile', data);
    return response.data;
  }

  async upsertMentorProfile(data: Record<string, unknown>) {
    return this.createMentorProfile(data);
  }

  async sendMentorRequest(
    mentorIdOrPayload: string | { mentorId: string; message?: string },
    message?: string,
  ) {
    const payload =
      typeof mentorIdOrPayload === 'string'
        ? { mentorId: mentorIdOrPayload, message }
        : mentorIdOrPayload;

    const response = await this.client.post('/bia/mentorship/request', payload);
    return response.data;
  }

  async respondToMentorRequest(requestId: string, accept: boolean) {
    const response = await this.client.post(`/bia/mentorship/request/${requestId}/respond`, { accept });
    return response.data;
  }

  // ── BIA Career Resources ──────────────────────────────────────────────────────
  async getCareerResources(category?: string) {
    const response = await this.client.get('/bia/careers', { params: category ? { category } : undefined });
    return response.data;
  }

  // ── Regiment Forums ───────────────────────────────────────────────────────────
  /** Public — returns all UK regiments with their member user counts. */
  async getRegiments() {
    const response = await this.client.get('/bia/regiments');
    return response.data;
  }

  /** Returns the 5 forum categories for a regiment. Requires the caller to belong to it. */
  async getRegimentForumCategories(slug: string) {
    const response = await this.client.get(`/bia/regiments/${slug}/forums`);
    return response.data;
  }
}

export const api = new ApiClient();
