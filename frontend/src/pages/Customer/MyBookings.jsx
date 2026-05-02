import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Box, Car, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ show: false, bookingId: null });
  const [cancelPolicy, setCancelPolicy] = useState(null);

  useEffect(() => {
    fetchBookings();
    fetchBusinessSettings();
  }, [user]);

  const fetchBusinessSettings = async () => {
    const { data } = await supabase.from('business_settings').select('cancellation_window_hours').maybeSingle();
    if (data) setCancelPolicy(data);
  };

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

  const isWithinCancellationWindow = (scheduledStart) => {
    const windowHours = cancelPolicy?.cancellation_window_hours || 24;
    const now = new Date();
    const start = new Date(scheduledStart);
    const diffMs = start - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= windowHours;
  };

  const handleCancelRequest = (booking) => {
    if (booking.service_status === 'IN_PROGRESS' || booking.service_status === 'FINISHED') {
      toast.error("Ongoing or completed services cannot be cancelled. Please contact support.");
      return;
    }
    setConfirmModal({ show: true, bookingId: booking.id });
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
      
      const activeBooking = data[0];
      setBookings(prev => prev.map(b => b.id === confirmModal.bookingId ? { ...b, booking_status: 'CANCELLED' } : b));
      
      // Notify Customer
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Booking Cancelled',
        message: `Your booking for ${new Date(activeBooking.scheduled_start).toLocaleDateString()} has been cancelled.`,
        type: 'warning',
        action_url: `/my-bookings/${activeBooking.id}`
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

  const isMobile = useMediaQuery('(max-width: 1024px)');

  if (loading) return <div style={{ padding: '2rem' }}>Loading bookings...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0' : '0 1rem' }}>
      <PageHeader 
        badge="BOOKING HISTORY"
        title="MY BOOKINGS"
        subtitle="Track and manage your scheduled detailing services."
        onRefresh={() => fetchBookings()}
      />

      <div style={{ 
        background: isMobile ? 'transparent' : 'var(--bg-secondary)', 
        borderRadius: '1rem', 
        border: isMobile ? 'none' : '1px solid var(--border-color)', 
        overflow: 'hidden' 
      }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>You have no bookings history.</div>
            ) : (
              bookings.map((booking) => {
                const status = getStatusDisplay(booking.booking_status);
                const serviceStatus = getServiceStatusDisplay(booking.service_status);
                const intent = booking.payment_intents?.[0] || {};
                const paymentStatus = getPaymentStatusDisplay(intent.status);

                return (
                  <div 
                    key={booking.id}
                    onClick={() => navigate(`/my-bookings/${booking.id}`)}
                    style={{ 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '1.25rem', 
                      padding: '1.5rem', 
                      border: '1px solid rgba(255,255,255,0.03)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ 
                          background: 'rgba(169, 27, 24, 0.1)', 
                        color: 'var(--primary-color)', 
                        padding: '0.4rem 0.8rem', 
                        borderRadius: '0.4rem', 
                        fontWeight: '800', 
                        fontSize: '0.65rem',
                        letterSpacing: '0.5px'
                      }}>
                        #{booking.id.substring(0, 4).toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ padding: '0.3rem 0.75rem', background: serviceStatus.bg, color: serviceStatus.color, borderRadius: '2rem', fontSize: '0.6rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {serviceStatus.label}
                        </span>
                        <span style={{ padding: '0.3rem 0.75rem', background: paymentStatus.bg, color: paymentStatus.color, borderRadius: '2rem', fontSize: '0.6rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {paymentStatus.label}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                       <div style={{ background: 'rgba(169, 27, 24, 0.1)', width: '48px', height: '48px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Car size={24} color="var(--primary-color)" />
                       </div>
                       <div>
                         <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{booking.vehicle_type || 'Sedan'}</h4>
                         <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{booking.plate_number}</p>
                       </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{new Date(booking.scheduled_start).toLocaleDateString()}</div>
                        <div style={{ color: 'var(--primary-color)', fontWeight: '800', fontSize: '0.75rem' }}>{new Date(booking.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total Amount</div>
                        <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#fff' }}>₱{(intent.total_amount || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Date & Time</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Service Status</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>You have no bookings history.</td></tr>
              ) : (
                bookings.map((booking) => {
                  const status = getStatusDisplay(booking.booking_status);
                  const serviceStatus = getServiceStatusDisplay(booking.service_status);
                  const intent = booking.payment_intents?.[0] || {};
                  const paymentStatus = getPaymentStatusDisplay(intent.status);

                  return (
                    <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ 
                            background: 'rgba(169, 27, 24, 0.1)', 
                          color: 'var(--primary-color)', 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '0.4rem', 
                          fontWeight: '800', 
                          fontSize: '0.75rem',
                          letterSpacing: '0.5px'
                        }}>
                          #{booking.id.substring(0, 4).toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{booking.vehicle_type || 'Sedan'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{booking.plate_number}</div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {new Date(booking.scheduled_start).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '700' }}>
                          {new Date(booking.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          color: '#f8fafc', 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <Clock size={12} /> {serviceStatus.label}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          background: paymentStatus.label === 'UNPAID' ? '#f59e0b' : `${paymentStatus.color}20`, 
                          color: paymentStatus.label === 'UNPAID' ? '#000' : paymentStatus.color, 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          border: paymentStatus.label === 'UNPAID' ? 'none' : `1px solid ${paymentStatus.color}40`
                        }}>
                          <Clock size={12} /> {paymentStatus.label}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ fontWeight: '900', color: 'var(--text-primary)', fontSize: '1rem', letterSpacing: '-0.5px' }}>₱{(intent.total_amount || 0).toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => navigate(`/my-bookings/${booking.id}`)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              background: 'rgba(255, 255, 255, 0.05)', 
                              border: '1px solid rgba(255, 255, 255, 0.1)', 
                              color: '#f8fafc', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '0.5rem', 
                              fontSize: '0.8rem', 
                              fontWeight: '700', 
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                          >
                            <ChevronRight size={14} /> View
                          </button>
                          
                          {(booking.booking_status === 'PENDING_ASSIGNMENT' || booking.booking_status === 'CONFIRMED') && (
                            <button 
                              onClick={() => handleCancelRequest(booking)}
                              style={{ 
                                background: 'transparent', 
                                border: '1px solid rgba(239, 68, 68, 0.3)', 
                                color: 'var(--danger-color)', 
                                padding: '0.5rem', 
                                borderRadius: '0.5rem', 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              title="Cancel Booking"
                            >
                              <AlertTriangle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              {bookings.find(b => b.id === confirmModal.bookingId)?.payment_intents?.[0]?.method === 'GCASH' 
                ? 'Your refund will be the total payment minus any material costs (e.g. Tint, Ceramic items) already purchased for your service. We will coordinate this in the Refund Hub.'
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
