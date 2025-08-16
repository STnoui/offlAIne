import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Chip, 
  Button, 
  useTheme, 
  Searchbar,
  Icon,
  ActivityIndicator,
  Menu,
  Divider,
  ProgressBar
} from 'react-native-paper';
import { useAppContext } from '../contexts/AppContext';
import { NavigationProps, AIModel, ModelPersonalization } from '../types';
import ModelManagementService from '../services/ModelManagementService';

export const LibraryScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [downloadedModels, setDownloadedModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, count: 0 });

  useEffect(() => {
    loadDownloadedModels();
  }, []);

  const loadDownloadedModels = async () => {
    setLoadingModels(true);
    try {
      const models = await ModelManagementService.getDownloadedModels();
      setDownloadedModels(models);
      
      // Update storage info
      const analytics = await ModelManagementService.getStorageAnalytics();
      setStorageInfo({
        used: analytics.spaceUsed / (1024 * 1024), // Convert to MB
        total: analytics.spaceAvailable / (1024 * 1024),
        count: analytics.modelCount
      });
    } catch (error) {
      console.error('Failed to load downloaded models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDownloadedModels();
    setRefreshing(false);
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      const success = await ModelManagementService.deleteModel(modelId);
      if (success) {
        await loadDownloadedModels();
        dispatch({ type: 'REMOVE_MODEL', payload: modelId });
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
    setMenuVisible(null);
  };

  const handleToggleFavorite = async (modelId: string) => {
    try {
      const current = await ModelManagementService.getPersonalization(modelId);
      await ModelManagementService.updatePersonalization(modelId, {
        favorited: !current?.favorited,
        modelId
      });
      
      dispatch({ 
        type: 'UPDATE_PERSONALIZATION', 
        payload: { 
          modelId, 
          personalization: { favorited: !current?.favorited } 
        } 
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
    setMenuVisible(null);
  };

  const filteredModels = downloadedModels.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (sizeInMB: number): string => {
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(1)} MB`;
    } else {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
  };

  const renderModelCard = (model: AIModel) => {
    const personalization = state.personalizations[model.id];
    const isFavorited = personalization?.favorited || false;
    
    return (
      <Card 
        key={model.id} 
        style={[styles.modelCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigation.navigate('ModelDetails', { modelId: model.id })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.modelInfo}>
              <Text variant="titleMedium" style={[styles.modelName, { color: theme.colors.onSurface }]}>
                {model.name}
              </Text>
              {isFavorited && (
                <Icon source="heart" size={20} color={theme.colors.error} />
              )}
            </View>
            
            <Menu
              visible={menuVisible === model.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <Button 
                  mode="text" 
                  onPress={() => setMenuVisible(model.id)}
                  icon="dots-vertical"
                  compact
                />
              }
            >
              <Menu.Item 
                onPress={() => handleToggleFavorite(model.id)} 
                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                leadingIcon={isFavorited ? 'heart-off' : 'heart'}
              />
              <Menu.Item 
                onPress={() => navigation.navigate('ModelDetails', { modelId: model.id })} 
                title="View details"
                leadingIcon="information"
              />
              <Divider />
              <Menu.Item 
                onPress={() => handleDeleteModel(model.id)} 
                title="Delete model"
                leadingIcon="delete"
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
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
              <Icon source="harddisk" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {formatFileSize(model.size)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Icon source="calendar" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {new Date(model.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {personalization?.usageCount && (
              <View style={styles.statItem}>
                <Icon source="play" size={16} color={theme.colors.onSurfaceVariant} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                  Used {personalization.usageCount} times
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loadingModels) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading your downloaded models...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Storage Info */}
      <Card style={[styles.storageCard, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Card.Content>
          <View style={styles.storageHeader}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Storage Usage
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {storageInfo.count} models • {formatFileSize(storageInfo.used)} used
            </Text>
          </View>
          <ProgressBar 
            progress={storageInfo.total > 0 ? storageInfo.used / storageInfo.total : 0} 
            color={theme.colors.primary}
            style={styles.storageProgress}
          />
        </Card.Content>
      </Card>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <Searchbar
          placeholder="Search downloaded models..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Models List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.modelsGrid}>
          {filteredModels.length > 0 ? (
            filteredModels.map(renderModelCard)
          ) : downloadedModels.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon source="download-off" size={64} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
                No Downloaded Models
              </Text>
              <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Download models from the Discover tab to see them here
              </Text>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('Discover')}
                style={styles.discoverButton}
              >
                Discover Models
              </Button>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon source="magnify-close" size={64} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
                No Matching Models
              </Text>
              <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Try adjusting your search terms
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
  storageCard: {
    margin: 16,
    marginBottom: 8,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageProgress: {
    height: 8,
    borderRadius: 4,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
    elevation: 2,
  },
  searchBar: {
    elevation: 0,
  },
  content: {
    flex: 1,
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
  modelInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelName: {
    flex: 1,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  modelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  discoverButton: {
    marginTop: 8,
  },
});