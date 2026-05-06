const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const sendBookingConfirmation = async (customerEmail, bookingData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking_confirmed',
        to: customerEmail,
        data: {
          date: bookingData.date,
          time: bookingData.time,
          totalPrice: bookingData.totalPrice,
          serviceName: bookingData.services || bookingData.vehicle
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};

export const sendStaffAssignmentNotification = async (staffEmail, bookingData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'staff_assigned',
        to: staffEmail,
        data: {
          date: bookingData.date,
          time: bookingData.time,
          vehicle: bookingData.vehicle,
          plate: bookingData.plate,
          services: bookingData.services
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};

export const sendStatusUpdateNotification = async (customerEmail, status, bookingData) => {
  try {
    if (status === 'cancelled') {
      const response = await fetch(`${BACKEND_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_cancelled',
          to: customerEmail,
          data: { date: bookingData.date }
        })
      });
      return await response.json();
    }

    if (status === 'completed' || status === 'finished') {
      const response = await fetch(`${BACKEND_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_finished',
          to: customerEmail,
          data: { 
            date: bookingData.date,
            vehicle: bookingData.vehicle 
          }
        })
      });
      return await response.json();
    }
    
    console.log(`Skipping email for status: ${status} (No template supported)`);
    return { success: true };
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};

export const sendPaymentReceiptNotification = async (customerEmail, amount, bookingData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_verified',
        to: customerEmail,
        data: {
          amount: amount,
          date: new Date().toLocaleDateString(),
          vehicle: bookingData.vehicle
        }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};

export const sendVerificationCode = async (to, code) => {
  try {
    const response = await fetch(`${BACKEND_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'auth_verification',
        to,
        data: { code }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};
