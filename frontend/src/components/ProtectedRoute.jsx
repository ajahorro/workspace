import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Could be replaced with a proper loading spinner
  }

  // If user is not logged in at all, redirect to landing page
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If user exists but profile hasn't loaded yet, show loading
  if (!profile) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: '#38bdf8' }}>Loading...</div>;
  }

  // If roles are specified, check if the user has permission
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect unauthorized users to their respective default dashboards
    if (profile.role === 'CUSTOMER') return <Navigate to="/my-bookings" replace />;
    if (profile.role === 'STAFF') return <Navigate to="/staff" replace />;
    if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
