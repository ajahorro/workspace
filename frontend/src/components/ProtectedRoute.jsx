import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // If we have a cached profile or the data has loaded, we can proceed
  const hasAccess = profile && profile.role;
  
  // Show minimal loader only if we are truly stuck with no data and still loading
  if (loading && !hasAccess) {
    return (
      <div style={{ 
        height: '100vh', width: '100vw', display: 'flex', 
        justifyContent: 'center', alignItems: 'center', 
        background: 'var(--bg-primary)', color: 'var(--primary-color)' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.05)', borderTop: '2px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ margin: 0, fontWeight: '900', letterSpacing: '2px', fontSize: '0.7rem', opacity: 0.5 }}>SPEEDWAY</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If not loading and no user, go home
  if (!loading && !user && !hasAccess) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Final check for role access
  if (hasAccess && allowedRoles && !allowedRoles.includes(profile.role)) {
    const defaultRoutes = {
      CUSTOMER: '/dashboard',
      STAFF: '/staff',
      ADMIN: '/admin',
      SUPER_ADMIN: '/admin'
    };
    return <Navigate to={defaultRoutes[profile.role] || '/'} replace />;
  }

  // If we have a user and profile (even from cache), render the children immediately
  return children;
};

export default ProtectedRoute;
