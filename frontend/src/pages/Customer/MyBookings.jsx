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
    if (user) {
      fetchBookings();
      fetchBusinessSettings();

      // Real-time listener for the customer's bookings
      const channel = supabase
        .channel(`my-bookings-live-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'bookings_v2', 
          filter: `customer_id=eq.${user.id}` 
        }, () => {
          fetchBookings();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchBusinessSettings = async () => {
    const { data } = await supabase.from('business_settings').select('cancellation_window_hours').maybeSingle();
    if (data) setCancelPolicy(data);
  };

  const fetchBookings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('bookings_v2')
      .select(`
        *,
        booking_services_v2 (
          price_at_booking,
          services_v2 (
            name
          )
        ),
        payments_v2 (*)
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setBookings(data);
    setLoading(false);
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'scheduled': return { label: 'SCHEDULED', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'completed': return { label: 'COMPLETED', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'cancelled': return { label: 'CANCELLED', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { label: status?.toUpperCase(), color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' };
    }
  };

  const getServiceStatusDisplay = (status, bookingStatus) => {
    if (bookingStatus === 'cancelled') return { label: 'CANCELLED', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    switch (status) {
      case 'NOT_STARTED': return { label: 'NOT STARTED', color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' };
      case 'IN_PROGRESS': return { label: 'IN PROGRESS', color: 'var(--admin-brand)', bg: 'rgba(169, 27, 24, 0.1)' };
      case 'FINISHED': return { label: 'FINISHED', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      default: return { label: status || 'PENDING', color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' };
    }
  };

  const getPaymentStatusDisplay = (status, bookingStatus) => {
    if (bookingStatus === 'cancelled') return { label: 'CANCELLED', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    switch (status) {
      case 'UNPAID': return { label: 'UNPAID', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'VERIFYING': return { label: 'VERIFYING', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'PARTIAL': return { label: 'PARTIAL', color: 'var(--admin-brand)', bg: 'rgba(169, 27, 24, 0.1)' };
      case 'PAID': return { label: 'PAID', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      default: return { label: status || 'UNKNOWN', color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' };
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
      toast.error("Ongoing or completed services cannot be cancelled. Please contact support.", {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }
    setConfirmModal({ show: true, bookingId: booking.id });
  };

  const processCancellation = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings_v2')
        .update({ status: 'cancelled' })
        .eq('id', confirmModal.bookingId)
        .eq('customer_id', user.id)
        .select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Update failed. You may not have permission to cancel this booking.');
      }
      
      const cancelledBooking = bookings.find(b => b.id === confirmModal.bookingId);
      
      // Update local state
      setBookings(prev => prev.map(b => b.id === confirmModal.bookingId ? { ...b, status: 'cancelled' } : b));
      
      // Notify Customer
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Booking Cancelled',
        message: `Your booking for ${new Date(cancelledBooking?.start_datetime).toLocaleDateString()} has been cancelled.`,
        type: 'warning',
        action_url: `/my-bookings/${cancelledBooking?.id}`
      });
      if (notifErr) console.error('Notification insert failed:', notifErr);

      // Fix #21: Notify Admins & Assigned Staff of customer cancellation
      try {
        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['ADMIN', 'SUPER_ADMIN']);
        const recipients = [...(admins || [])];
        
        // Add assigned staff to notifications
        if (cancelledBooking?.staff_id) {
          recipients.push({ id: cancelledBooking.staff_id });
        }

        if (recipients.length > 0) {
          await supabase.from('notifications').insert(
            recipients.map(r => ({
              user_id: r.id,
              title: 'Booking Cancelled by Customer 🛑',
              message: `A customer cancelled the booking for ${new Date(cancelledBooking?.start_datetime).toLocaleDateString()}.`,
              type: 'error',
              action_url: cancelledBooking?.staff_id === r.id ? '/staff/tasks' : `/admin/bookings/${cancelledBooking?.id}`
            }))
          );
        }
      } catch (adminErr) { console.error('Cancel notification failed:', adminErr); }

      // Send Cancellation Email
      if (user.email && cancelledBooking) {
        supabase.functions.invoke('send-email', {
          body: {
            type: 'booking_cancelled',
            to: user.email,
            data: { date: new Date(cancelledBooking.start_datetime).toLocaleDateString() }
          }
        });
      }

      const payments = cancelledBooking?.payments_v2 || [];
      const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);

      if (totalPaid > 0) {
        toast.success('Booking cancelled. Refund processing initiated.', {
          style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
        });
      } else {
        toast.success('Booking cancelled successfully.', {
          style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
        });
      }
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setConfirmModal({ show: false, bookingId: null });
    }
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  if (loading) return <div style={{ padding: '2rem' }}>Loading bookings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="BOOKING HISTORY"
        title="MY BOOKINGS"
        subtitle="Track and manage your scheduled detailing services."
        onRefresh={() => fetchBookings()}
      />

      <div style={{ 
        background: isMobile ? 'transparent' : 'var(--admin-card)', 
        borderRadius: '1rem', 
        border: isMobile ? 'none' : '1px solid var(--admin-border)', 
        overflow: 'hidden',
        boxShadow: isMobile ? 'none' : 'var(--admin-card-shadow)'
      }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>You have no bookings history.</div>
            ) : (
              bookings.map((booking) => {
                const status = getStatusDisplay(booking.status);
                const serviceStatus = getServiceStatusDisplay(booking.service_status, booking.status);
                const payments = booking.payments_v2 || [];
                const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
                const isVerifying = payments.some(p => p.status === 'FOR_VERIFICATION');
                const derivedPaymentStatus = totalPaid >= booking.total_price ? 'PAID' : (isVerifying ? 'VERIFYING' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID'));
                const paymentStatus = getPaymentStatusDisplay(derivedPaymentStatus, booking.status, totalPaid);

                return (
                  <div 
                    key={booking.id}
                    className="booking-card"
                    onClick={() => navigate(`/my-bookings/${booking.id}`)}
                    style={{ 
                      background: 'var(--admin-card)', 
                      borderRadius: '1.25rem', 
                      padding: '1.5rem', 
                      border: '1px solid var(--admin-border)',
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
                        <span style={{ padding: '0.3rem 0.75rem', background: serviceStatus.bg, color: serviceStatus.color, borderRadius: '2rem', fontSize: '0.6rem', fontWeight: '900', border: '1px solid var(--admin-border)' }}>
                          {serviceStatus.label}
                        </span>
                        <span style={{ padding: '0.3rem 0.75rem', background: status.bg, color: status.color, borderRadius: '2rem', fontSize: '0.6rem', fontWeight: '900', border: '1px solid var(--admin-border)' }}>
                          {status.label}
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--admin-text-primary)' }}>{new Date(booking.start_datetime).toLocaleDateString()}</div>
                        <div style={{ color: 'var(--admin-brand)', fontWeight: '800', fontSize: '0.75rem' }}>{new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total Amount</div>
                        <div style={{ fontWeight: '900', fontSize: '1.2rem', color: 'var(--admin-text-primary)' }}>₱{(booking.total_price || 0).toLocaleString()}</div>
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
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Date & Time</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Service Status</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>You have no bookings history.</td></tr>
              ) : (
                bookings.map((booking) => {
                  const status = getStatusDisplay(booking.status);
                  const serviceStatus = getServiceStatusDisplay(booking.service_status, booking.status);
                  const payments = booking.payments_v2 || [];
                  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
                  const isVerifying = payments.some(p => p.status === 'FOR_VERIFICATION');
                  const derivedPaymentStatus = totalPaid >= booking.total_price ? 'PAID' : (isVerifying ? 'VERIFYING' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID'));
                  const paymentStatus = getPaymentStatusDisplay(derivedPaymentStatus, booking.status);

                  return (
                    <tr key={booking.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ 
                          background: 'rgba(169, 27, 24, 0.1)', 
                          color: 'var(--admin-brand)', 
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
                          {new Date(booking.start_datetime).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '700' }}>
                          {new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          background: serviceStatus.bg, 
                          color: serviceStatus.color, 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          border: '1px solid var(--admin-border)'
                        }}>
                          <Clock size={12} /> {serviceStatus.label}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          background: paymentStatus.bg, 
                          color: paymentStatus.color, 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '2rem', 
                          fontSize: '0.7rem', 
                          fontWeight: '800',
                          border: `1px solid ${paymentStatus.color}40`
                        }}>
                          <Clock size={12} /> {paymentStatus.label}
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span style={{ fontWeight: '900', color: 'var(--text-primary)', fontSize: '1rem', letterSpacing: '-0.5px' }}>₱{(booking.total_price || 0).toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => navigate(`/my-bookings/${booking.id}`)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              background: 'var(--admin-bg)', 
                              border: '1px solid var(--admin-border)', 
                              color: 'var(--admin-text-primary)', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '0.5rem', 
                              fontSize: '0.8rem', 
                              fontWeight: '700', 
                              cursor: 'pointer'
                            }}
                          >
                            <ChevronRight size={14} /> View
                          </button>
                          
                          {/* Fix #20: Actually enforce cancellation window policy */}
                          {(booking.status === 'scheduled') && (
                            isWithinCancellationWindow(booking.start_datetime) ? (
                            <button 
                              onClick={() => handleCancelRequest(booking)}
                              style={{ 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: 'rgba(239, 68, 68, 0.05)', 
                                border: '1px solid rgba(239, 68, 68, 0.2)', 
                                color: '#ef4444', 
                                padding: '0.5rem 1rem', 
                                borderRadius: '0.5rem', 
                                fontSize: '0.8rem', 
                                fontWeight: '700', 
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                            ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '600', padding: '0.5rem', opacity: 0.6 }}>
                              Cancel window closed
                            </span>
                            )
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

      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <AlertTriangle size={36} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Confirm Cancellation?</h2>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6', opacity: 0.6 }}>
              {bookings.find(b => b.id === confirmModal.bookingId)?.payment_method === 'GCASH' 
                ? 'Your refund will be the total payment minus any material costs (e.g. Tint, Ceramic items) already purchased for your service. We will coordinate this in the Refund Hub.'
                : 'Are you sure you want to cancel this booking? This will release your time slot.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setConfirmModal({ show: false, bookingId: null })}
                style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
              >
                No, Keep it
              </button>
              <button 
                onClick={processCancellation}
                style={{ flex: 1, padding: '1rem', background: '#ef4444', border: 'none', color: '#FFFFFF', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        button, a {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .booking-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .booking-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          border-color: var(--primary-color) !important;
        }
        button:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
};

export default MyBookings;
