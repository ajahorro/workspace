import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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

const AuthenticatedCustomerLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontWeight: '500' }}>Are you sure you want to log out?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              await signOut();
              navigate('/');
            }}
            style={{ padding: '0.5rem 1rem', background: 'var(--danger-color)', border: 'none', color: '#fff', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '600' }}
          >
            Log Out
          </button>
        </div>
      </div>
    ), { duration: Infinity, style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } });
  };

  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    fetchUnreadCount();

    const channel = supabase
      .channel('notif-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Book Appointment', path: '/book', icon: CalendarPlus },
    { name: 'My Bookings', path: '/my-bookings', icon: History },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '280px', 
        background: 'var(--bg-primary)', 
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 1.5rem',
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '3rem', paddingLeft: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '24px', background: 'var(--primary-color)', borderRadius: '4px' }}></span>
            RENEW
          </h1>
        </div>

        {/* Primary Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.path);
            
            return (
              <NavLink
                key={link.name}
                to={link.path}
                style={({ isActive: exactActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  color: (exactActive || isActive) ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  background: (exactActive || isActive) ? 'var(--primary-color)' : 'transparent',
                  fontWeight: (exactActive || isActive) ? '700' : '500',
                  transition: 'all 0.2s ease',
                  border: (exactActive || isActive) ? '1px solid var(--primary-color)' : '1px solid transparent',
                  position: 'relative'
                })}
              >
                <Icon size={20} color={location.pathname.startsWith(link.path) ? "var(--primary-color)" : "currentColor"} />
                {link.name}
                {link.badge > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    right: '1.25rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    background: '#ef4444', 
                    color: '#fff', 
                    fontSize: '0.65rem', 
                    fontWeight: '800', 
                    padding: '0.1rem 0.4rem', 
                    borderRadius: '1rem',
                    minWidth: '1.2rem',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                  }}>
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom: Settings + Logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
          <NavLink
            to="/settings"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--primary-color)' : 'transparent',
              fontWeight: isActive ? '700' : '500',
              border: isActive ? '1px solid var(--primary-color)' : '1px solid transparent',
              transition: 'all 0.2s ease'
            })}
          >
            <Settings size={20} color={location.pathname.startsWith('/settings') ? "var(--primary-color)" : "currentColor"} />
            Settings
          </NavLink>
          
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '1rem 1.25rem', 
              borderRadius: '0.5rem', 
              border: 'none',
              background: 'transparent', 
              color: 'var(--danger-color)',
              cursor: 'pointer',
              fontWeight: '600',
              textAlign: 'left',
              marginTop: '0.5rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar with Profile Header */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          padding: '1rem 2.5rem', 
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <ProfileHeader />
        </header>
        <main style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthenticatedCustomerLayout;
