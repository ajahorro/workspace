const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;

if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS || !process.env.EMAIL_FROM) {
  console.warn('Missing email environment variables. Set GMAIL_USER, GMAIL_PASS, EMAIL_FROM.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS // App Password when using 2FA
  }
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject || !(html || text)) {
      return res.status(400).json({ error: 'Missing to, subject or html/text' });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    return res.json({ success: true, info });
  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Email server listening on http://localhost:${PORT}`);
});
