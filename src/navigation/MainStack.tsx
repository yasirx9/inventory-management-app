import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 
        Authenticated app entrypoint wrapping our bottom tabs 
        (each tab manages its own drill-down stacks, which is 
        the standard iOS/Android pattern for persistent tab status).
      */}
      <Stack.Screen 
        name="MainStack" 
        component={BottomTabNavigator} 
      />
    </Stack.Navigator>
  );
}
