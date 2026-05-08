import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmLogout } from '../utils/logoutConfirm.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery';

const ProfileHeader = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 640px)');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProfilePath = () => {
    const role = profile?.role;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin/profile';
    if (role === 'STAFF') return '/staff/profile';
    return '/profile';
  };

  const getSettingsPath = () => {
    const role = profile?.role;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin/settings';
    if (role === 'STAFF') return '/staff/settings';
    return '/settings';
  };

  const handleLogout = () => {
    setIsOpen(false);
    confirmLogout(async () => {
      await signOut();
      navigate('/');
    });
  };

  const initial = user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';
  const displayName = user?.user_metadata?.full_name || profile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.25rem' : '0.75rem', 
          background: 'var(--admin-bg)', 
          border: '1px solid var(--admin-border)', 
          padding: isMobile ? '0.25rem' : '0.4rem 0.85rem 0.4rem 0.4rem', 
          borderRadius: '2rem', 
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: 'var(--admin-card-shadow)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--admin-brand)';
          e.currentTarget.style.background = 'var(--admin-card)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--admin-border)';
          e.currentTarget.style.background = 'var(--admin-bg)';
        }}
      >
        <div style={{ 
          width: isMobile ? '28px' : '32px', 
          height: isMobile ? '28px' : '32px', 
          background: 'var(--admin-brand)', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#FFFFFF', 
          fontWeight: '900', 
          fontSize: '0.8rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {initial}
        </div>
        {!isMobile && <span style={{ color: 'var(--admin-text-primary)', fontWeight: '700', fontSize: '0.85rem' }}>{displayName}</span>}
        <ChevronDown size={14} color="var(--admin-text-secondary)" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 0.5rem)', 
          right: 0, 
          background: 'var(--admin-card)', 
          border: '1px solid var(--admin-border)', 
          borderRadius: '1rem', 
          minWidth: '220px', 
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* User info header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <p style={{ margin: 0, fontWeight: '800', fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{displayName}</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '500' }}>{user?.email}</p>
            <span style={{ 
              display: 'inline-block', 
              marginTop: '0.6rem', 
              fontSize: '0.65rem', 
              fontWeight: '800', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '2rem', 
              background: 'var(--admin-brand-light)', 
              color: 'var(--admin-brand)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {profile?.role?.replace(/_/g, ' ') || 'Customer'}
            </span>
          </div>

          {/* Menu items */}
          <div style={{ padding: '0.5rem' }}>

            <button 
              onClick={() => { setIsOpen(false); navigate(getProfilePath()); }}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem 1rem', 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--admin-text-primary)', 
                cursor: 'pointer', 
                borderRadius: '0.6rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <User size={16} color="var(--admin-brand)" opacity={0.8} /> My Profile
            </button>

            <button 
              onClick={() => { setIsOpen(false); navigate(getSettingsPath()); }}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem 1rem', 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--admin-text-primary)', 
                cursor: 'pointer', 
                borderRadius: '0.6rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Settings size={16} color="var(--admin-brand)" opacity={0.8} /> Settings
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--admin-border)', padding: '0.5rem' }}>
            <button 
              onClick={handleLogout}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem 1rem', 
                background: 'transparent', 
                border: 'none', 
                color: '#ef4444', 
                cursor: 'pointer', 
                borderRadius: '0.6rem',
                fontSize: '0.85rem',
                fontWeight: '700',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ProfileHeader;
