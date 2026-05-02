import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, User, Shield, Info, CreditCard, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

const BookingAuditTrail = ({ bookingId, isAdmin = false }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [bookingId]);

  const fetchEvents = async () => {
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
    switch (type) {
      case 'CREATE': return <Info size={14} />;
      case 'PAYMENT': return <CreditCard size={14} />;
      case 'ASSIGNMENT': return <User size={14} />;
      case 'STATUS_CHANGE': return <Clock size={14} />;
      case 'REFUND_REQUESTED': return <AlertTriangle size={14} />;
      case 'COMPLETED': return <CheckCircle size={14} />;
      default: return <Wrench size={14} />;
    }
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
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f8fafc' }}>
                {event.event_type.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>
                {new Date(event.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>
              {event.metadata?.details || event.event_type}
            </p>

            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
               <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(169, 27, 24, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Shield size={10} color="var(--primary-color)" />
               </div>
               <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary-color)' }}>
                 {event.actor?.full_name || 'System Auto-Log'}
               </span>
               <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
