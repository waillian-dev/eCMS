import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSecureItem, setSecureItem } from './secureStoreWrapper';
import { cleanAuthSession } from './api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await getSecureItem('accessToken');
        const savedUser = await getSecureItem('user');
        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('Failed to load local auth session', err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (accessToken: string, refreshToken: string, userData: User) => {
    await setSecureItem('accessToken', accessToken);
    await setSecureItem('refreshToken', refreshToken);
    await setSecureItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await cleanAuthSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within a mobile AuthProvider');
  }
  return context;
};
