# Fixes for First Half of Issues

## 1. Create NotificationContext.jsx
**Location:** `frontend/src/context/NotificationContext.jsx`

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const createNotification = async (userId, title, message, type = 'info', actionUrl = null) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          notification_type: type,
          action_url: actionUrl,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    refreshNotifications: fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
```

---

## 2. Update main.jsx
**Location:** `frontend/src/main.jsx`

Add NotificationProvider to the context providers:

```jsx
console.log('Main.jsx: Script execution started');
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BookingProvider } from './context/BookingContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx'; // ADD THIS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <NotificationProvider> {/* ADD THIS */}
        <ThemeProvider>
          <BookingProvider>
            <App />
          </BookingProvider>
        </ThemeProvider>
      </NotificationProvider> {/* ADD THIS */}
    </AuthProvider>
  </React.StrictMode>,
);
```

---

## 3. Fix Settings.jsx - Only Show Appearance
**Location:** `frontend/src/pages/Customer/Settings.jsx`

Replace the entire file with:

```jsx
import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const sectionStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1.25rem',
    border: '1px solid var(--admin-border)',
    padding: isMobile ? '1.25rem' : '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        badge="APPLICATION SETTINGS"
        title="Settings"
        subtitle="Manage your application preferences."
      />

      <div style={{ maxWidth: '600px' }}>
        {/* Appearance */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Appearance</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {['system', 'light', 'dark'].map(t => (
              <button
                key={t}
                onClick={() => toggleTheme(t)}
                style={{
                  padding: '1rem 0.5rem',
                  background: theme === t ? 'var(--admin-brand)' : 'var(--admin-bg)',
                  color: theme === t ? 'white' : 'var(--admin-text-secondary)',
                  border: theme === t ? 'none' : '1px solid var(--admin-border)',
                  borderRadius: '0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
```

---

## 4. Update ProfilePage.jsx - Add Profile Settings
**Location:** `frontend/src/pages/ProfilePage.jsx`

Add the Personal Identity and Security sections to ProfilePage:

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import { useMediaQuery } from '../hooks/useMediaQuery';

const ProfilePage = () => {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  // Form states
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone
      });
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1.25rem',
    border: '1px solid var(--admin-border)',
    padding: isMobile ? '1.25rem' : '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--admin-text-secondary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    background: 'var(--admin-bg)',
    border: '1px solid var(--admin-border)',
    borderRadius: '0.75rem',
    color: 'var(--admin-text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        badge="ACCOUNT PROFILE"
        title="My Profile"
        subtitle="Manage your personal information and security."
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Personal Identity */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Personal Identity</h2>
          </div>
          
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input 
                  style={inputStyle} 
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input 
                  style={inputStyle} 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input 
                style={inputStyle} 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{ 
                marginTop: '0.5rem', 
                padding: '1rem', 
                background: 'var(--admin-brand)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.75rem', 
                fontWeight: '900', 
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(169, 27, 24, 0.2)'
              }}
            >
              {loading ? 'Saving...' : 'UPDATE PROFILE'}
            </button>
          </form>
        </div>

        {/* Password Security */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lock size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Security</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input 
                type="password"
                style={inputStyle} 
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <button 
              onClick={async () => {
                if (!newPassword) return;
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) toast.error(error.message);
                else {
                  toast.success('Password updated!');
                  setNewPassword('');
                }
              }}
              style={{ 
                padding: '0.85rem', 
                background: 'rgba(255,255,255,0.05)', 
                color: 'var(--admin-text-primary)', 
                border: '1px solid var(--admin-border)', 
                borderRadius: '0.75rem', 
                fontWeight: '800', 
                cursor: 'pointer' 
              }}
            >
              CHANGE PASSWORD
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
```

---

---

## 5. Create Cancellation Policy Page
**Location:** `frontend/src/pages/CancellationPolicy.jsx`

Create a new page for viewing cancellation policies:

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, RefreshCcw, Shield } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const CancellationPolicy = () => {
  const navigate = useNavigate();

  const sectionStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1.25rem',
    border: '1px solid var(--admin-border)',
    padding: '2rem',
    marginBottom: '1.5rem'
  };

  const policyItemStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    alignItems: 'flex-start'
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PageHeader
        showBack
        onBack={() => navigate(-1)}
        badge="LEGAL"
        title="Cancellation & Refund Policy"
        subtitle="Understanding your rights and our commitment to fair service"
      />

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <Clock size={24} color="var(--admin-brand)" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: '900', margin: 0 }}>Cancellation Timeline</h2>
        </div>

        <div style={policyItemStyle}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'rgba(16, 185, 129, 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Shield size={20} color="#10b981" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              More than 24 hours before appointment
            </h3>
            <p style={{ color: 'var(--admin-text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Full refund (100%) if payment was made. No penalties apply.
            </p>
          </div>
        </div>

        <div style={policyItemStyle}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'rgba(245, 158, 11, 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} color="#f59e0b" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Less than 24 hours before appointment
            </h3>
            <p style={{ color: 'var(--admin-text-secondary)', lineHeight: '1.6', margin: 0 }}>
              50% refund. Applies to all cancellations within 24 hours of scheduled start time.
            </p>
          </div>
        </div>

        <div style={policyItemStyle}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            background: 'rgba(239, 68, 68, 0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <X size={20} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              No-Show (30 minutes after scheduled time)
            </h3>
            <p style={{ color: 'var(--admin-text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Automatic cancellation. Refund depends on payment status at time of booking.
              If unpaid, booking is cancelled with no charges. If paid, please contact support.
            </p>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <RefreshCcw size={24} color="var(--admin-brand)" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: '900', margin: 0 }}>Refund Process</h2>
        </div>

        <div style={{ color: 'var(--admin-text-secondary)', lineHeight: '1.8' }}>
          <p><strong>GCash Payments:</strong> Refunds are processed within 3-5 business days to the original GCash account.</p>
          <p><strong>Cash Payments:</strong> Refunds can be claimed in-store or via bank transfer (additional verification required).</p>
          <p style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(169, 27, 24, 0.05)', borderRadius: '0.75rem', border: '1px solid var(--admin-brand)' }}>
            <strong>Important:</strong> All refund requests must be initiated through your booking page or by contacting our support team at the shop.
          </p>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <Shield size={24} color="var(--admin-brand)" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: '900', margin: 0 }}>Our Commitment</h2>
        </div>

        <div style={{ color: 'var(--admin-text-secondary)', lineHeight: '1.8' }}>
          <p>
            SpeedWay AutoxMoto Detail Studio is committed to providing transparent and fair cancellation policies.
            We understand that plans change, and we strive to accommodate our customers while maintaining
            operational efficiency.
          </p>
          <p style={{ marginTop: '1rem' }}>
            For questions or special circumstances, please contact us directly at the shop or through
            the booking chat feature.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;
```

**Add route in App.jsx:**
```jsx
import CancellationPolicy from './pages/CancellationPolicy';

// Inside your routes:
<Route path="/cancellation-policy" element={<CancellationPolicy />} />
```

---

## 6. Auto-Cancellation Backend Logic
**Location:** Create new file `backend/auto-cancel-no-shows.js`

```javascript
const { Client } = require('pg');
require('dotenv').config();

const runAutoCancellation = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔍 Checking for no-show bookings...');

    // Find bookings that are 30 minutes past their scheduled start time
    // and still in 'scheduled' status
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { rows } = await client.query(`
      SELECT 
        b.id, 
        b.customer_id, 
        b.start_datetime,
        b.total_amount,
        b.payment_status,
        p.email as customer_email,
        p.full_name as customer_name
      FROM bookings b
      LEFT JOIN profiles p ON b.customer_id = p.id
      WHERE b.status = 'scheduled'
        AND b.start_datetime < $1
        AND b.created_at < NOW() - INTERVAL '30 minutes'
    `, [thirtyMinutesAgo]);

    if (rows.length === 0) {
      console.log('✅ No no-show bookings found.');
      return;
    }

    console.log(`⚠️  Found ${rows.length} no-show booking(s). Processing...`);

    for (const booking of rows) {
      // Update booking status to cancelled
      await client.query(`
        UPDATE bookings
        SET 
          status = 'cancelled',
          cancellation_reason = 'Automatic cancellation - No-show (30 min past scheduled time)',
          cancelled_at = NOW()
        WHERE id = $1
      `, [booking.id]);

      // Create audit log
      await client.query(`
        INSERT INTO audit_logs (booking_id, action_type, details, actor_name, actor_role, created_at)
        VALUES ($1, 'AUTO_CANCELLED', $2, 'System', 'SYSTEM', NOW())
      `, [
        booking.id,
        `Booking automatically cancelled due to no-show. Scheduled time: ${new Date(booking.start_datetime).toLocaleString()}. Customer did not arrive within 30 minutes of appointment.`
      ]);

      // Create notification for customer
      await client.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, action_url, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, false, NOW())
      `, [
        booking.customer_id,
        'Booking Cancelled - No Show',
        `Your booking on ${new Date(booking.start_datetime).toLocaleDateString()} was automatically cancelled due to no-show. If you paid, please contact us regarding refunds.`,
        'warning',
        `/my-bookings/${booking.id}`
      ]);

      console.log(`   ✅ Cancelled booking ${booking.id.substring(0, 8)} for ${booking.customer_name}`);
    }

    console.log(`✅ Auto-cancellation complete. ${rows.length} booking(s) cancelled.`);

  } catch (error) {
    console.error('❌ Auto-cancellation error:', error);
  } finally {
    await client.end();
  }
};

// Run immediately
runAutoCancellation();

// If you want to run this as a cron job, you can use node-cron:
// const cron = require('node-cron');
// cron.schedule('*/15 * * * *', runAutoCancellation); // Run every 15 minutes
```

**Setup Instructions:**
1. Install required dependencies if not already installed:
   ```bash
   npm install pg dotenv
   ```

2. Add to your `.env` file:
   ```
   DATABASE_URL=your_supabase_connection_string
   ```

3. Run manually:
   ```bash
   node backend/auto-cancel-no-shows.js
   ```

4. Or set up as a cron job using `node-cron` (install with `npm install node-cron`)

---

## 7. Update MyBookings.jsx - Add Cancellation Policy Link

**Location:** `frontend/src/pages/Customer/MyBookings.jsx`

Add a link to the cancellation policy near the booking list:

```jsx
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

// Add this somewhere visible (e.g., before or after the booking list):
<Link 
  to="/cancellation-policy" 
  style={{ 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    padding: '0.75rem 1.25rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--admin-border)',
    borderRadius: '0.75rem',
    color: 'var(--admin-text-primary)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '800',
    transition: 'all 0.2s ease'
  }}
>
  <FileText size={16} /> View Cancellation Policy
</Link>
```

---

## 8. Fix Admin Chat UI
**Location:** `frontend/src/pages/Admin/AdminBookingDetails.jsx`

The issue in the screenshot shows the chat UI is missing a text container. Check if BookingChat is properly rendered. If the issue is with the container, wrap it properly:

```jsx
{/* Communication Panel - FIXED */}
<div style={{ 
  background: 'var(--admin-card)', 
  borderRadius: '1.25rem', 
  border: '1px solid var(--admin-border)', 
  padding: '1.5rem' 
}}>
  <h3 style={{ 
    fontSize: '0.8rem', 
    fontWeight: '900', 
    color: 'var(--admin-text-secondary)', 
    textTransform: 'uppercase', 
    marginBottom: '1rem', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem' 
  }}>
    <MessageCircle size={16} /> Communication
  </h3>
  <div style={{ 
    minHeight: '400px',  // Ensure minimum height
    borderRadius: '0.75rem',
    overflow: 'hidden'  // Prevent overflow
  }}>
    <BookingChat bookingId={id} />
  </div>
</div>
```

---

## 9. Add GCash Proof Viewing in Admin Payments
**Location:** `frontend/src/pages/Admin/AdminPayments.jsx`

Update the payment verification section to show GCash receipt images:

```jsx
// In the payment verification section, add receipt preview:
{payment.receipt_url && (
  <div style={{ marginTop: '1rem' }}>
    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem' }}>
      PROOF OF PAYMENT:
    </div>
    <div style={{ position: 'relative', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
      <img 
        src={payment.receipt_url} 
        alt="GCash Receipt" 
        style={{ 
          width: '100%', 
          maxHeight: '300px', 
          objectFit: 'cover',
          cursor: 'pointer'
        }}
        onClick={() => window.open(payment.receipt_url, '_blank')}
      />
      <div style={{ 
        position: 'absolute', 
        bottom: '0.5rem', 
        right: '0.5rem', 
        padding: '0.35rem 0.75rem',
        background: 'rgba(0,0,0,0.7)',
        borderRadius: '0.5rem',
        fontSize: '0.65rem',
        fontWeight: '900',
        color: '#fff'
      }}>
        CLICK TO ENLARGE
      </div>
    </div>
  </div>
)}
```

---

## 10. Add Billing Section in Admin Settings
**Location:** `frontend/src/pages/Admin/AdminSettings.jsx`

Add a new billing/payment methods section:

```jsx
{/* Billing & Payment Methods */}
<div style={sectionStyle}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <CreditCard size={20} color="var(--admin-brand)" />
    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Billing & Payment</h2>
  </div>
  
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div>
      <label style={labelStyle}>GCash Number</label>
      <input 
        style={inputStyle} 
        placeholder="09XX XXX XXXX"
        defaultValue="0917 123 4567"
      />
    </div>
    
    <div>
      <label style={labelStyle}>GCash Account Name</label>
      <input 
        style={inputStyle} 
        placeholder="Business Name"
        defaultValue="SpeedWay Auto Detail Studio"
      />
    </div>
    
    <div>
      <label style={labelStyle}>Cash Payment Instructions</label>
      <textarea 
        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
        placeholder="Instructions for walk-in cash payments"
        defaultValue="Cash payments are accepted at our shop location in Mandaluyong. Please bring your booking confirmation."
      />
    </div>
    
    <button 
      style={{ 
        padding: '0.85rem', 
        background: 'var(--admin-brand)', 
        color: 'white', 
        border: 'none', 
        borderRadius: '0.75rem', 
        fontWeight: '900', 
        cursor: 'pointer',
        marginTop: '0.5rem'
      }}
    >
      UPDATE PAYMENT SETTINGS
    </button>
  </div>
</div>
```

---

## 11. Wire Up Notifications

Update these files to use the NotificationContext:

**CustomerDashboard.jsx:**
```jsx
import { useNotifications } from '../../context/NotificationContext';

// Inside component:
const { notifications, unreadCount } = useNotifications();

// Display unread count somewhere visible
{unreadCount > 0 && (
  <span style={{
    background: 'var(--admin-brand)',
    color: 'white',
    borderRadius: '50%',
    padding: '0.25rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: '900'
  }}>
    {unreadCount}
  </span>
)}
```

**AdminDashboard.jsx:** Same as above

---

## Summary of All Files to Create/Modify:

### New Files:
1. `frontend/src/context/NotificationContext.jsx` ✅
2. `frontend/src/pages/CancellationPolicy.jsx` ✅
3. `backend/auto-cancel-no-shows.js` ✅

### Files to Modify:
1. `frontend/src/main.jsx` - Add NotificationProvider
2. `frontend/src/pages/Customer/Settings.jsx` - Remove profile sections
3. `frontend/src/pages/ProfilePage.jsx` - Add profile settings
4. `frontend/src/pages/Customer/MyBookings.jsx` - Add cancellation policy link
5. `frontend/src/pages/Admin/AdminBookingDetails.jsx` - Fix chat container
6. `frontend/src/pages/Admin/AdminPayments.jsx` - Add GCash proof viewing
7. `frontend/src/pages/Admin/AdminSettings.jsx` - Add billing section
8. `frontend/src/pages/Customer/CustomerDashboard.jsx` - Wire up notifications
9. `frontend/src/pages/Admin/AdminDashboard.jsx` - Wire up notifications
10. `frontend/src/App.jsx` - Add cancellation policy route

All fixes are now documented! Apply these changes to your project.
