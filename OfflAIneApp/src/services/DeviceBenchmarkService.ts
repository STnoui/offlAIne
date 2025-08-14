import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceBenchmark, BenchmarkTest, PerformanceTier } from '../types';

const BENCHMARK_CACHE_KEY = 'device_benchmark_cache';

export class DeviceBenchmarkService {
  private static instance: DeviceBenchmarkService;

  public static getInstance(): DeviceBenchmarkService {
    if (!DeviceBenchmarkService.instance) {
      DeviceBenchmarkService.instance = new DeviceBenchmarkService();
    }
    return DeviceBenchmarkService.instance;
  }

  async runFullBenchmark(onProgress?: (progress: number, currentTest: string) => void): Promise<DeviceBenchmark> {
    const tests: BenchmarkTest[] = [
      {
        id: 'cpu_single',
        name: 'CPU Single-Core',
        description: 'Single-threaded CPU performance test',
        estimatedDuration: 5,
        testType: 'cpu',
        isCompleted: false,
      },
      {
        id: 'cpu_multi',
        name: 'CPU Multi-Core',
        description: 'Multi-threaded CPU performance test',
        estimatedDuration: 5,
        testType: 'cpu',
        isCompleted: false,
      },
      {
        id: 'memory_bandwidth',
        name: 'Memory Bandwidth',
        description: 'Memory read/write speed test',
        estimatedDuration: 3,
        testType: 'memory',
        isCompleted: false,
      },
      {
        id: 'memory_latency',
        name: 'Memory Latency',
        description: 'Memory access latency test',
        estimatedDuration: 2,
        testType: 'memory',
        isCompleted: false,
      },
      {
        id: 'storage_sequential',
        name: 'Storage Sequential',
        description: 'Sequential read/write performance',
        estimatedDuration: 5,
        testType: 'storage',
        isCompleted: false,
      },
    ];

    const deviceInfo = await this.getDeviceInfo();
    let totalScore = 0;
    let completedTests = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      onProgress?.((i / tests.length) * 100, test.name);

      const score = await this.runIndividualTest(test);
      test.score = score;
      test.isCompleted = true;
      totalScore += score;
      completedTests++;

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    onProgress?.(100, 'Computing results');

    const averageScore = totalScore / completedTests;
    const performanceTier = this.calculatePerformanceTier(averageScore, deviceInfo);
    const recommendedModels = await this.generateModelRecommendations(performanceTier, averageScore);

    const benchmark: DeviceBenchmark = {
      deviceId: await DeviceInfo.getUniqueId(),
      deviceName: `${await DeviceInfo.getBrand()} ${await DeviceInfo.getModel()}`,
      osVersion: await DeviceInfo.getSystemVersion(),
      totalMemory: deviceInfo.totalMemory,
      availableMemory: deviceInfo.availableMemory,
      cpuCores: deviceInfo.cpuCores,
      cpuFrequency: deviceInfo.cpuFrequency,
      storageTotal: deviceInfo.storageTotal,
      storageAvailable: deviceInfo.storageAvailable,
      hasGpu: deviceInfo.hasGpu,
      gpuName: deviceInfo.gpuName,
      benchmarkScore: Math.round(averageScore),
      performanceTier,
      recommendedModels,
      benchmarkedAt: new Date().toISOString(),
    };

    // Cache the benchmark result
    await this.cacheBenchmark(benchmark);

    return benchmark;
  }

  private async runIndividualTest(test: BenchmarkTest): Promise<number> {
    const startTime = Date.now();

    switch (test.testType) {
      case 'cpu':
        return await this.runCpuTest(test.id === 'cpu_multi');
      case 'memory':
        return await this.runMemoryTest(test.id === 'memory_latency');
      case 'storage':
        return await this.runStorageTest();
      default:
        return 1000; // Default score
    }
  }

  private async runCpuTest(isMultiCore: boolean): Promise<number> {
    const iterations = 100000;
    const startTime = Date.now();

    if (isMultiCore) {
      // Simulate multi-core work with multiple promises
      const promises = Array(4).fill(0).map(() => 
        this.performCpuWork(iterations / 4)
      );
      await Promise.all(promises);
    } else {
      await this.performCpuWork(iterations);
    }

    const duration = Date.now() - startTime;
    
    // Score inversely proportional to time (faster = higher score)
    return Math.round((iterations * 10) / Math.max(duration, 1));
  }

