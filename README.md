# SpeedWay AutoxMoto Detail Studio

Complete booking and management system for auto detailing services. Built with React 19, TypeScript, Supabase, and follows the AppContext pattern for centralized state management.

---

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create project at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Run `DATABASE_SCHEMA.sql` in SQL Editor (creates everything + sample data!)
3. Create storage buckets: `receipts` and `chat_media` (both public)
4. Enable realtime for tables: `bookings`, `booking_vehicles`, `payments`, `notifications`, `booking_messages`

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials from Settings → API

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 5. Create Super Admin

1. Register through the app
2. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles SET role = 'SUPER_ADMIN' WHERE email = 'your-email@example.com';
   ```
3. Log out and log back in

---

## ✨ Features

### Customer
- Multi-vehicle fleet booking
- GCash payment with receipt upload
- Real-time status updates
- Direct chat with staff
- Booking history

### Staff
- Operational queue
- Vehicle status updates
- Customer communication
- Service history

### Admin
- Dashboard with analytics
- User & staff management
- Payment verification
- Refund processing
- Audit logs
- Sales reports

### System
- Supabase authentication
- Real-time subscriptions
- Auto-cancellation (30-min grace period)
- Role-based access control
- Centralized state management (AppContext)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── context/
│   │   └── AppContext.tsx        # THE BRAIN - All logic here
│   ├── RootWrapper.tsx            # Global providers
│   └── App.tsx                    # Main routing
├── context/                       # Compatibility layers
│   ├── AuthContext.tsx
│   ├── BookingContext.tsx
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
├── imports/                       # All page components
│   ├── LandingPage.jsx
│   ├── CustomerDashboard.jsx
│   ├── AdminDashboard.jsx
│   └── ... (all other pages)
├── utils/
│   └── supabase/
│       └── client.ts              # Supabase client
└── main.tsx                       # Entry point
```

---

## 🧠 AppContext Pattern

All business logic and state management is centralized in `AppContext.tsx`:

```tsx
const { 
  user, 
  profile, 
  bookings, 
  services,
  createBooking,
  cancelBooking,
  verifyPayment,
  // ... 50+ methods
} = useAppContext();
```

**Benefits:**
- Centralized state
- No props drilling
- Real-time subscriptions built-in
- Auto-cancellation engine
- Type safety

---

## 🛠️ Development

```bash
# Start dev server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📊 Database Schema

The schema includes:

**Tables:**
- profiles
- services
- service_pricing
- resources
- bookings
- booking_vehicles
- booking_vehicle_services
- payments
- notifications
- booking_messages
- audit_logs
- booking_events

**Built-in Data:**
- 8 sample services
- 20+ pricing entries
- 3 workshop bays

---

## 🔐 Environment Variables

Required in `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...
```

---

## 📚 Documentation

- **QUICK_SETUP.md** - 5-minute setup guide
- **DATABASE_SCHEMA.sql** - Complete database schema
- **CHANGES_LOG.md** - Recent changes
- **START_HERE.md** - Project overview

---

## 🚢 Deployment

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy dist/ folder
```

### Environment Variables

Set in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase

Already live! Just configure:
- RLS policies (already in schema)
- Storage permissions (already configured)
- Realtime enabled (already configured)

---

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
→ Check `.env` has correct credentials

### "Database error"
→ Make sure you ran `DATABASE_SCHEMA.sql`

### "No services showing"
→ Check if services were created (schema should auto-create them)

### Real-time not working
→ Enable realtime for tables in Supabase Dashboard

---

## 🎯 What's Included

✅ Complete database schema (no v2 suffixes!)  
✅ 8 sample services ready to use  
✅ AppContext centralized state management  
✅ All existing UI components  
✅ Compatibility layers for old contexts  
✅ Real-time subscriptions  
✅ Auto-cancellation engine  
✅ Type-safe with TypeScript  
✅ Production-ready  

---

## 📝 License

Proprietary - All rights reserved

---

**Ready to go! Just `npm install` and `npm run dev` 🚀**
