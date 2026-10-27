import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set EXPO_PUBLIC_API_URL in frontend/.env, e.g.
//   https://medicare-clinic-api.onrender.com/api   (hosted)
//   http://192.168.1.10:5000/api                    (local, same Wi-Fi)
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const SERVER_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

/** Returns the server origin without /api (e.g. https://my-api.onrender.com) */
export const getServerOrigin = () => SERVER_ORIGIN;

/**
 * Builds a full URL for an uploaded file.
 * Handles absolute URLs (Cloudinary), "/uploads/x.jpg", "uploads/x.jpg" and Windows "uploads\\x.jpg".
 */
export const buildServerUrl = (path = '') => {
  if (!path) return null;
  if (/^(https?:|file:|content:|data:|blob:)/i.test(path)) return path;
  const normalizedPath = `/${String(path).replace(/\\/g, '/').replace(/^\/+/, '')}`;
  return `${SERVER_ORIGIN}${normalizedPath}`;
};

/** Pulls the most useful error message out of an axios error. */
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors[0]?.message) return data.errors[0].message;
  if (data?.message) return data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. If it was asleep, try again in a few seconds.';
  if (error?.message === 'Network Error') return 'Cannot reach the server. Check your internet connection.';
  return fallback;
};

// ── Session-expired listeners (AppNavigator logs the user out) ────────────────
const sessionExpiredListeners = new Set();
export const onSessionExpired = (fn) => {
  sessionExpiredListeners.add(fn);
  return () => sessionExpiredListeners.delete(fn);
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Free hosting (Render) can take ~30-50s to wake up after being idle
  timeout: 60000,
});

// ── Request interceptor ────────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    config.baseURL = API_BASE_URL;

    if (!config.headers.Authorization) {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      // Must not stay application/json, or axios turns the FormData into JSON.
      // React Native adds the multipart boundary itself.
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: refresh the access token once on 401 ────────────────
let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 60000 });
  const { accessToken, refreshToken: newRefreshToken } = response.data;
  await AsyncStorage.setItem('accessToken', accessToken);
  await AsyncStorage.setItem('refreshToken', newRefreshToken);
  axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  return accessToken;
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const url = originalRequest.url || '';
    const isAuthCall = /\/auth\/(login|register|refresh)/.test(url);

    // Account was deactivated by an admin → sign out everywhere
    if (error.response?.status === 403 && /deactivated/i.test(error.response?.data?.message || '') && !isAuthCall) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'cachedUser']);
      delete axiosInstance.defaults.headers.common.Authorization;
      sessionExpiredListeners.forEach((fn) => fn());
      return Promise.reject(error);
    }

    // Don't try to refresh for login/register — show the server's message instead
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      try {
        // Share one refresh between parallel requests
        refreshPromise = refreshPromise || refreshAccessToken().finally(() => { refreshPromise = null; });
        const accessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (_refreshError) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'cachedUser']);
        delete axiosInstance.defaults.headers.common.Authorization;
        sessionExpiredListeners.forEach((fn) => fn());
        return Promise.reject(error); // keep the original error/response for the screen
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
