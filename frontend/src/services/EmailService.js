
const RESEND_API_KEY = 're_g2Q5BTRf_8pG32oW4yLVJ6HbpzNGGh6Av';

export const sendBookingConfirmation = async (customerEmail, bookingData) => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SpeedWay AutoxMoto Detail Studio <onboarding@resend.dev>',
        to: customerEmail,
        subject: 'Booking Confirmed! 🚗✨',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
            <h1 style="color: #A91B18;">SpeedWay AutoxMoto Detail Studio</h1>
            <p>Hi there!</p>
            <p>Your booking has been successfully confirmed. We can't wait to make your vehicle look brand new again!</p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h2 style="font-size: 1.1rem; margin-top: 0;">Booking Details:</h2>
              <p><strong>Service:</strong> ${bookingData.serviceName}</p>
              <p><strong>Date:</strong> ${bookingData.date}</p>
              <p><strong>Time:</strong> ${bookingData.time}</p>
              <p><strong>Total:</strong> ₱${bookingData.totalPrice}</p>
            </div>

            <p>You can view more details or manage your booking in your customer dashboard.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 0.8rem; color: #64748b;">SpeedWay AutoxMoto Detail Studio - Premium Car Care Services</p>
          </div>
        `
      })
    });

    const result = await response.json();
    console.log('Email Service Response:', result);
    return result;
  } catch (error) {
    console.error('Email Service Error:', error);
    return { error };
  }
};
