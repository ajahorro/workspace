// This service forwards email requests to the local Nodemailer backend.
const API_URL = 'http://localhost:3001/send-email';

const baseStyles = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  color: #1e293b;
  background-color: #ffffff;
`;

const headerStyles = `
  color: #A91B18;
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 24px;
  letter-spacing: -0.5px;
`;

const cardStyles = `
  background: #f8fafc;
  padding: 24px;
  border-radius: 12px;
  margin: 24px 0;
  border: 1px solid #e2e8f0;
`;

const footerStyles = `
  font-size: 12px;
  color: #64748b;
  margin-top: 40px;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
`;

export const sendBookingConfirmation = async (customerEmail, bookingData) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customerEmail,
        subject: 'Booking Confirmed! 🚗✨',
        html: `
          <div style="${baseStyles}">
            <h1 style="${headerStyles}">SpeedWay AutoxMoto</h1>
            <p style="font-size: 16px;">Hi there!</p>
            <p>Your booking has been successfully confirmed. We can't wait to make your vehicle look brand new again!</p>
            
            <div style="${cardStyles}">
              <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 0;">Booking Summary</h2>
              <p><strong>Vehicle:</strong> ${bookingData.vehicle}</p>
              <p><strong>Services:</strong> ${bookingData.services}</p>
              <p><strong>Schedule:</strong> ${bookingData.date} at ${bookingData.time}</p>
              <p style="font-size: 18px; margin-top: 15px; color: #A91B18;"><strong>Total:</strong> ₱${bookingData.totalPrice}</p>
            </div>

            <p>You can manage your booking or chat with us in your customer dashboard.</p>
            <div style="${footerStyles}">
              <p>SpeedWay AutoxMoto Detail Studio - Premium Car Care Services</p>
              <p>Location: [Your Studio Address]</p>
            </div>
          </div>
        `
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: staffEmail,
        subject: 'New Job Assigned! 📋',
        html: `
          <div style="${baseStyles}">
            <h1 style="${headerStyles}">New Assignment</h1>
            <p>Hello Team!</p>
            <p>You have been assigned to a new detailing job. Please review the details below:</p>
            
            <div style="${cardStyles}">
              <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 0;">Job Details</h2>
              <p><strong>Vehicle:</strong> ${bookingData.vehicle}</p>
              <p><strong>Plate:</strong> ${bookingData.plate}</p>
              <p><strong>Services:</strong> ${bookingData.services}</p>
              <p><strong>Schedule:</strong> ${bookingData.date} at ${bookingData.time}</p>
            </div>

            <p>Please log in to your staff portal to start the service on schedule.</p>
            <div style="${footerStyles}">
              <p>Staff Internal Notification System</p>
            </div>
          </div>
        `
      })
    });
    return await response.json();
  } catch (error) {
    return { error };
  }
};

export const sendStatusUpdateNotification = async (customerEmail, status, bookingData) => {
  const isStarted = status === 'STARTED';
  const subject = isStarted ? 'Your vehicle service has started! 🚀' : 'Service Completed! 🏁';
  const message = isStarted 
    ? "Great news! Our team has started working on your vehicle. We'll let you know as soon as it's ready."
    : "Your detailing service is finished! Your vehicle is now ready for pick-up or review.";

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customerEmail,
        subject,
        html: `
          <div style="${baseStyles}">
            <h1 style="${headerStyles}">${isStarted ? 'Service Started' : 'Service Ready'}</h1>
            <p>Hi!</p>
            <p>${message}</p>
            
            <div style="${cardStyles}">
              <p><strong>Vehicle:</strong> ${bookingData.vehicle}</p>
              <p><strong>Status:</strong> <span style="color: ${isStarted ? '#3b82f6' : '#10b981'}; font-weight: bold;">${status}</span></p>
            </div>

            <p>Thank you for choosing SpeedWay AutoxMoto!</p>
            <div style="${footerStyles}">
              <p>SpeedWay AutoxMoto Detail Studio</p>
            </div>
          </div>
        `
      })
    });
    return await response.json();
  } catch (error) {
    return { error };
  }
};

export const sendPaymentReceiptNotification = async (customerEmail, amount, bookingData) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customerEmail,
        subject: 'Payment Received - Receipt 🧾',
        html: `
          <div style="${baseStyles}">
            <h1 style="${headerStyles}">Payment Receipt</h1>
            <p>Thank you for your payment!</p>
            
            <div style="${cardStyles}">
              <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 0;">Transaction Details</h2>
              <p><strong>Amount Paid:</strong> ₱${amount}</p>
              <p><strong>Vehicle:</strong> ${bookingData.vehicle}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <p>If you have any questions about this charge, please contact us via the app chat.</p>
            <div style="${footerStyles}">
              <p>SpeedWay AutoxMoto Detail Studio - Official Receipt</p>
            </div>
          </div>
        `
      })
    });
    return await response.json();
  } catch (error) {
    return { error };
  }
};
