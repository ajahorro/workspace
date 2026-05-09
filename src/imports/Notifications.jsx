import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, CheckCheck, Trash2, Clock, Calendar, CreditCard, CheckCircle, Info, ArrowRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import PageHeader from './PageHeader';
import LoadingState from './LoadingState';
import { useMediaQuery } from '../hooks/useMediaQuery';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!user || cancelled) return;
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setNotifications(data || []);
        setError(null);
      }
      setLoading(false);
    };

    loadNotifications();

    const channel = supabase
      .channel(`notifications-${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const refreshNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);

    if (!error) {
      toast.success('All marked as read', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      refreshNotifications();
      window.dispatchEvent(new Event('notificationsRead'));
    }
  };

  const deleteAllNotifications = async () => {
    if (!user) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      toast.success('All notifications deleted', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      setNotifications([]);
      setShowDeleteModal(false);
    } else {
      toast.error('Failed to delete notifications');
    }
    setIsDeleting(false);
  };

  const handleNotificationClick = async (n) => {
    if (n.action_url) {
      navigate(n.action_url);
    } else if (n.title && n.title.toLowerCase().includes('booking')) {
      navigate('/my-bookings');
    } else {
      refreshNotifications();
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const searchStr = `${n.title} ${n.message}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) {
      toast.success('Notification deleted', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  const getIcon = (title, message) => {
    const text = (title + ' ' + message).toLowerCase();
    if (text.includes('booking')) return <Calendar size={18} color="var(--admin-brand)" />;
    if (text.includes('payment')) return <CreditCard size={18} color="#f59e0b" />;
    if (text.includes('verified') || text.includes('completed')) return <CheckCircle size={18} color="#10b981" />;
    return <Info size={18} color="var(--admin-text-secondary)" style={{ opacity: 0.4 }} />;
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      <PageHeader 
        badge="ACCOUNT ACTIVITY"
        title="NOTIFICATIONS"
        subtitle={`You have ${notifications.filter(n => !n.is_read).length} unread updates.`}
        onRefresh={() => { refreshNotifications(); toast.success('Refreshing...', { style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' } }); }}
      >
        {notifications.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={markAllRead}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: isMobile ? '0.6rem 1.25rem' : '0.75rem 1.5rem', 
                background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', 
                color: 'var(--admin-text-secondary)', borderRadius: '5rem', cursor: 'pointer', 
                fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '800', transition: 'all 0.2s', textTransform: 'uppercase'
              }}
            >
              <CheckCheck size={16} /> {isMobile ? 'Read All' : 'Mark all read'}
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: isMobile ? '0.6rem 1.25rem' : '0.75rem 1.5rem', 
                background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: '#ef4444', borderRadius: '5rem', cursor: 'pointer', 
                fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '800', transition: 'all 0.2s', textTransform: 'uppercase'
              }}
            >
              <Trash2 size={16} /> {isMobile ? 'Clear' : 'Delete All'}
            </button>
          </div>
        )}
      </PageHeader>

      {/* Search Bar */}
      <div style={{ 
        background: 'var(--admin-card)', 
        borderRadius: '1rem', 
        border: '1px solid var(--admin-border)', 
        padding: '1rem',
        boxShadow: 'var(--admin-card-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--admin-bg)', padding: '0.85rem 1.5rem', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--admin-border)' }}>
          <Search size={18} color="var(--admin-text-secondary)" style={{ opacity: 0.3 }} />
          <input 
            placeholder="Search notifications..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--admin-text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '500' }} 
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.1)', fontSize: '0.85rem', fontWeight: '700' }}>
          ⚠️ System error: {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <LoadingState message="Checking for updates..." />
        ) : filteredNotifications.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: isMobile ? '4rem 1.5rem' : '6rem 2rem', 
            background: 'var(--admin-card)', borderRadius: '1.5rem', 
            border: '1px solid var(--admin-border)',
            boxShadow: 'var(--admin-card-shadow)'
          }}>
            <Bell size={48} color="var(--admin-text-secondary)" style={{ marginBottom: '1.5rem', opacity: 0.1 }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--admin-text-secondary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', fontSize: isMobile ? '0.9rem' : '1.1rem', opacity: 0.6 }}>No matches found</h3>
            <p style={{ margin: 0, color: 'var(--admin-text-secondary)', fontSize: isMobile ? '0.75rem' : '0.9rem', fontWeight: '600', opacity: 0.3 }}>Try a different search term.</p>
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div 
              key={n.id}
              className="notification-card"
              onClick={() => handleNotificationClick(n)}
              style={{ 
                background: n.is_read ? 'var(--admin-card)' : 'rgba(169, 27, 24, 0.04)', 
                padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', 
                border: '1px solid',
                borderColor: n.is_read ? 'var(--admin-border)' : 'rgba(169, 27, 24, 0.2)',
                display: 'flex', gap: isMobile ? '0.75rem' : '1.5rem', cursor: 'pointer',
                position: 'relative',
                backdropFilter: 'blur(10px)',
                boxShadow: n.is_read ? 'none' : '0 10px 30px rgba(169, 27, 24, 0.05)'
              }}
            >
              <div style={{ 
                width: isMobile ? '36px' : '48px', height: isMobile ? '36px' : '48px', borderRadius: '0.75rem', 
                background: 'var(--admin-bg)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--admin-border)', flexShrink: 0
              }}>
                {React.cloneElement(getIcon(n.title, n.message), { size: isMobile ? 14 : 18 })}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                  <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: '900', color: n.is_read ? 'var(--admin-text-secondary)' : 'var(--admin-text-primary)' }}>
                    {n.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '800', opacity: 0.4 }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {!isMobile && (
                      <button 
                        onClick={(e) => deleteNotification(e, n.id)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.1)', cursor: 'pointer', padding: '0.25rem', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.1)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '0.8rem' : '0.95rem', color: n.is_read ? 'var(--admin-text-secondary)' : 'var(--admin-text-primary)', opacity: n.is_read ? 0.6 : 0.8, lineHeight: '1.5' }}>
                  {n.message}
                </p>
                <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-secondary)', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.4 }}>
                  {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {!n.is_read && (
                <div style={{ 
                  position: 'absolute', top: isMobile ? '1rem' : '1.5rem', right: isMobile ? '1rem' : '1.5rem', 
                  width: '6px', height: '6px', borderRadius: '50%', background: 'var(--admin-brand)',
                  boxShadow: '0 0 10px var(--admin-brand)'
                }}></div>
              )}
            </div>
          ))
        )}
      </div>

      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: 'var(--admin-card-shadow)', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', fontWeight: '900', color: 'var(--admin-text-primary)' }}>DELETE ALL NOTIFICATIONS?</h2>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: '1.6', fontWeight: '500', opacity: 0.6 }}>
              Are you sure you want to clear your entire notification history? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>CANCEL</button>
              <button onClick={deleteAllNotifications} disabled={isDeleting} style={{ flex: 1, padding: '1rem', background: '#ef4444', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}>{isDeleting ? '...' : 'YES, DELETE'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .notification-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .notification-card:hover {
          transform: translateX(8px);
          border-color: var(--primary-color) !important;
          background: var(--admin-bg) !important;
        }
        button {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        button:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
};

export default Notifications;
