import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Settings, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import ProfileHeader from '../components/ProfileHeader';

const StaffLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontWeight: '500' }}>Confirm logout?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={() => toast.dismiss(t.id)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancel</button>
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
    ), { duration: Infinity, style: { background: 'var(--bg-secondary)', color: '#fff', border: '1px solid var(--border-color)' } });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <aside style={{ width: '280px', background: 'var(--bg-primary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ marginBottom: '3rem', paddingLeft: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '24px', background: 'var(--accent-green)', borderRadius: '4px' }}></span>
            STAFF
          </h1>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <NavLink
            to="/staff"
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-secondary)' : 'transparent',
              fontWeight: isActive ? '600' : '400',
              transition: 'all 0.2s ease',
              border: isActive ? '1px solid var(--border-color)' : '1px solid transparent'
            })}
          >
            <ClipboardList size={20} color={location.pathname === '/staff' ? "var(--accent-green)" : "currentColor"} />
            My Tasks
          </NavLink>
        </nav>

        {/* Bottom: Settings + Logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
          <NavLink
            to="/staff/settings"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-secondary)' : 'transparent',
              fontWeight: isActive ? '600' : '400',
              border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
              transition: 'all 0.2s ease'
            })}
          >
            <Settings size={20} color={location.pathname === '/staff/settings' ? "var(--accent-green)" : "currentColor"} />
            Settings
          </NavLink>
          
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--danger-color)', cursor: 'pointer', fontWeight: '600', textAlign: 'left', marginTop: '0.5rem', transition: 'all 0.2s ease' }}
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

export default StaffLayout;
