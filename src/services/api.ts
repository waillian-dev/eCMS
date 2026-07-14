import axios from 'axios';
import { getSecureItem, setSecureItem, deleteSecureItem } from './secureStoreWrapper';
import { Platform } from 'react-native';

// Resolve appropriate backend address depending on run context
const getBackendUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api/v1'; // Default emulator gateway
  }
  return 'http://localhost:5001/api/v1'; // iOS / Web local address
};

export const api = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach access token on outgoing queries
api.interceptors.request.use(
  async (config) => {
    const token = await getSecureItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle session refreshing
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getSecureItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${getBackendUrl()}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data;

          await setSecureItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          return api(originalRequest);
        } catch (refreshErr) {
          await cleanAuthSession();
        }
      } else {
        await cleanAuthSession();
      }
    }
    return Promise.reject(error);
  }
);

export const cleanAuthSession = async () => {
  await deleteSecureItem('accessToken');
  await deleteSecureItem('refreshToken');
  await deleteSecureItem('user');
};
