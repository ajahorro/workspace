// Compatibility layer for old BookingContext
// This wraps the new AppContext to provide backward compatibility

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useAppContext } from '../app/context/AppContext';

interface BookingContextType {
  bookings: any[];
  services: any[];
  servicePricing: any[];
  createBooking: (data: any) => Promise<any>;
  cancelBooking: (id: string, reason: string) => Promise<void>;
  updateBookingStatus: (id: string, status: string) => Promise<void>;
  getBookingById: (id: string) => Promise<any>;
  loading: boolean;
  // Old cart functionality (deprecated but kept for compatibility)
  cart: any[];
  addToCart: (item: any) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalDuration: number;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    bookings,
    services,
    servicePricing,
    createBooking,
    cancelBooking,
    updateBookingStatus,
    getBookingById,
    isLoading
  } = useAppContext();

  // Legacy cart state (for old components that still use it)
  const [cart, setCart] = useState<any[]>([]);

  const addToCart = (item: any) => {
    setCart(prev => [...prev, { ...item, id: Math.random().toString() }]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalDuration = cart.reduce((sum, item) => sum + (item.duration || 0), 0);

  const value: BookingContextType = {
    bookings,
    services,
    servicePricing,
    createBooking,
    cancelBooking,
    updateBookingStatus,
    getBookingById,
    loading: isLoading,
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    totalAmount,
    totalDuration
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

export const useBooking = (): BookingContextType => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
};
