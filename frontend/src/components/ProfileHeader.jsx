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
          background: 'rgba(255,255,255,0.04)', 
          border: '1px solid var(--border-color)', 
          padding: isMobile ? '0.25rem' : '0.5rem 1rem 0.5rem 0.5rem', 
          borderRadius: '2rem', 
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      >
        <div style={{ 
          width: isMobile ? '28px' : '32px', 
          height: isMobile ? '28px' : '32px', 
          background: 'var(--primary-color)', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#0f172a', 
          fontWeight: '800', 
          fontSize: '0.8rem' 
        }}>
          {initial}
        </div>
        {!isMobile && <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.85rem' }}>{displayName}</span>}
        <ChevronDown size={14} color="var(--text-secondary)" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 0.5rem)', 
          right: 0, 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '0.75rem', 
          minWidth: '200px', 
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          zIndex: 100,
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* User info header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{displayName}</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.email}</p>
            <span style={{ 
              display: 'inline-block', 
              marginTop: '0.5rem', 
              fontSize: '0.65rem', 
              fontWeight: '700', 
              padding: '0.15rem 0.5rem', 
              borderRadius: '1rem', 
              background: 'rgba(56, 189, 248, 0.1)', 
              color: 'var(--primary-color)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {profile?.role?.replace('_', ' ') || 'Customer'}
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
                color: 'var(--text-primary)', 
                cursor: 'pointer', 
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <User size={16} color="var(--text-secondary)" /> My Profile
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
                color: 'var(--text-primary)', 
                cursor: 'pointer', 
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '500',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Settings size={16} color="var(--text-secondary)" /> Settings
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.5rem' }}>
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
                color: 'var(--danger-color)', 
                cursor: 'pointer', 
                borderRadius: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: '600',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
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
