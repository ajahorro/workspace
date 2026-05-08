# 🚀 Run Your SpeedWay Detail Studio Project NOW

Follow these steps exactly to get your project running locally.

---

## ⚡ Quick Pre-Flight Check

Before starting, verify you have:
- [ ] Node.js installed (`node --version` should show v18+)
- [ ] Project files at `C:\Users\morco\Downloads\workspace\`
- [ ] Supabase project created (or ready to create one)

---

## 📋 Step-by-Step Launch Guide

### Step 1: Open Two Terminal Windows

**Important:** Keep both terminals open while running the app!

#### Terminal 1 Location:
```
C:\Users\morco\Downloads\workspace\backend
```

#### Terminal 2 Location:
```
C:\Users\morco\Downloads\workspace\frontend
```

---

### Step 2: Set Up Supabase (If Not Done Already)

#### A. Create Supabase Project (5 minutes)

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - Name: `speedway-studio`
   - Database Password: `YourStrongPassword123!` (save this!)
   - Region: Choose closest to you
4. Click **"Create New Project"** and wait 2-3 minutes

#### B. Get Your Credentials

1. In Supabase Dashboard → **Settings** → **API**
2. Copy these values:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGc...
```

**Keep this tab open - you'll need these soon!**

#### C. Run Database Schema

1. In Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file: `DATABASE_SCHEMA_COMPLETE.sql` from the workspace folder
4. Copy ENTIRE contents and paste into SQL Editor
5. Click **"Run"** button (or Ctrl+Enter)
6. Wait for "Success" message (~10 seconds)

#### D. Create Storage Buckets

1. In Supabase Dashboard → **Storage** (left sidebar)
2. Click **"New Bucket"**

**Bucket 1:**
- Name: `receipts`
- Public: ✅ **Yes**
- Click Create

**Bucket 2:**
- Name: `chat_media`
- Public: ✅ **Yes**
- Click Create

#### E. Enable Realtime

1. Go to **Database** → **Replication** (left sidebar)
2. Find these tables and toggle realtime ON:
   - `bookings_v2`
   - `notifications`
   - `booking_messages`
   - `payments_v2`

---

### Step 3: Configure Backend

#### A. Create backend/.env file

In `C:\Users\morco\Downloads\workspace\backend\` create a file named `.env`:

```env
PORT=3001
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-16-char-app-password
EMAIL_FROM="SpeedWay Studio <your-email@gmail.com>"
DATABASE_URL=postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Replace:**
- `your-email@gmail.com` → Your Gmail address
- `your-16-char-app-password` → Gmail app password (see below)
- `[DB_PASSWORD]` → Your Supabase database password
- `[PROJECT_REF]` → Your project reference (from Supabase URL)

**How to get Gmail App Password:**
1. Go to: https://myaccount.google.com/apppasswords
2. If asked, enable 2-Step Verification first
3. Select "Mail" and "Other (Custom name)"
4. Type "SpeedWay App"
5. Click Generate
6. Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

**How to get DATABASE_URL:**
1. Supabase Dashboard → Settings → Database
2. Scroll to "Connection string" → **URI** tab
3. Copy the entire string
4. Replace `[YOUR-PASSWORD]` with your database password from Step 2A

#### B. Install Backend Dependencies

**In Terminal 1:**
```bash
cd C:\Users\morco\Downloads\workspace\backend
npm install
```

Expected output:
```
added 50 packages in 5s
```

#### C. Start Backend Server

**Still in Terminal 1:**
```bash
node send-email.js
```

✅ **Success looks like:**
```
🚀 Email server listening on http://localhost:3001
💡 [TIP] All verification codes will appear HERE in this terminal!
```

❌ **If you see errors:**
- Check `.env` file exists in backend folder
- Verify no typos in `.env`
- Make sure port 3001 is not in use

**⚠️ LEAVE THIS TERMINAL RUNNING!**

---

### Step 4: Configure Frontend

#### A. Create frontend/.env file

In `C:\Users\morco\Downloads\workspace\frontend\` create a file named `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_BACKEND_URL=http://localhost:3001
```

**Replace:**
- `VITE_SUPABASE_URL` → Your Supabase Project URL (from Step 2B)
- `VITE_SUPABASE_ANON_KEY` → Your anon public key (from Step 2B)

#### B. Install Frontend Dependencies

**In Terminal 2:**
```bash
cd C:\Users\morco\Downloads\workspace\frontend
npm install
```

This may take 2-3 minutes. Expected output:
```
added 500+ packages in 45s
```

#### C. Start Frontend Dev Server

**Still in Terminal 2:**
```bash
npm run dev
```

✅ **Success looks like:**
```
  VITE v8.0.10  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.x:5173/
  ➜  press h + enter to show help
```

❌ **If you see errors:**
- Check `.env` file exists in frontend folder
- Verify Supabase URL starts with `https://`
- Make sure port 5173 is not in use

