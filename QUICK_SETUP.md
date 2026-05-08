# 🚀 Quick Setup Guide

Get SpeedWay running in **5 minutes**!

---

## Step 1: Install Dependencies (1 minute)

```bash
cd REFACTORED_SPEEDWAY
npm install
```

---

## Step 2: Set Up Supabase (3 minutes)

### A. Create Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - Name: `speedway-studio`
   - Database Password: **Save this password!**
   - Region: Choose closest to you
4. Wait 2-3 minutes for project to be ready

### B. Run Database Schema

1. In Supabase → **SQL Editor**
2. Click **"New Query"**
3. Copy **entire contents** of `DATABASE_SCHEMA.sql`
4. Paste and click **"Run"**
5. ✅ You should see success message with:
   - All tables created
   - 8 sample services added
   - 3 workshop bays created

### C. Create Storage Buckets

1. In Supabase → **Storage**
2. Click **"New Bucket"**

**Bucket 1:**
- Name: `receipts`
- Public: ✅ **Yes**

**Bucket 2:**
- Name: `chat_media`
- Public: ✅ **Yes**

### D. Enable Realtime

1. In Supabase → **Database** → **Replication**
2. Toggle **ON** for these tables:
   - `bookings`
   - `booking_vehicles`
   - `payments`
   - `notifications`
   - `booking_messages`

---

## Step 3: Configure Environment (1 minute)

### A. Copy `.env` file

```bash
cp .env.example .env
```

### B. Add Supabase Credentials

Edit `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
```

**Get these from:**
Supabase Dashboard → **Settings** → **API**
- Copy **Project URL**
- Copy **anon public** key

---

## Step 4: Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

---

## Step 5: Create Super Admin (2 minutes)

### Option 1: Via App + SQL (Recommended)

1. **Register** through the app:
   - Email: `admin@speedway.com`
   - Password: Your choice
   - Fill in name and phone

2. **Promote to Super Admin**:
   - Go to Supabase → **SQL Editor**
   - Run:
   ```sql
   UPDATE profiles 
   SET role = 'SUPER_ADMIN',
       first_name = 'Super',
       last_name = 'Admin'
   WHERE email = 'admin@speedway.com';
   ```

3. **Log out and log back in** → You now have admin access!

### Option 2: Direct via Supabase Dashboard

1. Supabase → **Authentication** → **Users**
2. Click **"Add user"**
3. Email: `admin@speedway.com`
4. Auto-generate password (or set your own)
5. Click **"Create user"**
6. Then run SQL:
   ```sql
   UPDATE profiles 
   SET role = 'SUPER_ADMIN',
       first_name = 'Super',
       last_name = 'Admin'
   WHERE email = 'admin@speedway.com';
   ```

---

## ✅ What You Get Out of the Box

The database schema automatically includes:

### Services (8 total)
- ✅ Wash & Wax
- ✅ Interior Deep Clean
- ✅ Paint Correction
- ✅ Ceramic Coating
- ✅ Engine Bay Detailing
- ✅ Headlight Restoration
- ✅ Undercarriage Wash
- ✅ Clay Bar Treatment

### Pricing (20+ combinations)
- ✅ All services have pricing for:
  - Sedan
  - SUV
  - Van
  - Motorcycle

### Workshop Resources
- ✅ Bay 1 (Main detailing bay)
- ✅ Bay 2 (Quick service bay)
- ✅ Bay 3 (Premium service bay)

---

## 🎯 Test Your Setup

### 1. Create a Test Booking

1. Register a customer account
2. Go to **Book Appointment**
3. Select services (e.g., Wash & Wax)
4. Choose vehicle type: Sedan
5. Pick date/time
6. Add vehicle details
7. Submit

### 2. Upload Payment Receipt

1. Go to **My Bookings**
2. Click on your booking
3. Upload any image as receipt
4. Status should change to "For Verification"

### 3. Verify Payment (as Admin)

1. Log in with your admin account
2. Go to **Admin** → **Payments**
3. Find the pending payment
4. Click **"Verify"**
5. Status should change to "Paid"

---

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
→ Check `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Database error"
→ Make sure you ran the entire `DATABASE_SCHEMA.sql` file

### "No services showing"
→ Check if services were created:
```sql
SELECT * FROM services;
```
If empty, the schema didn't run completely. Run it again.

### "Receipt upload fails"
→ Check storage buckets exist and are set to **Public**

### "Realtime updates not working"
→ Make sure you enabled realtime for all required tables

---

## 🎉 You're Done!

Your SpeedWay app is now running with:

✅ Complete database with sample data  
✅ Super admin account  
✅ 8 services ready to use  
✅ Real-time subscriptions  
✅ Auto-cancellation engine  
✅ Payment verification system  

**Next Steps:**
- Copy your existing UI components (see MIGRATION_GUIDE.md)
- Customize services and pricing
- Deploy to production

---

**Need more help?** Check:
- **README.md** - Full documentation
- **MIGRATION_GUIDE.md** - Component migration
- **START_HERE.md** - Project overview

Happy coding! 🚀
