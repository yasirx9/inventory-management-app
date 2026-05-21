import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  APP_SETTINGS: '@app_settings',
  CACHED_INVENTORY: '@cached_inventory',
};

export const storageService = {
  // Generic set
  setItem: async (key: string, value: any) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error setting storage item ${key}:`, error);
    }
  },

  // Generic get
  getItem: async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting storage item ${key}:`, error);
      return null;
    }
  },

  // Remove item
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing storage item ${key}:`, error);
    }
  },

  // Clear all
  clear: async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
