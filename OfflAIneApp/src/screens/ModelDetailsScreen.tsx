import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Chip, 
  Button, 
  useTheme, 
  Icon, 
  ProgressBar,
  ActivityIndicator,
  Divider,
  Badge
} from 'react-native-paper';
import { useAppContext } from '../contexts/AppContext';
import { NavigationProps, AIModel, PerformanceTier, DownloadProgress } from '../types';
import HuggingFaceService from '../services/HuggingFaceService';
import ModelManagementService from '../services/ModelManagementService';

export const ModelDetailsScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const { modelId } = route.params;
  
  const [model, setModel] = useState<AIModel | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | undefined>(undefined);
  const [downloadPaused, setDownloadPaused] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    loadModelDetails();
    checkModelStatus();
  }, [modelId]);

  const loadModelDetails = async () => {
    setLoading(true);
    setError(undefined);
    
    try {
      // First check if model is in app state
      let modelData = state.models.find(m => m.id === modelId);
      
      if (!modelData) {
        // Fetch from HuggingFace if not in state
        modelData = await HuggingFaceService.getModelDetails(modelId);
      }
      
      if (modelData) {
        setModel(modelData);
        
        // Check if model is downloaded
        const downloaded = await ModelManagementService.isModelDownloaded(modelId);
        setIsDownloaded(downloaded);
        
        // Check if favorited
        const personalization = state.personalizations[modelId];
        setIsFavorited(personalization?.favorited || false);
      } else {
        setError('Model not found');
      }
    } catch (err) {
      console.error('Failed to load model details:', err);
      setError('Failed to load model details. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const checkModelStatus = () => {
    const progress = ModelManagementService.getDownloadProgress(modelId);
    if (progress) {
      setDownloadProgress(progress);
      setDownloading(progress.status === 'downloading');
      setDownloadPaused(progress.status === 'paused');
    }
  };

  const handleDownload = async () => {
    if (!model || downloading) return;
    
    setDownloading(true);
    setDownloadProgress(undefined);
    
    try {
      const success = await ModelManagementService.downloadModel(
        model,
        (progress) => {
          setDownloadProgress(progress);
          dispatch({ 
            type: 'UPDATE_MODEL_DOWNLOAD', 
            payload: { 
              modelId: model.id, 
              progress: progress.progress,
              isDownloaded: progress.status === 'completed'
            } 
          });
        }
      );
      
      if (success) {
        setIsDownloaded(true);
        Alert.alert('Success', `${model.name} downloaded successfully!`);
      } else {
        Alert.alert('Error', 'Download failed. Please try again.');
      }
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Error', 'Download failed. Please check your storage space and try again.');
    } finally {
      setDownloading(false);
      setDownloadProgress(undefined);
    }
  };

  const handleDelete = async () => {
    if (!model) return;
    
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete ${model.name}? This will free up ${formatFileSize(model.size)} of storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await ModelManagementService.deleteModel(model.id);
              if (success) {
                setIsDownloaded(false);
                dispatch({ type: 'REMOVE_MODEL', payload: model.id });
                Alert.alert('Success', 'Model deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete model');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete model');
            }
          }
        }
      ]
    );
  };

  const handlePauseDownload = async () => {
    if (!model) return;
    
    try {
      await ModelManagementService.pauseDownload(model.id);
      setDownloading(false);
      setDownloadPaused(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to pause download');
    }
  };

  const handleResumeDownload = async () => {
    if (!model) return;
    
    try {
      await ModelManagementService.resumeDownload(model.id);
      setDownloading(true);
      setDownloadPaused(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to resume download');
    }
  };

  const handleCancelDownload = async () => {
    if (!model) return;
    
    Alert.alert(
      'Cancel Download',
      'Are you sure you want to cancel this download? Any progress will be lost.',
      [
        { text: 'Continue Download', style: 'cancel' },
        { 
          text: 'Cancel Download', 
          style: 'destructive',
          onPress: async () => {
            try {
              await ModelManagementService.cancelDownload(model.id);
              setDownloading(false);
              setDownloadPaused(false);
              setDownloadProgress(undefined);
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel download');
            }
          }
        }
      ]
    );
  };

  const handleToggleFavorite = async () => {
    if (!model) return;
    
    try {
      const newFavoriteStatus = !isFavorited;
      await ModelManagementService.updatePersonalization(model.id, {
        favorited: newFavoriteStatus,
        modelId: model.id
      });
      
      setIsFavorited(newFavoriteStatus);
      dispatch({ 
        type: 'UPDATE_PERSONALIZATION', 
        payload: { 
          modelId: model.id, 
          personalization: { favorited: newFavoriteStatus } 
        } 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const formatFileSize = (sizeInMB: number): string => {
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(1)} MB`;
    } else {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
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

  const getCompatibilityMessage = (tier: PerformanceTier): string => {
    const deviceTier = state.deviceBenchmark?.performanceTier;
    if (!deviceTier) return 'Run device benchmark to check compatibility';
    
    const tierLevels = { low: 1, medium: 2, high: 3 };
    const deviceLevel = tierLevels[deviceTier];
    const modelLevel = tierLevels[tier];
    
    if (deviceLevel >= modelLevel) {
      return '✅ Fully compatible with your device';
    } else if (deviceLevel === modelLevel - 1) {
      return '⚠️ May run slowly on your device';
    } else {
      return '❌ Not recommended for your device';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading model details...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !model) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon source="alert-circle" size={64} color={theme.colors.error} />
          <Text variant="titleMedium" style={[styles.errorTitle, { color: theme.colors.error }]}>
            {error || 'Model Not Found'}
          </Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.headerContent}>
              <View style={styles.titleSection}>
                <Text variant="headlineSmall" style={[styles.modelName, { color: theme.colors.onSurface }]}>
                  {model.name}
                </Text>
                <Text variant="bodyMedium" style={[styles.author, { color: theme.colors.onSurfaceVariant }]}>
                  by {model.author}
                </Text>
              </View>
              
              <View style={styles.badges}>
                <Chip 
                  mode="flat" 
                  style={[styles.tierChip, { backgroundColor: getTierColor(model.performanceTier) + '20' }]}
                  textStyle={{ color: getTierColor(model.performanceTier), fontWeight: 'bold' }}
                >
                  {model.performanceTier.toUpperCase()}
                </Chip>
                {isDownloaded && (
                  <Icon source="check-circle" size={24} color={theme.colors.tertiary} />
                )}
                {isFavorited && (
                  <Icon source="heart" size={24} color={theme.colors.error} />
                )}
              </View>
            </View>
            
            <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurface }]}>
              {model.description}
            </Text>
          </Card.Content>
        </Card>

        {/* Stats Section */}
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Model Statistics
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Icon source="download" size={20} color={theme.colors.onSurfaceVariant} />
                <View style={styles.statText}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Downloads</Text>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    {model.downloads.toLocaleString()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statItem}>
                <Icon source="star" size={20} color={theme.colors.onSurfaceVariant} />
                <View style={styles.statText}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Rating</Text>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    {model.rating.toFixed(1)} / 5.0
                  </Text>
                </View>
              </View>
              
              <View style={styles.statItem}>
                <Icon source="harddisk" size={20} color={theme.colors.onSurfaceVariant} />
                <View style={styles.statText}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Size</Text>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    {formatFileSize(model.size)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statItem}>
                <Icon source="memory" size={20} color={theme.colors.onSurfaceVariant} />
                <View style={styles.statText}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Memory</Text>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                    {formatFileSize(model.memoryRequirement)}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Compatibility Section */}
        <Card style={[styles.compatibilityCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Device Compatibility
            </Text>
            
            <Text variant="bodyMedium" style={[styles.compatibilityText, { color: theme.colors.onSurface }]}>
              {getCompatibilityMessage(model.performanceTier)}
            </Text>
            
            {!state.deviceBenchmark && (
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('Benchmark')}
                style={styles.benchmarkButton}
              >
                Run Device Benchmark
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Tags Section */}
        {model.tags.length > 0 && (
          <Card style={[styles.tagsCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Tags
              </Text>
              
              <View style={styles.tagsContainer}>
                {model.tags.map((tag, index) => (
                  <Chip key={index} mode="outlined" style={styles.tag}>
                    {tag}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Download Progress */}
        {(downloading || downloadPaused) && downloadProgress && (
          <Card style={[styles.progressCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <View style={styles.progressContent}>
                <View style={styles.progressHeader}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    {downloadPaused ? 'Download Paused' : 'Downloading'} {model.name}
                  </Text>
                  <View style={styles.progressActions}>
                    {downloading ? (
                      <Button 
                        mode="outlined" 
                        onPress={handlePauseDownload}
                        icon="pause"
                        compact
                        textColor={theme.colors.onPrimaryContainer}
                        style={styles.progressButton}
                      >
                        Pause
                      </Button>
                    ) : downloadPaused ? (
                      <Button 
                        mode="outlined" 
                        onPress={handleResumeDownload}
                        icon="play"
                        compact
                        textColor={theme.colors.onPrimaryContainer}
                        style={styles.progressButton}
                      >
                        Resume
                      </Button>
                    ) : null}
                    <Button 
                      mode="outlined" 
                      onPress={handleCancelDownload}
                      icon="close"
                      compact
                      textColor={theme.colors.onPrimaryContainer}
                      style={styles.progressButton}
                    >
                      Cancel
                    </Button>
                  </View>
                </View>
                
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  {downloadProgress.progress.toFixed(1)}% • {downloading ? `${downloadProgress.downloadSpeed.toFixed(1)} MB/s` : 'Paused'}
                </Text>
                <ProgressBar 
                  progress={downloadProgress.progress / 100} 
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
                
                {downloadProgress.estimatedTimeRemaining > 0 && downloading && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                    {Math.ceil(downloadProgress.estimatedTimeRemaining / 60)} minutes remaining
                  </Text>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.actionRow}>
          <Button 
            mode="outlined"
            onPress={handleToggleFavorite}
            icon={isFavorited ? 'heart' : 'heart-outline'}
            style={styles.favoriteButton}
          >
            {isFavorited ? 'Favorited' : 'Favorite'}
          </Button>
          
          {isDownloaded ? (
            <Button 
              mode="contained"
              onPress={handleDelete}
              icon="delete"
              style={styles.deleteButton}
              buttonColor={theme.colors.error}
            >
              Delete
            </Button>
          ) : (
            <Button 
              mode="contained"
              onPress={handleDownload}
              disabled={downloading}
              icon="download"
              style={styles.downloadButton}
            >
              {downloading ? 'Downloading...' : 'Download'}
            </Button>
          )}
        </View>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    marginBottom: 16,
  },
  titleSection: {
    marginBottom: 12,
  },
  modelName: {
    marginBottom: 4,
    fontWeight: 'bold',
  },
  author: {
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tierChip: {
    borderRadius: 16,
  },
  description: {
    lineHeight: 22,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
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
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statText: {
    marginLeft: 12,
    flex: 1,
  },
  compatibilityCard: {
    margin: 16,
    marginBottom: 8,
  },
  compatibilityText: {
    marginBottom: 12,
    lineHeight: 20,
  },
  benchmarkButton: {
    alignSelf: 'flex-start',
  },
  tagsCard: {
    margin: 16,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    marginBottom: 4,
  },
  progressCard: {
    margin: 16,
    marginBottom: 8,
  },
  progressContent: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  progressButton: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  actions: {
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  favoriteButton: {
    flex: 1,
  },
  downloadButton: {
    flex: 2,
  },
  deleteButton: {
    flex: 2,
  },
});