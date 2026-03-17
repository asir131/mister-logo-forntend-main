import { isAuthError } from '@/lib/error';
import useAuthStore, { getAuth } from '@/store/auth.store';
import { clearTokens, saveTokens } from '@/services/authSession';
import axios from 'axios';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

const API_BASE_URL =
  // 'https://ungustatory-erringly-ralph.ngrok-free.dev';
  'https://unap-backend-833630612791.us-central1.run.app';

export const SOCIAL_AUTH_BASE_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    'Content-Type': 'application/json',
  },
});

let isRedirectingToLogin = false;
let lastLoginToastAt = 0;
let authRedirectLockUntil = 0;

const getErrorMessage = (err: unknown) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
};

const isPublicAuthEndpoint = (url?: string) =>
  typeof url === 'string' &&
  /\/api\/auth\/(register|verify-otp|login|refresh|firebase|forgot-password|verify-reset-otp|reset-password)(?:\/|$)/.test(
    url
  );

api.interceptors.request.use(
  async config => {
    const token = getAuth().user?.token;
    const isPublicAuthRoute = isPublicAuthEndpoint(config.url);

    if (token && !isPublicAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (isPublicAuthRoute && config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response.data,
  async error => {
    const status = error.response?.status;
    const authError = isAuthError(error);
    const requestMethod = String(error?.config?.method || 'get').toUpperCase();
    const requestUrl = String(error?.config?.url || '');

    const showLoginToastOnce = () => {
      const now = Date.now();
      if (now - lastLoginToastAt < 3000) return;
      lastLoginToastAt = now;
      Toast.show({
        type: 'error',
        text1: 'Please login',
        text2: 'Session expired. Please login again.',
      });
    };

    if (!authError) {
      console.log(
        'API Error:',
        {
          method: requestMethod,
          url: requestUrl,
          status,
          error: error?.response?.data || getErrorMessage(error),
        }
      );
    }

    const originalRequest = error.config || {};
    const isPublicAuthCall = isPublicAuthEndpoint(originalRequest?.url);

    if (status === 401 && !originalRequest._retry && !isPublicAuthCall) {
      const authState = getAuth();
      const refreshToken = authState.user?.refreshToken;
      const hasAccessToken = Boolean(authState.user?.token);
      const now = Date.now();
      const canRedirectNow = now >= authRedirectLockUntil;

      if (!refreshToken) {
        // Only force-redirect if a logged-in session actually existed.
        // If already logged out, avoid repeated login-route refresh loops.
        if (hasAccessToken && canRedirectNow) {
          await clearTokens();
          useAuthStore.getState().clearAuth();
          showLoginToastOnce();
          authRedirectLockUntil = now + 10000;
          if (!isRedirectingToLogin) {
            isRedirectingToLogin = true;
            router.replace('/(auth)/login');
            setTimeout(() => {
              isRedirectingToLogin = false;
            }, 2000);
          }
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshClient = axios.create({
          baseURL: api.defaults.baseURL,
          headers: { 'Content-Type': 'application/json' },
        });
        const res = await refreshClient.post('/api/auth/refresh', {
          refreshToken,
        });
        const data = res?.data || {};
        const newToken = data?.token;
        const newRefresh = data?.refreshToken || refreshToken;
        const user = data?.user;

        if (newToken) {
          const current = getAuth().user;
          const rememberMe = Boolean(getAuth().rememberMe);
          const mergedUser = {
            ...(current || {}),
            ...(user || {}),
            token: newToken,
            refreshToken: newRefresh,
          };
          useAuthStore.getState().setUser(mergedUser as any);
          await saveTokens(newToken, newRefresh, rememberMe);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        if (!isAuthError(refreshErr)) {
          console.log('Refresh token failed:', getErrorMessage(refreshErr));
        }
      }

      if (hasAccessToken && canRedirectNow) {
        await clearTokens();
        useAuthStore.getState().clearAuth();
        showLoginToastOnce();
        authRedirectLockUntil = Date.now() + 10000;
        if (!isRedirectingToLogin) {
          isRedirectingToLogin = true;
          router.replace('/(auth)/login');
          setTimeout(() => {
            isRedirectingToLogin = false;
          }, 2000);
        }
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;


