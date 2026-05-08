# SpeedWay AutoxMoto Detail Studio - Setup Guide

Complete step-by-step guide to set up and run the application.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Initial Data Seed](#initial-data-seed)
7. [Admin Account Setup](#admin-account-setup)
8. [Testing the Application](#testing-the-application)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **pnpm** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/)
- **Text Editor** (VS Code recommended)

Verify installations:
```bash
node --version  # Should be v18+
npm --version   # Should be 9+
git --version
```

---

## Supabase Setup

### Step 1: Create a New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `speedway-detail-studio`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
4. Click **"Create New Project"**
5. Wait 2-3 minutes for project to initialize

### Step 2: Get Your Supabase Credentials

1. In your project dashboard, go to **Settings** (gear icon) → **API**
2. Copy the following values (you'll need them later):
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (keep this secret!)

### Step 3: Set Up Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `DATABASE_SCHEMA_COMPLETE.sql` from this repository
4. Paste into the SQL Editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. Wait for completion (should show "Success" message)

**Note:** If you get any errors about existing objects, that's okay - the schema has `IF NOT EXISTS` checks.

### Step 4: Set Up Storage Buckets

1. Go to **Storage** in the Supabase Dashboard
2. Click **"New Bucket"**

**Create Receipts Bucket:**
- Name: `receipts`
- Public: ✅ Yes
- File size limit: 10 MB
- Allowed MIME types: `image/*`

**Create Chat Media Bucket:**
- Name: `chat_media`  
- Public: ✅ Yes
- File size limit: 10 MB
- Allowed MIME types: `image/*,video/*,application/pdf`

### Step 5: Enable Realtime

1. Go to **Database** → **Replication**
2. Enable realtime for these tables:
   - `bookings_v2`
   - `booking_vehicles_v2`
   - `payments_v2`
   - `notifications`
   - `booking_messages`
   - `audit_logs`

---

## Backend Setup

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

This installs:
- `express` - Web server
- `nodemailer` - Email sending
- `cors` - Cross-origin requests
- `body-parser` - Request parsing
- `dotenv` - Environment variables
- `pg` - PostgreSQL client

### Step 2: Create Backend .env File

Create a file `backend/.env`:

```env
PORT=3001
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-specific-password
EMAIL_FROM="SpeedWay Detail Studio <your-email@gmail.com>"

# Supabase Connection (for auto-cancellation script)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**How to get Gmail App Password:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate a password for "Mail"
5. Copy the 16-character password to `GMAIL_PASS`

**How to get DATABASE_URL:**
1. In Supabase Dashboard → **Settings** → **Database**
2. Under "Connection string" → **URI**
3. Copy the URI and replace `[YOUR-PASSWORD]` with your database password

### Step 3: Test Backend

```bash
cd backend
node send-email.js
```

Expected output:
```
🚀 Email server listening on http://localhost:3001
💡 [TIP] All verification codes will appear HERE in this terminal!
```

Keep this terminal running!

---

## Frontend Setup

### Step 1: Install Frontend Dependencies

Open a **NEW terminal window** (keep backend running):

```bash
cd frontend
npm install
```

This installs React, Vite, Tailwind, Supabase client, and all UI dependencies.

### Step 2: Create Frontend .env File

Create a file `frontend/.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
VITE_BACKEND_URL=http://localhost:3001
```

Replace:
- `VITE_SUPABASE_URL` with your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` with your anon public key
- Keep `VITE_BACKEND_URL` as is (points to local backend)

### Step 3: Apply All Fixes

**From Part 1 (FIXES_PART1.md):**
1. Create `frontend/src/context/NotificationContext.jsx`
2. Update `frontend/src/main.jsx` to wrap with NotificationProvider
3. Update `frontend/src/pages/Customer/Settings.jsx` (appearance only)
4. Update `frontend/src/pages/ProfilePage.jsx` (add profile settings)
5. Create `frontend/src/pages/CancellationPolicy.jsx`
6. Update relevant admin pages for billing, payments, etc.

**From Part 2 (FIXES_PART2.md):**
1. Update `frontend/src/pages/Admin/AdminRefunds.jsx` (add refund reason)
2. Fix `frontend/src/pages/Staff/StaffTasks.jsx` (correct text)
3. Create `frontend/src/pages/Staff/StaffBookingDetails.jsx`

**Note:** All code is provided in FIXES_PART1.md and FIXES_PART2.md files.

---

## Running the Application

### Terminal 1 - Backend Server
```bash
cd backend
node send-email.js
```

Keep running. You should see:
```
🚀 Email server listening on http://localhost:3001
```

### Terminal 2 - Auto-Cancellation (Optional, for production)
```bash
cd backend
# Run once manually:
node auto-cancel-no-shows.js

# Or set up as a cron job (see Debugging Guide)
```

### Terminal 3 - Frontend Dev Server
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Access the Application

Open your browser to: **http://localhost:5173/**

---

## Initial Data Seed

### Step 1: Seed Services

In Supabase SQL Editor, run:

```sql
-- Insert sample services
INSERT INTO services_v2 (name, description, category, base_duration_hours) VALUES
('Wash & Wax', 'Complete exterior wash with premium wax coating', 'exterior', 2),
('Interior Deep Clean', 'Vacuum, shampoo, and detail interior surfaces', 'interior', 3),
('Paint Correction', 'Remove swirls and scratches from paint', 'exterior', 8),
('Ceramic Coating', 'Long-lasting paint protection', 'exterior', 16),
('Engine Bay Detailing', 'Clean and protect engine components', 'engine', 2)
ON CONFLICT DO NOTHING;

-- Insert pricing for each service
INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
-- Wash & Wax
((SELECT id FROM services_v2 WHERE name = 'Wash & Wax'), 'sedan', 800),
((SELECT id FROM services_v2 WHERE name = 'Wash & Wax'), 'suv', 1200),
((SELECT id FROM services_v2 WHERE name = 'Wash & Wax'), 'van', 1500),
((SELECT id FROM services_v2 WHERE name = 'Wash & Wax'), 'motorcycle', 400),

-- Interior Deep Clean
((SELECT id FROM services_v2 WHERE name = 'Interior Deep Clean'), 'sedan', 1500),
((SELECT id FROM services_v2 WHERE name = 'Interior Deep Clean'), 'suv', 2000),
((SELECT id FROM services_v2 WHERE name = 'Interior Deep Clean'), 'van', 2500),

-- Paint Correction
((SELECT id FROM services_v2 WHERE name = 'Paint Correction'), 'sedan', 5000),
((SELECT id FROM services_v2 WHERE name = 'Paint Correction'), 'suv', 7000),
((SELECT id FROM services_v2 WHERE name = 'Paint Correction'), 'van', 9000)
ON CONFLICT DO NOTHING;
```

### Step 2: Create Initial Resources (Workshop Bays)

```sql
INSERT INTO resources (name, description, capacity) VALUES
('Bay 1', 'Main detailing bay', 1),
('Bay 2', 'Quick service bay', 1),
('Bay 3', 'Premium service bay', 1)
ON CONFLICT DO NOTHING;
```

---

## Admin Account Setup

### Method 1: Manual Registration (Recommended)

1. Go to http://localhost:5173/
2. Click **"Book Now"** (this triggers registration)
3. Fill in your details:
   - Email: your-admin@example.com
   - Create a password
4. Check the **backend terminal** for the verification code
5. Enter the code and complete registration

6. **Promote to Admin via SQL:**
   - Go to Supabase SQL Editor
   - Run:
   ```sql
   UPDATE profiles
   SET role = 'SUPER_ADMIN'
   WHERE email = 'your-admin@example.com';
   ```

7. Log out and log back in
8. You should now see the Admin dashboard!

### Method 2: Direct SQL Insert

```sql
-- First, create auth user (replace with your details)
-- Note: You'll need to do this via Supabase Dashboard → Authentication → Users
-- Or use the registration flow above

-- Then promote to admin:
UPDATE profiles
SET role = 'SUPER_ADMIN',
    first_name = 'Admin',
    last_name = 'User',
    phone_number = '+63 917 XXX XXXX'
WHERE email = 'your-email@example.com';
```

---

## Testing the Application

### Test 1: Customer Flow

1. **Register as Customer**
   - Go to landing page
   - Click "Book Now"
   - Complete registration with email verification
   - Should redirect to booking page

2. **Create a Booking**
   - Select services (e.g., Wash & Wax)
   - Choose vehicle type (e.g., Sedan)
   - Pick a date/time
   - Add vehicle details (make, model, plate)
   - Submit booking

3. **Upload Payment Receipt**
   - Go to "My Bookings"
   - Click on your booking
   - Upload a fake receipt image
   - Check that it shows "For Verification"

4. **Test Chat**
   - In booking details, send a message
   - Check real-time updates

### Test 2: Admin Flow

1. **Log in as Admin**
   - Use the admin account created earlier

2. **Verify Payment**
   - Go to Admin → Payments
   - Find the pending payment
   - Click to verify
   - Mark as PAID

3. **Assign Staff** (if you have a staff account)
   - Go to Admin → Bookings
   - Click on booking
   - Assign to staff member

4. **Test Notifications**
   - Click bell icon
   - Should see notification for new booking

### Test 3: Staff Flow (Optional)

1. **Create Staff Account**
   ```sql
   -- Register normally, then:
   UPDATE profiles SET role = 'STAFF'
   WHERE email = 'staff@example.com';
   ```

2. **Log in as Staff**
   - Check operational queue
   - Update vehicle status
   - Send messages to customer

---

## Common Post-Setup Tasks

### Add More Services

Go to Supabase SQL Editor:
```sql
INSERT INTO services_v2 (name, description, category, base_duration_hours)
VALUES ('Your Service Name', 'Description', 'category', 2);

-- Then add pricing
INSERT INTO service_pricing (service_id, vehicle_type, price)
VALUES 
((SELECT id FROM services_v2 WHERE name = 'Your Service Name'), 'sedan', 1000),
((SELECT id FROM services_v2 WHERE name = 'Your Service Name'), 'suv', 1500);
```

### Configure Auto-Cancellation Cron Job

See **DEBUGGING_GUIDE.md** section on "Setting Up Cron Jobs"

### Set Up Production Email

Replace Gmail with a transactional email service:
- SendGrid
- Mailgun
- AWS SES

Update `backend/.env` with new SMTP credentials.

---

## Next Steps

- Read **DEBUGGING_GUIDE.md** for troubleshooting
- Configure production environment variables
- Set up domain and hosting
- Enable SSL/HTTPS
- Set up backup strategies

---

## Need Help?

If you encounter issues:
1. Check **DEBUGGING_GUIDE.md**
2. Verify all environment variables are set correctly
3. Check browser console for frontend errors
4. Check backend terminal for API errors
5. Check Supabase logs in Dashboard → Logs

---

**Congratulations! Your SpeedWay Detail Studio app should now be running! 🎉**
