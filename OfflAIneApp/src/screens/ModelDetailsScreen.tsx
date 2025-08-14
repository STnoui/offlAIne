import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Icon } from 'react-native-paper';
import { NavigationProps } from '../types';

export const ModelDetailsScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const theme = useTheme();
  const { modelId } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Icon source="robot" size={64} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
          Model Details
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Detailed information for model: {modelId}
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
});