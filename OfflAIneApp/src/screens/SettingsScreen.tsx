import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Switch, 
  Button, 
  useTheme, 
  Icon, 
  List,
  Divider,
  Dialog,
  Portal,
  ProgressBar
} from 'react-native-paper';
import { useAppContext } from '../contexts/AppContext';
import { NavigationProps, AppSettings } from '../types';
import ModelManagementService from '../services/ModelManagementService';
import HuggingFaceService from '../services/HuggingFaceService';
import DeviceBenchmarkService from '../services/DeviceBenchmarkService';

export const SettingsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    dispatch({ 
      type: 'UPDATE_SETTINGS', 
      payload: { [key]: value } 
    });
  };

  const handleStorageOptimization = async () => {
    setOptimizing(true);
    setOptimizationResult(null);
    
    try {
      const result = await ModelManagementService.optimizeStorage();
      const spaceSavedMB = result.spaceSaved / (1024 * 1024);
      setOptimizationResult(
        `Optimization complete! Saved ${spaceSavedMB.toFixed(1)} MB of space.\n\n` +
        result.optimizationsApplied.join('\n')
      );
    } catch (error) {
      console.error('Storage optimization failed:', error);
      setOptimizationResult('Storage optimization failed. Please try again.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached model data and force fresh downloads. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await HuggingFaceService.clearCache();
              await DeviceBenchmarkService.clearBenchmarkCache();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all app settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            dispatch({ 
              type: 'UPDATE_SETTINGS', 
              payload: {
                theme: 'system',
                language: 'en',
                autoCleanup: true,
                maxStorageUsage: 5,
                showResourceMonitor: true,
                enableBackgroundDownloads: true,
                downloadOnlyOnWifi: false,
                showPerformanceWarnings: true,
                enableUsageAnalytics: false,
              }
            });
            Alert.alert('Success', 'Settings reset to defaults');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.content}>
        {/* App Preferences */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              App Preferences
            </Text>
            
            <List.Item
              title="Theme"
              description={`Current: ${state.settings.theme}`}
              left={props => <Icon {...props} source="palette" />}
              right={() => (
                <View style={styles.settingValue}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {state.settings.theme}
                  </Text>
                </View>
              )}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Show Resource Monitor"
              description="Display real-time performance metrics"
              left={props => <Icon {...props} source="chart-line" />}
              right={() => (
                <Switch
                  value={state.settings.showResourceMonitor}
                  onValueChange={(value) => updateSetting('showResourceMonitor', value)}
                />
              )}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Performance Warnings"
              description="Show alerts when device is under stress"
              left={props => <Icon {...props} source="alert-circle" />}
              right={() => (
                <Switch
                  value={state.settings.showPerformanceWarnings}
                  onValueChange={(value) => updateSetting('showPerformanceWarnings', value)}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Download Settings */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Download Settings
            </Text>
            
            <List.Item
              title="Background Downloads"
              description="Allow downloads to continue in background"
              left={props => <Icon {...props} source="download" />}
              right={() => (
                <Switch
                  value={state.settings.enableBackgroundDownloads}
                  onValueChange={(value) => updateSetting('enableBackgroundDownloads', value)}
                />
              )}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="WiFi Only Downloads"
              description="Only download models when connected to WiFi"
              left={props => <Icon {...props} source="wifi" />}
              right={() => (
                <Switch
                  value={state.settings.downloadOnlyOnWifi}
                  onValueChange={(value) => updateSetting('downloadOnlyOnWifi', value)}
                />
              )}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Max Storage Usage"
              description={`Limit model storage to ${state.settings.maxStorageUsage} GB`}
              left={props => <Icon {...props} source="harddisk" />}
              right={() => (
                <View style={styles.settingValue}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {state.settings.maxStorageUsage} GB
                  </Text>
                </View>
              )}
            />
          </Card.Content>
        </Card>

        {/* Storage Management */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Storage Management
            </Text>
            
            <List.Item
              title="Auto Cleanup"
              description="Automatically remove old and unused models"
              left={props => <Icon {...props} source="delete-sweep" />}
              right={() => (
                <Switch
                  value={state.settings.autoCleanup}
                  onValueChange={(value) => updateSetting('autoCleanup', value)}
                />
              )}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Optimize Storage"
              description="Compress models and free up space"
              left={props => <Icon {...props} source="compress" />}
              onPress={() => setShowStorageDialog(true)}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Clear Cache"
              description="Remove temporary files and cached data"
              left={props => <Icon {...props} source="cached" />}
              onPress={handleClearCache}
            />
          </Card.Content>
        </Card>

        {/* Privacy & Security */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Privacy & Security
            </Text>
            
            <List.Item
              title="Usage Analytics"
              description="Help improve the app by sharing anonymous usage data"
              left={props => <Icon {...props} source="chart-box" />}
              right={() => (
                <Switch
                  value={state.settings.enableUsageAnalytics}
                  onValueChange={(value) => updateSetting('enableUsageAnalytics', value)}
                />
              )}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Privacy Policy"
              description="Read our privacy policy and data handling practices"
              left={props => <Icon {...props} source="shield-account" />}
              onPress={() => {
                Alert.alert(
                  'Privacy Policy',
                  'OfflAIne is designed with privacy first:\n\n' +
                  '• No user accounts required\n' +
                  '• All AI processing happens locally\n' +
                  '• No data transmitted to external servers\n' +
                  '• Anonymous usage analytics are optional\n\n' +
                  'Your data stays on your device.'
                );
              }}
            />
          </Card.Content>
        </Card>

        {/* About & Support */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              About & Support
            </Text>
            
            <List.Item
              title="App Version"
              description="0.0.1 (Development)"
              left={props => <Icon {...props} source="information" />}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Run Device Benchmark"
              description="Test device performance and get recommendations"
              left={props => <Icon {...props} source="speedometer" />}
              onPress={() => navigation.navigate('Benchmark')}
            />
            
            <Divider style={styles.divider} />
            
            <List.Item
              title="Reset All Settings"
              description="Restore app to default configuration"
              left={props => <Icon {...props} source="restore" />}
              onPress={handleResetSettings}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Storage Optimization Dialog */}
      <Portal>
        <Dialog visible={showStorageDialog} onDismiss={() => setShowStorageDialog(false)}>
          <Dialog.Title>Storage Optimization</Dialog.Title>
          <Dialog.Content>
            {optimizing ? (
              <View style={styles.optimizingContent}>
                <ProgressBar indeterminate color={theme.colors.primary} style={styles.progressBar} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 16 }}>
                  Optimizing storage... This may take a few moments.
                </Text>
              </View>
            ) : optimizationResult ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {optimizationResult}
              </Text>
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                This will compress old models, remove duplicates, and clean up temporary files to free up space.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            {!optimizing && (
              <>
                <Button onPress={() => setShowStorageDialog(false)}>
                  {optimizationResult ? 'Close' : 'Cancel'}
                </Button>
                {!optimizationResult && (
                  <Button onPress={handleStorageOptimization}>
                    Optimize
                  </Button>
                )}
              </>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  card: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 4,
  },
  settingValue: {
    alignItems: 'flex-end',
  },
  optimizingContent: {
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
});