import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Bell, Calendar, CreditCard, AlertTriangle, CheckCircle, Info, ArrowRight, X } from 'lucide-react';
import LoadingState from './LoadingState';
import { useMediaQuery } from '../hooks/useMediaQuery';

const NotificationPopover = ({ user, profile, onClose, onRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const popoverRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 640px)');

  useEffect(() => {
    fetchRecent();
    
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6);
    
    if (data) setNotifications(data);
    setLoading(false);
  };

  const getIcon = (title, message) => {
    const text = (title + ' ' + message).toLowerCase();
    if (text.includes('booking')) return <Calendar size={14} color="var(--admin-brand)" />;
    if (text.includes('payment')) return <CreditCard size={14} color="#10b981" />;
    if (text.includes('refund')) return <AlertTriangle size={14} color="#ef4444" />;
    if (text.includes('completed')) return <CheckCircle size={14} color="#10b981" />;
    return <Info size={14} color="var(--admin-text-secondary)" />;
  };

  const getBasePath = () => {
    const role = profile?.role;
    console.log('NotificationPopover: Detected role:', role);
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin';
    if (role === 'STAFF') return '/staff';
    return ''; // Customer
  };

  const handleClick = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      if (onRead) onRead();
    }
    onClose();
    if (n.action_url) {
      console.log('NotificationPopover: Navigating to action_url:', n.action_url);
      navigate(n.action_url);
    } else {
      const path = getBasePath();
      const target = path === '' ? '/notifications' : `${path}/notifications`;
      console.log('NotificationPopover: Navigating to target:', target);
      navigate(target);
    }
  };

  const mobileStyles = {
    position: 'fixed',
    top: '5rem',
    left: '1rem',
    right: '1rem',
    width: 'auto',
    maxWidth: 'none',
  };

  const desktopStyles = {
    position: 'absolute',
    top: 'calc(100% + 1rem)',
    right: 0,
    width: '360px',
  };

  return (
    <div ref={popoverRef} style={{
      ...(isMobile ? mobileStyles : desktopStyles),
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      zIndex: 2000,
      overflow: 'hidden',
      animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      color: 'var(--admin-text-primary)'
    }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--admin-sidebar)' }}>
        <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--admin-text-secondary)' }}>Recent Updates</h3>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--admin-text-secondary)', 
            padding: '0.5rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-input-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ maxHeight: isMobile ? '70vh' : '480px', overflowY: 'auto' }}>
        <div style={{ 
          padding: '0.75rem 1.5rem', 
          borderBottom: '1px solid var(--admin-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(var(--admin-brand-rgb), 0.02)'
        }}>
          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '0.5px' }}>
            {notifications.filter(n => !n.is_read).length} UNREAD
          </span>
          <button 
            onClick={async () => {
              await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
              fetchRecent();
              if (onRead) onRead();
            }}
            style={{ background: 'none', border: 'none', color: 'var(--admin-brand)', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', padding: 0 }}
          >
            MARK ALL AS READ
          </button>
        </div>
        {loading ? (
          <div style={{ padding: '1rem 0' }}>
            <LoadingState message="Syncing..." />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', opacity: 0.3 }}>
            <Bell size={32} style={{ marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700' }}>No notifications found</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleClick(n)}
              style={{ 
                padding: '1.25rem 1.5rem', 
                borderBottom: '1px solid var(--admin-border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                gap: '1rem',
                background: n.is_read ? 'transparent' : 'var(--admin-brand-light)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-input-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--admin-brand-light)'}
            >
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '0.6rem', 
                background: 'var(--admin-input-bg)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--admin-border)', flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                {getIcon(n.title, n.message)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', gap: '0.5rem' }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '0.85rem', 
                    fontWeight: '800', 
                    color: 'var(--admin-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {n.title}
                  </h4>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    color: 'var(--admin-text-secondary)', 
                    fontWeight: '700',
                    flexShrink: 0,
                    marginTop: '0.15rem'
                  }}>
                    {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.75rem', 
                  color: 'var(--admin-text-secondary)', 
                  lineHeight: 1.5, 
                  fontWeight: '500',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {n.message}
                </p>
                {!n.is_read && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: 'var(--admin-brand)' 
                  }}></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div 
        onClick={() => { 
          onClose(); 
          const path = getBasePath();
          navigate(path === '' ? '/notifications' : `${path}/notifications`); 
        }}
        style={{ padding: '0.85rem', textAlign: 'center', background: 'var(--admin-sidebar)', color: 'var(--admin-brand)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid var(--admin-border)' }}
      >
        VIEW ALL UPDATES <ArrowRight size={14} />
      </div>

      <style>{`
        @keyframes popIn { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

export default NotificationPopover;
