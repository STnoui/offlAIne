import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { ResourceUsage } from '../types';

const RESOURCE_HISTORY_KEY = 'resource_usage_history';
const MAX_HISTORY_ENTRIES = 1000;
const MONITORING_INTERVAL = 2000; // 2 seconds

interface MonitoringSession {
  sessionId: string;
  modelId?: string;
  taskType?: string;
  startTime: number;
  isActive: boolean;
}

interface ResourceThresholds {
  cpuWarning: number;      // CPU usage percentage
  cpuCritical: number;
  memoryWarning: number;   // Memory usage MB
  memoryCritical: number;
  batteryWarning: number;  // Battery level percentage
  temperatureWarning: number; // Temperature in Celsius
}

interface PerformanceMetrics {
  averageCpuUsage: number;
  peakCpuUsage: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  totalBatteryDrain: number;
  sessionDuration: number;
  performanceScore: number;
}

export class ResourceMonitorService {
  private static instance: ResourceMonitorService;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private currentSession: MonitoringSession | null = null;
  private resourceHistory: ResourceUsage[] = [];
  private listeners: ((usage: ResourceUsage) => void)[] = [];

  private thresholds: ResourceThresholds = {
    cpuWarning: 70,
    cpuCritical: 90,
    memoryWarning: 3000, // 3GB
    memoryCritical: 4000, // 4GB
    batteryWarning: 20,   // 20%
    temperatureWarning: 45, // 45°C
  };

  public static getInstance(): ResourceMonitorService {
    if (!ResourceMonitorService.instance) {
      ResourceMonitorService.instance = new ResourceMonitorService();
    }
    return ResourceMonitorService.instance;
  }

  constructor() {
    this.loadResourceHistory();
  }

  async startMonitoring(modelId?: string, taskType?: string): Promise<string> {
    // Stop existing monitoring session
    if (this.currentSession) {
      this.stopMonitoring();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      sessionId,
      modelId,
      taskType,
      startTime: Date.now(),
      isActive: true,
    };

    // Start monitoring interval
    this.monitoringInterval = setInterval(async () => {
      if (this.currentSession?.isActive) {
        const usage = await this.captureResourceUsage();
        this.addResourceUsage(usage);
        this.notifyListeners(usage);
        this.checkThresholds(usage);
      }
    }, MONITORING_INTERVAL);

    return sessionId;
  }

  stopMonitoring(): PerformanceMetrics | null {
    if (!this.currentSession) {
      return null;
    }

    const sessionId = this.currentSession.sessionId;
    this.currentSession.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Calculate performance metrics for the session
    const metrics = this.calculateSessionMetrics(sessionId);
    this.currentSession = null;

    return metrics;
  }

  private async captureResourceUsage(): Promise<ResourceUsage> {
    try {
      // Get current resource usage
      const [batteryLevel, freeDiskStorage, totalMemory] = await Promise.all([
        DeviceInfo.getBatteryLevel(),
        DeviceInfo.getFreeDiskStorage(),
        DeviceInfo.getTotalMemory(),
      ]);

      // Estimate CPU usage (simplified simulation)
      const cpuUsage = await this.estimateCpuUsage();
      
      // Calculate memory usage
      const freeMemory = freeDiskStorage / (1024 * 1024); // Convert to MB
      const totalMemoryMB = totalMemory / (1024 * 1024);
      const memoryUsage = totalMemoryMB - freeMemory;

      // Estimate battery drain rate
      const batteryDrain = await this.estimateBatteryDrainRate();

      // Get temperature (simulated for now)
      const temperature = await this.estimateTemperature();

      return {
        timestamp: Date.now(),
        cpuUsage,
        memoryUsage,
        totalMemory: totalMemoryMB,
        batteryLevel: batteryLevel * 100, // Convert to percentage
        batteryDrain,
        temperature,
        modelId: this.currentSession?.modelId,
        taskType: this.currentSession?.taskType,
      };
    } catch (error) {
      console.error('Failed to capture resource usage:', error);
      
      // Return default values on error
      return {
        timestamp: Date.now(),
        cpuUsage: 0,
        memoryUsage: 0,
        totalMemory: 4000, // Default 4GB
        batteryLevel: 100,
        batteryDrain: 0,
        modelId: this.currentSession?.modelId,
        taskType: this.currentSession?.taskType,
      };
    }
  }

  private async estimateCpuUsage(): Promise<number> {
    // Simplified CPU usage estimation
    // In a real implementation, this would use native modules or system APIs
    const baseUsage = 10; // Base system usage
    const randomVariation = Math.random() * 20; // 0-20% variation
    const modelUsage = this.currentSession?.modelId ? 30 + Math.random() * 40 : 0; // 30-70% for model inference
    
    return Math.min(100, Math.round(baseUsage + randomVariation + modelUsage));
  }

