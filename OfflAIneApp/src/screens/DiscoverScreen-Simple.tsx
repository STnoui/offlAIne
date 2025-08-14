import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { NavigationProps } from '../types';

export const DiscoverScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="displaySmall" style={[styles.title, { color: theme.colors.primary }]}>
          🤖 OfflAIne
        </Text>
        <Text variant="titleLarge" style={[styles.subtitle, { color: theme.colors.onSurface }]}>
          Privacy AI
        </Text>
        <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          Your offline AI companion is starting up...
        </Text>
        <Text variant="bodyMedium" style={[styles.status, { color: theme.colors.tertiary }]}>
          ✅ App loaded successfully!
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
  },
  status: {
    textAlign: 'center',
  },
});