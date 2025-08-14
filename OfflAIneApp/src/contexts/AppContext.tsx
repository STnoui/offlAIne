import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AIModel, CustomModel, DeviceBenchmark, AppSettings, ModelPersonalization, ResourceUsage } from '../types';

interface AppState {
  models: AIModel[];
  customModels: CustomModel[];
  personalizations: Record<string, ModelPersonalization>;
  deviceBenchmark: DeviceBenchmark | null;
  settings: AppSettings;
  resourceUsage: ResourceUsage[];
  isOffline: boolean;
  isLoading: boolean;
}

type AppAction =
  | { type: 'SET_MODELS'; payload: AIModel[] }
  | { type: 'ADD_CUSTOM_MODEL'; payload: CustomModel }
  | { type: 'UPDATE_MODEL_DOWNLOAD'; payload: { modelId: string; progress?: number; isDownloaded?: boolean; localPath?: string } }
  | { type: 'SET_DEVICE_BENCHMARK'; payload: DeviceBenchmark }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_PERSONALIZATION'; payload: { modelId: string; personalization: Partial<ModelPersonalization> } }
  | { type: 'ADD_RESOURCE_USAGE'; payload: ResourceUsage }
  | { type: 'SET_OFFLINE_STATUS'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'REMOVE_MODEL'; payload: string };

const initialState: AppState = {
  models: [],
  customModels: [],
  personalizations: {},
  deviceBenchmark: null,
  settings: {
    theme: 'system',
    language: 'en',
    autoCleanup: true,
    maxStorageUsage: 5,
    showResourceMonitor: true,
    enableBackgroundDownloads: true,
    downloadOnlyOnWifi: false,
    showPerformanceWarnings: true,
    enableUsageAnalytics: false,
  },
  resourceUsage: [],
  isOffline: false,
  isLoading: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_MODELS':
      return { ...state, models: action.payload };
    
    case 'ADD_CUSTOM_MODEL':
      return { ...state, customModels: [...state.customModels, action.payload] };
    
    case 'UPDATE_MODEL_DOWNLOAD':
      return {
        ...state,
        models: state.models.map(model =>
          model.id === action.payload.modelId
            ? { ...model, ...action.payload }
            : model
        ),
      };
    
    case 'SET_DEVICE_BENCHMARK':
      return { ...state, deviceBenchmark: action.payload };
    
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    
    case 'UPDATE_PERSONALIZATION':
      const { modelId, personalization } = action.payload;
      return {
        ...state,
        personalizations: {
          ...state.personalizations,
          [modelId]: { ...state.personalizations[modelId], ...personalization },
        },
      };
    
    case 'ADD_RESOURCE_USAGE':
      return {
        ...state,
        resourceUsage: [...state.resourceUsage.slice(-99), action.payload], // Keep last 100 entries
      };
    
    case 'SET_OFFLINE_STATUS':
      return { ...state, isOffline: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'REMOVE_MODEL':
      return {
        ...state,
        models: state.models.filter(model => model.id !== action.payload),
        customModels: state.customModels.filter(model => model.id !== action.payload),
      };
    
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};