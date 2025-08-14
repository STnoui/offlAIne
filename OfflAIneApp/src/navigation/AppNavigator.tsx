import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { Text } from 'react-native';
import { DiscoverScreen } from '../screens/DiscoverScreen-Simple';
import { LibraryScreen } from '../screens/LibraryScreen';
import { BenchmarkScreen } from '../screens/BenchmarkScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ModelDetailsScreen } from '../screens/ModelDetailsScreen';
import { ResourceMonitorScreen } from '../screens/ResourceMonitorScreen';
import { CustomModelUploadScreen } from '../screens/CustomModelUploadScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  ModelDetails: { modelId: string };
  ResourceMonitor: { modelId?: string };
  CustomModelUpload: undefined;
};

export type MainTabParamList = {
  Discover: undefined;
  Library: undefined;
  Benchmark: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

const MainTabs: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let icon: string;

          if (route.name === 'Discover') {
            icon = '🔍';
          } else if (route.name === 'Library') {
            icon = '📚';
          } else if (route.name === 'Benchmark') {
            icon = '⚡';
          } else if (route.name === 'Settings') {
            icon = '⚙️';
          } else {
            icon = '?';
          }

          return <Text style={{ fontSize: size * 0.8, color }}>{icon}</Text>;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'System',
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontSize: 20,
          fontWeight: '600',
          fontFamily: 'System',
        },
      })}
    >
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen} 
        options={{ title: 'Discover Models' }}
      />
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen} 
        options={{ title: 'My Library' }}
      />
      <Tab.Screen 
        name="Benchmark" 
        component={BenchmarkScreen} 
        options={{ title: 'Device Test' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            color: theme.colors.onSurface,
            fontSize: 18,
            fontWeight: '600',
            fontFamily: 'System',
          },
          headerTintColor: theme.colors.primary,
          cardStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ModelDetails" 
          component={ModelDetailsScreen}
          options={{ title: 'Model Details' }}
        />
        <Stack.Screen 
          name="ResourceMonitor" 
          component={ResourceMonitorScreen}
          options={{ title: 'Resource Monitor' }}
        />
        <Stack.Screen 
          name="CustomModelUpload" 
          component={CustomModelUploadScreen}
          options={{ title: 'Upload Custom Model' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;