  private async estimateBatteryDrainRate(): Promise<number> {
    // Estimate battery drain rate per hour
    const baseRate = 5; // 5% per hour base rate
    const cpuMultiplier = 1 + (await this.estimateCpuUsage()) / 100; // Higher CPU = more drain
    const modelMultiplier = this.currentSession?.modelId ? 2 : 1; // Model inference drains more
    
    return baseRate * cpuMultiplier * modelMultiplier;
  }

  private async estimateTemperature(): Promise<number> {
    // Simplified temperature estimation
    const baseTemp = 25; // 25°C base temperature
    const cpuUsage = await this.estimateCpuUsage();
    const heatIncrease = (cpuUsage / 100) * 20; // Up to 20°C increase with high CPU
    
    return Math.round(baseTemp + heatIncrease);
  }

  private addResourceUsage(usage: ResourceUsage): void {
    this.resourceHistory.push(usage);
    
    // Keep only the last MAX_HISTORY_ENTRIES
    if (this.resourceHistory.length > MAX_HISTORY_ENTRIES) {
      this.resourceHistory = this.resourceHistory.slice(-MAX_HISTORY_ENTRIES);
    }
    
    this.saveResourceHistory();
  }

  private async loadResourceHistory(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(RESOURCE_HISTORY_KEY);
      if (saved) {
        this.resourceHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load resource history:', error);
    }
  }

