# Migration Guide: Old Project → Refactored AppContext Pattern

This guide will help you migrate your existing SpeedWay UI components to the new AppContext architecture.

---

## 📋 Overview

The refactoring follows the **One-Shot pattern** where:
- **AppContext = The Brain** (all logic, state, database calls)
- **Components = Presentational** (just UI, no business logic)

Result: **75% less code** in components, cleaner architecture, easier to maintain.

---

## 🚀 Migration Checklist

### Phase 1: Setup (30 minutes)

- [ ] Download/clone REFACTORED_SPEEDWAY folder
- [ ] Run `npm install`
- [ ] Set up Supabase project (follow README)
- [ ] Configure `.env` file
- [ ] Run `npm run dev` to verify setup works

### Phase 2: Copy UI Assets (15 minutes)

- [ ] Copy `frontend/src/styles/` → `REFACTORED_SPEEDWAY/src/styles/`
- [ ] Copy `frontend/src/assets/` → `REFACTORED_SPEEDWAY/src/assets/` (if exists)
- [ ] Copy any custom Tailwind config

### Phase 3: Migrate Components (2-4 hours)

Follow the component-by-component guide below.

---

## 🔄 Component Migration Pattern

### Step-by-Step for Each Component

#### 1. Copy the File

Copy your component from `frontend/src/pages/` to `REFACTORED_SPEEDWAY/src/app/pages/`

#### 2. Update Imports

**Remove:**
```tsx
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../utils/supabaseClient';
```

**Add:**
```tsx
import { useAppContext } from '../context/AppContext';
```

#### 3. Replace Hook Usage

**Old:**
```tsx
const { user, login, logout } = useAuth();
const { bookings, createBooking, fetchBookings } = useBooking();
const { notifications, markAsRead } = useNotifications();
```

**New:**
```tsx
const {
  user,
  profile,
  login,
  logout,
  bookings,
  createBooking,
  notifications,
  markNotificationAsRead,
  isLoading
} = useAppContext();
```

#### 4. Remove Local State

**Delete:**
```tsx
const [bookings, setBookings] = useState([]);
const [loading, setLoading] = useState(true);
const [services, setServices] = useState([]);
```

**Why?** AppContext already provides this state globally.

#### 5. Remove useEffect for Data Fetching

**Delete:**
```tsx
useEffect(() => {
  const fetchData = async () => {
    const { data } = await supabase.from('bookings_v2').select('*');
    setBookings(data);
  };
  fetchData();
}, []);
```

**Why?** AppContext automatically fetches and keeps data in sync.

#### 6. Replace Direct Supabase Calls

**Old:**
```tsx
const handleSubmit = async (formData) => {
  setLoading(true);
  const { data, error } = await supabase.from('bookings_v2').insert(formData);
  if (error) {
    toast.error(error.message);
  } else {
    toast.success('Booking created!');
    fetchBookings(); // Manual refresh
  }
  setLoading(false);
};
```

**New:**
```tsx
const handleSubmit = async (formData) => {
  try {
    await createBooking(formData); // AppContext handles loading, toast, refresh!
  } catch (error) {
    // Error already shown by AppContext
  }
};
```

**Simplified to 5 lines!**

---

## 📝 Example Migrations

### Example 1: Customer MyBookings Page

**OLD (60 lines):**
```tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings_v2')
      .select(`
        *,
        customer:profiles!bookings_v2_customer_id_fkey(*),
        vehicles:booking_vehicles_v2(*,
          services:booking_vehicle_services_v2(*, service:services_v2(*))
        ),
        payment:payments_v2(*)
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load bookings');
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const handleCancelBooking = async (bookingId, reason) => {
    const { error } = await supabase
      .from('bookings_v2')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id
      })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to cancel booking');
    } else {
      toast.success('Booking cancelled');
      fetchBookings();
    }
  };

  if (loading) return <div className="spinner">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
      {bookings.map(booking => (
        <div key={booking.id} className="bg-white shadow rounded-lg p-4 mb-4">
          {/* Booking details */}
          <button
            onClick={() => handleCancelBooking(booking.id, 'Customer requested')}
            className="btn-secondary"
          >
            Cancel Booking
          </button>
        </div>
      ))}
    </div>
  );
};

export default MyBookings;
```

**NEW (15 lines):**
```tsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { BookingCard } from '../components/customer/BookingCard';

