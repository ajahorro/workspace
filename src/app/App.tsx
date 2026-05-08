import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { useAppContext } from './context/AppContext';

// Import existing pages from imports folder
import LandingPage from '../imports/LandingPage';
import Login from '../imports/Login';
import CustomerDashboard from '../imports/CustomerDashboard';
import BookAppointment from '../imports/BookAppointment';
import MyBookings from '../imports/MyBookings';
import BookingDetails from '../imports/BookingDetails';
import Settings from '../imports/Settings';
import ProfilePage from '../imports/ProfilePage';
import Notifications from '../imports/Notifications';

// Staff pages
import StaffTasks from '../imports/StaffTasks';
import StaffHistory from '../imports/StaffHistory';
import StaffSettings from '../imports/StaffSettings';
import StaffNotifications from '../imports/StaffNotifications';

// Admin pages
import AdminDashboard from '../imports/AdminDashboard';
import AdminBookings from '../imports/AdminBookings';
import AdminBookingDetails from '../imports/AdminBookingDetails';
import AdminPayments from '../imports/AdminPayments';
import AdminRefunds from '../imports/AdminRefunds';
import AdminUserManagement from '../imports/AdminUserManagement';
import AdminStaffManagement from '../imports/AdminStaffManagement';
import AdminSettings from '../imports/AdminSettings';
import AdminAnalytics from '../imports/AdminAnalytics';
import AdminAuditLogs from '../imports/AdminAuditLogs';
import AdminNotifications from '../imports/AdminNotifications';
import AdminSalesReport from '../imports/AdminSalesReport';
import AdminSchedule from '../imports/AdminSchedule';
import AdminSearch from '../imports/AdminSearch';

// Protected Route wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, profile, isLoading } = useAppContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
    const routes: Record<string, string> = {
      CUSTOMER: '/dashboard',
      STAFF: '/staff',
      ADMIN: '/admin',
      SUPER_ADMIN: '/admin'
    };
    return <Navigate to={routes[profile.role] || '/'} replace />;
  }

  return <>{children}</>;
};

// Main App component
const App: React.FC = () => {
  const { user, profile } = useAppContext();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={user ? <Navigate to={profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' ? '/admin' : profile?.role === 'STAFF' ? '/staff' : '/dashboard'} /> : <Login />}
      />

      {/* Customer Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/book" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><BookAppointment /></ProtectedRoute>} />
      <Route path="/book-appointment" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><BookAppointment /></ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><MyBookings /></ProtectedRoute>} />
      <Route path="/booking/:id" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN']}><BookingDetails /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

      {/* Staff Routes */}
      <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}><StaffTasks /></ProtectedRoute>} />
      <Route path="/staff/tasks" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}><StaffTasks /></ProtectedRoute>} />
      <Route path="/staff/history" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}><StaffHistory /></ProtectedRoute>} />
      <Route path="/staff/settings" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}><StaffSettings /></ProtectedRoute>} />
      <Route path="/staff/notifications" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}><StaffNotifications /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminBookings /></ProtectedRoute>} />
      <Route path="/admin/booking/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminBookingDetails /></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminPayments /></ProtectedRoute>} />
      <Route path="/admin/refunds" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminRefunds /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminUserManagement /></ProtectedRoute>} />
      <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminStaffManagement /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminAuditLogs /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminNotifications /></ProtectedRoute>} />
      <Route path="/admin/sales-report" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminSalesReport /></ProtectedRoute>} />
      <Route path="/admin/schedule" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminSchedule /></ProtectedRoute>} />
      <Route path="/admin/search" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminSearch /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
