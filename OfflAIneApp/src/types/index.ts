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
export type PrecisionType = 'fp16' | 'int8' | 'int4' | 'w4a8';
export type ModelTier = 'light' | 'medium' | 'heavy';

export interface AIAccelerator {
  type: 'npu' | 'gpu' | 'cpu' | 'unknown';
  name: string;
  vendor: 'qualcomm' | 'apple' | 'google' | 'mediatek' | 'unknown';
  topsPerformance?: number; // Trillions of operations per second
  supportsInt4: boolean;
  supportsInt8: boolean;
  supportsFp16: boolean;
}

export interface QuantizationSupport {
  fp16: {
    supported: boolean;
    performance: number; // Operations per second
  };
  int8: {
    supported: boolean;
    performance: number;
  };
  int4: {
    supported: boolean;
    performance: number;
  };
  w4a8: {
    supported: boolean;
    performance: number;
  };
}

export interface AIBenchmarkResults {
  matrixMultiplication: {
    ops16x16: number; // Operations per second for 16x16 matrices
    ops32x32: number;
    ops64x64: number;
  };
  memoryBandwidth: {
    sequentialRead: number; // MB/s
    sequentialWrite: number;
    randomAccess: number;
  };
  quantizationPerformance: QuantizationSupport;
  thermalThrottling: {
    sustainedPerformance: number; // % of peak after 5 minutes
    throttleOnset: number; // Seconds until throttling starts
  };
}

export interface ModelRecommendation {
  modelId: string;
  modelName: string;
  parameters: string;
  tier: ModelTier;
  recommendedQuantization: PrecisionType;
  estimatedPerformance: {
    tokensPerSecond: number;
    memoryUsage: number; // MB
    batteryImpact: 'minimal' | 'low' | 'moderate' | 'high';
  };
  compatibilityScore: number; // 0-100
  useCases: string[];
}

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
  aiAccelerator: AIAccelerator;
  aiBenchmarkResults: AIBenchmarkResults;
  benchmarkScore: number;
  aiCapabilityScore: number; // New AI-specific score
  performanceTier: PerformanceTier;
  recommendedModels: ModelRecommendation[];
  benchmarkedAt: string;
}

export interface BenchmarkTest {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number; // in seconds
  testType: 'cpu' | 'memory' | 'storage' | 'gpu' | 'ai_matrix' | 'ai_memory' | 'ai_quantization' | 'ai_thermal';
  isCompleted: boolean;
  score?: number;
  details?: Record<string, any>;
}

export interface ModelPerformanceData {
  modelId: string;
  tier: ModelTier;
  precisionOptions: {
    precision: PrecisionType;
    memoryUsage: number; // MB
    estimatedTokensPerSec: number;
    batteryImpact: 'minimal' | 'low' | 'moderate' | 'high';
    compatible: boolean;
    recommended: boolean;
  }[];
  useCases: {
    category: string;
    suitability: 'excellent' | 'good' | 'fair' | 'poor';
    description: string;
  }[];
}

export interface ResourceUsage {
  timestamp: number;
  cpuUsage: number; // percentage
  memoryUsage: number; // in MB
  totalMemory: number; // in MB
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