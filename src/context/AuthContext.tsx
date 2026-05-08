// Compatibility layer for old AuthContext
// This wraps the new AppContext to provide backward compatibility

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppContext } from '../app/context/AppContext';

interface AuthContextType {
  user: any;
  profile: any;
  session: any;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    user,
    profile,
    session,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isLoading
  } = useAppContext();

  const value: AuthContextType = {
    user,
    profile,
    session,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    loading: isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
