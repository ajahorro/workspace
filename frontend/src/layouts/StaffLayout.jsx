import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ClipboardList, Settings, LogOut, Bell, Menu, X } from 'lucide-react';
import ProfileHeader from '../components/ProfileHeader';
import AdminSearch from '../components/AdminSearch';
import NotificationPopover from '../components/NotificationPopover';
import { confirmLogout } from '../utils/logoutConfirm.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery';

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

const StaffLayout = () => {
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
      .channel('staff-notif-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('notificationsRead', handleNotificationsRead);
    };
  }, [user]);

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
    { name: 'Tasks', path: '/staff', icon: ClipboardList, exact: true },
    { name: 'Notifications', path: '/staff/notifications', icon: Bell },
    { name: 'Settings', path: '/staff/settings', icon: Settings },
  ];

  const sidebarStyle = {
    width: '280px',
    background: 'var(--bg-panel)',
    backdropFilter: 'var(--blur-amount)',
    WebkitBackdropFilter: 'var(--blur-amount)',
    borderRight: '1px solid var(--glass-border)',
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
      <BlurGlow top="10%" right="5%" size="450px" color="rgba(169, 27, 24, 0.2)" />
      <BlurGlow top="40%" left="35%" size="600px" color="rgba(169, 27, 24, 0.15)" />
      <BlurGlow bottom="-5%" right="-5%" size="550px" color="rgba(169, 27, 24, 0.3)" />

      <div style={overlayStyle} onClick={() => setIsSidebarOpen(false)} />

      <aside style={sidebarStyle}>
        <div style={{ marginBottom: '3rem', paddingLeft: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--panel-text)', letterSpacing: '0.5px', marginBottom: '2rem', lineHeight: '1.2' }}>
            SpeedWay AutoxMoto Detail Studio
          </div>
          {isMobile && <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--panel-text)', opacity: 0.5, cursor: 'pointer' }}><X /></button>}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);
            return (
              <NavLink
                key={link.name}
                to={link.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem',
                  borderRadius: '0.75rem', textDecoration: 'none',
                  color: 'var(--panel-text)',
                  background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  opacity: isActive ? 1 : 0.6,
                  fontWeight: isActive ? '900' : '500', fontSize: '0.9rem',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  borderLeft: isActive ? '3px solid var(--panel-text)' : '3px solid transparent'
                }}
              >
                <Icon size={18} color="currentColor" />
                {link.name}
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
            borderRadius: '0.75rem', border: 'none', background: 'transparent',
            color: 'var(--panel-text)', opacity: 0.8, cursor: 'pointer', fontWeight: '900', fontSize: '0.9rem',
            marginTop: 'auto'
          }}
        >
          <LogOut size={18} />
          LOG OUT
        </button>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, minHeight: '100vh', maxWidth: '100%', marginLeft: isMobile ? 0 : '280px' }}>
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: isMobile ? '0.75rem 1.25rem' : '1.25rem 2.5rem', 
          background: 'var(--bg-panel)',
          backdropFilter: 'var(--blur-amount)',
          WebkitBackdropFilter: 'var(--blur-amount)',
          borderBottom: '1px solid var(--glass-border)',
          position: 'sticky', top: 0, zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '2rem' }}>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} style={{ color: 'var(--panel-text)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Menu size={24} />
              </button>
            )}
            <div
              style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: '900', letterSpacing: '-1px', cursor: 'pointer', color: 'var(--panel-text)' }}
              onClick={() => navigate('/staff')}
            >
              STAFF
            </div>
            {!isMobile && <AdminSearch />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.5rem', position: 'relative' }}>
            <div
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              style={{ position: 'relative', cursor: 'pointer', opacity: showNotifPopover ? 1 : 0.6, color: 'var(--panel-text)' }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff', fontSize: '0.5rem',
                  fontWeight: 'bold', width: '14px', height: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', border: '1px solid var(--bg-panel)'
                }}>{unreadCount}</div>
              )}
            </div>
            {showNotifPopover && (
              <NotificationPopover user={user} profile={profile} onClose={() => setShowNotifPopover(false)} onRead={fetchUnreadCount} />
            )}
            <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }}></div>
            <ProfileHeader />
          </div>
        </header>

        {isMobile && (
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-secondary)' }}>
            <AdminSearch />
          </div>
        )}

        <main style={{ flex: 1, padding: '1.5rem 2.5rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
