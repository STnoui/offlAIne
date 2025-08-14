import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Chip, 
  Button, 
  ProgressBar, 
  useTheme, 
  Searchbar,
  SegmentedButtons,
  Icon,
  Badge
} from 'react-native-paper';
import { useAppContext } from '../contexts/AppContext';
import { ModelCategory, PerformanceTier, NavigationProps } from '../types';

const CATEGORIES: { value: ModelCategory; label: string; icon: string }[] = [
  { value: 'writing-assistant', label: 'Writing', icon: 'pencil' },
  { value: 'code-helper', label: 'Code', icon: 'code-braces' },
  { value: 'language-translation', label: 'Translation', icon: 'translate' },
  { value: 'image-processing', label: 'Images', icon: 'image' },
  { value: 'voice-processing', label: 'Voice', icon: 'microphone' },
  { value: 'specialized', label: 'Specialized', icon: 'school' },
  { value: 'creative', label: 'Creative', icon: 'palette' },
];

const PERFORMANCE_TIERS = [
  { value: 'all', label: 'All Devices' },
  { value: 'low', label: 'Low-end' },
  { value: 'medium', label: 'Mid-range' },
  { value: 'high', label: 'High-end' },
];

export const DiscoverScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<PerformanceTier | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredModels = state.models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
    const matchesTier = selectedTier === 'all' || model.performanceTier === selectedTier;
    
    return matchesSearch && matchesCategory && matchesTier;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Implement model refresh from HuggingFace
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTierColor = (tier: PerformanceTier): string => {
    switch (tier) {
      case 'low': return theme.colors.tertiary;
      case 'medium': return theme.colors.primary;
      case 'high': return theme.colors.error;
      default: return theme.colors.outline;
    }
  };

  const renderModelCard = (model: any) => (
    <Card 
      key={model.id} 
      style={[styles.modelCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => navigation.navigate('ModelDetails', { modelId: model.id })}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={[styles.modelName, { color: theme.colors.onSurface }]}>
            {model.name}
          </Text>
          <View style={styles.badges}>
            <Chip 
              mode="outlined" 
              compact 
              style={[styles.tierChip, { borderColor: getTierColor(model.performanceTier) }]}
            >
              {model.performanceTier.toUpperCase()}
            </Chip>
            {model.isDownloaded && (
              <Icon source="check-circle" size={20} color={theme.colors.tertiary} />
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
            <Icon source="download" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {model.downloads.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon source="star" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {model.rating.toFixed(1)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon source="harddisk" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {formatFileSize(model.size)}
            </Text>
          </View>
        </View>

        {model.downloadProgress !== undefined && (
          <View style={styles.progressContainer}>
            <ProgressBar 
              progress={model.downloadProgress / 100} 
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {model.downloadProgress}%
            </Text>
          </View>
        )}
        
        <View style={styles.cardActions}>
          <Button 
            mode={model.isDownloaded ? 'outlined' : 'contained'}
            onPress={() => {
              if (model.isDownloaded) {
                // Open model
                navigation.navigate('ModelDetails', { modelId: model.id });
              } else {
                // Start download
                dispatch({ 
                  type: 'UPDATE_MODEL_DOWNLOAD', 
                  payload: { modelId: model.id, progress: 0 } 
                });
              }
            }}
            style={styles.actionButton}
          >
            {model.isDownloaded ? 'Open' : 'Download'}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <Searchbar
          placeholder="Search models..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <ScrollView 
        style={styles.filtersContainer}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <Chip
          selected={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
          style={styles.filterChip}
        >
          All Categories
        </Chip>
        {CATEGORIES.map(category => (
          <Chip
            key={category.value}
            selected={selectedCategory === category.value}
            onPress={() => setSelectedCategory(category.value)}
            icon={category.icon}
            style={styles.filterChip}
          >
            {category.label}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {state.isOffline && (
          <Card style={[styles.offlineCard, { backgroundColor: theme.colors.errorContainer }]}>
            <Card.Content>
              <View style={styles.offlineContent}>
                <Icon source="wifi-off" size={24} color={theme.colors.onErrorContainer} />
                <Text style={{ color: theme.colors.onErrorContainer, marginLeft: 8 }}>
                  You're offline. Showing downloaded models only.
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.modelsGrid}>
          {filteredModels.length > 0 ? (
            filteredModels.map(renderModelCard)
          ) : (
            <View style={styles.emptyState}>
              <Icon source="robot-confused" size={64} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
                No models found
              </Text>
              <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  searchBar: {
    elevation: 0,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  offlineCard: {
    margin: 16,
    marginBottom: 8,
  },
  offlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelsGrid: {
    padding: 16,
  },
  modelCard: {
    marginBottom: 16,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modelName: {
    flex: 1,
    marginRight: 8,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierChip: {
    height: 24,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  modelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    marginRight: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
  },
});