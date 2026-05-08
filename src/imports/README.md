Email server for Samp Project

Quick start:

1. Copy `.env.example` to `.env` and fill in `GMAIL_USER`, `GMAIL_PASS`, and `EMAIL_FROM`.
2. Run `npm install express nodemailer dotenv body-parser` in the `backend` folder.
3. Start the server: `node send-email.js`.
4. Call `POST /send-email` with JSON { to, subject, html } from frontend.

Security:
- Use a Gmail App Password if your account has 2FA.
- Do NOT commit `.env` with real credentials.