  private async saveResourceHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(RESOURCE_HISTORY_KEY, JSON.stringify(this.resourceHistory));
    } catch (error) {
      console.error('Failed to save resource history:', error);
    }
  }

  private checkThresholds(usage: ResourceUsage): void {
    const warnings: string[] = [];

    // CPU thresholds
    if (usage.cpuUsage >= this.thresholds.cpuCritical) {
      warnings.push(`Critical CPU usage: ${usage.cpuUsage}%`);
    } else if (usage.cpuUsage >= this.thresholds.cpuWarning) {
      warnings.push(`High CPU usage: ${usage.cpuUsage}%`);
    }

    // Memory thresholds
    if (usage.memoryUsage >= this.thresholds.memoryCritical) {
      warnings.push(`Critical memory usage: ${Math.round(usage.memoryUsage)}MB`);
    } else if (usage.memoryUsage >= this.thresholds.memoryWarning) {
      warnings.push(`High memory usage: ${Math.round(usage.memoryUsage)}MB`);
    }

    // Battery thresholds
    if (usage.batteryLevel <= this.thresholds.batteryWarning) {
      warnings.push(`Low battery: ${Math.round(usage.batteryLevel)}%`);
    }

    // Temperature thresholds
    if (usage.temperature && usage.temperature >= this.thresholds.temperatureWarning) {
      warnings.push(`High temperature: ${usage.temperature}°C`);
    }

    // Log warnings (in a real app, you might show notifications)
    if (warnings.length > 0) {
      console.warn('Resource warnings:', warnings);
    }
  }

  private calculateSessionMetrics(sessionId: string): PerformanceMetrics {
    const sessionData = this.resourceHistory.filter(
      usage => this.currentSession?.sessionId === sessionId
    );

    if (sessionData.length === 0) {
      return {
        averageCpuUsage: 0,
        peakCpuUsage: 0,
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        totalBatteryDrain: 0,
        sessionDuration: 0,
        performanceScore: 100,
      };
    }

    const cpuUsages = sessionData.map(d => d.cpuUsage);
    const memoryUsages = sessionData.map(d => d.memoryUsage);
    const batteryLevels = sessionData.map(d => d.batteryLevel);

    const averageCpuUsage = cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length;
    const peakCpuUsage = Math.max(...cpuUsages);
    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const peakMemoryUsage = Math.max(...memoryUsages);
    const totalBatteryDrain = batteryLevels[0] - batteryLevels[batteryLevels.length - 1];
    const sessionDuration = sessionData[sessionData.length - 1].timestamp - sessionData[0].timestamp;

    // Calculate performance score (0-100, higher is better)
    const cpuScore = Math.max(0, 100 - averageCpuUsage);
    const memoryScore = Math.max(0, 100 - (averageMemoryUsage / 50)); // 50MB = 1 point deduction
    const batteryScore = Math.max(0, 100 - (totalBatteryDrain * 2)); // 0.5% drain = 1 point deduction
    const performanceScore = Math.round((cpuScore + memoryScore + batteryScore) / 3);

    return {
      averageCpuUsage: Math.round(averageCpuUsage),
      peakCpuUsage,
      averageMemoryUsage: Math.round(averageMemoryUsage),
      peakMemoryUsage: Math.round(peakMemoryUsage),
      totalBatteryDrain: Math.round(totalBatteryDrain * 10) / 10, // One decimal place
      sessionDuration: Math.round(sessionDuration / 1000), // Convert to seconds
      performanceScore,
    };
  }

  // Public API methods
  getCurrentUsage(): ResourceUsage | null {
    return this.resourceHistory.length > 0 
      ? this.resourceHistory[this.resourceHistory.length - 1] 
      : null;
  }

  getUsageHistory(limit?: number): ResourceUsage[] {
    const history = this.resourceHistory.slice();
    return limit ? history.slice(-limit) : history;
  }

  getUsageForModel(modelId: string, limit?: number): ResourceUsage[] {
    const modelUsage = this.resourceHistory.filter(usage => usage.modelId === modelId);
    return limit ? modelUsage.slice(-limit) : modelUsage;
  }

  addListener(callback: (usage: ResourceUsage) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(usage: ResourceUsage): void {
    this.listeners.forEach(listener => {
      try {
        listener(usage);
      } catch (error) {
        console.error('Resource monitor listener error:', error);
      }
    });
  }

  getThresholds(): ResourceThresholds {
    return { ...this.thresholds };
  }

  updateThresholds(newThresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  isMonitoring(): boolean {
    return this.currentSession?.isActive || false;
  }

  getCurrentSession(): MonitoringSession | null {
    return this.currentSession;
  }

  async clearHistory(): Promise<void> {
    this.resourceHistory = [];
    await AsyncStorage.removeItem(RESOURCE_HISTORY_KEY);
  }

  getResourceRecommendations(): string[] {
    const current = this.getCurrentUsage();
    const recommendations: string[] = [];

    if (!current) {
      return ['Start monitoring to get resource recommendations'];
    }

    if (current.cpuUsage > 80) {
      recommendations.push('High CPU usage detected. Consider using a smaller model or closing other apps.');
    }

    if (current.memoryUsage > 3000) {
      recommendations.push('High memory usage detected. Consider freeing up storage or using model compression.');
    }

    if (current.batteryLevel < 30 && current.batteryDrain > 10) {
      recommendations.push('High battery drain detected. Consider reducing model inference frequency.');
    }

    if (current.temperature && current.temperature > 40) {
      recommendations.push('Device temperature is high. Consider taking a break or reducing workload.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Resource usage is optimal. Continue current operation.');
    }

    return recommendations;
  }

  generatePerformanceReport(): {
    summary: string;
    metrics: PerformanceMetrics | null;
    recommendations: string[];
    resourceTrends: {
      cpuTrend: 'increasing' | 'decreasing' | 'stable';
      memoryTrend: 'increasing' | 'decreasing' | 'stable';
      batteryTrend: 'improving' | 'declining' | 'stable';
    };
  } {
    const recentHistory = this.getUsageHistory(50); // Last 50 entries
    const currentMetrics = this.currentSession 
      ? this.calculateSessionMetrics(this.currentSession.sessionId)
      : null;

    // Analyze trends
    const cpuTrend = this.analyzeTrend(recentHistory.map(h => h.cpuUsage));
    const memoryTrend = this.analyzeTrend(recentHistory.map(h => h.memoryUsage));
    const batteryTrend = this.analyzeTrend(recentHistory.map(h => h.batteryLevel), true); // Reverse for battery (higher is better)

    let summary = 'No monitoring data available';
    if (currentMetrics) {
      summary = `Performance Score: ${currentMetrics.performanceScore}/100. `;
      summary += `Average CPU: ${currentMetrics.averageCpuUsage}%, `;
      summary += `Memory: ${Math.round(currentMetrics.averageMemoryUsage)}MB, `;
      summary += `Battery Drain: ${currentMetrics.totalBatteryDrain}%`;
    }

    return {
      summary,
      metrics: currentMetrics,
      recommendations: this.getResourceRecommendations(),
      resourceTrends: {
        cpuTrend,
        memoryTrend,
        batteryTrend,
      },
    };
  }

  private analyzeTrend(values: number[], reverse: boolean = false): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 5) return 'stable';

    const first = values.slice(0, values.length / 2);
    const second = values.slice(values.length / 2);

    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;

    const threshold = Math.max(Math.abs(firstAvg) * 0.1, 5); // 10% change or 5 units minimum

    if (reverse) {
      if (secondAvg > firstAvg + threshold) return 'improving';
      if (secondAvg < firstAvg - threshold) return 'declining';
    } else {
      if (secondAvg > firstAvg + threshold) return 'increasing';
      if (secondAvg < firstAvg - threshold) return 'decreasing';
    }

    return 'stable';
  }
}

export default ResourceMonitorService.getInstance();