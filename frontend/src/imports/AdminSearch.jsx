import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

const AdminSearch = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const { profile } = useAuth();
  const role = profile?.role || 'CUSTOMER';

  const allPages = {
    ADMIN: [
      { name: 'Dashboard', path: '/admin', keywords: ['home', 'main', 'overview'] },
      { name: 'Booking Management', path: '/admin/bookings', keywords: ['orders', 'appointments', 'reservations'] },
      { name: 'Payment Verification', path: '/admin/payments', keywords: ['cash', 'verify', 'finance', 'money'] },
      { name: 'Schedule', path: '/admin/schedule', keywords: ['calendar', 'time', 'availability'] },
      { name: 'Refunds', path: '/admin/refunds', keywords: ['return', 'money back', 'cancel'] },
      { name: 'Analytics', path: '/admin/analytics', keywords: ['reports', 'charts', 'data', 'stats'] },
      { name: 'Audit Logs', path: '/admin/audit-logs', keywords: ['history', 'actions', 'events'] },
      { name: 'Staff Management', path: '/admin/staff', keywords: ['employees', 'team', 'technicians'] },
      { name: 'User Management', path: '/admin/users', keywords: ['customers', 'accounts', 'profiles'] },
      { name: 'Notifications', path: '/admin/notifications', keywords: ['alerts', 'messages', 'updates'] },
      { name: 'Settings', path: '/admin/settings', keywords: ['config', 'profile', 'password'] },
    ],
    SUPER_ADMIN: [], // Same as ADMIN
    STAFF: [
      { name: 'Dashboard', path: '/staff', keywords: ['home', 'tasks', 'main'] },
      { name: 'Notifications', path: '/staff/notifications', keywords: ['alerts', 'messages', 'updates'] },
      { name: 'Settings', path: '/staff/settings', keywords: ['config', 'profile', 'password'] },
    ],
    CUSTOMER: [
      { name: 'Dashboard', path: '/dashboard', keywords: ['home', 'main'] },
      { name: 'Book Service', path: '/book', keywords: ['appointment', 'detailing', 'reserve'] },
      { name: 'My History', path: '/my-bookings', keywords: ['orders', 'previous', 'bookings'] },
      { name: 'Notifications', path: '/notifications', keywords: ['alerts', 'messages', 'updates'] },
      { name: 'Settings', path: '/settings', keywords: ['config', 'profile', 'password'] },
    ]
  };

  const pages = (role === 'SUPER_ADMIN' ? allPages.ADMIN : allPages[role]) || allPages.CUSTOMER;

  useEffect(() => {
    if (query.trim() === '') {
      setSuggestions([]);
      return;
    }

    const filtered = pages.filter(page => 
      page.name.toLowerCase().includes(query.toLowerCase()) ||
      page.keywords.some(k => k.includes(query.toLowerCase()))
    );
    setSuggestions(filtered);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (path) => {
    navigate(path);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: isMobile ? '100%' : '350px' }}>
      <div style={{ position: 'relative' }}>
        <Search 
          size={18} 
          style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} 
        />
        <input 
          type="text"
          placeholder="Search system..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '0.7rem 1rem 0.7rem 2.75rem',
            background: 'var(--admin-input-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: '0.75rem',
            color: 'var(--admin-text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            fontWeight: '600',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--admin-brand)'}
          onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.borderColor = 'var(--admin-border)'; }}
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          left: 0,
          right: 0,
          background: 'var(--admin-card)',
          border: '1px solid var(--admin-border)',
          borderRadius: '0.75rem',
          padding: '0.4rem',
          zIndex: 1000,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          animation: 'fadeIn 0.2s ease',
          color: 'var(--admin-text-primary)'
        }}>
          {suggestions.map((item) => (
            <div 
              key={item.path}
              onClick={() => handleSelect(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-input-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>{item.name}</span>
              <ChevronRight size={14} style={{ opacity: 0.4 }} color="var(--admin-brand)" />
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminSearch;
