import React, { createContext, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { View } from 'react-native';
import {
  ChecklistItemId,
  ClientInfo,
  CollectionState,
  INITIAL_CHECKLIST,
  MeasureEvidence,
  PhotoEvidence,
  VideoEvidence,
} from '../types';
import { POINTS } from '../constants';
import {
  clearPersistedCollection,
  loadPersistedCollection,
  savePersistedCollection,
} from '../utils/collectionStorage';

type Action =
  | { type: 'HYDRATE'; payload: CollectionState }
  | { type: 'SET_CLIENT_INFO'; payload: ClientInfo }
  | { type: 'MARK_CHECKLIST_DONE'; id: ChecklistItemId }
  | { type: 'ADD_MEASURE'; payload: MeasureEvidence }
  | { type: 'ADD_PHOTO'; payload: PhotoEvidence }
  | { type: 'ADD_VIDEO'; payload: VideoEvidence }
  | { type: 'SET_STEP'; step: number; maxSteps: number }
  | { type: 'RESET' };

const initialState: CollectionState = {
  clientInfo: null,
  checklist: INITIAL_CHECKLIST,
  measures: [],
  photos: [],
  videos: [],
  totalPoints: 0,
  currentStep: 1,
  maxSteps: 4,
};

function reducer(state: CollectionState, action: Action): CollectionState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'SET_CLIENT_INFO':
      return { ...state, clientInfo: action.payload };
    case 'MARK_CHECKLIST_DONE': {
      const target = state.checklist.find((item) => item.id === action.id);
      if (!target || target.done) return state;
      const checklist = state.checklist.map((item) =>
        item.id === action.id ? { ...item, done: true } : item
      );
      return { ...state, checklist, totalPoints: state.totalPoints + POINTS.CHECKLIST_ITEM };
    }
    case 'ADD_MEASURE':
      if (action.payload.itemId) {
        const exists = state.measures.some((item) => item.itemId === action.payload.itemId);
        const measures = exists
          ? state.measures.map((item) =>
              item.itemId === action.payload.itemId ? action.payload : item
            )
          : [...state.measures, action.payload];
        return {
          ...state,
          measures,
          totalPoints: state.totalPoints + (exists ? 0 : POINTS.MEASURE),
        };
      }
      return {
        ...state,
        measures: [...state.measures, action.payload],
        totalPoints: state.totalPoints + POINTS.MEASURE,
      };
    case 'ADD_PHOTO':
      if (action.payload.itemId) {
        const exists = state.photos.some((item) => item.itemId === action.payload.itemId);
        const photos = exists
          ? state.photos.map((item) =>
              item.itemId === action.payload.itemId ? action.payload : item
            )
          : [...state.photos, action.payload];
        return {
          ...state,
          photos,
          totalPoints: state.totalPoints + (exists ? 0 : POINTS.PHOTO),
        };
      }
      return {
        ...state,
        photos: [...state.photos, action.payload],
        totalPoints: state.totalPoints + POINTS.PHOTO,
      };
    case 'ADD_VIDEO':
      if (action.payload.itemId) {
        const exists = state.videos.some((item) => item.itemId === action.payload.itemId);
        const videos = exists
          ? state.videos.map((item) =>
              item.itemId === action.payload.itemId ? action.payload : item
            )
          : [...state.videos, action.payload];
        return {
          ...state,
          videos,
          totalPoints: state.totalPoints + (exists ? 0 : POINTS.VIDEO),
        };
      }
      return {
        ...state,
        videos: [...state.videos, action.payload],
        totalPoints: state.totalPoints + POINTS.VIDEO,
      };
    case 'SET_STEP':
      return { ...state, currentStep: action.step, maxSteps: action.maxSteps };
    case 'RESET':
      return { ...initialState, checklist: INITIAL_CHECKLIST };
    default:
      return state;
  }
}

const CollectionContext = createContext<{
  state: CollectionState;
  setClientInfo: (payload: ClientInfo) => void;
  completeChecklist: (id: ChecklistItemId) => void;
  addMeasure: (payload: MeasureEvidence) => void;
  addPhoto: (payload: PhotoEvidence) => void;
  addVideo: (payload: VideoEvidence) => void;
  setStep: (step: number, maxSteps: number) => void;
  reset: () => void;
} | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadPersistedCollection();
      if (cancelled) return;
      if (saved) {
        dispatch({ type: 'HYDRATE', payload: saved });
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersistedCollection(state);
  }, [state, hydrated]);

  const setClientInfo = useCallback((payload: ClientInfo) => {
    dispatch({ type: 'SET_CLIENT_INFO', payload });
  }, []);

  const completeChecklist = useCallback((id: ChecklistItemId) => {
    dispatch({ type: 'MARK_CHECKLIST_DONE', id });
  }, []);

  const addMeasure = useCallback((payload: MeasureEvidence) => {
    dispatch({ type: 'ADD_MEASURE', payload });
  }, []);

  const addPhoto = useCallback((payload: PhotoEvidence) => {
    dispatch({ type: 'ADD_PHOTO', payload });
  }, []);

  const addVideo = useCallback((payload: VideoEvidence) => {
    dispatch({ type: 'ADD_VIDEO', payload });
  }, []);

  const setStep = useCallback((step: number, maxSteps: number) => {
    dispatch({ type: 'SET_STEP', step, maxSteps });
  }, []);

  const reset = useCallback(() => {
    void clearPersistedCollection();
    dispatch({ type: 'RESET' });
  }, []);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: '#0f172a' }} />;
  }

  return (
    <CollectionContext.Provider
      value={{
        state,
        setClientInfo,
        completeChecklist,
        addMeasure,
        addPhoto,
        addVideo,
        setStep,
        reset,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection must be used within CollectionProvider');
  return ctx;
}
