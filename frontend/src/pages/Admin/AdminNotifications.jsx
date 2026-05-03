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
      toast.success('All marked as read');
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
      toast.success('Deleted');
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
        subtitle={`You have ${notifications.filter(n => !n.is_read).length} unread updates.`}
        onRefresh={() => { fetchNotifications(); toast.success('Refreshing...'); }}
      >
        {notifications.length > 0 && (
          <button 
            onClick={handleMarkAllRead}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.5rem', 
              background: 'var(--bg-secondary)', border: 'var(--border-color)', 
              color: '#fff', borderRadius: '5rem', cursor: 'pointer', 
              fontSize: '0.85rem', fontWeight: '800', transition: 'all 0.2s', textTransform: 'uppercase'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </PageHeader>

      {/* Search Bar */}
      <div style={{ 
        background: 'var(--glass-bg)', 
        backdropFilter: 'blur(var(--blur-amount))',
        WebkitBackdropFilter: 'blur(var(--blur-amount))',
        borderRadius: '1rem', 
        border: '1px solid var(--glass-border)', 
        padding: '1rem',
        boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-input)', padding: '0.85rem 1.5rem', borderRadius: '0.75rem', flex: 1, border: 'var(--border-color)' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            placeholder="Search notifications..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '500' }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <LoadingState message="Checking for updates..." />
        ) : filteredNotifications.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '6rem 2rem', 
            background: 'var(--bg-secondary)', borderRadius: '1.5rem', 
            border: 'var(--border-color)', color: '#fff', boxShadow: 'var(--card-shadow)'
          }}>
            <Bell size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'rgba(255,255,255,0.8)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>No matches found</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: '600' }}>Try a different search term.</p>
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div 
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              style={{ 
                background: n.is_read ? 'var(--glass-bg)' : 'rgba(255, 255, 255, 0.1)', 
                backdropFilter: 'blur(var(--blur-amount))',
                WebkitBackdropFilter: 'blur(var(--blur-amount))',
                padding: '1.5rem', borderRadius: '1rem', 
                border: '1px solid var(--glass-border)',
                display: 'flex', gap: '1.5rem', cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                color: '#fff',
                boxShadow: 'var(--card-shadow)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(8px)';
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '0.75rem', 
                background: 'rgba(255,255,255,0.2)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
              }}>
                {getIcon(n.title, n.message)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#fff' }}>
                    {n.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button 
                      onClick={(e) => deleteNotification(e, n.id)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0.25rem', transition: 'color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                  {n.message}
                </p>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {!n.is_read && (
                <div style={{ 
                  position: 'absolute', top: '1.5rem', right: '1.5rem', 
                  width: '6px', height: '6px', borderRadius: '50%', background: '#fff',
                  boxShadow: '0 0 10px #fff'
                }}></div>
              )}
            </div>
          ))
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminNotifications;
