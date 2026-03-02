import * as SecureStore from 'expo-secure-store/build/SecureStore';
import axios from 'axios';
import useAuthStore, { getAuth } from '@/store/auth.store';

const API_BASE_URL = 'https://marlene-unlarcenous-nonmunicipally.ngrok-free.dev';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function saveTokens(
  accessToken?: string | null,
  refreshToken?: string | null,
  rememberMe: boolean = false
) {
  try {
    if (accessToken) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    }

    if (rememberMe && refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.log('[authSession] saveTokens failed:', error);
  }
}

export async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.log('[authSession] clearTokens failed:', error);
  }
}

export async function bootstrapAuth() {
  const store = useAuthStore.getState();
  store.setAuthReady(false);

  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      store.clearAuth();
      return { isLoggedIn: false };
    }

    const res = await authClient.post('/api/auth/refresh', { refreshToken });
    const data = res?.data || {};
    const token = data?.token;
    const rotatedRefreshToken = data?.refreshToken || refreshToken;
    const userFromApi = data?.user || {};

    if (!token) {
      throw new Error('Refresh response missing access token.');
    }

    const nextUser: any = {
      ...(getAuth().user || {}),
      ...userFromApi,
      token,
      refreshToken: rotatedRefreshToken,
    };

    await saveTokens(token, rotatedRefreshToken, true);
    store.setRememberPreference(true);
    store.setUser(nextUser);

    return { isLoggedIn: true, user: nextUser };
  } catch (error) {
    await clearTokens();
    store.clearAuth();
    console.log('[authSession] bootstrapAuth failed:', error);
    return { isLoggedIn: false, error };
  } finally {
    useAuthStore.getState().setAuthReady(true);
  }
}

export async function logout() {
  await clearTokens();
  useAuthStore.getState().clearAuth();
}
