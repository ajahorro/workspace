import React, { createContext, useContext, useState, useEffect } from 'react';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  
  const [bookingDetails, setBookingDetails] = useState({
    vehicleType: '',
    plateNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    customerNotes: '',
    scheduledStart: null,
    paymentMethod: 'CASH'
  });

  useEffect(() => {
    const saved = localStorage.getItem('speedway_cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('speedway_booking_details');
    if (saved) setBookingDetails(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('speedway_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('speedway_booking_details', JSON.stringify(bookingDetails));
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
