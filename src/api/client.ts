import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/app/lib/config';
import { clearStoredSession, readStoredSession, writeStoredSession } from '@/app/lib/session';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.config.headers.Authorization = `Bearer ${token}`;
      prom.resolve(apiClient(prom.config));
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Bearer token and user headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const session = readStoredSession();
    let token = session?.accessToken;

    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken') || localStorage.getItem('kfpcl_token') || undefined;
    }

    if (token === 'undefined' || token === 'null' || !token?.trim()) {
      token = undefined;
    }

    if (token) {
      const authHeader = `Bearer ${token.trim()}`;
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', authHeader);
      } else {
        config.headers.Authorization = authHeader;
      }
    }

    // Retain X-User-Email and X-Phone-Number for buyer endpoints compatibility as fallback
    const email = session?.email || (typeof window !== 'undefined' ? localStorage.getItem('kfpcl_user_email') : null);
    const phone = session?.phoneNumber || (typeof window !== 'undefined' ? localStorage.getItem('kfpcl_user_phone') : null);

    if (email) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('X-User-Email', email);
      } else {
        config.headers['X-User-Email'] = email;
      }
    }
    if (phone) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('X-Phone-Number', phone);
      } else {
        config.headers['X-Phone-Number'] = phone;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-refresh on 401 without wiping session on background failures
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints
    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/refresh') ||
      requestUrl.includes('/api/auth/verify-otp') ||
      requestUrl.includes('/api/auth/signup') ||
      requestUrl.includes('/api/auth/send-otp') ||
      requestUrl.includes('/api/auth/firebase-login');

    if (error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const session = readStoredSession();
      const refreshToken =
        session?.refreshToken ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('refreshToken') || localStorage.getItem('kfpcl_refresh_token')
          : null);

      if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const data = response.data?.data || response.data;
        const newAccessToken = data?.accessToken;
        const newRefreshToken = data?.refreshToken || refreshToken;

        if (newAccessToken) {
          if (session) {
            writeStoredSession({
              ...session,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            });
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('kfpcl_token', newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            localStorage.setItem('kfpcl_refresh_token', newRefreshToken);
          }

          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh response missing access token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Do not wipe the user's stored session on background refresh failure;
        // let the UI prompt re-authentication via modal when user performs an action
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
