import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  RefreshControl, 
  Alert, 
  FlatList, 
  Dimensions 
} from 'react-native';
import { 
  Text, 
  Card, 
  Chip, 
  Button, 
  ProgressBar, 
  useTheme, 
  Searchbar,
  ActivityIndicator,
  Snackbar,
  FAB,
  Portal
} from 'react-native-paper';
import { useAppContext } from '../contexts/AppContext';
import { ModelCategory, PerformanceTier, NavigationProps, AIModel, DownloadProgress } from '../types';
import HuggingFaceService from '../services/HuggingFaceService';
import ModelManagementService from '../services/ModelManagementService';
import DeviceBenchmarkService from '../services/DeviceBenchmarkService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // 16px margin on each side

const CATEGORIES: { value: ModelCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🔍' },
  { value: 'writing-assistant', label: 'Writing', icon: '✏️' },
  { value: 'code-helper', label: 'Code', icon: '💻' },
  { value: 'language-translation', label: 'Translation', icon: '🌐' },
  { value: 'image-processing', label: 'Images', icon: '🖼️' },
  { value: 'voice-processing', label: 'Voice', icon: '🎤' },
  { value: 'specialized', label: 'Specialized', icon: '🎓' },
  { value: 'creative', label: 'Creative', icon: '🎨' },
];

const PERFORMANCE_TIERS: { value: PerformanceTier | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Devices', color: '#757575' },
  { value: 'low', label: 'Basic', color: '#4CAF50' },
  { value: 'medium', label: 'Mid-range', color: '#2196F3' },
  { value: 'high', label: 'High-end', color: '#FF5722' },
];

