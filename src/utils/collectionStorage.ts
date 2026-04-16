import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CollectionState } from '../types';
import { INITIAL_CHECKLIST } from '../types';

const STORAGE_KEY = '@pint_collection_v1';

function normalizeState(parsed: Partial<CollectionState> | null): CollectionState | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const clientInfo =
    parsed.clientInfo &&
    typeof parsed.clientInfo.fullName === 'string' &&
    typeof parsed.clientInfo.phone === 'string' &&
    typeof parsed.clientInfo.email === 'string' &&
    typeof parsed.clientInfo.address === 'string'
      ? parsed.clientInfo
      : null;

  return {
    clientInfo,
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist : INITIAL_CHECKLIST,
    measures: Array.isArray(parsed.measures) ? parsed.measures : [],
    photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    videos: Array.isArray(parsed.videos) ? parsed.videos : [],
    totalPoints: typeof parsed.totalPoints === 'number' ? parsed.totalPoints : 0,
    currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 1,
    maxSteps: typeof parsed.maxSteps === 'number' ? parsed.maxSteps : 4,
  };
}

export async function loadPersistedCollection(): Promise<CollectionState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CollectionState>;
    return normalizeState(parsed);
  } catch {
    return null;
  }
}

export async function savePersistedCollection(state: CollectionState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export async function clearPersistedCollection(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
