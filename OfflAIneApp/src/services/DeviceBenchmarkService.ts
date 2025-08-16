import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  DeviceBenchmark, 
  BenchmarkTest, 
  PerformanceTier, 
  AIAccelerator, 
  AIBenchmarkResults,
  QuantizationSupport,
  ModelRecommendation,
  ModelTier,
  PrecisionType
} from '../types';

const BENCHMARK_CACHE_KEY = 'device_benchmark_cache';

export class DeviceBenchmarkService {
  private static instance: DeviceBenchmarkService;

  public static getInstance(): DeviceBenchmarkService {
    if (!DeviceBenchmarkService.instance) {
      DeviceBenchmarkService.instance = new DeviceBenchmarkService();
    }
    return DeviceBenchmarkService.instance;
  }

  // AI Accelerator Detection
  private async detectAIAccelerator(): Promise<AIAccelerator> {
    const deviceName = await DeviceInfo.getDeviceName();
    const brand = await DeviceInfo.getBrand();
    const model = await DeviceInfo.getModel();
    
    // Initialize with defaults
    let accelerator: AIAccelerator = {
      type: 'unknown',
      name: 'Unknown',
      vendor: 'unknown',
      supportsInt4: false,
      supportsInt8: false,
      supportsFp16: false,
    };

    if (Platform.OS === 'ios') {
      // Apple devices with Neural Engine
      const systemVersion = await DeviceInfo.getSystemVersion();
      const majorVersion = parseInt(systemVersion.split('.')[0]);
      
      if (model.includes('iPhone')) {
        if (model.includes('15 Pro') || model.includes('15')) {
          accelerator = {
            type: 'npu',
            name: 'Apple Neural Engine (A17 Pro)',
            vendor: 'apple',
            topsPerformance: 35.17,
            supportsInt4: true,
            supportsInt8: true,
            supportsFp16: true,
          };
        } else if (model.includes('14') || model.includes('13')) {
          accelerator = {
            type: 'npu',
            name: 'Apple Neural Engine (A15/A16)',
            vendor: 'apple',
            topsPerformance: 15.8,
            supportsInt4: true,
            supportsInt8: true,
            supportsFp16: true,
          };
        }
      } else if (model.includes('iPad')) {
        accelerator = {
          type: 'npu',
          name: 'Apple Neural Engine (M-series)',
          vendor: 'apple',
          topsPerformance: 40.0,
          supportsInt4: true,
          supportsInt8: true,
          supportsFp16: true,
        };
      }
    } else if (Platform.OS === 'android') {
      // Android device detection
      if (brand.toLowerCase() === 'google' && model.includes('Pixel')) {
        // Google Tensor chips
        if (model.includes('9') || model.includes('10')) {
          accelerator = {
            type: 'npu',
            name: 'Google Tensor G4/G5 TPU',
            vendor: 'google',
            topsPerformance: 20.0,
            supportsInt4: true,
            supportsInt8: true,
            supportsFp16: true,
          };
        }
      } else if (deviceName.toLowerCase().includes('snapdragon') || model.toLowerCase().includes('snapdragon')) {
        // Qualcomm Snapdragon devices
        accelerator = {
          type: 'npu',
          name: 'Qualcomm Hexagon NPU',
          vendor: 'qualcomm',
          topsPerformance: 25.0,
          supportsInt4: true,
          supportsInt8: true,
          supportsFp16: true,
        };
      } else {
        // Generic Android GPU
        accelerator = {
          type: 'gpu',
          name: 'Android GPU',
          vendor: 'unknown',
          supportsInt4: false,
          supportsInt8: true,
          supportsFp16: true,
        };
      }
    }

    return accelerator;
  }

  // Enhanced AI Benchmarks
  private async runAIMatrixBenchmark(): Promise<{ ops16x16: number; ops32x32: number; ops64x64: number }> {
    const results = {
      ops16x16: 0,
      ops32x32: 0,
      ops64x64: 0,
    };

    // 16x16 matrix multiplication benchmark
    const start16 = Date.now();
    const iterations16 = 1000;
    
    for (let i = 0; i < iterations16; i++) {
      await this.performMatrixMultiplication(16);
    }
    
    const duration16 = Date.now() - start16;
    results.ops16x16 = Math.round((iterations16 * 1000) / duration16);

    // 32x32 matrix multiplication benchmark  
    const start32 = Date.now();
    const iterations32 = 200;
    
    for (let i = 0; i < iterations32; i++) {
      await this.performMatrixMultiplication(32);
    }
    
    const duration32 = Date.now() - start32;
    results.ops32x32 = Math.round((iterations32 * 1000) / duration32);

    // 64x64 matrix multiplication benchmark
    const start64 = Date.now();
    const iterations64 = 50;
    
    for (let i = 0; i < iterations64; i++) {
      await this.performMatrixMultiplication(64);
    }
    
    const duration64 = Date.now() - start64;
    results.ops64x64 = Math.round((iterations64 * 1000) / duration64);

    return results;
  }