interface DiscoverScreenProps extends NavigationProps {
  onModelPress?: (model: AIModel) => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation, onModelPress }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<PerformanceTier | 'all'>('all');
  
  // Data state
  const [models, setModels] = useState<AIModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<AIModel[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showFAB, setShowFAB] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterModels();
  }, [models, searchQuery, selectedCategory, selectedTier]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load downloaded models first for instant display
      const downloaded = await ModelManagementService.getDownloadedModels();
      setModels(downloaded);

      // Then load from HuggingFace
      await loadHuggingFaceModels();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      showMessage('Failed to load models. Using cached data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHuggingFaceModels = async () => {
    try {
      const curatedModels = await HuggingFaceService.getCuratedModels();
      const searchResults = await HuggingFaceService.searchModels('', 'all', 30);
      
      // Combine and deduplicate
      const allModels = [...curatedModels, ...searchResults];
      const uniqueModels = allModels.filter((model, index, self) => 
        index === self.findIndex(m => m.id === model.id)
      );

      // Check which models are already downloaded
      const modelsWithStatus = await Promise.all(
        uniqueModels.map(async (model) => ({
          ...model,
          isDownloaded: await ModelManagementService.isModelDownloaded(model.id),
        }))
      );

      setModels(modelsWithStatus);
    } catch (error) {
      console.error('Failed to load HuggingFace models:', error);
      throw error;
    }
  };

  const filterModels = () => {
    let filtered = models.filter(model => {
      const matchesSearch = !searchQuery || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        model.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
      const matchesTier = selectedTier === 'all' || model.performanceTier === selectedTier;
      
      return matchesSearch && matchesCategory && matchesTier;
    });

    // Sort by download status (downloaded first), then by popularity
    filtered.sort((a, b) => {
      if (a.isDownloaded && !b.isDownloaded) return -1;
      if (!a.isDownloaded && b.isDownloaded) return 1;
      return (b.downloads + b.likes) - (a.downloads + a.likes);
    });

    setFilteredModels(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await HuggingFaceService.clearCache();
      await loadHuggingFaceModels();
      showMessage('Models refreshed successfully');
    } catch (error) {
      console.error('Refresh failed:', error);
      showMessage('Failed to refresh models');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadModel = async (model: AIModel) => {
    if (model.isDownloaded) {
      // Model already downloaded, open it
      onModelPress?.(model);
      return;
    }

    try {
      // Check device compatibility
      const benchmark = await DeviceBenchmarkService.getCachedBenchmark();
      if (benchmark) {
        const recommendations = benchmark.recommendedModels;
        if (!recommendations.includes(model.id) && model.performanceTier === 'high' && benchmark.performanceTier === 'low') {
          Alert.alert(
            'Performance Warning',
            `This model may not run well on your device. Your device is rated as ${benchmark.performanceTier}-performance. Continue anyway?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Download', onPress: () => startDownload(model) }
            ]
          );
          return;
        }
      }

      await startDownload(model);
    } catch (error) {
      console.error('Download failed:', error);
      showMessage('Download failed. Please try again.');
    }
  };

  const startDownload = async (model: AIModel) => {
    try {
      showMessage(`Starting download: ${model.name}`);
      
      const success = await ModelManagementService.downloadModel(
        model,
        (progress: DownloadProgress) => {
          setDownloadProgress(prev => ({
            ...prev,
            [model.id]: progress
          }));
        }
      );

      if (success) {
        // Update model status
        setModels(prev => prev.map(m => 
          m.id === model.id ? { ...m, isDownloaded: true } : m
        ));
        
        // Remove from progress tracking
        setDownloadProgress(prev => {
          const { [model.id]: _, ...rest } = prev;
          return rest;
        });

        showMessage(`${model.name} downloaded successfully`);
      } else {
        showMessage(`Failed to download ${model.name}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      showMessage(`Download failed: ${error.message}`);
    }
  };

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
  };

  const formatFileSize = (sizeInMB: number): string => {
    if (sizeInMB < 1000) {
      return `${Math.round(sizeInMB)}MB`;
    }
    return `${(sizeInMB / 1024).toFixed(1)}GB`;
  };

  const getTierColor = (tier: PerformanceTier): string => {
    switch (tier) {
      case 'low': return '#4CAF50';
      case 'medium': return '#2196F3';
      case 'high': return '#FF5722';
      default: return theme.colors.outline;
    }
  };

  const getTierLabel = (tier: PerformanceTier): string => {
    switch (tier) {
      case 'low': return 'BASIC';
      case 'medium': return 'MID-RANGE';
      case 'high': return 'HIGH-END';
      default: return 'UNKNOWN';
    }
  };

  const renderModelCard = ({ item: model }: { item: AIModel }) => {
    const progress = downloadProgress[model.id];
    
    return (
      <Card 
        style={[styles.modelCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => onModelPress?.(model)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.modelInfo}>
              <Text variant="titleMedium" style={[styles.modelName, { color: theme.colors.onSurface }]}>
                {model.name}
              </Text>
              <Text variant="bodySmall" style={[styles.author, { color: theme.colors.onSurfaceVariant }]}>
                by {model.author}
              </Text>
            </View>
            
            <View style={styles.badges}>
              <Chip 
                mode="outlined" 
                compact
                textStyle={{ fontSize: 10 }}
                style={[styles.tierChip, { borderColor: getTierColor(model.performanceTier) }]}
              >
                {getTierLabel(model.performanceTier)}
              </Chip>
              {model.isDownloaded && (
                <View style={[styles.downloadedBadge, { backgroundColor: theme.colors.tertiary }]}>
                  <Text style={[styles.downloadedText, { color: theme.colors.onTertiary }]}>✓</Text>
                </View>
              )}
            </View>
          </View>
          
          <Text 
            variant="bodySmall" 
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {model.description}
          </Text>
          
          <View style={styles.modelStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statIcon, { color: theme.colors.onSurfaceVariant }]}>⬇</Text>
              <Text variant="labelSmall" style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {model.downloads.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statIcon, { color: theme.colors.onSurfaceVariant }]}>⭐</Text>
              <Text variant="labelSmall" style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {model.rating.toFixed(1)}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statIcon, { color: theme.colors.onSurfaceVariant }]}>💾</Text>
              <Text variant="labelSmall" style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {formatFileSize(model.size)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statIcon, { color: theme.colors.onSurfaceVariant }]}>🧠</Text>
              <Text variant="labelSmall" style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {formatFileSize(model.memoryRequirement)}
              </Text>
            </View>
          </View>

          {progress && (
            <View style={styles.progressContainer}>
              <ProgressBar 
                progress={progress.progress / 100} 
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {progress.status === 'downloading' 
                  ? `${Math.round(progress.progress)}% - ${progress.downloadSpeed?.toFixed(1) || 0} MB/s`
                  : progress.status
                }
              </Text>
            </View>
          )}
          
          <View style={styles.cardActions}>
            <Button 
              mode={model.isDownloaded ? 'outlined' : 'contained'}
              onPress={() => handleDownloadModel(model)}
              disabled={!!progress && progress.status === 'downloading'}
              style={styles.actionButton}
            >
              {model.isDownloaded 
                ? 'Open' 
                : progress?.status === 'downloading' 
                  ? 'Downloading...' 
                  : 'Download'
              }
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: theme.colors.onSurfaceVariant }]}>🤖</Text>
      <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
        {isLoading ? 'Loading models...' : 'No models found'}
      </Text>
      <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {isLoading ? 'Please wait while we fetch the latest models' : 'Try adjusting your search or filters'}
      </Text>
      {!isLoading && (
        <Button 
          mode="outlined" 
          onPress={onRefresh}
          style={styles.refreshButton}
        >
          Refresh Models
        </Button>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Header */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <Searchbar
          placeholder="Search models..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
        />
      </View>

      {/* Category Filters */}
      <View style={styles.filtersSection}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {CATEGORIES.map(category => (
            <Chip
              key={category.value}
              selected={selectedCategory === category.value}
              onPress={() => setSelectedCategory(category.value)}
              style={styles.filterChip}
              icon={() => <Text>{category.icon}</Text>}
            >
              {category.label}
            </Chip>
          ))}
        </ScrollView>

        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {PERFORMANCE_TIERS.map(tier => (
            <Chip
              key={tier.value}
              selected={selectedTier === tier.value}
              onPress={() => setSelectedTier(tier.value)}
              style={[
                styles.filterChip,
                selectedTier === tier.value && { backgroundColor: tier.color + '20' }
              ]}
            >
              {tier.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Models List */}
      <FlatList
        data={filteredModels}
        renderItem={renderModelCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.modelsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
          const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
          setShowFAB(contentOffset.y > 200);
        }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Loading models...
          </Text>
        </View>
      )}

      {/* Floating Action Button */}
      <Portal>
        <FAB
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primaryContainer,
              transform: [{ scale: showFAB ? 1 : 0 }],
            }
          ]}
          icon="refresh"
          onPress={onRefresh}
          label="Refresh"
        />
      </Portal>

      {/* Snackbar for messages */}
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.inverseSurface }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBar: {
    elevation: 0,
  },
  filtersSection: {
    paddingVertical: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  filterChip: {
    marginRight: 8,
  },
  modelsList: {
    padding: 16,
  },
  modelCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modelInfo: {
    flex: 1,
    marginRight: 12,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
  },
  author: {
    marginTop: 2,
    opacity: 0.7,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierChip: {
    height: 28,
  },
  downloadedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadedText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    marginBottom: 12,
    lineHeight: 18,
  },
  modelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  statText: {
    fontSize: 11,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    minWidth: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});