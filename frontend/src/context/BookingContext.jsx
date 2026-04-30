import React, { createContext, useContext, useState, useEffect } from 'react';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('renew_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [bookingDetails, setBookingDetails] = useState(() => {
    const saved = localStorage.getItem('renew_booking_details');
    return saved ? JSON.parse(saved) : {
      vehicleType: '',
      plateNumber: '',
      vehicleBrand: '',
      vehicleModel: '',
      customerNotes: '',
      scheduledStart: null,
      paymentMethod: 'CASH'
    };
  });

  useEffect(() => {
    localStorage.setItem('renew_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('renew_booking_details', JSON.stringify(bookingDetails));
  }, [bookingDetails]);

  const addToCart = (service) => {
    setCart((prev) => {
      if (prev.find(s => s.id === service.id)) return prev;
      return [...prev, service];
    });
  };

  const removeFromCart = (serviceId) => {
    setCart((prev) => prev.filter(s => s.id !== serviceId));
  };

  const clearCart = () => {
    setCart([]);
    setBookingDetails({
      vehicleType: '',
      plateNumber: '',
      vehicleBrand: '',
      vehicleModel: '',
      customerNotes: '',
      scheduledStart: null,
      paymentMethod: 'CASH'
    });
  };

  const totalAmount = cart.reduce((sum, service) => sum + Number(service.price), 0);
  const totalDuration = cart.reduce((sum, service) => sum + Number(service.duration_minutes), 0);

  return (
    <BookingContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      totalAmount,
      totalDuration,
      bookingDetails,
      setBookingDetails
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
