import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIModel, CustomModel, DownloadProgress, ModelPersonalization } from '../types';

const MODELS_DIRECTORY = `${RNFS.DocumentDirectoryPath}/offlaine_models`;
const DOWNLOADS_STATE_KEY = 'model_downloads_state';
const PERSONALIZATIONS_KEY = 'model_personalizations';
const STORAGE_ANALYTICS_KEY = 'storage_analytics';

interface StorageAnalytics {
  totalModelsSize: number;
  modelCount: number;
  lastCleanup: string;
  spaceAvailable: number;
  spaceUsed: number;
}

interface DownloadState {
  [modelId: string]: {
    progress: number;
    status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
    localPath?: string;
    downloadedSize: number;
    totalSize: number;
    error?: string;
    startedAt: string;
  };
}

export class ModelManagementService {
  private static instance: ModelManagementService;
  private downloadStates: DownloadState = {};

  public static getInstance(): ModelManagementService {
    if (!ModelManagementService.instance) {
      ModelManagementService.instance = new ModelManagementService();
    }
    return ModelManagementService.instance;
  }

  constructor() {
    this.initializeStorage();
    this.loadDownloadStates();
  }

  private async initializeStorage(): Promise<void> {
    try {
      const exists = await RNFS.exists(MODELS_DIRECTORY);
      if (!exists) {
        await RNFS.mkdir(MODELS_DIRECTORY);
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  private async loadDownloadStates(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(DOWNLOADS_STATE_KEY);
      if (saved) {
        this.downloadStates = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load download states:', error);
    }
  }

  private async saveDownloadStates(): Promise<void> {
    try {
      await AsyncStorage.setItem(DOWNLOADS_STATE_KEY, JSON.stringify(this.downloadStates));
    } catch (error) {
      console.error('Failed to save download states:', error);
    }
  }

  async downloadModel(
    model: AIModel,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    try {
      const modelId = model.id;
      const modelPath = `${MODELS_DIRECTORY}/${this.sanitizeFileName(modelId)}`;
      
      // Initialize download state
      this.downloadStates[modelId] = {
        progress: 0,
        status: 'pending',
        downloadedSize: 0,
        totalSize: model.size * 1024 * 1024, // Convert MB to bytes
        startedAt: new Date().toISOString(),
      };

      await this.saveDownloadStates();

      // Simulate model download (In real implementation, this would download from HuggingFace)
      const success = await this.simulateModelDownload(model, modelPath, onProgress);

      if (success) {
        this.downloadStates[modelId].status = 'completed';
        this.downloadStates[modelId].progress = 100;
        this.downloadStates[modelId].localPath = modelPath;
      } else {
        this.downloadStates[modelId].status = 'failed';
        this.downloadStates[modelId].error = 'Download failed';
      }

      await this.saveDownloadStates();
      await this.updateStorageAnalytics();

      return success;
    } catch (error) {
      console.error('Download failed:', error);
      
      if (this.downloadStates[model.id]) {
        this.downloadStates[model.id].status = 'failed';
        this.downloadStates[model.id].error = error.message;
        await this.saveDownloadStates();
      }
      
      return false;
    }
  }

  private async simulateModelDownload(
    model: AIModel,
    modelPath: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    const modelId = model.id;
    const totalSize = model.size * 1024 * 1024;
    const chunkSize = Math.max(totalSize / 100, 1024 * 1024); // At least 1MB chunks
    
    try {
      // Create model directory
      await RNFS.mkdir(modelPath);
      
      // Create model metadata file
      const metadata = {
        model,
        downloadedAt: new Date().toISOString(),
        version: '1.0',
        format: 'gguf', // Default format
      };
      
      await RNFS.writeFile(
        `${modelPath}/metadata.json`,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      // Simulate download progress
      let downloadedSize = 0;
      this.downloadStates[modelId].status = 'downloading';

      while (downloadedSize < totalSize && this.downloadStates[modelId].status === 'downloading') {
        // Simulate download chunk
        const currentChunk = Math.min(chunkSize, totalSize - downloadedSize);
        downloadedSize += currentChunk;

        const progress = (downloadedSize / totalSize) * 100;
        const downloadSpeed = chunkSize / 1024 / 1024; // MB/s simulation
        const remainingBytes = totalSize - downloadedSize;
        const estimatedTimeRemaining = remainingBytes / (downloadSpeed * 1024 * 1024);

        // Update internal state
        this.downloadStates[modelId].progress = progress;
        this.downloadStates[modelId].downloadedSize = downloadedSize;

        // Call progress callback
        onProgress?.({
          modelId,
          progress,
          downloadSpeed,
          estimatedTimeRemaining,
          status: 'downloading',
        });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Create model file (placeholder)
      const modelFile = `${modelPath}/model.gguf`;
      await RNFS.writeFile(modelFile, `Model data for ${model.name}`, 'utf8');

      return true;
    } catch (error) {
      console.error('Simulation download failed:', error);
      return false;
    }
  }

  async pauseDownload(modelId: string): Promise<void> {
    if (this.downloadStates[modelId]) {
      this.downloadStates[modelId].status = 'paused';
      await this.saveDownloadStates();
    }
  }

  async resumeDownload(modelId: string): Promise<void> {
    if (this.downloadStates[modelId]) {
      this.downloadStates[modelId].status = 'downloading';
      await this.saveDownloadStates();
    }
  }

  async cancelDownload(modelId: string): Promise<void> {
    if (this.downloadStates[modelId]) {
      this.downloadStates[modelId].status = 'cancelled';
      
      // Clean up partial download
      const modelPath = `${MODELS_DIRECTORY}/${this.sanitizeFileName(modelId)}`;
      const exists = await RNFS.exists(modelPath);
      if (exists) {
        await RNFS.unlink(modelPath);
      }
      
      delete this.downloadStates[modelId];
      await this.saveDownloadStates();
      await this.updateStorageAnalytics();
    }
  }

  async deleteModel(modelId: string): Promise<boolean> {
    try {
      const modelPath = `${MODELS_DIRECTORY}/${this.sanitizeFileName(modelId)}`;
      const exists = await RNFS.exists(modelPath);
      
      if (exists) {
        await RNFS.unlink(modelPath);
      }
      
      // Remove from download states
      delete this.downloadStates[modelId];
      await this.saveDownloadStates();
      
      // Remove personalization data
      await this.removePersonalization(modelId);
      
      await this.updateStorageAnalytics();
      return true;
    } catch (error) {
      console.error('Failed to delete model:', error);
      return false;
    }
  }

  async getDownloadedModels(): Promise<AIModel[]> {
    try {
      const models: AIModel[] = [];
      const modelDirs = await RNFS.readDir(MODELS_DIRECTORY);
      
      for (const dir of modelDirs) {
        if (dir.isDirectory()) {
          const metadataPath = `${dir.path}/metadata.json`;
          const exists = await RNFS.exists(metadataPath);
          
          if (exists) {
            const metadataStr = await RNFS.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataStr);
            
            models.push({
              ...metadata.model,
              isDownloaded: true,
              localPath: dir.path,
            });
          }
        }
      }
      
      return models;
    } catch (error) {
      console.error('Failed to get downloaded models:', error);
      return [];
    }
  }

  async isModelDownloaded(modelId: string): Promise<boolean> {
    const modelPath = `${MODELS_DIRECTORY}/${this.sanitizeFileName(modelId)}`;
    return await RNFS.exists(modelPath);
  }

  getDownloadProgress(modelId: string): DownloadProgress | null {
    const state = this.downloadStates[modelId];
    if (!state) return null;

    return {
      modelId,
      progress: state.progress,
      downloadSpeed: 0, // Would be calculated in real implementation
      estimatedTimeRemaining: 0,
      status: state.status,
      error: state.error,
    };
  }

  // Storage optimization methods
  async optimizeStorage(): Promise<{ spaceSaved: number; optimizationsApplied: string[] }> {
    const optimizations: string[] = [];
    let spaceSaved = 0;

    try {
      // 1. Remove duplicate models
      const duplicates = await this.findDuplicateModels();
      for (const duplicate of duplicates) {
        await this.deleteModel(duplicate);
        spaceSaved += 100 * 1024 * 1024; // Estimated 100MB saved per duplicate
        optimizations.push(`Removed duplicate: ${duplicate}`);
      }

      // 2. Compress old models
      const oldModels = await this.findOldModels(30); // Models older than 30 days
      for (const modelId of oldModels) {
        const compressed = await this.compressModel(modelId);
        if (compressed) {
          spaceSaved += 50 * 1024 * 1024; // Estimated 50MB saved per compression
          optimizations.push(`Compressed old model: ${modelId}`);
        }
      }

      // 3. Clean cache files
      const cacheCleared = await this.clearTempFiles();
      spaceSaved += cacheCleared;
      if (cacheCleared > 0) {
        optimizations.push(`Cleared ${Math.round(cacheCleared / 1024 / 1024)}MB cache`);
      }

      await this.updateStorageAnalytics();

      return { spaceSaved, optimizationsApplied: optimizations };
    } catch (error) {
      console.error('Storage optimization failed:', error);
      return { spaceSaved: 0, optimizationsApplied: [] };
    }
  }

  private async findDuplicateModels(): Promise<string[]> {
    // Simplified duplicate detection - in real implementation would use file hashing
    const models = await this.getDownloadedModels();
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const model of models) {
      const key = `${model.name}_${model.size}`;
      if (seen.has(key)) {
        duplicates.push(model.id);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  private async findOldModels(daysOld: number): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldModels: string[] = [];
    const models = await this.getDownloadedModels();

    for (const model of models) {
      const downloadDate = new Date(model.createdAt);
      if (downloadDate < cutoffDate) {
        oldModels.push(model.id);
      }
    }

    return oldModels;
  }

  private async compressModel(modelId: string): Promise<boolean> {
    // Placeholder for model compression
    // In real implementation, would use compression algorithms
    try {
      const modelPath = `${MODELS_DIRECTORY}/${this.sanitizeFileName(modelId)}`;
      const exists = await RNFS.exists(modelPath);
      
      if (exists) {
        // Simulate compression by adding a compressed flag
        const metadataPath = `${modelPath}/metadata.json`;
        const metadataStr = await RNFS.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataStr);
        
        metadata.compressed = true;
        metadata.compressedAt = new Date().toISOString();
        
        await RNFS.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to compress model ${modelId}:`, error);
      return false;
    }
  }

  private async clearTempFiles(): Promise<number> {
    try {
      const tempPath = `${MODELS_DIRECTORY}/.temp`;
      const exists = await RNFS.exists(tempPath);
      
      if (exists) {
        const stat = await RNFS.stat(tempPath);
        await RNFS.unlink(tempPath);
        return stat.size;
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to clear temp files:', error);
      return 0;
    }
  }

  async getStorageAnalytics(): Promise<StorageAnalytics> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_ANALYTICS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to get storage analytics:', error);
    }

    // Return default analytics
    return {
      totalModelsSize: 0,
      modelCount: 0,
      lastCleanup: new Date().toISOString(),
      spaceAvailable: 0,
      spaceUsed: 0,
    };
  }

  private async updateStorageAnalytics(): Promise<void> {
    try {
      const models = await this.getDownloadedModels();
      const totalSize = models.reduce((sum, model) => sum + model.size, 0);
      
      const freeSpace = await RNFS.getFSInfo();
      
      const analytics: StorageAnalytics = {
        totalModelsSize: totalSize,
        modelCount: models.length,
        lastCleanup: new Date().toISOString(),
        spaceAvailable: freeSpace.freeSpace,
        spaceUsed: totalSize * 1024 * 1024, // Convert MB to bytes
      };

      await AsyncStorage.setItem(STORAGE_ANALYTICS_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.error('Failed to update storage analytics:', error);
    }
  }

  // Model personalization methods
  async getPersonalization(modelId: string): Promise<ModelPersonalization | null> {
    try {
      const saved = await AsyncStorage.getItem(`${PERSONALIZATIONS_KEY}_${modelId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to get personalization:', error);
      return null;
    }
  }

  async updatePersonalization(modelId: string, personalization: Partial<ModelPersonalization>): Promise<void> {
    try {
      const existing = await this.getPersonalization(modelId) || {
        modelId,
        favorited: false,
        lastUsed: new Date().toISOString(),
        usageCount: 0,
        customSettings: {},
      };

      const updated: ModelPersonalization = {
        ...existing,
        ...personalization,
      };

      await AsyncStorage.setItem(`${PERSONALIZATIONS_KEY}_${modelId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update personalization:', error);
    }
  }

  private async removePersonalization(modelId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${PERSONALIZATIONS_KEY}_${modelId}`);
    } catch (error) {
      console.error('Failed to remove personalization:', error);
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-z0-9\-_]/gi, '_');
  }

  async getModelPath(modelId: string): Promise<string | null> {
    const state = this.downloadStates[modelId];
    return state?.localPath || null;
  }

  async validateModelIntegrity(modelId: string): Promise<boolean> {
    try {
      const modelPath = `${MODELS_DIRECTORY}/${this.sanitizeFileName(modelId)}`;
      const exists = await RNFS.exists(modelPath);
      
      if (!exists) return false;
      
      // Check for required files
      const metadataExists = await RNFS.exists(`${modelPath}/metadata.json`);
      const modelExists = await RNFS.exists(`${modelPath}/model.gguf`);
      
      return metadataExists && modelExists;
    } catch (error) {
      console.error('Model integrity check failed:', error);
      return false;
    }
  }
}

export default ModelManagementService.getInstance();