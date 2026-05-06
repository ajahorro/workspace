import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import AiChatbot from '../components/AiChatbot';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  Bell,
  Settings,
  LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProfileHeader from '../components/ProfileHeader';
import AdminSearch from '../components/AdminSearch';
import NotificationPopover from '../components/NotificationPopover';
import { confirmLogout } from '../utils/logoutConfirm.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from '../components/BrandLogo';

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

const AuthenticatedCustomerLayout = () => {
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
      .channel('customer-notif-count')
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
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Book Service', path: '/book', icon: CalendarPlus },
    { name: 'My History', path: '/my-bookings', icon: History },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const bottomLinks = [
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const sidebarStyle = {
    width: '280px',
    background: 'var(--admin-sidebar)',
    borderRight: '1px solid var(--admin-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '2rem 1.25rem',
    position: 'fixed',
    top: 0,
    left: isMobile ? (isSidebarOpen ? 0 : '-280px') : 0,
    height: '100vh',
    zIndex: 1000,
    transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: 'var(--admin-card-shadow)'
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
      <BlurGlow top="-5%" left="-5%" size="500px" color="rgba(169, 27, 24, 0.4)" />
      <BlurGlow top="10%" right="5%" size="450px" color="rgba(206, 231, 243, 0.3)" />
      <BlurGlow top="40%" left="35%" size="600px" color="rgba(169, 27, 24, 0.25)" />
      <BlurGlow bottom="10%" left="5%" size="400px" color="rgba(206, 231, 243, 0.3)" />
      <BlurGlow bottom="-5%" right="-5%" size="550px" color="rgba(169, 27, 24, 0.3)" />

      {/* THEME GLOWS - Admin Inspired */}
      <BlurGlow top="-10%" left="-10%" size="600px" color="rgba(153, 27, 27, 0.25)" />
      <BlurGlow top="20%" right="-5%" size="500px" color="rgba(30, 41, 59, 0.4)" />
      <BlurGlow bottom="-10%" right="-10%" size="600px" color="rgba(153, 27, 27, 0.2)" />

      <aside style={sidebarStyle}>
        <div style={{ 
          marginTop: '-10px', 
          padding: '0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '2rem',
          overflow: 'visible'
        }}>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <BrandLogo width="260px" height="120px" />
          </div>
          {isMobile && <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', position: 'absolute', right: '1rem', top: '1.5rem', cursor: 'pointer' }}><X /></button>}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || (link.path !== '/dashboard' && location.pathname.startsWith(link.path));
            return (
              <NavLink
                key={link.name}
                to={link.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                  borderRadius: '0.75rem', textDecoration: 'none',
                  color: isActive ? 'var(--admin-sidebar-active-text)' : 'var(--admin-text-secondary)',
                  background: isActive ? 'var(--admin-sidebar-active-bg)' : 'transparent',
                  fontWeight: isActive ? '800' : '600', fontSize: '0.9rem',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  borderLeft: isActive ? '3px solid var(--primary-color)' : '3px solid transparent'
                }}
              >
                <Icon size={18} style={{ opacity: 1 }} />
                {link.name}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <NavLink
                key={link.name}
                to={link.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
                  borderRadius: '0.75rem', textDecoration: 'none',
                  color: isActive ? 'var(--admin-sidebar-active-text)' : 'var(--admin-text-secondary)',
                  background: isActive ? 'var(--admin-sidebar-active-bg)' : 'transparent',
                  fontWeight: isActive ? '800' : '600', fontSize: '0.9rem',
                  transition: 'all 0.3s',
                }}
              >
                <Icon size={18} />
                {link.name}
              </NavLink>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem',
            borderRadius: '0.75rem', border: 'none', background: 'transparent',
            color: '#ef4444', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem',
            transition: 'all 0.2s', marginTop: 'auto'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} />
          LOG OUT
        </button>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, minHeight: '100vh', maxWidth: '100%', marginLeft: isMobile ? 0 : '280px' }}>
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: isMobile ? '0.75rem 1.25rem' : '1rem 2.5rem', 
          background: 'var(--admin-sidebar)',
          borderBottom: '1px solid var(--admin-border)',
          position: 'sticky', top: 0, zIndex: 1000,
          backdropFilter: 'blur(20px)',
          background: 'rgba(var(--admin-sidebar-rgb), 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '2rem' }}>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <Menu size={24} />
              </button>
            )}
            <div
              style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: '900', letterSpacing: '-1px', cursor: 'pointer' }}
              onClick={() => navigate('/dashboard')}
            >
              CUSTOMER
            </div>
            {!isMobile && <AdminSearch />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '1rem' : '1.5rem', position: 'relative' }}>
            <div
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              style={{ position: 'relative', cursor: 'pointer', opacity: showNotifPopover ? 1 : 0.6, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => !showNotifPopover && (e.currentTarget.style.opacity = 0.6)}
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff', fontSize: '0.6rem',
                  fontWeight: 'bold', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', border: '2px solid #050a15'
                }}>{unreadCount}</div>
              )}
            </div>
            {showNotifPopover && (
              <NotificationPopover user={user} profile={profile} onClose={() => setShowNotifPopover(false)} onRead={fetchUnreadCount} />
            )}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.05)' }}></div>
            <ProfileHeader />
          </div>
        </header>

        {isMobile && (
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(5, 10, 21, 0.2)' }}>
            <AdminSearch />
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
        {/* <AiChatbot /> */}
      </div>
    </div>
  );
};

export default AuthenticatedCustomerLayout;
