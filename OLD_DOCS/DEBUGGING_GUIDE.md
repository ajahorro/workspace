# SpeedWay AutoxMoto Detail Studio - Debugging & Troubleshooting Guide

Complete guide to diagnosing and fixing common issues.

---

## Table of Contents

1. [Common Frontend Issues](#common-frontend-issues)
2. [Common Backend Issues](#common-backend-issues)
3. [Database & Supabase Issues](#database--supabase-issues)
4. [Authentication Issues](#authentication-issues)
5. [Payment & File Upload Issues](#payment--file-upload-issues)
6. [Real-time & Notifications Issues](#real-time--notifications-issues)
7. [Performance Issues](#performance-issues)
8. [Production Deployment Issues](#production-deployment-issues)
9. [Development Tools](#development-tools)

---

## Common Frontend Issues

### Issue: "Cannot read property of undefined" errors

**Symptoms:**
- App crashes with React errors
- White screen
- Console shows `Cannot read property 'X' of undefined`

**Diagnosis:**
```javascript
// Check browser console (F12)
// Look for the exact line number
```

**Solutions:**

1. **Add null checks:**
```javascript
// Before:
const name = user.profile.full_name;

// After:
const name = user?.profile?.full_name || 'Guest';
```

2. **Add loading states:**
```javascript
if (loading) return <LoadingSpinner />;
if (!data) return <div>No data available</div>;
```

3. **Check data structure:**
```javascript
console.log('User data:', user);
console.log('Profile data:', profile);
```

---

### Issue: Environment variables not loading

**Symptoms:**
- `import.meta.env.VITE_SUPABASE_URL` is undefined
- API calls fail with CORS errors
- Blank Supabase connection

**Diagnosis:**
```bash
# Check if .env file exists
ls -la frontend/.env

# Print environment variables
cd frontend
npm run dev | grep VITE_
```

**Solutions:**

1. **Ensure .env is in correct location:**
```bash
# Should be at frontend/.env, NOT root/.env
frontend/
  .env              ✅ Correct
  src/
  package.json
.env                ❌ Wrong location
```

2. **Restart dev server after .env changes:**
```bash
# Stop with Ctrl+C, then:
npm run dev
```

3. **Check .env syntax:**
```env
# ✅ Correct
VITE_SUPABASE_URL=https://xxxxx.supabase.co

# ❌ Wrong (no quotes, no spaces)
VITE_SUPABASE_URL = "https://xxxxx.supabase.co"
```

---

### Issue: React Router "Cannot GET" on refresh

**Symptoms:**
- Page works initially
- Refreshing gives 404 or "Cannot GET /admin"
- Direct URL navigation fails

**Diagnosis:**
- This is a Vite dev server routing issue

**Solutions:**

1. **For Development:**
   - Already handled by Vite
   - If still broken, check `vite.config.js`:
   ```javascript
   export default {
     server: {
       historyApiFallback: true // Should be enabled
     }
   }
   ```

2. **For Production:**
   - Configure your hosting to redirect all routes to `/index.html`
   - See deployment section below

---

### Issue: Styles not applying / Tailwind not working

**Symptoms:**
- Components have no styling
- CSS classes not working
- Design looks broken

**Diagnosis:**
```bash
# Check if Tailwind is installed
npm list tailwindcss

# Check if CSS is imported
grep -r "@tailwind" frontend/src/
```

**Solutions:**

1. **Verify Tailwind is imported in index.css:**
```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. **Check Tailwind config:**
```javascript
// tailwind.config.js should exist
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ...
}
```

3. **Rebuild:**
```bash
npm run dev
# Or clear cache:
rm -rf node_modules/.vite
npm run dev
```

---

## Common Backend Issues

### Issue: Email verification codes not showing

**Symptoms:**
- Backend says "Email sent"
- No code appears in terminal
- Gmail errors in console

**Diagnosis:**
```bash
# Check backend terminal output
# Look for email-related errors
```

**Solutions:**

1. **Gmail App Password not set:**
```env
# backend/.env
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=abcd efgh ijkl mnop    # 16-character app password
```

2. **Check Gmail Security:**
   - Enable 2FA: https://myaccount.google.com/security
   - Generate App Password: https://myaccount.google.com/apppasswords

3. **Fallback (Dev Mode):**
   - Even if Gmail fails, codes still print to console
   - Look for: `🔑 VERIFICATION CODE: XXXXXX`

---

### Issue: CORS errors when calling backend

**Symptoms:**
- `Access to fetch at 'http://localhost:3001' has been blocked by CORS`
- API calls fail in browser console

**Diagnosis:**
```javascript
// Browser console shows:
// Access-Control-Allow-Origin error
```

**Solutions:**

1. **Verify CORS is enabled in backend:**
```javascript
// backend/send-email.js
const cors = require('cors');
app.use(cors()); // ✅ This line must exist
```

2. **Check frontend is calling correct URL:**
```javascript
// frontend/src/services/EmailService.js
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

3. **Ensure backend is running:**
```bash
# Terminal should show:
🚀 Email server listening on http://localhost:3001
```

---

### Issue: Auto-cancellation not working

**Symptoms:**
- Bookings past 30 minutes still showing as "scheduled"
- No automatic cancellations happening

**Diagnosis:**
```bash
# Run script manually to test:
node backend/auto-cancel-no-shows.js
```

**Solutions:**

1. **Set up as cron job (Linux/Mac):**
```bash
# Edit crontab
crontab -e

# Add this line (runs every 15 minutes):
*/15 * * * * cd /path/to/project/backend && node auto-cancel-no-shows.js >> /tmp/auto-cancel.log 2>&1
```

2. **Set up as scheduled task (Windows):**
   - Open Task Scheduler
   - Create Basic Task
   - Trigger: Every 15 minutes
   - Action: Start a program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\path\to\project\backend\auto-cancel-no-shows.js`

3. **Use node-cron for always-running process:**
```javascript
// backend/auto-cancel-scheduler.js
const cron = require('node-cron');
const { runAutoCancellation } = require('./auto-cancel-no-shows');

// Run every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running auto-cancellation check...');
  runAutoCancellation();
});

console.log('Auto-cancellation scheduler started');
```

Then run with PM2 (production):
```bash
npm install -g pm2
pm2 start backend/auto-cancel-scheduler.js
pm2 save
```

---

## Database & Supabase Issues

### Issue: "relation does not exist" errors

**Symptoms:**
- API calls return database errors
- SQL queries fail
- "relation 'bookings_v2' does not exist"

**Diagnosis:**
```sql
-- In Supabase SQL Editor, check if table exists:
SELECT * FROM bookings_v2 LIMIT 1;
```

**Solutions:**

1. **Run the schema migration:**
   - Copy entire `DATABASE_SCHEMA_COMPLETE.sql`
   - Paste in Supabase SQL Editor
   - Run it

2. **Check for typos in table names:**
```javascript
// ✅ Correct
.from('bookings_v2')

// ❌ Wrong
.from('bookings')  // Old table name
```

3. **Verify you're connected to correct project:**
   - Check Supabase URL in `.env`
   - Ensure it matches your project

---

### Issue: RLS (Row Level Security) blocking queries

**Symptoms:**
- Queries return empty results
- "new row violates row-level security policy"
- User can't see their own data

**Diagnosis:**
```sql
-- Check if RLS is enabled:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Test query with RLS bypassed (temporarily):
SELECT * FROM bookings_v2;  -- As service_role in dashboard
```

**Solutions:**

1. **Check user authentication:**
```javascript
// In browser console:
console.log('Current user:', supabase.auth.getUser());
```

2. **Verify RLS policies exist:**
```sql
-- List policies:
SELECT * FROM pg_policies WHERE tablename = 'bookings_v2';
```

3. **Temporarily disable RLS for testing:**
```sql
-- ⚠️ ONLY FOR DEBUGGING
ALTER TABLE bookings_v2 DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable:
ALTER TABLE bookings_v2 ENABLE ROW LEVEL SECURITY;
```

4. **Check policy logic:**
```sql
-- Example: Customer should see own bookings
CREATE POLICY "Customers see own bookings" ON bookings_v2
FOR SELECT USING (customer_id = auth.uid());
```

---

### Issue: Real-time subscriptions not updating

**Symptoms:**
- Changes in database don't reflect in UI
- Notifications don't appear automatically
- Chat messages don't update live

**Diagnosis:**
```javascript
// In browser console, check subscription:
const channel = supabase.channel('test');
console.log('Channel state:', channel.state);
```

**Solutions:**

1. **Enable realtime in Supabase:**
   - Dashboard → Database → Replication
   - Enable for affected tables
   - Wait 1-2 minutes for changes to take effect

2. **Check subscription code:**
```javascript
// ✅ Correct
const channel = supabase
  .channel('booking-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings_v2'
  }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();

// Don't forget cleanup:
return () => { supabase.removeChannel(channel); };
```

3. **Check filter syntax:**
```javascript
// ✅ Correct
filter: `id=eq.${bookingId}`

// ❌ Wrong
filter: `id = ${bookingId}`
```

---

## Authentication Issues

### Issue: "Invalid login credentials" despite correct password

**Symptoms:**
- User can't log in
- "Invalid login credentials" error
- Password is definitely correct

**Diagnosis:**
```sql
-- Check if user exists in auth.users:
SELECT email, email_confirmed_at FROM auth.users WHERE email = 'user@example.com';
```

**Solutions:**

1. **Check email confirmation:**
   - User must confirm email first
   - Check backend terminal for verification code
   - Or check Supabase → Authentication → Users → Email confirmation status

2. **Reset password via SQL (emergency):**
```sql
-- Generate reset token
SELECT auth.generate_reset_token('user@example.com');
```

3. **Check for account lock:**
   - Supabase locks accounts after multiple failed attempts
   - Wait 1 hour or manually unlock in dashboard

---

### Issue: User redirected to wrong dashboard

**Symptoms:**
- Customer sees admin dashboard
- Staff sees customer pages
- Role-based routing broken

**Diagnosis:**
```javascript
// In browser console:
const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
console.log('User role:', data.role);
```

**Solutions:**

1. **Check ProtectedRoute logic:**
```javascript
// frontend/src/components/ProtectedRoute.jsx
if (hasAccess && allowedRoles && !allowedRoles.includes(profile.role)) {
  const defaultRoutes = {
    CUSTOMER: '/dashboard',
    STAFF: '/staff',
    ADMIN: '/admin',
    SUPER_ADMIN: '/admin'
  };
  return <Navigate to={defaultRoutes[profile.role] || '/'} replace />;
}
```

2. **Verify profile role in database:**
```sql
UPDATE profiles SET role = 'CUSTOMER' WHERE email = 'user@example.com';
```

3. **Clear localStorage and re-login:**
```javascript
// Browser console:
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

---

## Payment & File Upload Issues

### Issue: Receipt upload fails or doesn't show

**Symptoms:**
- Upload button doesn't work
- "Upload failed" error
- Receipt doesn't appear in booking

**Diagnosis:**
```javascript
// Browser console:
console.error('Upload error details');

// Check network tab for failed requests
```

**Solutions:**

1. **Verify storage bucket exists:**
   - Supabase → Storage
   - Bucket `receipts` should exist with public access

2. **Check storage policies:**
```sql
-- List policies:
SELECT * FROM storage.policies WHERE bucket_id = 'receipts';

-- Should have:
-- INSERT policy for authenticated users
-- SELECT policy for public
```

3. **Check file size:**
```javascript
// Add validation:
if (file.size > 10 * 1024 * 1024) {
  toast.error('File too large. Max 10MB.');
  return;
}
```

4. **Test upload manually:**
```javascript
// Browser console:
const file = document.querySelector('input[type="file"]').files[0];
const { data, error } = await supabase.storage
  .from('receipts')
  .upload(`test/${Date.now()}.jpg`, file);
console.log('Upload result:', { data, error });
```

---

### Issue: OCR (Tesseract.js) is slow or fails

**Symptoms:**
- Receipt scanning takes forever
- OCR progress stuck at 0%
- "Recognition failed" errors

**Diagnosis:**
```javascript
// Check console for Tesseract logs
```

**Solutions:**

1. **Use CDN version (faster):**
```javascript
// Already configured in package.json
import Tesseract from 'tesseract.js';
```

2. **Show progress feedback:**
```javascript
const { data: { text } } = await Tesseract.recognize(file, 'eng', {
  logger: (m) => {
    if (m.status === 'recognizing text') {
      setProgress(Math.round(m.progress * 100));
    }
  }
});
```

3. **Add timeout:**
```javascript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('OCR timeout')), 30000)
);

const ocrPromise = Tesseract.recognize(file, 'eng');

try {
  const result = await Promise.race([ocrPromise, timeoutPromise]);
} catch (error) {
  console.error('OCR failed:', error);
  toast.error('Receipt scan timed out. Payment marked for manual review.');
}
```

---

## Real-time & Notifications Issues

### Issue: Notifications not appearing in popover

**Symptoms:**
- Bell icon shows 0 unread
- No notifications display
- NotificationContext not working

**Diagnosis:**
```javascript
// Browser console:
const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id);
console.log('Notifications in DB:', data);
```

**Solutions:**

1. **Check NotificationContext is wrapped:**
```javascript
// src/main.jsx
<AuthProvider>
  <NotificationProvider>  {/* Must be here */}
    <App />
  </NotificationProvider>
</AuthProvider>
```

2. **Verify realtime subscription:**
```javascript
// Check in NotificationContext.jsx
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      console.log('🔔 New notification:', payload);  // Should log
    })
    .subscribe((status) => {
      console.log('Subscription status:', status);  // Should be 'SUBSCRIBED'
    });
}, [user?.id]);
```

3. **Test notification creation:**
```sql
-- Insert test notification via SQL:
INSERT INTO notifications (user_id, title, message, notification_type)
VALUES (
  (SELECT id FROM profiles WHERE email = 'your-email@example.com'),
  'Test Notification',
  'This is a test',
  'info'
);
```

---

## Performance Issues

### Issue: App is slow or laggy

**Symptoms:**
- Pages take long to load
- Scrolling is janky
- High CPU/memory usage

**Diagnosis:**
```javascript
// Use React DevTools Profiler
// Check network tab for slow requests
```

**Solutions:**

1. **Optimize Supabase queries:**
```javascript
// ❌ Slow - fetching too much data
const { data } = await supabase.from('bookings_v2').select('*');

// ✅ Fast - select only needed columns
const { data } = await supabase
  .from('bookings_v2')
  .select('id, status, start_datetime, customer:profiles(full_name)')
  .limit(20);
```

2. **Add pagination:**
```javascript
const { data, error } = await supabase
  .from('bookings_v2')
  .select('*')
  .range(0, 9)  // First 10 items
  .order('created_at', { ascending: false });
```

3. **Memoize expensive calculations:**
```javascript
import { useMemo } from 'react';

const totalRevenue = useMemo(() => {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}, [payments]);
```

4. **Debounce search inputs:**
```javascript
import { debounce } from 'lodash';

const handleSearch = debounce((term) => {
  // Perform search
}, 300);
```

---

## Production Deployment Issues

### Issue: Environment variables not working in production

**Solutions:**

**Vercel/Netlify:**
- Add env vars in dashboard
- Rebuild after adding

**Railway/Render:**
- Add in Environment section
- Restart service

**Self-hosted:**
```bash
# Create .env.production
cp .env .env.production

# Build with production env
npm run build
```

---

### Issue: Supabase connection fails in production

**Diagnosis:**
```javascript
// Check if URL and key are set
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

**Solutions:**

1. **Check environment variables are deployed**
2. **Verify no CORS issues:**
   - Add your production domain to Supabase → Settings → API → CORS
3. **Check RLS policies work for anon key**

---

## Development Tools

### Useful Browser Console Commands

```javascript
// Get current user
supabase.auth.getUser();

// Get current session
supabase.auth.getSession();

// Test query
supabase.from('bookings_v2').select('*').limit(5);

// Clear auth
localStorage.removeItem('supabase.auth.token');

// Check environment
console.table(import.meta.env);
```

### Useful SQL Queries

```sql
-- Count bookings by status
SELECT status, COUNT(*) FROM bookings_v2 GROUP BY status;

-- Find orphaned records
SELECT * FROM booking_vehicles_v2 WHERE booking_id NOT IN (SELECT id FROM bookings_v2);

-- Check user roles
SELECT email, role FROM profiles ORDER BY created_at DESC;

-- Recent audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

### Logging Best Practices

```javascript
// ✅ Good - structured logging
console.log('📦 Booking created:', { id, status, customer_id });

// ✅ Good - error context
console.error('❌ Payment failed:', { bookingId, error: error.message });

// ❌ Bad - unclear logs
console.log('done');
console.log(data);
```

---

## Getting Additional Help

1. **Check Supabase Logs:**
   - Dashboard → Logs → Filter by error level

2. **Check Browser Console:**
   - F12 → Console tab
   - Look for red errors

3. **Check Network Tab:**
   - F12 → Network tab
   - Filter by XHR
   - Check failed requests

4. **Enable verbose logging:**
```javascript
// In supabase.js
export const supabase = createClient(url, key, {
  db: { schema: 'public' },
  auth: { debug: true }  // Enable auth debug logs
});
```

---

**Still stuck? Create an issue in the repository with:**
- Error message (full stack trace)
- Steps to reproduce
- Screenshots
- Browser/Node version
- What you've tried already
