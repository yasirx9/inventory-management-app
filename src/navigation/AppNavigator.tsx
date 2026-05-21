import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from './types';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen 
          name="MainStack" 
          component={MainStack} 
        />
      ) : (
        <Stack.Screen 
          name="AuthStack" 
          component={AuthStack} 
        />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
