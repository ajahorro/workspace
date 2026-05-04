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
    if (text.includes('booking')) return <Calendar size={14} color="var(--primary-color)" />;
    if (text.includes('payment')) return <CreditCard size={14} color="var(--success-color)" />;
    if (text.includes('refund')) return <AlertTriangle size={14} color="var(--danger-color)" />;
    if (text.includes('completed')) return <CheckCircle size={14} color="var(--success-color)" />;
    return <Info size={14} color="var(--text-secondary)" />;
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
      background: 'var(--bg-secondary)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1.25rem',
      boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      zIndex: 2000,
      overflow: 'hidden',
      animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.8, color: 'var(--panel-text)' }}>RECENT UPDATES</h3>
        <button 
          onClick={onClose}
          style={{ 
            background: 'rgba(0,0,0,0.05)', 
            border: 'none', 
            borderRadius: '0.5rem', 
            color: 'var(--panel-text)', 
            opacity: 0.5,
            padding: '0.4rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ maxHeight: isMobile ? '60vh' : '420px', overflowY: 'auto' }}>
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
                borderBottom: '1px solid var(--glass-border)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                gap: '1rem',
                background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
              onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)'}
            >
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '0.5rem', 
                background: 'rgba(0,0,0,0.1)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--glass-border)', flexShrink: 0
              }}>
                {getIcon(n.title, n.message)}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: '900', color: 'var(--panel-text)', opacity: n.is_read ? 0.6 : 1 }}>{n.title}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--panel-text)', opacity: 0.6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.message}</p>
                <span style={{ fontSize: '0.65rem', color: 'var(--panel-text)', opacity: 0.3, fontWeight: '900', marginTop: '0.5rem', display: 'block' }}>
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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
        style={{ padding: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.05)', color: 'var(--panel-text)', opacity: 0.8, fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        SHOW ALL NOTIFICATIONS <ArrowRight size={14} />
      </div>

      <style>{`
        @keyframes popIn { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

export default NotificationPopover;
