import React, { ReactNode } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { BookingProvider } from '../context/BookingContext';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';
import { Toaster } from 'sonner';

interface RootWrapperProps {
  children: ReactNode;
}

const RootWrapperContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoading } = useAppContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] text-blue-600 dark:text-blue-400" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading SpeedWay Studio...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const RootWrapper: React.FC<RootWrapperProps> = ({ children }) => {
  return (
    <AppProvider>
      <AuthProvider>
        <ThemeProvider>
          <BookingProvider>
            <NotificationProvider>
              <RootWrapperContent>{children}</RootWrapperContent>
              <Toaster position="top-right" richColors />
            </NotificationProvider>
          </BookingProvider>
        </ThemeProvider>
      </AuthProvider>
    </AppProvider>
  );
};
