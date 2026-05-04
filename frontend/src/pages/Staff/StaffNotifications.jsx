import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Bell, CheckCheck, Trash2, Clock, Calendar, CreditCard, CheckCircle, Info, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const StaffNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

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
      .channel(`staff-notifications-${user?.id}`)
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

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      window.dispatchEvent(new Event('notificationsRead'));
    }
    if (n.action_url) {
      navigate(n.action_url);
    } else if (n.title && n.title.toLowerCase().includes('booking')) {
      navigate('/staff'); // Staff go back to task list
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
    if (text.includes('completed')) return <CheckCircle size={18} color="#10b981" />;
    return <Info size={18} color="var(--admin-text-secondary)" style={{ opacity: 0.4 }} />;
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      <PageHeader 
        badge="ACTIVITY UPDATES"
        title="NOTIFICATIONS"
        subtitle={`You have ${notifications.filter(n => !n.is_read).length} unread staff updates.`}
        onRefresh={() => { refreshNotifications(); toast.success('Refreshing...', { style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' } }); }}
      >
        {notifications.length > 0 && (
          <button 
            onClick={markAllRead}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: isMobile ? '0.6rem 1.25rem' : '0.75rem 1.5rem', 
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', 
              color: 'var(--admin-text-secondary)', borderRadius: '5rem', cursor: 'pointer', 
              fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '900', transition: 'all 0.2s', textTransform: 'uppercase'
            }}
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </PageHeader>

      {/* Search Bar */}
      <div style={{ 
        background: 'var(--admin-card)', 
        borderRadius: '1.25rem', 
        border: '1px solid var(--admin-border)', 
        padding: '1.5rem',
        boxShadow: 'var(--admin-card-shadow)',
        color: 'var(--admin-text-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--admin-bg)', padding: '0.85rem 1.5rem', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--admin-border)' }}>
          <Search size={18} color="var(--admin-text-secondary)" style={{ opacity: 0.3 }} />
          <input 
            placeholder="Search notifications..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--admin-text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '900' }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <LoadingState message="Checking for updates..." />
        ) : filteredNotifications.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: isMobile ? '4rem 1.5rem' : '6rem 2rem', 
            background: 'var(--admin-card)', borderRadius: '1.5rem', 
            border: '1px solid var(--admin-border)',
            backdropFilter: 'blur(10px)',
            color: 'var(--admin-text-primary)',
            boxShadow: 'var(--admin-card-shadow)'
          }}>
            <Bell size={48} style={{ marginBottom: '1.5rem', opacity: 0.1 }} />
            <h3 style={{ margin: '0 0 0.5rem 0', opacity: 0.4, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>No matches found</h3>
            <p style={{ margin: 0, opacity: 0.2, fontSize: '0.9rem', fontWeight: '600' }}>Try a different search term.</p>
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div 
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              style={{ 
                background: n.is_read ? 'var(--admin-card)' : 'rgba(169, 27, 24, 0.04)', 
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                padding: isMobile ? '1.25rem' : '1.5rem', borderRadius: '1.25rem', 
                border: '1px solid',
                borderColor: n.is_read ? 'var(--admin-border)' : 'var(--admin-brand)',
                display: 'flex', gap: isMobile ? '1rem' : '1.5rem', cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                boxShadow: n.is_read ? 'none' : '0 10px 30px rgba(169, 27, 24, 0.05)',
                color: 'var(--admin-text-primary)'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateX(8px)';
                  e.currentTarget.style.background = n.is_read ? 'var(--admin-bg)' : 'rgba(169, 27, 24, 0.08)';
                  e.currentTarget.style.borderColor = 'var(--admin-brand)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.background = n.is_read ? 'var(--admin-card)' : 'rgba(169, 27, 24, 0.04)';
                  e.currentTarget.style.borderColor = n.is_read ? 'var(--admin-border)' : 'var(--admin-brand)';
                }
              }}
            >
              <div style={{ 
                width: isMobile ? '44px' : '52px', height: isMobile ? '44px' : '52px', borderRadius: '1rem', 
                background: 'var(--admin-bg)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--admin-border)', flexShrink: 0
              }}>
                {getIcon(n.title, n.message)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.15rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>
                    {n.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', opacity: 0.3, fontWeight: '800' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button 
                      onClick={(e) => deleteNotification(e, n.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', opacity: 0.1, cursor: 'pointer', transition: 'color 0.2s' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '0.8rem' : '0.95rem', color: 'var(--admin-text-primary)', opacity: n.is_read ? 0.4 : 0.8, lineHeight: '1.5' }}>
                  {n.message}
                </p>
                <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-secondary)', opacity: 0.2, fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
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
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .notification-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .notification-card:hover {
          border-color: var(--primary-color) !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        button, input {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default StaffNotifications;
