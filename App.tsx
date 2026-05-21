import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { PaperProvider, Text } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { SnackbarProvider } from './src/context/SnackbarContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/utils/theme';
import { useNetInfo } from './src/hooks/useNetInfo';

function OfflineBanner() {
  const { isConnected } = useNetInfo();

  if (isConnected) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>
        ⚠️ No internet connection – showing cached data
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <SnackbarProvider>
        <AuthProvider>
          <View style={styles.appContainer}>
            <StatusBar backgroundColor="#1565C0" barStyle="light-content" />
            <OfflineBanner />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </View>
        </AuthProvider>
      </SnackbarProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  offlineBanner: {
    backgroundColor: '#FF8F00', // Amber alert warning color from theme
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 9999,
    elevation: 4,
  },
  offlineText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
