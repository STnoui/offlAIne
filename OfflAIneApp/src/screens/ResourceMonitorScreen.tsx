import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { 
  Text, 
  Card, 
  Switch, 
  Button, 
  useTheme, 
  Icon, 
  ProgressBar,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { useAppContext } from '../contexts/AppContext';
import { NavigationProps, ResourceUsage } from '../types';
import ResourceMonitorService from '../services/ResourceMonitorService';

const { width: screenWidth } = Dimensions.get('window');

export const ResourceMonitorScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const { modelId } = route?.params || {};
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentUsage, setCurrentUsage] = useState<ResourceUsage | null>(null);
  const [usageHistory, setUsageHistory] = useState<ResourceUsage[]>([]);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadCurrentUsage();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      startRealTimeMonitoring();
    } else {
      stopRealTimeMonitoring();
    }
  }, [isMonitoring]);

  const loadCurrentUsage = async () => {
    try {
      const usage = ResourceMonitorService.getCurrentUsage();
      setCurrentUsage(usage);
    } catch (error) {
      console.error('Failed to load current usage:', error);
    }
  };

  const startMonitoring = async () => {
    setLoading(true);
    try {
      const sessionId = await ResourceMonitorService.startMonitoring(modelId, 'inference');
      setIsMonitoring(true);
      setUsageHistory([]);
      setSessionStats(null);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopMonitoring = async () => {
    setLoading(true);
    try {
      const stats = await ResourceMonitorService.stopMonitoring();
      setIsMonitoring(false);
      setSessionStats(stats);
      stopRealTimeMonitoring();
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRealTimeMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      try {
        const usage = ResourceMonitorService.getCurrentUsage();
        setCurrentUsage(usage);
        
        if (usage) {
          setUsageHistory(prev => {
            const newHistory = [...prev, usage];
            // Keep only last 60 readings (2 minutes at 2-second intervals)
            return newHistory.slice(-60);
          });
        }
      } catch (error) {
        console.error('Failed to get resource usage:', error);
      }
    }, 2000); // Update every 2 seconds
  };

  const stopRealTimeMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return theme.colors.tertiary;
    if (percentage < 80) return theme.colors.primary;
    return theme.colors.error;
  };

  const getTemperatureColor = (temp: number): string => {
    if (temp < 35) return theme.colors.tertiary;
    if (temp < 45) return theme.colors.primary;
    return theme.colors.error;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    } else {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const renderMetricCard = (
    title: string,
    value: number,
    maxValue: number,
    unit: string,
    icon: string,
    colorFn: (val: number) => string
  ) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const displayValue = unit === '%' ? formatPercentage(percentage) : `${value.toFixed(1)}${unit}`;
    
    return (
      <Card style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.metricHeader}>
            <Icon source={icon} size={24} color={colorFn(percentage)} />
            <Text variant="titleSmall" style={[styles.metricTitle, { color: theme.colors.onSurface }]}>
              {title}
            </Text>
          </View>
          
          <Text variant="headlineSmall" style={[styles.metricValue, { color: colorFn(percentage) }]}>
            {displayValue}
          </Text>
          
          <ProgressBar 
            progress={percentage / 100} 
            color={colorFn(percentage)}
            style={styles.metricProgress}
          />
          
          {maxValue > 0 && unit !== '%' && (
            <Text variant="bodySmall" style={[styles.metricMax, { color: theme.colors.onSurfaceVariant }]}>
              of {unit === 'MB' || unit === 'GB' ? formatBytes(maxValue * 1024 * 1024) : `${maxValue}${unit}`}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderMiniChart = () => {
    if (usageHistory.length < 2) return null;
    
    const maxCpu = Math.max(...usageHistory.map(u => u.cpuUsage));
    const maxMemory = Math.max(...usageHistory.map(u => u.memoryUsage));
    
    return (
      <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
            Performance Trends
          </Text>
          
          <View style={styles.chartContainer}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: theme.colors.primary }]} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>CPU</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: theme.colors.tertiary }]} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Memory</Text>
              </View>
            </View>
            
            <View style={styles.miniChart}>
              {usageHistory.map((usage, index) => {
                const cpuHeight = (usage.cpuUsage / 100) * 60;
                const memoryHeight = (usage.memoryUsage / maxMemory) * 60;
                
                return (
                  <View key={index} style={styles.chartBar}>
                    <View 
                      style={[
                        styles.cpuBar, 
                        { 
                          height: cpuHeight,
                          backgroundColor: theme.colors.primary 
                        }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.memoryBar, 
                        { 
                          height: memoryHeight,
                          backgroundColor: theme.colors.tertiary 
                        }
                      ]} 
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderSessionStats = () => {
    if (!sessionStats) return null;
    
    return (
      <Card style={[styles.statsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.statsTitle, { color: theme.colors.onSurfaceVariant }]}>
            Session Summary
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Duration</Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {Math.round(sessionStats.sessionDuration / 60)}m {Math.round(sessionStats.sessionDuration % 60)}s
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Avg CPU</Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatPercentage(sessionStats.averageCpuUsage)}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Peak CPU</Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatPercentage(sessionStats.peakCpuUsage)}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Avg Memory</Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatBytes(sessionStats.averageMemoryUsage * 1024 * 1024)}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Performance</Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {sessionStats.performanceScore}/100
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Battery Drain</Text>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatPercentage(sessionStats.totalBatteryDrain)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            {isMonitoring ? 'Starting monitoring...' : 'Stopping monitoring...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Icon source="chart-line" size={48} color={theme.colors.primary} />
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Resource Monitor
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Real-time device performance tracking
          </Text>
          
          {modelId && (
            <Chip 
              mode="outlined" 
              style={styles.modelChip}
              icon="robot"
            >
              Monitoring: {modelId.split('/').pop()}
            </Chip>
          )}
        </View>

        {/* Control Panel */}
        <Card style={[styles.controlCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.controlRow}>
              <View style={styles.controlInfo}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Real-time Monitoring
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {isMonitoring ? 'Currently tracking performance' : 'Click start to begin tracking'}
                </Text>
              </View>
              
              <Button 
                mode={isMonitoring ? "outlined" : "contained"}
                onPress={isMonitoring ? stopMonitoring : startMonitoring}
                icon={isMonitoring ? "stop" : "play"}
                disabled={loading}
              >
                {isMonitoring ? 'Stop' : 'Start'}
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Current Metrics */}
        {currentUsage && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Current Usage
            </Text>
            
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'CPU Usage',
                currentUsage.cpuUsage,
                100,
                '%',
                'chip',
                getUsageColor
              )}
              
              {renderMetricCard(
                'Memory',
                currentUsage.memoryUsage,
                currentUsage.totalMemory,
                'MB',
                'memory',
                getUsageColor
              )}
              
              {renderMetricCard(
                'Battery',
                currentUsage.batteryLevel,
                100,
                '%',
                'battery',
                (val) => val > 20 ? theme.colors.tertiary : theme.colors.error
              )}
              
              {renderMetricCard(
                'Temperature',
                currentUsage.temperature || 35,
                60,
                '°C',
                'thermometer',
                getTemperatureColor
              )}
            </View>
          </>
        )}

        {/* Performance Trends */}
        {isMonitoring && renderMiniChart()}

        {/* Session Stats */}
        {renderSessionStats()}

        {/* Quick Actions */}
        <Card style={[styles.actionsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.actionsTitle, { color: theme.colors.onSurface }]}>
              Quick Actions
            </Text>
            
            <View style={styles.actionsRow}>
              <Button 
                mode="outlined"
                onPress={() => navigation.navigate('Settings')}
                icon="cog"
                style={styles.actionButton}
              >
                Settings
              </Button>
              
              <Button 
                mode="outlined"
                onPress={() => navigation.navigate('Benchmark')}
                icon="speedometer"
                style={styles.actionButton}
              >
                Benchmark
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 16,
  },
  modelChip: {
    marginTop: 8,
  },
  controlCard: {
    margin: 16,
    marginBottom: 8,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlInfo: {
    flex: 1,
    marginRight: 16,
  },
  sectionTitle: {
    margin: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  metricCard: {
    width: (screenWidth - 48) / 2,
    margin: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    marginLeft: 8,
    fontWeight: '500',
  },
  metricValue: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  metricProgress: {
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  metricMax: {
    fontSize: 10,
  },
  chartCard: {
    margin: 16,
    marginBottom: 8,
  },
  chartTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  chartContainer: {
    height: 120,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 4,
  },
  chartBar: {
    width: 2,
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cpuBar: {
    width: 2,
    marginBottom: 1,
  },
  memoryBar: {
    width: 2,
    opacity: 0.7,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  actionsCard: {
    margin: 16,
    marginBottom: 32,
  },
  actionsTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});