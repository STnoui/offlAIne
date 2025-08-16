import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  useTheme, 
  Icon, 
  ProgressBar,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { useAppContext } from '../contexts/AppContext';
import { NavigationProps, DeviceBenchmark, BenchmarkTest, PerformanceTier } from '../types';
import DeviceBenchmarkService from '../services/DeviceBenchmarkService';

export const BenchmarkScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [benchmark, setBenchmark] = useState<DeviceBenchmark | null>(null);
  const [lastBenchmark, setLastBenchmark] = useState<DeviceBenchmark | null>(null);

  useEffect(() => {
    loadCachedBenchmark();
  }, []);

  const loadCachedBenchmark = async () => {
    try {
      const cached = await DeviceBenchmarkService.getCachedBenchmark();
      if (cached) {
        setLastBenchmark(cached);
        setBenchmark(cached);
        dispatch({ type: 'SET_DEVICE_BENCHMARK', payload: cached });
      }
    } catch (error) {
      console.error('Failed to load cached benchmark:', error);
    }
  };

  const runBenchmark = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentTest('');
    setBenchmark(null);

    try {
      const result = await DeviceBenchmarkService.runFullBenchmark(
        (progressValue, testName) => {
          setProgress(progressValue);
          setCurrentTest(testName);
        }
      );

      setBenchmark(result);
      setLastBenchmark(result);
      dispatch({ type: 'SET_DEVICE_BENCHMARK', payload: result });
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setIsRunning(false);
      setProgress(0);
      setCurrentTest('');
    }
  };

  const getTierColor = (tier: PerformanceTier): string => {
    switch (tier) {
      case 'low': return theme.colors.tertiary;
      case 'medium': return theme.colors.primary;
      case 'high': return theme.colors.error;
      default: return theme.colors.outline;
    }
  };

  const getTierDescription = (tier: PerformanceTier): string => {
    return DeviceBenchmarkService.getPerformanceTierDescription(tier);
  };

  const getModelSizeRecommendation = (tier: PerformanceTier) => {
    return DeviceBenchmarkService.getModelSizeRecommendation(tier);
  };

  const formatMemory = (bytes: number): string => {
    return `${(bytes / 1024).toFixed(1)} GB`;
  };

  const renderDeviceInfo = (device: DeviceBenchmark) => (
    <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
          Device Information
        </Text>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Icon source="smartphone" size={20} color={theme.colors.onSurfaceVariant} />
            <View style={styles.infoText}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Device</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{device.deviceName}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon source="memory" size={20} color={theme.colors.onSurfaceVariant} />
            <View style={styles.infoText}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Memory</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {formatMemory(device.totalMemory)} total
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon source="chip" size={20} color={theme.colors.onSurfaceVariant} />
            <View style={styles.infoText}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>CPU</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {device.cpuCores} cores @ {device.cpuFrequency}MHz
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Icon source="harddisk" size={20} color={theme.colors.onSurfaceVariant} />
            <View style={styles.infoText}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Storage</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {device.storageAvailable} GB available
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderBenchmarkResults = (device: DeviceBenchmark) => (
    <>
      <Card style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.scoreHeader}>
            <View style={styles.scoreInfo}>
              <Text variant="titleLarge" style={[styles.score, { color: theme.colors.onSurface }]}>
                {device.benchmarkScore}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Overall Score
              </Text>
            </View>
            <Chip 
              mode="flat" 
              style={[styles.tierChip, { backgroundColor: getTierColor(device.performanceTier) + '20' }]}
              textStyle={{ color: getTierColor(device.performanceTier), fontWeight: 'bold' }}
            >
              {device.performanceTier.toUpperCase()}
            </Chip>
          </View>
          
          <Text variant="bodyMedium" style={[styles.tierDescription, { color: theme.colors.onSurfaceVariant }]}>
            {getTierDescription(device.performanceTier)}
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.recommendationsCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Model Size Recommendations
          </Text>
          
          {(() => {
            const rec = getModelSizeRecommendation(device.performanceTier);
            return (
              <View style={styles.recommendationContent}>
                <View style={styles.recommendationItem}>
                  <Icon source="check-circle" size={20} color={theme.colors.tertiary} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                    Recommended: up to {rec.recommended} MB
                  </Text>
                </View>
                <View style={styles.recommendationItem}>
                  <Icon source="alert-circle" size={20} color={theme.colors.error} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                    Maximum: {rec.max} MB
                  </Text>
                </View>
              </View>
            );
          })()}
        </Card.Content>
      </Card>

      <Card style={[styles.modelsCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Recommended Models
          </Text>
          
          <View style={styles.modelsList}>
            {device.recommendedModels.map((model, index) => (
              <Chip 
                key={index}
                mode="outlined"
                style={styles.modelChip}
                onPress={() => {
                  // Navigate to model details or search for this model
                  navigation.navigate('Discover');
                }}
              >
                {typeof model === 'string' ? (model.split('/').pop() || model) : model.modelName}
              </Chip>
            ))}
          </View>
          
          <Button 
            mode="contained"
            onPress={() => navigation.navigate('Discover')}
            style={styles.discoverButton}
          >
            Browse All Models
          </Button>
        </Card.Content>
      </Card>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Icon source="speedometer" size={48} color={theme.colors.primary} />
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Device Benchmark
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Test your device performance and get AI model recommendations
          </Text>
        </View>

        {/* Running Benchmark */}
        {isRunning && (
          <Card style={[styles.runningCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <View style={styles.runningContent}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <View style={styles.runningText}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    Running Benchmark
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    {currentTest}
                  </Text>
                  <ProgressBar 
                    progress={progress / 100} 
                    color={theme.colors.primary}
                    style={styles.progress}
                  />
                  <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                    {Math.round(progress)}% Complete
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Results */}
        {benchmark && renderDeviceInfo(benchmark)}
        {benchmark && renderBenchmarkResults(benchmark)}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button 
            mode="contained"
            onPress={runBenchmark}
            disabled={isRunning}
            style={styles.benchmarkButton}
            icon="play"
          >
            {lastBenchmark ? 'Run New Benchmark' : 'Start Benchmark'}
          </Button>
          
          {lastBenchmark && (
            <Button 
              mode="outlined"
              onPress={() => setBenchmark(lastBenchmark)}
              disabled={isRunning}
              style={styles.showLastButton}
            >
              Show Last Results
            </Button>
          )}
        </View>

        {/* Initial State */}
        {!benchmark && !isRunning && !lastBenchmark && (
          <Card style={[styles.welcomeCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.welcomeContent}>
                <Icon source="rocket-launch" size={64} color={theme.colors.primary} />
                <Text variant="titleLarge" style={[styles.welcomeTitle, { color: theme.colors.onSurface }]}>
                  Ready to Test Your Device?
                </Text>
                <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
                  Our benchmark will test your CPU, memory, and storage to recommend the best AI models for your device.
                </Text>
                <Text variant="bodySmall" style={[styles.duration, { color: theme.colors.onSurfaceVariant }]}>
                  ⏱️ Takes approximately 30 seconds
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
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
  },
  runningCard: {
    margin: 16,
    marginBottom: 8,
  },
  runningContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runningText: {
    flex: 1,
    marginLeft: 16,
  },
  progress: {
    marginVertical: 8,
    height: 6,
    borderRadius: 3,
  },
  infoCard: {
    margin: 16,
    marginBottom: 8,
  },
  cardTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  scoreCard: {
    margin: 16,
    marginBottom: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreInfo: {
    alignItems: 'flex-start',
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  tierChip: {
    borderRadius: 20,
  },
  tierDescription: {
    marginTop: 8,
    lineHeight: 20,
  },
  recommendationsCard: {
    margin: 16,
    marginBottom: 8,
  },
  recommendationContent: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelsCard: {
    margin: 16,
    marginBottom: 8,
  },
  modelsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modelChip: {
    marginBottom: 4,
  },
  discoverButton: {
    marginTop: 8,
  },
  actions: {
    padding: 16,
    gap: 8,
  },
  benchmarkButton: {
    marginBottom: 8,
  },
  showLastButton: {
    marginBottom: 8,
  },
  welcomeCard: {
    margin: 16,
    marginBottom: 32,
  },
  welcomeContent: {
    alignItems: 'center',
    padding: 16,
  },
  welcomeTitle: {
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  duration: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});