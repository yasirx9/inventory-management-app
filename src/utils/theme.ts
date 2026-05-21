import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E3A8A', // Deep Royal Navy Blue
    secondary: '#F59E0B', // Amber Gold Highlight
    tertiary: '#D97706', // Rich Amber Accent
    background: '#FFFFFF', // Pure White Background
    surface: '#FFFFFF', // Pure White Card Surfaces
    error: '#ef4444',
  },
  roundness: 8,
};
