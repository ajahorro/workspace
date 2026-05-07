import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, ClipboardList, CheckSquare, Calendar,
  Bell, Undo, BarChart2, History, Users, User,
  Settings, LogOut, Menu, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProfileHeader from '../components/ProfileHeader';
import AdminSearch from '../components/AdminSearch';
import NotificationPopover from '../components/NotificationPopover';
import { confirmLogout } from '../utils/logoutConfirm.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from '../components/BrandLogo';

const AdminLayout = () => {
  const { theme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    fetchUnreadCount();

    const handleNotificationsRead = () => fetchUnreadCount();
    window.addEventListener('notificationsRead', handleNotificationsRead);

    const channel = supabase
      .channel('admin-notif-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('notificationsRead', handleNotificationsRead);
    };
  }, [user]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [location, isMobile]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const handleLogout = () => {
    confirmLogout(async () => {
      await signOut();
      navigate('/');
    });
  };

  const navLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Booking Management', path: '/admin/bookings', icon: ClipboardList },
    { name: 'Payment Verification', path: '/admin/payments', icon: CheckSquare },
    { name: 'Schedule', path: '/admin/schedule', icon: Calendar },
    { name: 'Refunds', path: '/admin/refunds', icon: Undo },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart2 },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: History },
    { name: 'Staff Management', path: '/admin/staff', icon: Users },
    { name: 'Users', path: '/admin/users', icon: User },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
    { name: 'Profile', path: '/admin/profile', icon: User },
  ];

  const bottomLinks = [
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const BlurGlow = ({ top, left, right, bottom, size, color }) => (
    <div style={{
      position: 'absolute',
      top, left, right, bottom,
      width: size,
      height: size,
      background: color || 'rgba(169, 27, 24, 0.4)',
      filter: 'blur(120px)',
      borderRadius: '50%',
      zIndex: 0,
      pointerEvents: 'none',
      opacity: 0.4
    }} />
  );

  const sidebarStyle = {
    width: '280px',
    background: 'var(--admin-sidebar)',
    borderRight: '1px solid var(--admin-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    position: 'fixed',
    top: 0,
    left: isMobile ? (isSidebarOpen ? 0 : '-280px') : 0,
    height: '100vh',
    zIndex: 1000,
    transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '4px 0 20px rgba(0,0,0,0.02)'
  };

  const overlayStyle = {
    display: isMobile && isSidebarOpen ? 'block' : 'none',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 999
  };

  return (
    <div className="admin-theme" data-theme={theme} style={{ display: 'flex', height: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)', position: 'relative', overflow: 'hidden' }}>

      {/* Mobile Overlay */}
      <div style={overlayStyle} onClick={() => setIsSidebarOpen(false)} />

      <aside style={sidebarStyle}>
        <div style={{ 
          marginTop: '-10px', // Pull it up to remove the gap
          padding: '0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '1rem',
          overflow: 'visible'
        }}>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}>
            <BrandLogo width="260px" height="120px" />
          </div>
          {isMobile && <button onClick={() => setIsSidebarOpen(false)} style={{ color: 'var(--admin-text-primary)', position: 'absolute', right: '1rem', top: '1rem' }}><X size={20} /></button>}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.exact}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  color: isActive ? 'var(--admin-sidebar-active-text)' : 'var(--admin-text-secondary)',
                  background: isActive ? 'var(--admin-sidebar-active-bg)' : 'transparent',
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Icon size={18} color="currentColor" />
                  {link.name}
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '2rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem' }}>
          <NavLink
            to="/admin/settings"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.6rem',
              textDecoration: 'none',
              color: isActive ? 'var(--admin-sidebar-active-text)' : 'var(--admin-text-secondary)',
              background: isActive ? 'var(--admin-sidebar-active-bg)' : 'transparent',
              fontWeight: isActive ? '800' : '600',
              fontSize: '0.9rem'
            })}
          >
            <Settings size={18} />
            Settings
          </NavLink>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
              borderRadius: '0.6rem', color: 'var(--admin-text-secondary)', fontWeight: '700',
              fontSize: '0.9rem', width: '100%', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--admin-brand)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--admin-text-secondary)'}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, maxWidth: '100%', marginLeft: isMobile ? 0 : '280px' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
          borderBottom: '1px solid var(--admin-border)',
          background: 'var(--admin-card)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: 'var(--admin-card-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '2rem' }}>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} style={{ color: 'var(--admin-text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Menu size={24} />
              </button>
            )}
            <div
              style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: '800', letterSpacing: '-1.5px', cursor: 'pointer', color: 'var(--admin-text-primary)' }}
              onClick={() => navigate('/admin')}
            >
              ADMIN
            </div>
            {!isMobile && <AdminSearch />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.5rem', position: 'relative' }}>
            <div
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              style={{ position: 'relative', cursor: 'pointer', opacity: showNotifPopover ? 1 : 0.7, color: 'var(--admin-text-primary)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => { if (!showNotifPopover) e.currentTarget.style.opacity = '0.7'; }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-8px',
                  background: 'var(--admin-brand)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: '900',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  border: '2px solid var(--admin-card)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  fontFamily: 'sans-serif'
                }}>{unreadCount}</div>
              )}
            </div>

            {showNotifPopover && (
              <NotificationPopover
                user={user}
                profile={profile}
                onClose={() => setShowNotifPopover(false)}
                onRead={fetchUnreadCount}
              />
            )}
            <div style={{ width: '1px', height: '20px', background: 'var(--admin-border)' }}></div>
            <ProfileHeader />
          </div>
        </header>

        {isMobile && (
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <AdminSearch />
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