  private async performMatrixMultiplication(size: number): Promise<void> {
    return new Promise(resolve => {
      const matA = new Array(size);
      const matB = new Array(size);
      const matC = new Array(size);
      
      // Initialize matrices
      for (let i = 0; i < size; i++) {
        matA[i] = new Array(size).fill(0).map(() => Math.random());
        matB[i] = new Array(size).fill(0).map(() => Math.random());
        matC[i] = new Array(size).fill(0);
      }
      
      // Matrix multiplication
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          for (let k = 0; k < size; k++) {
            matC[i][j] += matA[i][k] * matB[k][j];
          }
        }
      }
      
      resolve();
    });
  }

  private async runAIMemoryBenchmark(): Promise<{ sequentialRead: number; sequentialWrite: number; randomAccess: number }> {
    const arraySize = 10000000; // 10M elements for AI workload simulation
    
    // Sequential read test
    const readArray = new Float32Array(arraySize);
    for (let i = 0; i < arraySize; i++) {
      readArray[i] = Math.random();
    }
    
    const readStart = Date.now();
    let sum = 0;
    for (let i = 0; i < arraySize; i++) {
      sum += readArray[i];
    }
    const readDuration = Date.now() - readStart;
    const sequentialRead = Math.round((arraySize * 4) / 1024 / 1024 / (readDuration / 1000)); // MB/s

    // Sequential write test
    const writeArray = new Float32Array(arraySize);
    const writeStart = Date.now();
    for (let i = 0; i < arraySize; i++) {
      writeArray[i] = i;
    }
    const writeDuration = Date.now() - writeStart;
    const sequentialWrite = Math.round((arraySize * 4) / 1024 / 1024 / (writeDuration / 1000)); // MB/s

    // Random access test
    const accessStart = Date.now();
    for (let i = 0; i < 100000; i++) {
      const randomIndex = Math.floor(Math.random() * arraySize);
      const value = readArray[randomIndex];
    }
    const accessDuration = Date.now() - accessStart;
    const randomAccess = Math.round((100000 * 4) / 1024 / 1024 / (accessDuration / 1000)); // MB/s

    return { sequentialRead, sequentialWrite, randomAccess };
  }

  private async runQuantizationBenchmark(accelerator: AIAccelerator): Promise<QuantizationSupport> {
    const testSize = 1000;
    const iterations = 100;

    // FP16 test
    const fp16Start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await this.performQuantizedOperations(testSize, 'fp16');
    }
    const fp16Duration = Date.now() - fp16Start;
    const fp16Performance = Math.round((iterations * 1000) / fp16Duration);

    // INT8 test  
    const int8Start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await this.performQuantizedOperations(testSize, 'int8');
    }
    const int8Duration = Date.now() - int8Start;
    const int8Performance = Math.round((iterations * 1000) / int8Duration);

    // INT4 test (if supported)
    let int4Performance = 0;
    if (accelerator.supportsInt4) {
      const int4Start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.performQuantizedOperations(testSize, 'int4');
      }
      const int4Duration = Date.now() - int4Start;
      int4Performance = Math.round((iterations * 1000) / int4Duration);
    }

    // W4A8 test (weights 4-bit, activations 8-bit)
    let w4a8Performance = 0;
    if (accelerator.supportsInt4 && accelerator.supportsInt8) {
      const w4a8Start = Date.now();
      for (let i = 0; i < iterations; i++) {
        await this.performQuantizedOperations(testSize, 'w4a8');
      }
      const w4a8Duration = Date.now() - w4a8Start;
      w4a8Performance = Math.round((iterations * 1000) / w4a8Duration);
    }

    return {
      fp16: {
        supported: accelerator.supportsFp16,
        performance: fp16Performance,
      },
      int8: {
        supported: accelerator.supportsInt8,
        performance: int8Performance,
      },
      int4: {
        supported: accelerator.supportsInt4,
        performance: int4Performance,
      },
      w4a8: {
        supported: accelerator.supportsInt4 && accelerator.supportsInt8,
        performance: w4a8Performance,
      },
    };
  }

  private async performQuantizedOperations(size: number, precision: string): Promise<void> {
    return new Promise(resolve => {
      // Simulate quantized operations with different precision levels
      const scaleFactor = precision === 'fp16' ? 1.0 : 
                         precision === 'int8' ? 255.0 : 
                         precision === 'int4' ? 15.0 : 127.0;
      
      let sum = 0;
      for (let i = 0; i < size; i++) {
        const value = Math.random() * scaleFactor;
        const quantized = Math.round(value);
        sum += quantized;
      }
      
      resolve();
    });
  }

  private async runThermalBenchmark(): Promise<{ sustainedPerformance: number; throttleOnset: number }> {
    const testDuration = 5 * 60 * 1000; // 5 minutes
    const intervalDuration = 10 * 1000; // 10 seconds
    const intervals = testDuration / intervalDuration;
    
    const initialScore = await this.performCpuWork(50000);
    let currentScore = initialScore;
    let throttleOnset = testDuration / 1000; // Default to full duration if no throttling
    
    const startTime = Date.now();
    
    for (let i = 0; i < intervals; i++) {
      await new Promise(resolve => setTimeout(() => resolve(undefined), intervalDuration));
      
      // Perform a quick performance test
      const testScore = await this.performCpuWork(10000);
      const performanceRatio = testScore / initialScore;
      
      // Detect throttling (performance drops below 80% of initial)
      if (performanceRatio < 0.8 && throttleOnset === testDuration / 1000) {
        throttleOnset = (Date.now() - startTime) / 1000;
      }
      
      currentScore = testScore;
    }
    
    const sustainedPerformance = Math.round((currentScore / initialScore) * 100);
    
    return { sustainedPerformance, throttleOnset };
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
      {
        id: 'ai_matrix',
        name: 'AI Matrix Operations',
        description: 'Matrix multiplication performance (simulates transformer layers)',
        estimatedDuration: 8,
        testType: 'ai_matrix',
        isCompleted: false,
      },
      {
        id: 'ai_memory',
        name: 'AI Memory Bandwidth',
        description: 'Large array operations for AI workloads',
        estimatedDuration: 4,
        testType: 'ai_memory',
        isCompleted: false,
      },
      {
        id: 'ai_quantization',
        name: 'Quantization Support',
        description: 'Tests different precision levels (FP16, INT8, INT4, W4A8)',
        estimatedDuration: 6,
        testType: 'ai_quantization',
        isCompleted: false,
      },
      {
        id: 'ai_thermal',
        name: 'Thermal Performance',
        description: 'Sustained performance under thermal load',
        estimatedDuration: 30,
        testType: 'ai_thermal',
        isCompleted: false,
      },
    ];

    const deviceInfo = await this.getDeviceInfo();
    const aiAccelerator = await this.detectAIAccelerator();
    
    let totalScore = 0;
    let completedTests = 0;
    let aiBenchmarkResults: AIBenchmarkResults = {
      matrixMultiplication: { ops16x16: 0, ops32x32: 0, ops64x64: 0 },
      memoryBandwidth: { sequentialRead: 0, sequentialWrite: 0, randomAccess: 0 },
      quantizationPerformance: {
        fp16: { supported: false, performance: 0 },
        int8: { supported: false, performance: 0 },
        int4: { supported: false, performance: 0 },
        w4a8: { supported: false, performance: 0 },
      },
      thermalThrottling: { sustainedPerformance: 100, throttleOnset: 300 },
    };

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      onProgress?.((i / tests.length) * 100, test.name);

      let score: number;
      let details: Record<string, any> = {};

      switch (test.testType) {
        case 'ai_matrix':
          const matrixResults = await this.runAIMatrixBenchmark();
          details = matrixResults;
          score = (matrixResults.ops16x16 + matrixResults.ops32x32 + matrixResults.ops64x64) / 3;
          break;
        case 'ai_memory':
          const memoryResults = await this.runAIMemoryBenchmark();
          details = memoryResults;
          score = (memoryResults.sequentialRead + memoryResults.sequentialWrite + memoryResults.randomAccess) / 3;
          break;
        case 'ai_quantization':
          const quantResults = await this.runQuantizationBenchmark(aiAccelerator);
          details = quantResults;
          score = (quantResults.fp16.performance + quantResults.int8.performance + quantResults.int4.performance + quantResults.w4a8.performance) / 4;
          break;
        case 'ai_thermal':
          const thermalResults = await this.runThermalBenchmark();
          details = thermalResults;
          score = thermalResults.sustainedPerformance;
          break;
        default:
          score = await this.runIndividualTest(test);
          break;
      }

      test.score = score;
      test.details = details;
      test.isCompleted = true;
      totalScore += score;
      completedTests++;

      // Store AI benchmark results
      if (test.id === 'ai_matrix') {
        aiBenchmarkResults.matrixMultiplication = details as typeof aiBenchmarkResults.matrixMultiplication;
      } else if (test.id === 'ai_memory') {
        aiBenchmarkResults.memoryBandwidth = details as typeof aiBenchmarkResults.memoryBandwidth;
      } else if (test.id === 'ai_quantization') {
        aiBenchmarkResults.quantizationPerformance = details as typeof aiBenchmarkResults.quantizationPerformance;
      } else if (test.id === 'ai_thermal') {
        aiBenchmarkResults.thermalThrottling = details as typeof aiBenchmarkResults.thermalThrottling;
      }

      // Small delay to show progress
      await new Promise(resolve => setTimeout(() => resolve(undefined), 100));
    }

    onProgress?.(100, 'Computing results');

    const averageScore = totalScore / completedTests;
    const aiCapabilityScore = this.calculateAICapabilityScore(aiBenchmarkResults, aiAccelerator);
    const performanceTier = this.calculatePerformanceTier(averageScore, deviceInfo);
    const recommendedModels = await this.generateAIModelRecommendations(performanceTier, averageScore, aiCapabilityScore, aiAccelerator);

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
      aiAccelerator,
      aiBenchmarkResults,
      benchmarkScore: Math.round(averageScore),
      aiCapabilityScore: Math.round(aiCapabilityScore),
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

  private async performCpuWork(iterations: number): Promise<number> {
    return new Promise(resolve => {
      let sum = 0;
      for (let i = 0; i < iterations; i++) {
        sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
      resolve(sum);
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

  private calculateAICapabilityScore(aiBenchmarkResults: AIBenchmarkResults, aiAccelerator: AIAccelerator): number {
    if (!aiBenchmarkResults) return 50; // Default score if no AI benchmarks

    // Weighted scoring for AI capabilities
    const matrixWeight = 0.35;
    const memoryWeight = 0.25;
    const quantWeight = 0.25;
    const thermalWeight = 0.15;

    // Normalize matrix performance (typical ranges: 100-5000 ops/sec)
    const matrixScore = Math.min(
      (aiBenchmarkResults.matrixMultiplication.ops16x16 + 
       aiBenchmarkResults.matrixMultiplication.ops32x32 + 
       aiBenchmarkResults.matrixMultiplication.ops64x64) / 3 / 50, 100
    );

    // Normalize memory performance (typical ranges: 100-2000 MB/s)
    const memoryScore = Math.min(
      (aiBenchmarkResults.memoryBandwidth.sequentialRead + 
       aiBenchmarkResults.memoryBandwidth.sequentialWrite + 
       aiBenchmarkResults.memoryBandwidth.randomAccess) / 3 / 20, 100
    );

    // Score quantization support
    const quantSupported = [
      aiBenchmarkResults.quantizationPerformance.fp16.supported,
      aiBenchmarkResults.quantizationPerformance.int8.supported,
      aiBenchmarkResults.quantizationPerformance.int4.supported,
      aiBenchmarkResults.quantizationPerformance.w4a8.supported,
    ].filter(Boolean).length;
    const quantScore = (quantSupported / 4) * 100;

    // Thermal performance score
    const thermalScore = aiBenchmarkResults.thermalThrottling.sustainedPerformance;

    // Accelerator bonus
    let acceleratorBonus = 0;
    if (aiAccelerator.type === 'npu') {
      acceleratorBonus = 20;
    } else if (aiAccelerator.type === 'gpu') {
      acceleratorBonus = 10;
    }

    const finalScore = (
      matrixScore * matrixWeight +
      memoryScore * memoryWeight +
      quantScore * quantWeight +
      thermalScore * thermalWeight
    ) + acceleratorBonus;

    return Math.min(finalScore, 100);
  }

  private async generateAIModelRecommendations(
    tier: PerformanceTier, 
    score: number, 
    aiScore: number, 
    aiAccelerator: AIAccelerator
  ): Promise<ModelRecommendation[]> {
    const recommendations: ModelRecommendation[] = [];

    // Light tier models (suitable for all devices)
    const lightModels = [
      {
        modelId: 'google/gemma-3-270m',
        modelName: 'Gemma 3 270M',
        parameters: '270M',
        tier: 'light' as ModelTier,
        recommendedQuantization: 'int8' as PrecisionType,
        estimatedPerformance: {
          tokensPerSecond: Math.round(aiScore / 10),
          memoryUsage: 512,
          batteryImpact: 'minimal' as const,
        },
        compatibilityScore: Math.min(100, aiScore + 20),
        useCases: ['Quick chat', 'Simple Q&A', 'Basic assistance'],
      },
      {
        modelId: 'microsoft/phi-4-mini',
        modelName: 'Phi-4 Mini',
        parameters: '3.8B',
        tier: 'light' as ModelTier,
        recommendedQuantization: aiAccelerator.supportsInt4 ? 'int4' as PrecisionType : 'int8' as PrecisionType,
        estimatedPerformance: {
          tokensPerSecond: Math.round(aiScore / 15),
          memoryUsage: 1024,
          batteryImpact: 'low' as const,
        },
        compatibilityScore: Math.min(100, aiScore + 10),
        useCases: ['Reasoning', 'Math problems', 'Code assistance'],
      },
    ];

    // Medium tier models (for medium+ devices)
    const mediumModels = [
      {
        modelId: 'google/gemma-3n-4b',
        modelName: 'Gemma 3n 4B',
        parameters: '4B',
        tier: 'medium' as ModelTier,
        recommendedQuantization: aiAccelerator.supportsInt4 ? 'int4' as PrecisionType : 'int8' as PrecisionType,
        estimatedPerformance: {
          tokensPerSecond: Math.round(aiScore / 20),
          memoryUsage: 2048,
          batteryImpact: 'moderate' as const,
        },
        compatibilityScore: Math.max(0, aiScore - 10),
        useCases: ['Advanced chat', 'Content creation', 'Complex reasoning'],
      },
      {
        modelId: 'qwen/qwen3-7b',
        modelName: 'Qwen3 7B',
        parameters: '7B',
        tier: 'medium' as ModelTier,
        recommendedQuantization: aiAccelerator.supportsInt4 ? 'int4' as PrecisionType : 'int8' as PrecisionType,
        estimatedPerformance: {
          tokensPerSecond: Math.round(aiScore / 25),
          memoryUsage: 3584,
          batteryImpact: 'moderate' as const,
        },
        compatibilityScore: Math.max(0, aiScore - 15),
        useCases: ['Professional writing', 'Code generation', 'Analysis'],
      },
    ];

    // Heavy tier models (for high-end devices only)
    const heavyModels = [
      {
        modelId: 'google/gemma-3n-8b',
        modelName: 'Gemma 3n 8B',
        parameters: '8B',
        tier: 'heavy' as ModelTier,
        recommendedQuantization: aiAccelerator.supportsInt4 ? 'int4' as PrecisionType : 'int8' as PrecisionType,
        estimatedPerformance: {
          tokensPerSecond: Math.round(aiScore / 30),
          memoryUsage: 4096,
          batteryImpact: 'high' as const,
        },
        compatibilityScore: Math.max(0, aiScore - 25),
        useCases: ['Expert-level tasks', 'Complex code', 'Research assistance'],
      },
    ];

    // Add models based on device capability
    recommendations.push(...lightModels);

    if (tier === 'medium' || tier === 'high') {
      recommendations.push(...mediumModels);
    }

    if (tier === 'high' && aiScore > 70) {
      recommendations.push(...heavyModels);
    }

    // Filter out models with very low compatibility scores
    return recommendations.filter(model => model.compatibilityScore > 30);
  }

  private async generateModelRecommendations(tier: PerformanceTier, score: number): Promise<string[]> {
    const recommendations: Record<PerformanceTier, string[]> = {
      'low': [
        'google/gemma-3-270m',
        'microsoft/phi-4-mini',
      ],
      'medium': [
        'google/gemma-3n-4b',
        'qwen/qwen3-7b',
        'microsoft/phi-4-mini',
      ],
      'high': [
        'google/gemma-3n-8b',
        'google/gemma-3n-4b',
        'qwen/qwen3-7b',
        'microsoft/phi-4-mini',
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