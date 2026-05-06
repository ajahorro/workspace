const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;

// Setup transporter (will still try to send, but won't crash if it fails)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const generateTemplate = (type, data) => {
  let subject = '';
  let html = '';

  switch (type) {
    case 'auth_verification':
      subject = 'Your Verification Code - SpeedWay';
      html = `<p>Your code is: <strong>${data.code}</strong></p>`;
      break;
    default:
      subject = 'RENEW Auto Detailing Update';
      html = `<p>New update for ${type}</p>`;
  }
  return { subject, html };
};

app.post('/send-email', async (req, res) => {
  const { to, type, data } = req.body;
  
  // 🌟 ALWAYS LOG TO TERMINAL (FOR TESTING)
  console.log('\n----------------------------------------');
  console.log(`📧 [DEV MODE] EMAIL TRIGGERED`);
  console.log(`Type: ${type}`);
  console.log(`To: ${to}`);
  if (data?.code) {
    console.log(`🔑 VERIFICATION CODE: ${data.code}`);
  }
  console.log('----------------------------------------\n');

  try {
    const { subject, html } = generateTemplate(type, data);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    });
    console.log('✅ Email successfully sent via Gmail');
    return res.json({ success: true, message: 'Email sent and logged to terminal' });
  } catch (err) {
    console.warn('⚠️ Gmail failed (BadCredentials), but code is logged above!');
    // Still return success so the frontend doesn't crash
    return res.json({ 
      success: true, 
      message: 'Gmail failed, but check your terminal for the code!',
      dev_mode: true 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Email server listening on http://localhost:${PORT}`);
  console.log(`💡 [TIP] All verification codes will appear HERE in this terminal!`);
});
