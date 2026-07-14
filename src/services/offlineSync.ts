import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const OFFLINE_DRAFTS_KEY = 'ecms_offline_drafts';

interface OfflineDraft {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  address: string;
  createdAt: string;
}

export const saveOfflineDraft = async (draft: Omit<OfflineDraft, 'id' | 'createdAt'>): Promise<void> => {
  try {
    const existing = await getOfflineDrafts();
    const newDraft: OfflineDraft = {
      ...draft,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    const updated = [...existing, newDraft];
    await AsyncStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save offline ticket draft:', error);
    throw new Error('Save draft failed.');
  }
};

export const getOfflineDrafts = async (): Promise<OfflineDraft[]> => {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_DRAFTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to retrieve offline drafts:', error);
    return [];
  }
};

export const clearOfflineDrafts = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(OFFLINE_DRAFTS_KEY);
  } catch (error) {
    console.error('Failed to clear offline drafts storage:', error);
  }
};

export const syncOfflineDrafts = async (): Promise<{ success: number; failed: number }> => {
  const drafts = await getOfflineDrafts();
  if (drafts.length === 0) {
    return { success: 0, failed: 0 };
  }

  const results = { success: 0, failed: 0 };
  const remainingDrafts: OfflineDraft[] = [];

  for (const draft of drafts) {
    try {
      // Setup payload matching backend creation controller expectations
      const formData = new FormData();
      formData.append('title', draft.title);
      formData.append('description', draft.description);
      formData.append('categoryId', draft.categoryId);
      formData.append('address', draft.address);
      formData.append('isAnonymous', 'false');
      formData.append('longitude', '-122.4194');
      formData.append('latitude', '37.7749');

      await api.post('/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      results.success += 1;
    } catch (error) {
      console.error(`Failed to sync offline draft ${draft.id}:`, error);
      results.failed += 1;
      remainingDrafts.push(draft);
    }
  }

  // Update storage with only the drafts that failed to upload
  await AsyncStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(remainingDrafts));

  return results;
};
