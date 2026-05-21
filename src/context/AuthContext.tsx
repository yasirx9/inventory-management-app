import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getData } from '../services/database';
import { User as UserProfile } from '../types';

interface AuthContextType {
  user: { uid: string; email: string } | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = '@eih_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session on startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedSession = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (savedSession) {
          const profile = JSON.parse(savedSession);
          setUserProfile(profile);
        }
      } catch (e) {
        console.error('AuthContext: Failed to restore user session:', e);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Log in using direct Firebase RTDB query
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Fetch all users from your cloud database
      const usersData = await getData<Record<string, UserProfile & { password?: string }>>('users');
      
      if (!usersData) {
        throw new Error('No user database records found on Firebase.');
      }

      let foundUser: (UserProfile & { password?: string }) | null = null;
      
      // Look for a matching user record
      for (const key of Object.keys(usersData)) {
        const profile = usersData[key];
        if (
          profile.email && 
          profile.email.toLowerCase() === email.trim().toLowerCase() && 
          profile.password === password
        ) {
          foundUser = { ...profile, id: key };
          break;
        }
      }

      if (!foundUser) {
        throw new Error('Invalid email or password credentials.');
      }

      if (foundUser.status === 'inactive') {
        throw new Error('Account suspended. Contact administrative team.');
      }

      // Safe copy without exposing password in current session state
      const cleanUser: UserProfile = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        department: foundUser.department,
        status: foundUser.status,
        created_at: foundUser.created_at || new Date().toISOString()
      };
      
      // Save session locally
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(cleanUser));
      setUserProfile(cleanUser);
    } catch (error) {
      setUserProfile(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Log out the current user
  const logout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      setUserProfile(null);
    } catch (error) {
      console.error('AuthContext: Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Keep compatibility with screens checking `user !== null`
  const user = userProfile ? { uid: userProfile.id, email: userProfile.email } : null;

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
