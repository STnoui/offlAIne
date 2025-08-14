export interface AIModel {
  id: string;
  name: string;
  description: string;
  category: ModelCategory;
  size: number; // in MB
  performanceTier: PerformanceTier;
  downloads: number;
  likes: number;
  rating: number;
  tags: string[];
  author: string;
  license: string;
  huggingFaceUrl: string;
  isDownloaded: boolean;
  downloadProgress?: number;
  localPath?: string;
  quantization?: QuantizationType;
  contextLength: number;
  memoryRequirement: number; // in MB
  createdAt: string;
  updatedAt: string;
}

export interface CustomModel extends Omit<AIModel, 'huggingFaceUrl' | 'downloads' | 'likes' | 'rating'> {
  isCustom: true;
  uploadedAt: string;
  filePath: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
}

export type ModelCategory = 
  | 'writing-assistant'
  | 'code-helper'
  | 'language-translation'
  | 'image-processing'
  | 'voice-processing'
  | 'specialized'
  | 'creative'
  | 'custom';

export type PerformanceTier = 'low' | 'medium' | 'high';
export type QuantizationType = 'q2_k' | 'q4_0' | 'q4_k_m' | 'q5_0' | 'q5_k_m' | 'q6_k' | 'q8_0' | 'f16' | 'f32';

export interface DeviceBenchmark {
  deviceId: string;
  deviceName: string;
  osVersion: string;
  totalMemory: number;
  availableMemory: number;
  cpuCores: number;
  cpuFrequency: number;
  storageTotal: number;
  storageAvailable: number;
  hasGpu: boolean;
  gpuName?: string;
  benchmarkScore: number;
  performanceTier: PerformanceTier;
  recommendedModels: string[];
  benchmarkedAt: string;
}

export interface BenchmarkTest {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number; // in seconds
  testType: 'cpu' | 'memory' | 'storage' | 'gpu';
  isCompleted: boolean;
  score?: number;
  details?: Record<string, any>;
}

export interface ResourceUsage {
  timestamp: number;
  cpuUsage: number; // percentage
  memoryUsage: number; // in MB
  batteryLevel: number; // percentage
  batteryDrain: number; // percentage per hour
  temperature?: number; // in celsius
  modelId?: string;
  taskType?: string;
}

export interface ModelPersonalization {
  modelId: string;
  customName?: string;
  favorited: boolean;
  lastUsed: string;
  usageCount: number;
  customSettings: Record<string, any>;
  userRating?: number;
  userNotes?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoCleanup: boolean;
  maxStorageUsage: number; // in GB
  showResourceMonitor: boolean;
  enableBackgroundDownloads: boolean;
  downloadOnlyOnWifi: boolean;
  showPerformanceWarnings: boolean;
  enableUsageAnalytics: boolean;
}

export interface DownloadProgress {
  modelId: string;
  progress: number; // 0-100
  downloadSpeed: number; // MB/s
  estimatedTimeRemaining: number; // seconds
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}