**⚠️ LEAVE THIS TERMINAL RUNNING TOO!**

---

### Step 5: Open the App in Your Browser

1. Open your browser (Chrome, Edge, Firefox)
2. Go to: **http://localhost:5173/**

✅ **You should see:**
- SpeedWay AutoxMoto Detail Studio landing page
- Navigation with "Book Now" button
- Clean, dark-themed interface

---

### Step 6: Create Your First Admin Account

#### A. Register a New Account

1. On the landing page, click **"Book Now"** (this triggers registration)
2. Fill in the form:
   - Email: `admin@speedway.com` (or your email)
   - Password: Create a strong password (save it!)
   - First Name: `Admin`
   - Last Name: `User`
   - Phone: `+63 917 123 4567`

3. Click **"Register"** or **"Sign Up"**

4. **Look at Terminal 1 (backend)** - You should see:
   ```
   🔑 VERIFICATION CODE: 123456
   ```

5. Enter this code in the verification popup
6. Click **"Verify"**

#### B. Promote Yourself to Admin

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query (replace with your email):

```sql
UPDATE profiles 
SET role = 'SUPER_ADMIN',
    first_name = 'Admin',
    last_name = 'User'
WHERE email = 'admin@speedway.com';
```

3. Click **"Run"**

#### C. Log Out and Back In

1. In your app, log out (top right corner)
2. Log back in with your email and password
3. You should now see the **Admin Dashboard**!

---

### Step 7: Test the App

#### Test Customer Features:

1. **Create a Booking:**
   - Go to Customer Dashboard → Book Appointment
   - Select services (e.g., Wash & Wax)
   - Pick a date/time
   - Add vehicle details
   - Submit

2. **Upload Payment Receipt:**
   - Go to My Bookings
   - Click on your booking
   - Upload any image as a "receipt"
   - Should show "For Verification"

#### Test Admin Features:

1. **Switch to Admin View:**
   - Click profile icon → Switch to Admin (or go to /admin)

2. **Verify Payment:**
   - Admin → Payments
   - Find the pending payment
   - Click to verify and mark as PAID

3. **View Dashboard:**
   - Admin → Dashboard
   - Should see statistics and recent bookings

---

## 🎯 What Should Be Running

After completing all steps:

### Terminal 1 (Backend):
```
🚀 Email server listening on http://localhost:3001
💡 [TIP] All verification codes will appear HERE in this terminal!
```

### Terminal 2 (Frontend):
```
  VITE v8.0.10  ready in 1234 ms
  ➜  Local:   http://localhost:5173/
```

### Browser:
```
http://localhost:5173/ → SpeedWay app running
```

---

## ❌ Troubleshooting Common Issues

### "Cannot connect to Supabase"
- Check `frontend/.env` has correct Supabase URL and key
- Verify Supabase project is active (not paused)
- Restart frontend: Ctrl+C in Terminal 2, then `npm run dev`

### "Email server not responding"
- Check `backend/.env` exists
- Verify port 3001 is not blocked by firewall
- Restart backend: Ctrl+C in Terminal 1, then `node send-email.js`

### "Port already in use"
- Frontend (5173): Close other Vite/React apps
- Backend (3001): Close other Node apps
- Or change port in `.env` files

### "Module not found"
- Re-run `npm install` in the respective folder
- Delete `node_modules` and `package-lock.json`, then `npm install` again

### "Page is blank"
- Check browser console (F12)
- Verify `.env` files are correctly formatted
- Make sure both terminals are still running

---

## 📱 Access Points

Once running, you can access:

**Customer View:**
- http://localhost:5173/
- http://localhost:5173/dashboard
- http://localhost:5173/book-appointment

**Admin View:**
- http://localhost:5173/admin
- http://localhost:5173/admin/bookings
- http://localhost:5173/admin/payments

**Staff View:**
- http://localhost:5173/staff
- http://localhost:5173/staff/tasks

---

## 🛑 How to Stop the App

When you're done testing:

1. **Stop Frontend:** Go to Terminal 2 → Press `Ctrl+C`
2. **Stop Backend:** Go to Terminal 1 → Press `Ctrl+C`

To restart later, just run:
- Terminal 1: `node send-email.js`
- Terminal 2: `npm run dev`

---

## ✅ Quick Checklist

Before asking for help, verify:
- [ ] Both terminals are running (backend + frontend)
- [ ] Both `.env` files exist and are correctly filled
- [ ] Supabase project is active
- [ ] Database schema was run successfully
- [ ] Storage buckets were created
- [ ] No errors showing in either terminal
- [ ] Browser console (F12) has no red errors

---

## 🎉 You're All Set!

Your SpeedWay Detail Studio should now be running locally!

**Next Steps:**
1. Apply fixes from `FIXES_PART1.md`
2. Apply fixes from `FIXES_PART2.md`
3. Test all features
4. Deploy to production

**Need Help?** Check `DEBUGGING_GUIDE.md`

---

**Happy coding! 🚀**
