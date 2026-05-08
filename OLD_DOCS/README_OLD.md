# SpeedWay AutoxMoto Detail Studio

Complete booking and management system for auto detailing services. Built with React 19, TypeScript, Supabase, and follows the One-Shot AppContext pattern for centralized state management.

---

## ✨ Features

### Customer Features
- 🚗 Multi-vehicle fleet booking
- 💰 GCash payment with receipt upload
- 📱 Real-time booking status updates
- 💬 Direct chat with staff
- 🔔 Push notifications
- 📊 Booking history and tracking

### Staff Features
- 📋 Operational queue (assigned tasks)
- 🔄 Vehicle status updates (washing, detailing, drying, etc.)
- 💬 Customer communication
- 📈 Service history

### Admin Features
- 📊 Dashboard with analytics
- 👥 User & staff management
- 💵 Payment verification
- 💸 Refund processing
- 🔍 Audit logs
- ⚙️ Service & pricing configuration
- 📈 Sales reports (printable)

### System Features
- 🔐 Supabase authentication (email/password)
- 🔄 Real-time database subscriptions
- 🕒 Auto-cancellation of no-shows (30-min grace period)
- 🎯 Role-based access control (Customer, Staff, Admin, Super Admin)
- 📦 Centralized state management (AppContext as "brain")
- ⚡ Optimistic UI updates
- 🌓 Dark/light theme support

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm or pnpm
- Supabase account ([Sign up](https://supabase.com/))

### Step 1: Clone or Download

```bash
# Download the REFACTORED_SPEEDWAY folder
# Extract to your desired location
cd REFACTORED_SPEEDWAY
```

### Step 2: Install Dependencies

```bash
npm install
# or
pnpm install
```

### Step 3: Set Up Supabase

1. **Create Supabase Project**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Fill in project details
   - Save your database password!

2. **Run Database Schema**
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents from `DATABASE_SCHEMA.sql`
   - Paste and run the entire schema
   - Sample services and pricing will be automatically added

3. **Create Storage Buckets**
   - Go to Storage in Supabase Dashboard
   - Create bucket: `receipts` (Public: Yes)
   - Create bucket: `chat_media` (Public: Yes)

4. **Enable Realtime**
   - Go to Database → Replication
   - Enable realtime for these tables:
     - `bookings`
     - `booking_vehicles`
     - `payments`
     - `notifications`
     - `booking_messages`

### Step 4: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   Get these from: Supabase Dashboard → Settings → API

### Step 5: Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
REFACTORED_SPEEDWAY/
├── src/
│   ├── app/
│   │   ├── context/
│   │   │   └── AppContext.tsx          # THE BRAIN - All state & logic
│   │   ├── components/                 # Reusable UI components
│   │   │   ├── layout/                 # Navbar, Sidebar, etc.
│   │   │   ├── customer/               # Customer-specific components
│   │   │   ├── staff/                  # Staff-specific components
│   │   │   └── admin/                  # Admin-specific components
│   │   ├── pages/                      # Page components
│   │   │   ├── customer/               # Customer pages
│   │   │   ├── staff/                  # Staff pages
│   │   │   └── admin/                  # Admin pages
│   │   ├── RootWrapper.tsx             # Global provider wrapper
│   │   └── App.tsx                     # Main app with routing
│   ├── utils/
│   │   └── supabase/
│   │       └── client.ts               # Supabase client config
│   ├── styles/                         # Global styles
│   └── main.tsx                        # Entry point
├── .env.example                        # Example environment variables
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🧠 AppContext Pattern

This project uses a **centralized state management** pattern inspired by the [One-Shot repository](https://github.com/astromrcz/One-Shot/tree/testing-branch).

### Key Concept: AppContext as the "Brain"

All business logic, state, and Supabase calls are centralized in `AppContext.tsx`. Components are kept simple and use the `useAppContext()` hook.

**Before (Old Pattern):**
```tsx
// 60+ lines per component
const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchBookings = async () => {
      const { data } = await supabase
        .from('bookings_v2')
        .select('*, customer(*), vehicles(*)')
        .eq('customer_id', user.id);
      setBookings(data);
    };
    fetchBookings();
  }, [user]);

  const handleCancel = async (id) => {
    await supabase.from('bookings_v2').update({ status: 'cancelled' }).eq('id', id);
    // Refresh...
  };

  return <div>{ /* ...render... */ }</div>;
};
```

**After (New Pattern with AppContext):**
```tsx
// 15 lines per component
const MyBookings = () => {
  const { bookings, cancelBooking } = useAppContext();

  return (
    <div>
      {bookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={(reason) => cancelBooking(booking.id, reason)}
        />
      ))}
    </div>
  );
};
```

**75% less code!**

### AppContext Features

- ✅ Centralized state (bookings, services, notifications, etc.)
- ✅ 50+ methods for all CRUD operations
- ✅ Auto-cancellation engine (runs in useEffect)
- ✅ Real-time subscriptions
- ✅ Session persistence
- ✅ Optimistic UI updates
- ✅ Role-based data filtering
- ✅ Parallel batch fetching
- ✅ Full TypeScript support

---

## 🔄 Migrating Your UI Components

You already have all the UI components designed. Here's how to migrate them:

### Step 1: Copy Your UI Files

Copy these folders from your old project to the new one:

```bash
# From your old project
frontend/src/pages/        → REFACTORED_SPEEDWAY/src/app/pages/
frontend/src/components/   → REFACTORED_SPEEDWAY/src/app/components/
frontend/src/styles/       → REFACTORED_SPEEDWAY/src/styles/
```

### Step 2: Refactor Each Component

For each component, follow this pattern:

**1. Remove old context imports:**
```tsx
// DELETE these
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useNotifications } from '../context/NotificationContext';
```

**2. Add AppContext import:**
```tsx
// ADD this
import { useAppContext } from '../context/AppContext';
```

**3. Replace hook usage:**
```tsx
// OLD
const { user } = useAuth();
const { bookings, createBooking } = useBooking();
const { notifications } = useNotifications();

// NEW
const { user, profile, bookings, createBooking, notifications } = useAppContext();
```

**4. Remove local state and useEffect:**
```tsx
// DELETE these
const [bookings, setBookings] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchBookings();
}, []);
```

**5. Replace direct Supabase calls:**
```tsx
// OLD
const handleSubmit = async (data) => {
  const { error } = await supabase.from('bookings_v2').insert(data);
  if (!error) fetchBookings();
};

// NEW
const handleSubmit = async (data) => {
  await createBooking(data); // AppContext handles everything!
};
```

### Example Migration

**OLD: `pages/Customer/MyBookings.jsx` (60 lines)**
```tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings_v2')
      .select('*, customer(*), vehicles(*), payment(*)')
      .eq('customer_id', user.id);
    setBookings(data || []);
    setLoading(false);
  };

  const handleCancelBooking = async (id, reason) => {
    await supabase.from('bookings_v2').update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString()
    }).eq('id', id);
    fetchBookings();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      {bookings.map(booking => (
        <div key={booking.id} className="border p-4 mb-4">
          {/* Booking card content */}
          <button onClick={() => handleCancelBooking(booking.id, 'Customer requested')}>
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
};

export default MyBookings;
```

**NEW: `pages/Customer/MyBookings.tsx` (15 lines)**
```tsx
import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { BookingCard } from '../../components/customer/BookingCard';

const MyBookings = () => {
  const { bookings, cancelBooking, isLoading } = useAppContext();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      {bookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={(reason) => cancelBooking(booking.id, reason)}
        />
      ))}
    </div>
  );
};

export default MyBookings;
```

---

## 🎯 Available AppContext Methods

### Authentication
- `login(email, password)`
- `register(email, password, userData)`
- `logout()`
- `updateProfile(updates)`
- `changePassword(newPassword)`

### Bookings
- `createBooking(bookingData)`
- `cancelBooking(bookingId, reason)`
- `updateBookingStatus(bookingId, status)`
- `assignStaffToBooking(bookingId, staffId)`
- `getBookingById(bookingId)`

### Vehicles
- `updateVehicleStatus(vehicleId, status)`

### Payments
- `uploadPaymentReceipt(bookingId, file)`
- `verifyPayment(paymentId)`
- `refundPayment(paymentId, reason)`

### Messages
- `sendMessage(bookingId, message)`
- `getMessagesForBooking(bookingId)`

### Notifications
- `markNotificationAsRead(notificationId)`
- `markAllNotificationsAsRead()`

### Admin
- `getAllUsers()`
- `updateUserRole(userId, role)`
- `toggleUserActive(userId)`
- `getAuditLogs(filters)`

### Data
- `refreshData(silent?)`

---

## 🔐 Initial Setup

### Create Admin Account

1. Register normally through the app
2. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles
   SET role = 'SUPER_ADMIN'
   WHERE email = 'your-admin-email@example.com';
   ```
3. Log out and log back in
4. You now have admin access!

### Add More Services (Optional)

**✅ The schema already includes 8 sample services!**

To add additional services:

```sql
-- Insert new service
INSERT INTO services (name, description, category, base_duration_hours) VALUES
('Your Service Name', 'Service description', 'exterior', 2);

-- Add pricing
INSERT INTO service_pricing (service_id, vehicle_type, price) VALUES
((SELECT id FROM services WHERE name = 'Your Service Name'), 'sedan', 1000),
((SELECT id FROM services WHERE name = 'Your Service Name'), 'suv', 1500);
```

---

## 🛠️ Development

### Available Scripts

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

### Code Style

- Use TypeScript for all new files
- Follow React 19 best practices
- Use `useAppContext()` for all data and logic
- Keep components simple and presentational
- All business logic goes in AppContext

---

## 📦 What's Different from Old Version?

| Old Architecture | New Architecture |
|-----------------|------------------|
| Separate `backend/` folder with Express server | No backend - pure Supabase |
| Email verification via nodemailer | Supabase Auth email verification |
| Multiple contexts (Auth, Booking, Notification) | Single AppContext |
| Manual state management in components | Centralized state in AppContext |
| Scattered Supabase calls | All database logic in AppContext |
| Manual data refresh | Auto-refresh with real-time subscriptions |
| Separate auto-cancel script | Built-in auto-cancellation engine |
| JavaScript (partial TS) | Full TypeScript |
| Props drilling | Global state via context |

---

## 🔥 Auto-Cancellation Engine

The app automatically cancels bookings that are no-shows (30-minute grace period).

**How it works:**
- Runs every minute in AppContext
- Checks all `confirmed` bookings
- If appointment time + 30 minutes has passed
- Automatically updates status to `no_show`
- Sends notification to customer
- No separate backend process needed!

---

## 🚢 Deployment

### Frontend (Vercel/Netlify)

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy `dist/` folder to your host

3. Set environment variables in your hosting platform:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Supabase

Your Supabase project is already live! Just configure:
- Row Level Security (RLS) policies (already in schema)
- Storage bucket permissions (already configured)
- Realtime enabled (already configured)

---

## 🐛 Troubleshooting

### "Cannot find module '@/context/AppContext'"

Make sure you've installed dependencies:
```bash
npm install
```

### "Missing environment variables"

Copy `.env.example` to `.env` and fill in your Supabase credentials.

### "Database error"

Make sure you've run the complete `DATABASE_SCHEMA_COMPLETE.sql` file in Supabase.

### Real-time not working

Enable realtime for tables in: Supabase Dashboard → Database → Replication

---

## 📚 Additional Documentation

- `PROJECT_REFACTOR_PLAN.md` - Architecture overview
- `HOW_TO_DOWNLOAD_AND_USE.md` - Detailed migration guide
- `EXAMPLE_REFACTORED_COMPONENT.tsx` - Before/after examples

---

## 🤝 Contributing

This is a private project for SpeedWay AutoxMoto Detail Studio.

---

## 📄 License

Proprietary - All rights reserved

---

## 🎉 You're Ready!

1. Install dependencies: `npm install`
2. Set up Supabase (see Quick Start)
3. Configure `.env`
4. Run: `npm run dev`
5. Open: http://localhost:5173

**Your UI designs are retained 100%. Just copy your components and refactor them to use `useAppContext()`!**

Happy coding! 🚀
