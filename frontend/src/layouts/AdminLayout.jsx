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

const AdminLayout = () => {
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
      opacity: 0.6
    }} />
  );

  const sidebarStyle = {
    width: '280px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid rgba(255,255,255,0.03)',
    display: 'flex',
    flexDirection: 'column',
    padding: '2rem 1.5rem',
    position: 'fixed',
    top: 0,
    left: isMobile ? (isSidebarOpen ? 0 : '-280px') : 0,
    height: '100vh',
    zIndex: 1000,
    transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative', overflow: 'hidden' }}>
      <BlurGlow top="-5%" left="-5%" size="500px" color="rgba(169, 27, 24, 0.4)" />
      <BlurGlow top="10%" right="5%" size="450px" color="rgba(206, 231, 243, 0.3)" />
      <BlurGlow top="40%" left="35%" size="600px" color="rgba(169, 27, 24, 0.25)" />
      <BlurGlow bottom="10%" left="5%" size="400px" color="rgba(206, 231, 243, 0.3)" />
      <BlurGlow bottom="-5%" right="-5%" size="550px" color="rgba(169, 27, 24, 0.3)" />
      
      {/* Mobile Overlay */}
      <div style={overlayStyle} onClick={() => setIsSidebarOpen(false)} />

      <aside style={sidebarStyle}>
        <div style={{ marginBottom: '3rem', paddingLeft: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--primary-color)', letterSpacing: '0.5px', marginBottom: '2rem', lineHeight: '1.2' }}>
            SpeedWay AutoxMoto Detail Studio
          </div>
          {isMobile && <button onClick={() => setIsSidebarOpen(false)} style={{ color: 'rgba(255,255,255,0.4)' }}><X /></button>}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);

            return (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.exact}
                style={({ isActive: linkActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  color: linkActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.4)',
                  background: linkActive ? 'rgba(169, 27, 24, 0.05)' : 'transparent',
                  fontWeight: linkActive ? '700' : '500',
                  transition: 'all 0.2s ease',
                  borderLeft: linkActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                  fontSize: '0.9rem'
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Icon size={18} color={isActive ? "var(--primary-color)" : "currentColor"} />
                  {link.name}
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '2rem' }}>
          <NavLink
            to="/admin/settings"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.85rem 1.25rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: isActive ? '700' : '500',
              fontSize: '0.9rem'
            })}
          >
            <Settings size={18} />
            Settings
          </NavLink>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem',
              borderRadius: '0.5rem', color: '#ef4444', fontWeight: '700',
              fontSize: '0.9rem', width: '100%', textAlign: 'left'
            }}
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
          padding: isMobile ? '0.75rem 1.25rem' : '1.25rem 2.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          background: 'var(--bg-secondary)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '2rem' }}>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} style={{ color: '#fff' }}>
                <Menu size={24} />
              </button>
            )}
            <div
              style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: '900', letterSpacing: '-1px', cursor: 'pointer' }}
              onClick={() => navigate('/admin')}
            >
              ADMIN
            </div>
            {!isMobile && <AdminSearch />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.5rem', position: 'relative' }}>
            <div
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              style={{ position: 'relative', cursor: 'pointer', opacity: showNotifPopover ? 1 : 0.6 }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff', fontSize: '0.5rem',
                  fontWeight: 'bold', width: '14px', height: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', border: '1px solid #050a15'
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
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.05)' }}></div>
            <ProfileHeader />
          </div>
        </header>

        {isMobile && (
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(5, 10, 21, 0.2)' }}>
            <AdminSearch />
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '1rem' : '1.5rem 2.5rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
