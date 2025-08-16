/**
 * OfflAIne - Privacy AI
 * React Native Application
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { AppProvider } from './src/contexts/AppContext';
import { getTheme } from './src/utils/theme';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = getTheme(isDarkMode);

  return (
    <AppProvider>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={theme.colors.surface}
          />
          <AppNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </AppProvider>
  );
}

export default App;