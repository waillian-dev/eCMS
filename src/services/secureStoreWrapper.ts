import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
};

export const deleteSecureItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
};
