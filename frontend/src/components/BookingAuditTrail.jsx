import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, User, Shield, Info, CreditCard, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

const BookingAuditTrail = ({ bookingId, logs, isAdmin = false }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(!logs);

  useEffect(() => {
    if (logs) {
      setEvents(logs);
      setLoading(false);
    } else if (bookingId) {
      fetchEvents();
    }
  }, [bookingId, logs]);

  const fetchEvents = async () => {
    if (!bookingId) return;
    setLoading(true);
    // We pull from booking_events which is our "Source of Truth" for security
    const { data, error } = await supabase
      .from('booking_events')
      .select(`
        *,
        actor:profiles!actor_id(full_name, role)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (!error && data) setEvents(data);
    setLoading(false);
  };

  const getEventIcon = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('CREATE')) return <Info size={14} />;
    if (t.includes('PAYMENT')) return <CreditCard size={14} />;
    if (t.includes('ASSIGN')) return <User size={14} />;
    if (t.includes('STATUS')) return <Clock size={14} />;
    if (t.includes('REFUND')) return <AlertTriangle size={14} />;
    if (t.includes('COMPLETED') || t.includes('FINISHED')) return <CheckCircle size={14} />;
    return <Wrench size={14} />;
  };

  if (loading) return <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Loading audit trail...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {events.map((event, i) => (
        <div key={event.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          {/* Connector Line */}
          {i !== events.length - 1 && (
            <div style={{ position: 'absolute', left: '15px', top: '30px', bottom: '-15px', width: '2px', background: 'rgba(255,255,255,0.05)' }} />
          )}
          
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--primary-color)',
            flexShrink: 0,
            zIndex: 1
          }}>
            {getEventIcon(event.event_type)}
          </div>

          <div style={{ flex: 1, paddingBottom: i !== events.length - 1 ? '1.5rem' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {event.event_type.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '700', opacity: 0.6 }}>
                {new Date(event.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-secondary)', lineHeight: '1.5', fontWeight: '500' }}>
              {event.metadata?.details || event.event_type}
            </p>

            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
               <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(var(--admin-brand-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Shield size={10} color="var(--admin-brand)" />
               </div>
               <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>
                 {event.actor?.full_name || 'System Log'}
               </span>
               <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, fontWeight: '700' }}>
                 • {event.actor?.role || 'SYSTEM'}
               </span>
            </div>
          </div>
        </div>
      ))}

      {events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
          No recorded activity for this booking.
        </div>
      )}
    </div>
  );
};

export default BookingAuditTrail;
