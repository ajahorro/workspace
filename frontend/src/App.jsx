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
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminBookings from './pages/Admin/AdminBookings';
import AdminPayments from './pages/Admin/AdminPayments';
import AdminSettings from './pages/Admin/AdminSettings';

import CustomerDashboard from './pages/Customer/CustomerDashboard';
import Notifications from './pages/Customer/Notifications';
import Settings from './pages/Customer/Settings';
import LandingPage from './pages/LandingPage';
import AiChatbot from './components/AiChatbot';
import ProfilePage from './pages/ProfilePage';

function App() {

  return (
    <BrowserRouter>
      <Toaster position="top-center" />

      <Routes>
        {/* Root Redirect & Public Pages */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Pages */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />


        {/* Authenticated Customer View */}
        <Route path="/" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN']}><AuthenticatedCustomerLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="book" element={<BookAppointment />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="my-bookings/:id" element={<BookingDetails />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Staff Routes */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF', 'ADMIN', 'SUPER_ADMIN']}><StaffLayout /></ProtectedRoute>}>
          <Route index element={<StaffTasks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AiChatbot />
    </BrowserRouter>
  );
}

export default App;
