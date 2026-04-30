import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Bell, CheckCheck, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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

    // Subscribe to real-time notifications
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
      toast.success('All marked as read');
      refreshNotifications();
    }
  };

  const deleteNotification = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      toast.success('Notification deleted');
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>Notifications</h1>
        <button 
          onClick={markAllRead}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}
        >
          <CheckCheck size={18} /> Mark all as read
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem', border: '1px solid #ef4444', marginBottom: '2rem', fontSize: '0.9rem' }}>
          ⚠️ <strong>Database Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading notifications...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
               <Bell size={48} color="var(--text-secondary)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
               <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>You have no notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                style={{ 
                  background: n.is_read ? 'rgba(255,255,255,0.02)' : 'var(--bg-secondary)', 
                  padding: '1.5rem 2rem', 
                  borderRadius: '1rem', 
                  border: '1px solid var(--border-color)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  transition: 'transform 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {!n.is_read && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--primary-color)' }}></div>}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{n.title || 'Notification'}</h3>
                    {!n.is_read && <span style={{ background: 'var(--primary-color)', color: '#0f172a', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>New</span>}
                  </div>
                  <p style={{ margin: '0 0 0.75rem 0', color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>{n.message}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Clock size={12} />
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <button 
                  onClick={() => deleteNotification(n.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger-color)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
