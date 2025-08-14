/**
 * OfflAIne - Privacy AI (Simple Version)
 * React Native Application
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { getTheme } from './src/utils/theme';
import { DiscoverScreen } from './src/screens/DiscoverScreen-Simple';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = getTheme(isDarkMode);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar 
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.surface}
        />
        <DiscoverScreen navigation={{}} route={{}} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;