  private async performCpuWork(iterations: number): Promise<void> {
    return new Promise(resolve => {
      let sum = 0;
      for (let i = 0; i < iterations; i++) {
        sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
      resolve();
    });
  }

  private async runMemoryTest(isLatencyTest: boolean): Promise<number> {
    const arraySize = isLatencyTest ? 10000 : 1000000;
    const startTime = Date.now();

    if (isLatencyTest) {
      // Test memory access patterns
      const array = new Array(arraySize);
      for (let i = 0; i < arraySize; i++) {
        array[i] = Math.random();
      }

      // Random access pattern
      for (let i = 0; i < 10000; i++) {
        const index = Math.floor(Math.random() * arraySize);
        const value = array[index];
      }
    } else {
      // Test memory bandwidth with sequential access
      const array = new Array(arraySize);
      for (let i = 0; i < arraySize; i++) {
        array[i] = i;
      }

      let sum = 0;
      for (let i = 0; i < arraySize; i++) {
        sum += array[i];
      }
    }

    const duration = Date.now() - startTime;
    return Math.round((arraySize * 5) / Math.max(duration, 1));
  }

  private async runStorageTest(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Test with AsyncStorage (simplified storage test)
      const testData = 'x'.repeat(10000); // 10KB of data
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        await AsyncStorage.setItem(`benchmark_test_${i}`, testData);
        await AsyncStorage.getItem(`benchmark_test_${i}`);
      }

      // Cleanup
      for (let i = 0; i < iterations; i++) {
        await AsyncStorage.removeItem(`benchmark_test_${i}`);
      }

      const duration = Date.now() - startTime;
      return Math.round((iterations * 1000) / Math.max(duration, 1));
    } catch (error) {
      console.error('Storage test failed:', error);
      return 500; // Default score on error
    }
  }

  private async getDeviceInfo() {
    try {
      const [
        totalMemory,
        availableMemory,
        storageTotal,
        storageAvailable,
      ] = await Promise.all([
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getFreeDiskStorage(),
        DeviceInfo.getTotalDiskCapacity(),
        DeviceInfo.getFreeDiskStorage(),
      ]);

      return {
        totalMemory: Math.round(totalMemory / (1024 * 1024)), // Convert to MB
        availableMemory: Math.round(availableMemory / (1024 * 1024)),
        storageTotal: Math.round(storageTotal / (1024 * 1024 * 1024)), // Convert to GB
        storageAvailable: Math.round(storageAvailable / (1024 * 1024 * 1024)),
        cpuCores: 4, // Default assumption for mobile devices
        cpuFrequency: 2000, // Default assumption in MHz
        hasGpu: true, // Most modern devices have GPU
        gpuName: 'Integrated GPU',
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      
      // Return default values on error
      return {
        totalMemory: 4000, // 4GB default
        availableMemory: 2000, // 2GB default
        storageTotal: 32, // 32GB default
        storageAvailable: 16, // 16GB default
        cpuCores: 4,
        cpuFrequency: 2000,
        hasGpu: true,
        gpuName: 'Unknown GPU',
      };
    }
  }

  private calculatePerformanceTier(averageScore: number, deviceInfo: any): PerformanceTier {
    // Multi-factor performance tier calculation
    const scoreWeight = 0.6;
    const memoryWeight = 0.3;
    const coreWeight = 0.1;

    const normalizedScore = Math.min(averageScore / 2000, 1); // Normalize to 0-1
    const normalizedMemory = Math.min(deviceInfo.totalMemory / 8000, 1); // 8GB = 1.0
    const normalizedCores = Math.min(deviceInfo.cpuCores / 8, 1); // 8 cores = 1.0

    const overallScore = (
      normalizedScore * scoreWeight +
      normalizedMemory * memoryWeight +
      normalizedCores * coreWeight
    );

    if (overallScore >= 0.7) return 'high';
    if (overallScore >= 0.4) return 'medium';
    return 'low';
  }

  private async generateModelRecommendations(tier: PerformanceTier, score: number): Promise<string[]> {
    const recommendations: Record<PerformanceTier, string[]> = {
      'low': [
        'distilbert-base-uncased',
        'microsoft/DialoGPT-small',
        'Helsinki-NLP/opus-mt-en-de',
      ],
      'medium': [
        'microsoft/DialoGPT-medium',
        'facebook/blenderbot-400M-distill',
        'microsoft/CodeBERT-base',
        'EleutherAI/gpt-neo-125M',
      ],
      'high': [
        'EleutherAI/gpt-neo-1.3B',
        'microsoft/DialoGPT-large',
        'facebook/blenderbot-1B-distill',
        'codeparrot/codeparrot-small',
        'microsoft/BioGPT',
      ],
    };

    return recommendations[tier] || recommendations['medium'];
  }

  async getCachedBenchmark(): Promise<DeviceBenchmark | null> {
    try {
      const cached = await AsyncStorage.getItem(BENCHMARK_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached benchmark:', error);
      return null;
    }
  }

  private async cacheBenchmark(benchmark: DeviceBenchmark): Promise<void> {
    try {
      await AsyncStorage.setItem(BENCHMARK_CACHE_KEY, JSON.stringify(benchmark));
    } catch (error) {
      console.error('Failed to cache benchmark:', error);
    }
  }

  async clearBenchmarkCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BENCHMARK_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear benchmark cache:', error);
    }
  }

  getPerformanceTierDescription(tier: PerformanceTier): string {
    const descriptions: Record<PerformanceTier, string> = {
      'low': 'Basic device suitable for small models and simple tasks',
      'medium': 'Mid-range device capable of running medium-sized models efficiently',
      'high': 'High-performance device that can handle large models and complex tasks',
    };

    return descriptions[tier];
  }

  getModelSizeRecommendation(tier: PerformanceTier): { max: number; recommended: number } {
    const recommendations = {
      'low': { max: 500, recommended: 250 },      // Max 500MB, recommend 250MB
      'medium': { max: 2000, recommended: 1000 }, // Max 2GB, recommend 1GB
      'high': { max: 8000, recommended: 4000 },   // Max 8GB, recommend 4GB
    };

    return recommendations[tier];
  }
}

export default DeviceBenchmarkService.getInstance();