const MyBookings = () => {
  const { bookings, cancelBooking, isLoading } = useAppContext();

  if (isLoading) return <div className="spinner">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
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

**Result: 60 lines → 15 lines (75% reduction)**

---

### Example 2: Admin Payment Verification

**OLD:**
```tsx
const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  
  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments_v2')
      .select('*, booking:bookings_v2(*, customer:profiles(*))')
      .eq('status', 'for_verification');
    setPayments(data);
  };

  const handleVerify = async (paymentId) => {
    await supabase.from('payments_v2').update({
      status: 'paid',
      verified_at: new Date().toISOString()
    }).eq('id', paymentId);
    
    toast.success('Payment verified');
    fetchPayments();
  };

  return (
    <div>
      {payments.map(payment => (
        <div key={payment.id}>
          <button onClick={() => handleVerify(payment.id)}>Verify</button>
        </div>
      ))}
    </div>
  );
};
```

**NEW:**
```tsx
const AdminPayments = () => {
  const { bookings, verifyPayment } = useAppContext();

  // Filter bookings with pending payments
  const pendingPayments = bookings
    .filter(b => b.payment?.status === 'for_verification')
    .map(b => b.payment);

  return (
    <div>
      {pendingPayments.map(payment => (
        <div key={payment.id}>
          <button onClick={() => verifyPayment(payment.id)}>Verify</button>
        </div>
      ))}
    </div>
  );
};
```

**No state, no useEffect, no manual refresh!**

---

## 🔑 Key AppContext Methods Reference

### Authentication
```tsx
const { user, profile, login, register, logout, updateProfile, changePassword } = useAppContext();

// Login
await login('email@example.com', 'password');

// Register
await register('email@example.com', 'password', {
  first_name: 'John',
  last_name: 'Doe',
  phone_number: '+63 917 XXX XXXX'
});

// Update profile
await updateProfile({ first_name: 'Jane' });

// Change password
await changePassword('newPassword123');
```

### Bookings
```tsx
const { bookings, createBooking, cancelBooking, updateBookingStatus, getBookingById } = useAppContext();

// Create booking
await createBooking({
  appointment_datetime: '2026-05-10T10:00:00',
  vehicles: [
    {
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      vehicle_year: 2022,
      license_plate: 'ABC 1234',
      vehicle_type: 'sedan',
      services: ['service-id-1', 'service-id-2']
    }
  ],
  notes: 'Please use eco-friendly products'
});

// Cancel booking
await cancelBooking('booking-id', 'Customer requested cancellation');

// Update status (Admin/Staff only)
await updateBookingStatus('booking-id', 'completed');

// Get full booking details
const booking = await getBookingById('booking-id');
```

### Payments
```tsx
const { uploadPaymentReceipt, verifyPayment, refundPayment } = useAppContext();

// Upload receipt (Customer)
await uploadPaymentReceipt('booking-id', receiptFile);

// Verify payment (Admin)
await verifyPayment('payment-id');

// Refund payment (Admin)
await refundPayment('payment-id', 'Customer requested refund');
```

### Notifications
```tsx
const { notifications, unreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead } = useAppContext();

// Display unread count
<span className="badge">{unreadNotificationCount}</span>

// Mark one as read
await markNotificationAsRead('notification-id');

// Mark all as read
await markAllNotificationsAsRead();
```

### Messages
```tsx
const { sendMessage, getMessagesForBooking } = useAppContext();

// Send message
await sendMessage('booking-id', 'Hello, what time will you arrive?');

// Get messages
const messages = await getMessagesForBooking('booking-id');
```

### Admin
```tsx
const { getAllUsers, updateUserRole, toggleUserActive, getAuditLogs } = useAppContext();

// Get all users
const users = await getAllUsers();

// Change user role
await updateUserRole('user-id', 'STAFF');

// Toggle user active/inactive
await toggleUserActive('user-id');

// Get audit logs
const logs = await getAuditLogs({ entityType: 'booking' });
```

---

## 🛠️ Common Migration Scenarios

### Scenario 1: Form Submission

**OLD:**
```tsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const { data, error } = await supabase.from('bookings_v2').insert(formData);
    if (error) throw error;
    toast.success('Booking created!');
    navigate('/my-bookings');
  } catch (err) {
    setError(err.message);
    toast.error('Failed to create booking');
  } finally {
    setLoading(false);
  }
};
```

**NEW:**
```tsx
const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    await createBooking(formData);
    navigate('/my-bookings');
  } catch (err) {
    // Error already handled by AppContext
  }
};
```

### Scenario 2: Real-time Updates

**OLD:**
```tsx
useEffect(() => {
  const subscription = supabase
    .channel('bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings_v2' }, () => {
      fetchBookings();
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**NEW:**
```tsx
// Nothing! AppContext already handles real-time subscriptions
const { bookings } = useAppContext(); // Always up to date!
```

### Scenario 3: Role-Based Rendering

**OLD:**
```tsx
const { user } = useAuth();
const [profile, setProfile] = useState(null);

useEffect(() => {
  if (user) {
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setProfile(data));
  }
}, [user]);

