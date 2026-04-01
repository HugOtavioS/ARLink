import React, { createContext, useCallback, useContext, useReducer } from 'react';
import {
  ChecklistItem,
  ChecklistItemId,
  CollectionState,
  INITIAL_CHECKLIST,
  MeasureEvidence,
  PhotoEvidence,
  VideoEvidence,
} from '../types';
import { POINTS } from '../constants';

type Action =
  | { type: 'SET_CHECKLIST'; payload: ChecklistItem[] }
  | { type: 'TOGGLE_CHECKLIST'; id: ChecklistItemId }
  | { type: 'ADD_MEASURE'; payload: MeasureEvidence }
  | { type: 'ADD_PHOTO'; payload: PhotoEvidence }
  | { type: 'ADD_VIDEO'; payload: VideoEvidence }
  | { type: 'SET_STEP'; step: number; maxSteps: number }
  | { type: 'RESET' };

const initialState: CollectionState = {
  checklist: INITIAL_CHECKLIST,
  measures: [],
  photos: [],
  videos: [],
  totalPoints: 0,
  currentStep: 1,
  maxSteps: 7,
};

function reducer(state: CollectionState, action: Action): CollectionState {
  switch (action.type) {
    case 'SET_CHECKLIST':
      return { ...state, checklist: action.payload };
    case 'TOGGLE_CHECKLIST': {
      const checklist = state.checklist.map((item) =>
        item.id === action.id ? { ...item, done: !item.done } : item
      );
      const toggledItem = checklist.find((c) => c.id === action.id);
      const addedPoints = toggledItem?.done ? POINTS.CHECKLIST_ITEM : 0;
      return { ...state, checklist, totalPoints: state.totalPoints + addedPoints };
    }
    case 'ADD_MEASURE':
      return {
        ...state,
        measures: [...state.measures, action.payload],
        totalPoints: state.totalPoints + POINTS.MEASURE,
      };
    case 'ADD_PHOTO':
      return {
        ...state,
        photos: [...state.photos, action.payload],
        totalPoints: state.totalPoints + POINTS.PHOTO,
      };
    case 'ADD_VIDEO':
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
  toggleChecklist: (id: ChecklistItemId) => void;
  addMeasure: (payload: MeasureEvidence) => void;
  addPhoto: (payload: PhotoEvidence) => void;
  addVideo: (payload: VideoEvidence) => void;
  setStep: (step: number, maxSteps: number) => void;
  reset: () => void;
} | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const toggleChecklist = useCallback((id: ChecklistItemId) => {
    dispatch({ type: 'TOGGLE_CHECKLIST', id });
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
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <CollectionContext.Provider
      value={{
        state,
        toggleChecklist,
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
