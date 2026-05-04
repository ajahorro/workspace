import { supabase } from '../lib/supabase';

export const sendBookingConfirmation = async (customerEmail, bookingData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'booking_confirmed',
        to: customerEmail,
        data: {
          date: bookingData.date,
          time: bookingData.time,
          totalPrice: bookingData.totalPrice,
          serviceName: bookingData.services || bookingData.vehicle
        }
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};

export const sendStaffAssignmentNotification = async (staffEmail, bookingData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'staff_assigned',
        to: staffEmail,
        data: {
          date: bookingData.date,
          time: bookingData.time,
          vehicle: bookingData.vehicle,
          plate: bookingData.plate,
          services: bookingData.services
        }
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};

export const sendStatusUpdateNotification = async (customerEmail, status, bookingData) => {
  try {
    // Note: Edge Function currently only has 'booking_confirmed', 'staff_assigned', 'booking_cancelled', 'payment_verified'. 
    // We'll map status updates. If it's cancelled, we use booking_cancelled. Otherwise, we might need to add a generic status update to the edge function, or skip for now.
    if (status === 'cancelled') {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'booking_cancelled',
          to: customerEmail,
          data: { date: bookingData.date }
        }
      });
      if (error) throw error;
      return data;
    }
    
    if (status === 'in_progress') {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'service_started',
          to: customerEmail,
          data: { date: bookingData.date }
        }
      });
      if (error) throw error;
      return data;
    }

    if (status === 'completed') {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'service_completed',
          to: customerEmail,
          data: { date: bookingData.date }
        }
      });
      if (error) throw error;
      return data;
    }

    return { success: true };
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};

export const sendPaymentReceiptNotification = async (customerEmail, amount, bookingData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'payment_verified',
        to: customerEmail,
        data: {
          amount: amount,
          date: new Date().toLocaleDateString(),
          vehicle: bookingData.vehicle
        }
      }
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};