return profile?.role === 'ADMIN' ? <AdminView /> : <CustomerView />;
```

**NEW:**
```tsx
const { profile } = useAppContext();

return profile?.role === 'ADMIN' ? <AdminView /> : <CustomerView />;
```

---

## ✅ Testing After Migration

After migrating each component, test:

1. **Component renders** - No errors in console
2. **Data loads** - Check if bookings/services/etc. display
3. **Actions work** - Create, update, delete operations
4. **Real-time updates** - Make changes in Supabase, see instant updates
5. **Role-based access** - Verify customer/staff/admin views work correctly

---

## 🚨 Common Pitfalls

### Pitfall 1: Calling AppContext methods outside Provider

**Error:**
```
useAppContext must be used within AppProvider
```

**Fix:**
Make sure `RootWrapper` wraps your entire app in `main.tsx`:
```tsx
<RootWrapper>
  <App />
</RootWrapper>
```

### Pitfall 2: Trying to modify AppContext state directly

**Wrong:**
```tsx
const { bookings } = useAppContext();
bookings.push(newBooking); // ❌ Don't do this!
```

**Right:**
```tsx
const { createBooking } = useAppContext();
await createBooking(newBookingData); // ✅ Use the method
```

### Pitfall 3: Duplicating data fetching

**Wrong:**
```tsx
const MyComponent = () => {
  const { bookings } = useAppContext();
  const [localBookings, setLocalBookings] = useState([]);

  useEffect(() => {
    // ❌ Don't fetch again! AppContext already has it
    fetchBookings();
  }, []);
};
```

**Right:**
```tsx
const MyComponent = () => {
  const { bookings } = useAppContext(); // ✅ Just use it directly

  return <div>{bookings.map(...)}</div>;
};
```

---

## 📊 Migration Progress Tracker

Use this to track your progress:

### Customer Components
- [ ] LandingPage
- [ ] Login
- [ ] Register
- [ ] CustomerDashboard
- [ ] BookAppointment
- [ ] MyBookings
- [ ] BookingDetails
- [ ] Settings
- [ ] Profile

### Staff Components
- [ ] StaffDashboard
- [ ] StaffTasks
- [ ] StaffBookingDetails
- [ ] StaffSettings

### Admin Components
- [ ] AdminDashboard
- [ ] AdminBookings
- [ ] AdminPayments
- [ ] AdminRefunds
- [ ] AdminUsers
- [ ] AdminStaff
- [ ] AdminServices
- [ ] AdminSettings
- [ ] AdminAnalytics
- [ ] AdminAuditLogs

### Shared Components
- [ ] Navbar
- [ ] Sidebar
- [ ] NotificationBell
- [ ] BookingCard
- [ ] ServiceCard
- [ ] PaymentCard

---

## 🎯 Benefits After Migration

✅ **75% less code** in components  
✅ **No props drilling** - everything via context  
✅ **Automatic data refresh** - real-time subscriptions built-in  
✅ **Centralized business logic** - easier to debug and maintain  
✅ **Full TypeScript** - catch errors at compile-time  
✅ **Optimistic UI updates** - instant feedback  
✅ **Built-in auto-cancellation** - no separate script needed  
✅ **Cleaner project structure** - no messy backend folder  

---

## 🆘 Need Help?

If you get stuck:

1. Check `README.md` for setup issues
2. Review `AppContext.tsx` for available methods
3. Look at `EXAMPLE_REFACTORED_COMPONENT.tsx` for patterns
4. Check browser console for errors
5. Verify Supabase RLS policies are correct

---

**Good luck with your migration! 🚀**
