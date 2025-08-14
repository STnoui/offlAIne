import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIModel, ModelCategory, PerformanceTier } from '../types';

const HUGGINGFACE_API_BASE = 'https://huggingface.co/api';
const MODELS_CACHE_KEY = 'hf_models_cache';
const CACHE_EXPIRY_KEY = 'hf_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class HuggingFaceService {
  private static instance: HuggingFaceService;
  
  public static getInstance(): HuggingFaceService {
    if (!HuggingFaceService.instance) {
      HuggingFaceService.instance = new HuggingFaceService();
    }
    return HuggingFaceService.instance;
  }

  private mapCategoryFromTags(tags: string[]): ModelCategory {
    const tagStr = tags.join(' ').toLowerCase();
    
    if (tagStr.includes('text-generation') || tagStr.includes('language-model')) return 'writing-assistant';
    if (tagStr.includes('code') || tagStr.includes('programming')) return 'code-helper';
    if (tagStr.includes('translation')) return 'language-translation';
    if (tagStr.includes('image') || tagStr.includes('vision')) return 'image-processing';
    if (tagStr.includes('audio') || tagStr.includes('speech')) return 'voice-processing';
    if (tagStr.includes('medical') || tagStr.includes('legal') || tagStr.includes('science')) return 'specialized';
    if (tagStr.includes('creative') || tagStr.includes('story') || tagStr.includes('art')) return 'creative';
    
    return 'writing-assistant'; // Default
  }

  private estimatePerformanceTier(modelSize: number): PerformanceTier {
    if (modelSize < 1000) return 'low';      // < 1GB
    if (modelSize < 4000) return 'medium';   // 1-4GB  
    return 'high';                           // > 4GB
  }

  private estimateModelSize(downloads: number, likes: number): number {
    // Heuristic estimation based on popularity metrics
    const baseSize = 500; // MB
    const popularityFactor = Math.log(downloads + 1) * 0.1;
    const qualityFactor = Math.log(likes + 1) * 0.05;
    
    return Math.floor(baseSize * (1 + popularityFactor + qualityFactor));
  }

  private estimateMemoryRequirement(modelSize: number): number {
    // Memory typically 1.5-2x model size for inference
    return Math.floor(modelSize * 1.8);
  }

  async searchModels(
    query: string = '',
    category: ModelCategory | 'all' = 'all',
    limit: number = 50
  ): Promise<AIModel[]> {
    try {
      // Check cache first
      const cached = await this.getCachedModels();
      if (cached && cached.length > 0) {
        return this.filterModels(cached, query, category).slice(0, limit);
      }

      // Fetch from HuggingFace
      const response = await axios.get(`${HUGGINGFACE_API_BASE}/models`, {
        params: {
          limit: limit * 2, // Get more to account for filtering
          sort: 'downloads',
          direction: -1,
          filter: 'text-generation',
        },
        timeout: 10000,
      });

      const models: AIModel[] = response.data.map((model: any) => {
        const estimatedSize = this.estimateModelSize(model.downloads || 0, model.likes || 0);
        const memoryReq = this.estimateMemoryRequirement(estimatedSize);
        const performanceTier = this.estimatePerformanceTier(estimatedSize);
        const category = this.mapCategoryFromTags(model.tags || []);

        return {
          id: model.id || model.modelId,
          name: model.id?.split('/').pop() || 'Unknown Model',
          description: model.description || 'No description available',
          category,
          size: estimatedSize,
          performanceTier,
          downloads: model.downloads || 0,
          likes: model.likes || 0,
          rating: Math.min(5, Math.max(1, (model.likes || 0) / Math.max(1, (model.downloads || 1)) * 1000 + 1)),
          tags: model.tags || [],
          author: model.author || model.id?.split('/')[0] || 'Unknown',
          license: model.cardData?.license || 'Unknown',
          huggingFaceUrl: `https://huggingface.co/${model.id}`,
          isDownloaded: false,
          contextLength: 4096, // Default assumption
          memoryRequirement: memoryReq,
          createdAt: model.createdAt || new Date().toISOString(),
          updatedAt: model.lastModified || new Date().toISOString(),
        };
      });

      // Cache the results
      await this.cacheModels(models);

      return this.filterModels(models, query, category).slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch models from HuggingFace:', error);
      
      // Return cached data on network error
      const cached = await this.getCachedModels();
      return cached ? this.filterModels(cached, query, category).slice(0, limit) : [];
    }
  }

  private filterModels(models: AIModel[], query: string, category: ModelCategory | 'all'): AIModel[] {
    return models.filter(model => {
      const matchesQuery = !query || 
        model.name.toLowerCase().includes(query.toLowerCase()) ||
        model.description.toLowerCase().includes(query.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = category === 'all' || model.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  async getModelDetails(modelId: string): Promise<AIModel | null> {
    try {
      const response = await axios.get(`${HUGGINGFACE_API_BASE}/models/${modelId}`, {
        timeout: 5000,
      });

      const model = response.data;
      const estimatedSize = this.estimateModelSize(model.downloads || 0, model.likes || 0);
      const memoryReq = this.estimateMemoryRequirement(estimatedSize);
      const performanceTier = this.estimatePerformanceTier(estimatedSize);
      const category = this.mapCategoryFromTags(model.tags || []);

      return {
        id: model.id,
        name: model.id.split('/').pop() || 'Unknown Model',
        description: model.description || 'No description available',
        category,
        size: estimatedSize,
        performanceTier,
        downloads: model.downloads || 0,
        likes: model.likes || 0,
        rating: Math.min(5, Math.max(1, (model.likes || 0) / Math.max(1, (model.downloads || 1)) * 1000 + 1)),
        tags: model.tags || [],
        author: model.author || model.id.split('/')[0] || 'Unknown',
        license: model.cardData?.license || 'Unknown',
        huggingFaceUrl: `https://huggingface.co/${model.id}`,
        isDownloaded: false,
        contextLength: model.config?.max_position_embeddings || 4096,
        memoryRequirement: memoryReq,
        createdAt: model.createdAt || new Date().toISOString(),
        updatedAt: model.lastModified || new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to fetch model details for ${modelId}:`, error);
      return null;
    }
  }

  async getCuratedModels(): Promise<AIModel[]> {
    // Curated list of high-quality models for each category
    const curatedModelIds = [
      // Writing Assistant
      'microsoft/DialoGPT-medium',
      'facebook/blenderbot-400M-distill',
      'EleutherAI/gpt-neo-1.3B',
      
      // Code Helper  
      'microsoft/CodeBERT-base',
      'codeparrot/codeparrot-small',
      'huggingface/CodeBERTa-small-v1',
      
      // Language Translation
      'Helsinki-NLP/opus-mt-en-de',
      'Helsinki-NLP/opus-mt-en-fr',
      'Helsinki-NLP/opus-mt-en-es',
      
      // Specialized
      'microsoft/BioGPT',
      'allenai/scibert_scivocab_uncased',
    ];

    try {
      const models = await Promise.all(
        curatedModelIds.map(id => this.getModelDetails(id))
      );

      return models.filter((model): model is AIModel => model !== null);
    } catch (error) {
      console.error('Failed to fetch curated models:', error);
      return [];
    }
  }

  private async cacheModels(models: AIModel[]): Promise<void> {
    try {
      await AsyncStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(models));
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to cache models:', error);
    }
  }

  private async getCachedModels(): Promise<AIModel[] | null> {
    try {
      const expiryStr = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
      if (!expiryStr) return null;

      const expiry = parseInt(expiryStr);
      if (Date.now() - expiry > CACHE_DURATION) {
        // Cache expired
        await AsyncStorage.removeItem(MODELS_CACHE_KEY);
        await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
        return null;
      }

      const cachedStr = await AsyncStorage.getItem(MODELS_CACHE_KEY);
      return cachedStr ? JSON.parse(cachedStr) : null;
    } catch (error) {
      console.error('Failed to get cached models:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MODELS_CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export default HuggingFaceService.getInstance();