import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, CheckCheck, Trash2, Clock, Calendar, 
  CreditCard, AlertTriangle, CheckCircle, Info, X, Trash, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';

const AdminNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`admin-notifications-${user?.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user?.id}` 
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setNotifications(data);
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);

    if (!error) {
      toast.success('All marked as read', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      fetchNotifications();
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
    } else {
      const msg = n.message.toLowerCase();
      if (msg.includes('booking')) navigate('/admin/bookings');
      else if (msg.includes('payment')) navigate('/admin/payments');
      else if (msg.includes('refund')) navigate('/admin/refunds');
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
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
    }
  };

  const getIcon = (title, message) => {
    const text = (title + ' ' + message).toLowerCase();
    if (text.includes('booking')) return <Calendar size={18} color="#fff" />;
    if (text.includes('payment')) return <CreditCard size={18} color="#fff" />;
    if (text.includes('refund')) return <AlertTriangle size={18} color="#fff" />;
    if (text.includes('completed')) return <CheckCircle size={18} color="#fff" />;
    return <Info size={18} color="#fff" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      <PageHeader 
        badge="SYSTEM UPDATES"
        title="NOTIFICATIONS"
        title="NOTIFICATIONS"
        subtitle={`You have ${notifications.filter(n => !n.is_read).length} unread updates.`}
        onRefresh={() => { fetchNotifications(); toast.success('Refreshing...', { style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' } }); }}
      >
        {notifications.length > 0 && (
          <button 
            onClick={handleMarkAllRead}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', 
              background: 'var(--admin-bg)', border: '1px solid var(--admin-input-border)', 
              color: 'var(--admin-text-primary)', borderRadius: '0.75rem', cursor: 'pointer', 
              fontSize: '0.85rem', fontWeight: '800', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </PageHeader>

      {/* Search Bar */}
      <div style={{ 
        background: 'var(--admin-card)', 
        borderRadius: '1rem', 
        border: '1px solid var(--admin-border)', 
        padding: '1rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--admin-input-bg)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--admin-input-border)' }}>
          <Search size={18} color="var(--admin-text-secondary)" />
          <input 
            placeholder="Search notifications..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--admin-text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '700', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <LoadingState message="Checking for updates..." />
        ) : filteredNotifications.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '6rem 2rem', 
            background: 'var(--admin-card)', borderRadius: '1.25rem', 
            border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <Bell size={48} color="var(--admin-text-secondary)" style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--admin-text-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>No matches found</h3>
            <p style={{ margin: 0, color: 'var(--admin-text-secondary)', fontSize: '0.95rem', fontWeight: '600' }}>Try a different search term.</p>
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div 
              key={n.id}
              className="admin-notification-card"
              onClick={() => handleNotificationClick(n)}
              style={{ 
                background: 'var(--admin-card)', 
                opacity: n.is_read ? 0.8 : 1,
                padding: '1.25rem 1.5rem', borderRadius: '1rem', 
                border: '1px solid var(--admin-border)',
                borderLeft: n.is_read ? '1px solid var(--admin-border)' : '4px solid var(--admin-brand)',
                display: 'flex', gap: '1.5rem', cursor: 'pointer',
                position: 'relative',
                color: 'var(--admin-text-primary)',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
              }}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '0.75rem', 
                background: 'var(--admin-bg)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--admin-border)', flexShrink: 0,
                color: 'var(--admin-brand)'
              }}>
                {React.cloneElement(getIcon(n.title, n.message), { color: 'currentColor' })}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>
                    {n.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button 
                      onClick={(e) => deleteNotification(e, n.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', opacity: 0.4, cursor: 'pointer', padding: '0.25rem', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.4; e.currentTarget.style.color = 'var(--admin-text-secondary)'; }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--admin-text-secondary)', fontWeight: '500', lineHeight: '1.5' }}>
                  {n.message}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {!n.is_read && (
                <div style={{ 
                  position: 'absolute', top: '1.25rem', right: '1.25rem', 
                  width: '8px', height: '8px', borderRadius: '50%', background: 'var(--admin-brand)',
                  boxShadow: '0 0 8px var(--admin-brand)'
                }}></div>
              )}
            </div>
          ))
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .admin-notification-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-notification-card:hover {
          transform: translateX(8px);
          border-color: var(--admin-brand) !important;
          background: var(--admin-bg) !important;
        }
        button:hover {
          border-color: var(--admin-brand) !important;
          color: var(--admin-brand) !important;
        }
      `}</style>
    </div>
  );
};

export default AdminNotifications;
