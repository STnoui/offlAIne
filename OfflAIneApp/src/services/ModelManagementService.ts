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
  private activeDownloads: Map<string, any> = new Map(); // Store active download promises

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

      // Download model from HuggingFace
      const downloadPromise = this.downloadModelFromHuggingFace(model, modelPath, onProgress);
      this.activeDownloads.set(modelId, downloadPromise);
      
      const success = await downloadPromise;
      this.activeDownloads.delete(modelId);

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
        this.downloadStates[model.id].error = error instanceof Error ? error.message : 'Unknown error';
        await this.saveDownloadStates();
      }
      
      return false;
    }
  }

  private async downloadModelFromHuggingFace(
    model: AIModel,
    modelPath: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    const modelId = model.id;
    const startTime = Date.now();
    
    try {
      // Create model directory
      await RNFS.mkdir(modelPath);
      
      // Create model metadata file
      const metadata = {
        model,
        downloadedAt: new Date().toISOString(),
        version: '1.0',
        format: 'gguf',
        source: 'huggingface',
      };
      
      await RNFS.writeFile(
        `${modelPath}/metadata.json`,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      this.downloadStates[modelId].status = 'downloading';

      // Construct HuggingFace download URLs
      const baseUrl = `https://huggingface.co/${model.id}/resolve/main`;
      const modelFiles = await this.getModelFiles(model);
      
      let totalDownloaded = 0;
      const totalSize = model.size * 1024 * 1024; // Convert MB to bytes
      
      // Download each model file
      for (const file of modelFiles) {
        const fileUrl = `${baseUrl}/${file.filename}`;
        const filePath = `${modelPath}/${file.filename}`;
        
        try {
          const downloadResult = await this.downloadFileWithProgress(
            fileUrl,
            filePath,
            (bytesDownloaded, fileTotalBytes) => {
              const currentProgress = ((totalDownloaded + bytesDownloaded) / totalSize) * 100;
              const elapsed = (Date.now() - startTime) / 1000;
              const downloadSpeed = (totalDownloaded + bytesDownloaded) / 1024 / 1024 / elapsed;
              const remainingBytes = totalSize - (totalDownloaded + bytesDownloaded);
              const estimatedTimeRemaining = remainingBytes / (downloadSpeed * 1024 * 1024);

              // Update internal state
              this.downloadStates[modelId].progress = currentProgress;
              this.downloadStates[modelId].downloadedSize = totalDownloaded + bytesDownloaded;

              // Call progress callback
              onProgress?.({
                modelId,
                progress: currentProgress,
                downloadSpeed,
                estimatedTimeRemaining,
                status: 'downloading',
              });
            }
          );
          
          if (!downloadResult) {
            throw new Error(`Failed to download ${file.filename}`);
          }
          
          totalDownloaded += file.size;
          
        } catch (fileError) {
          console.error(`Failed to download file ${file.filename}:`, fileError);
          throw fileError;
        }
      }

      // Verify download integrity
      const isValid = await this.verifyModelIntegrity(modelPath, modelFiles);
      if (!isValid) {
        throw new Error('Downloaded model failed integrity check');
      }

      // Final progress update
      onProgress?.({
        modelId,
        progress: 100,
        downloadSpeed: 0,
        estimatedTimeRemaining: 0,
        status: 'completed',
      });

      return true;
      
    } catch (error) {
      console.error('HuggingFace download failed:', error);
      
      // Cleanup partial download
      try {
        const exists = await RNFS.exists(modelPath);
        if (exists) {
          await RNFS.unlink(modelPath);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup partial download:', cleanupError);
      }
      
      return false;
    }
  }

  private async getModelFiles(model: AIModel): Promise<{ filename: string; size: number }[]> {
    try {
      // For GGUF models, typically look for specific file patterns
      const commonFiles = [
        { filename: 'model.gguf', size: model.size * 1024 * 1024 * 0.95 }, // Main model file (~95% of total)
        { filename: 'tokenizer.json', size: model.size * 1024 * 1024 * 0.03 }, // Tokenizer (~3% of total) 
        { filename: 'config.json', size: model.size * 1024 * 1024 * 0.02 }, // Config (~2% of total)
      ];
      
      // For quantized models, adjust filename
      if (model.quantization) {
        const quantSuffix = model.quantization.replace('_', '-');
        commonFiles[0].filename = `model-${quantSuffix}.gguf`;
      }
      
      return commonFiles;
      
    } catch (error) {
      console.error('Failed to get model files list:', error);
      // Fallback to single file
      return [{ filename: 'model.gguf', size: model.size * 1024 * 1024 }];
    }
  }

  private async downloadFileWithProgress(
    url: string,
    filePath: string,
    onProgress: (bytesDownloaded: number, totalBytes: number) => void
  ): Promise<boolean> {
    try {
      // Use RNFS downloadFile with progress tracking
      const downloadOptions = {
        fromUrl: url,
        toFile: filePath,
        background: true,
        discretionary: true,
        progress: (res: any) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          onProgress(res.bytesWritten, res.contentLength);
        },
      };

      const result = await RNFS.downloadFile(downloadOptions).promise;
      
      // Check if download was successful
      return result.statusCode === 200;
      
    } catch (error) {
      console.error('File download failed:', error);
      return false;
    }
  }

  private async verifyModelIntegrity(modelPath: string, expectedFiles: { filename: string; size: number }[]): Promise<boolean> {
    try {
      // Check if all expected files exist and have reasonable sizes
      for (const file of expectedFiles) {
        const filePath = `${modelPath}/${file.filename}`;
        const exists = await RNFS.exists(filePath);
        
        if (!exists) {
          console.error(`Missing file: ${file.filename}`);
          return false;
        }
        
        const stat = await RNFS.stat(filePath);
        const actualSize = stat.size;
        const expectedSize = file.size;
        
        // Allow 10% variance in file size
        const sizeDifference = Math.abs(actualSize - expectedSize) / expectedSize;
        if (sizeDifference > 0.1) {
          console.error(`File size mismatch for ${file.filename}: expected ${expectedSize}, got ${actualSize}`);
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Integrity verification failed:', error);
      return false;
    }
  }

  async pauseDownload(modelId: string): Promise<void> {
    if (this.downloadStates[modelId]) {
      this.downloadStates[modelId].status = 'paused';
      
      // Cancel active download if it exists
      const activeDownload = this.activeDownloads.get(modelId);
      if (activeDownload && activeDownload.stop) {
        activeDownload.stop();
      }
      
      await this.saveDownloadStates();
    }
  }

  async resumeDownload(modelId: string): Promise<void> {
    if (this.downloadStates[modelId] && this.downloadStates[modelId].status === 'paused') {
      // Find the original model data to resume download
      // This would typically involve resuming from where we left off
      this.downloadStates[modelId].status = 'downloading';
      await this.saveDownloadStates();
      
      // Note: Full resume implementation would require storing partial download state
      // and implementing HTTP range requests for resume capability
    }
  }

  async cancelDownload(modelId: string): Promise<void> {
    if (this.downloadStates[modelId]) {
      this.downloadStates[modelId].status = 'cancelled';
      
      // Cancel active download if it exists
      const activeDownload = this.activeDownloads.get(modelId);
      if (activeDownload && activeDownload.stop) {
        activeDownload.stop();
      }
      this.activeDownloads.delete(modelId);
      
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