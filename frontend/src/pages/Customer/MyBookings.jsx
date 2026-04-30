import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Box, Car, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ show: false, bookingId: null });

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (
          service_name,
          service_price
        ),
        payment_intents (
          status,
          total_amount,
          amount_paid,
          method
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setBookings(data);
    setLoading(false);
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT': return { label: 'SCHEDULED', color: 'orange', bg: 'rgba(255, 165, 0, 0.1)' };
      case 'CONFIRMED': return { label: 'SCHEDULED', color: 'orange', bg: 'rgba(255, 165, 0, 0.1)' };
      case 'COMPLETED': return { label: 'COMPLETED', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      case 'CLOSED': return { label: 'CLOSED', color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
      case 'CANCELLED': return { label: 'CANCELLED', color: 'var(--danger-color)', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { label: status, color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  const getServiceStatusDisplay = (status) => {
    switch (status) {
      case 'NOT_STARTED': return { label: 'NOT STARTED', color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
      case 'IN_PROGRESS': return { label: 'IN PROGRESS', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.1)' };
      case 'FINISHED': return { label: 'FINISHED', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      default: return { label: status, color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  const getPaymentStatusDisplay = (status) => {
    switch (status) {
      case 'INITIATED': return { label: 'UNPAID', color: 'orange', bg: 'rgba(255, 165, 0, 0.1)' };
      case 'FOR_VERIFICATION': return { label: 'FOR VERIFICATION', color: 'orange', bg: 'rgba(255, 165, 0, 0.1)' };
      case 'PARTIALLY_PAID': return { label: 'PARTIAL', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.1)' };
      case 'PAID': return { label: 'PAID', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      case 'VERIFIED': return { label: 'VERIFIED', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      default: return { label: status || 'UNKNOWN', color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  const handleCancelRequest = (id) => {
    setConfirmModal({ show: true, bookingId: id });
  };

  const processCancellation = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ booking_status: 'CANCELLED' })
        .eq('id', confirmModal.bookingId)
        .eq('customer_id', user.id)
        .select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Update failed. You may not have permission to cancel this booking.');
      }
      
      setBookings(prev => prev.map(b => b.id === confirmModal.bookingId ? { ...b, booking_status: 'CANCELLED' } : b));
      
      // Notify Customer
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Booking Cancelled',
        message: 'Your booking has been successfully cancelled. If you paid via GCash, your refund is now being processed.',
        type: 'warning'
      });
      if (notifError) console.error('Notification insert failed:', notifError);

      // Send Cancellation Email via Edge Function
      const cancelledBooking = bookings.find(b => b.id === confirmModal.bookingId);
      supabase.functions.invoke('send-email', {
        body: {
          type: 'booking_cancelled',
          to: user.email,
          data: {
            date: new Date(cancelledBooking?.scheduled_start).toLocaleDateString()
          }
        }
      }).catch(err => console.error('Email trigger failed:', err));

      toast.success('Booking cancelled. Refund processing initiated.');
    } catch (err) {
      console.error('Cancellation Error:', err);
      toast.error(err.message || 'Failed to cancel booking.');
    } finally {
      setConfirmModal({ show: false, bookingId: null });
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading bookings...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 2rem 0' }}>My Bookings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {bookings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '1rem', color: 'var(--text-secondary)' }}>
            You have no bookings history.
          </div>
        ) : (
          bookings.map((booking) => {
            const status = getStatusDisplay(booking.booking_status);
            const serviceStatus = getServiceStatusDisplay(booking.service_status);
            
            // Handle multiple payment intents (though usually there is only one)
            const intent = booking.payment_intents?.[0] || {};
            const paymentStatus = getPaymentStatusDisplay(intent.status);

            const servicesList = booking.booking_services.map(bs => bs.service_name).join(', ');

            return (
              <div key={booking.id} style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', fontSize: '1rem', fontWeight: '700' }}>
                      #{booking.id.substring(0, 4)}
                    </h2>
                    <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                      {new Date(booking.scheduled_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ padding: '0.25rem 0.75rem', background: status.bg, color: status.color, borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {status.label}
                    </span>
                    <span style={{ padding: '0.25rem 0.75rem', background: serviceStatus.bg, color: serviceStatus.color, borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700' }}>
                      {serviceStatus.label}
                    </span>
                    <span style={{ padding: '0.25rem 0.75rem', background: paymentStatus.bg, color: paymentStatus.color, borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '700' }}>
                      {paymentStatus.label}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Box size={18} style={{ marginTop: '0.1rem' }} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{servicesList}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                      <Car size={18} />
                      <span>{booking.vehicle_type || 'Sedan'} - {booking.plate_number}</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>TOTAL AMOUNT</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>₱{intent.total_amount || 0}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px' }}>PAID</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-green)' }}>₱{intent.amount_paid || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  {(booking.booking_status === 'PENDING_ASSIGNMENT' || booking.booking_status === 'CONFIRMED') && (
                    <button 
                      onClick={() => handleCancelRequest(booking.id)}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        background: 'rgba(239, 68, 68, 0.05)', 
                        border: '1px solid var(--danger-color)', 
                        color: 'var(--danger-color)', 
                        borderRadius: '0.25rem', 
                        cursor: 'pointer', 
                        fontWeight: '700', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      <AlertTriangle size={14} /> {intent.method === 'GCASH' ? 'Cancel and Get Refund' : 'Cancel Booking'}
                    </button>
                  )}

                  {booking.booking_status === 'CANCELLED' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                      <Clock size={14} /> {intent.method === 'GCASH' ? 'Cancelled & Awaiting Refund' : 'Cancelled'}
                    </span>
                  )}
                  <button onClick={() => navigate(`/my-bookings/${booking.id}`)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    View Details <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Premium Confirmation Modal */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <AlertTriangle size={36} color="var(--danger-color)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', fontWeight: '800' }}>Confirm Cancellation?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              {bookings.find(b => b.id === confirmModal.bookingId)?.payment_intents?.[0]?.method === 'GCASH' 
                ? 'Are you sure you want to cancel and get a refund? This will release your time slot and notify our team.'
                : 'Are you sure you want to cancel this booking? This will release your time slot.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setConfirmModal({ show: false, bookingId: null })}
                style={{ flex: 1, padding: '1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
              >
                No, Keep it
              </button>
              <button 
                onClick={processCancellation}
                style={{ flex: 1, padding: '1rem', background: 'var(--danger-color)', border: 'none', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
