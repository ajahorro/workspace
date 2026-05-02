import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';
import AuthenticatedCustomerLayout from './layouts/AuthenticatedCustomerLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import BookAppointment from './pages/Customer/BookAppointment';
import MyBookings from './pages/Customer/MyBookings';
import BookingDetails from './pages/Customer/BookingDetails';
import StaffTasks from './pages/Staff/StaffTasks';
import StaffSettings from './pages/Staff/StaffSettings';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminBookings from './pages/Admin/AdminBookings';
import AdminBookingDetails from './pages/Admin/AdminBookingDetails';
import AdminPayments from './pages/Admin/AdminPayments';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminSchedule from './pages/Admin/AdminSchedule';
import AdminNotifications from './pages/Admin/AdminNotifications';
import AdminRefunds from './pages/Admin/AdminRefunds';
import AdminAnalytics from './pages/Admin/AdminAnalytics';
import AdminAuditLogs from './pages/Admin/AdminAuditLogs';
import AdminStaffManagement from './pages/Admin/AdminStaffManagement';
import AdminUserManagement from './pages/Admin/AdminUserManagement';

import CustomerDashboard from './pages/Customer/CustomerDashboard';
import Notifications from './pages/Customer/Notifications';
import Settings from './pages/Customer/Settings';
import LandingPage from './pages/LandingPage';
import Faq from './pages/Faq';
import ProfilePage from './pages/ProfilePage';
import StaffNotifications from './pages/Staff/StaffNotifications';

function App() {

  return (
    <BrowserRouter>
      <Toaster 
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          top: 20,
          left: 20,
          bottom: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--bg-secondary)',
            color: '#fff',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.9rem',
            fontWeight: '600',
            maxWidth: '90vw',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(10px)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }} 
      />

      <Routes>
        {/* Root Redirect & Public Pages */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Pages */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/faq" element={<Faq />} />


        {/* Staff Routes */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}><StaffLayout /></ProtectedRoute>}>
          <Route index element={<StaffTasks />} />
          <Route path="settings" element={<StaffSettings />} />
          <Route path="notifications" element={<StaffNotifications />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="bookings/:id" element={<AdminBookingDetails />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="refunds" element={<AdminRefunds />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="staff" element={<AdminStaffManagement />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Authenticated Customer View */}
        <Route path="/" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><AuthenticatedCustomerLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="book" element={<BookAppointment />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="my-bookings/:id" element={<BookingDetails />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
