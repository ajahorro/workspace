import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Bell, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { supabase } from '../lib/supabase';
import BookingCartSidebar from '../components/Customer/BookingCartSidebar';
import NotificationPopover from '../components/NotificationPopover';
import ProfileHeader from '../components/ProfileHeader';

const CustomerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { cart } = useBooking();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      const handleNotificationsRead = () => fetchUnreadCount();
      window.addEventListener('notificationsRead', handleNotificationsRead);

      const channel = supabase
        .channel(`customer-notifs-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, () => {
          fetchUnreadCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('notificationsRead', handleNotificationsRead);
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <header style={{ 
        padding: '0.75rem 2rem', 
        background: 'rgba(23, 23, 23, 0.8)', 
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#000', fontSize: '1.2rem' }}>S</div>
          <h1 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', letterSpacing: '0.5px', color: '#fff', lineHeight: '1.2', textTransform: 'uppercase' }}>
            SpeedWay <span style={{ color: 'var(--primary-color)' }}>Studio</span>
          </h1>
        </Link>

        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: location.pathname === '/' ? 'var(--primary-color)' : 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: '0.85rem', transition: 'all 0.2s' }}>SERVICES</Link>
          <Link to="/my-bookings" style={{ textDecoration: 'none', color: location.pathname.startsWith('/my-bookings') ? 'var(--primary-color)' : 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: '0.85rem', transition: 'all 0.2s' }}>MY HISTORY</Link>
          
          <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowNotifPopover(!showNotifPopover)}
                  style={{ position: 'relative', cursor: 'pointer', opacity: showNotifPopover ? 1 : 0.7, color: '#fff', transition: 'all 0.2s' }}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <div style={{
                      position: 'absolute', 
                      top: '-5px', 
                      right: '-8px',
                      background: 'var(--primary-color)', 
                      color: '#000', 
                      fontSize: '0.6rem',
                      fontWeight: '900', 
                      minWidth: '16px', 
                      height: '16px',
                      padding: '0 4px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRadius: '10px', 
                      border: '2px solid #171717',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
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
              </div>

              {/* Profile */}
              <ProfileHeader />
            </div>
          ) : (
            <Link 
              to="/login"
              style={{ background: 'var(--primary-color)', color: '#000', padding: '0.6rem 1.5rem', borderRadius: '0.75rem', fontWeight: '800', textDecoration: 'none', fontSize: '0.85rem' }}
            >
              LOGIN
            </Link>
          )}
          
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ 
              background: cart.length > 0 ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent', 
              border: '1px solid var(--glass-border)', 
              padding: '0.6rem 1rem', 
              borderRadius: '0.75rem', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontWeight: '800',
              color: cart.length > 0 ? 'var(--primary-color)' : '#fff',
              transition: 'all 0.2s'
            }}
          >
            <ShoppingBag size={18} />
            {cart.length > 0 && <span style={{ fontSize: '0.85rem' }}>{cart.length}</span>}
          </button>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <BookingCartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default CustomerLayout;
