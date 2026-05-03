import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Box, Car, FileText, Calendar, Clock, Banknote, AlertTriangle, Check, History } from 'lucide-react';
import toast from 'react-hot-toast';
import BookingAuditTrail from '../../components/BookingAuditTrail';
import BookingChat from '../../components/BookingChat';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reuploading, setReuploading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelPolicy, setCancelPolicy] = useState(null);
  const [refund, setRefund] = useState(null);
  const [newChatMsg, setNewChatMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    fetchBooking();
    fetchBusinessSettings();
    fetchRefund();
  }, [id]);

  const fetchBusinessSettings = async () => {
    const { data } = await supabase.from('business_settings').select('*').maybeSingle();
    if (data) setCancelPolicy(data);
  };

  const fetchRefund = async () => {
    const { data } = await supabase
      .from('refunds')
      .select('*')
      .eq('booking_id', id)
      .maybeSingle();
    if (data) setRefund(data);
  };

  const fetchBooking = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_services (
            service_name,
            service_price,
            service_duration
          ),
          payment_intents (
            status,
            total_amount,
            amount_paid,
            method
          )
        `)
        .eq('id', id)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setBooking(data);
    } catch (err) {
      console.error('Error fetching booking:', err);
      toast.error('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  if (loading) return <div style={{ padding: '2rem' }}>Loading details...</div>;
  if (!booking) return <div style={{ padding: '2rem' }}>Booking not found.</div>;

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT': return { label: 'Pending', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
      case 'CONFIRMED': return { label: 'Confirmed', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
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
      case 'INITIATED': return { label: 'UNPAID', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
      case 'FOR_VERIFICATION': return { label: 'FOR VERIFICATION', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
      case 'PARTIALLY_PAID': return { label: 'PARTIAL', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.1)' };
      case 'PAID': return { label: 'PAID', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      case 'VERIFIED': return { label: 'VERIFIED', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      default: return { label: status || 'UNKNOWN', color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  const status = getStatusDisplay(booking.booking_status);
  const serviceStatus = getServiceStatusDisplay(booking.service_status);
  
  const intent = booking.payment_intents?.[0] || {};
  const paymentStatus = getPaymentStatusDisplay(intent.status);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: isMobile ? '5rem' : '0' }}>
      <button 
        onClick={() => navigate('/my-bookings')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to Bookings
      </button>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '2rem', gap: '1rem' }}>
        <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '800', margin: 0 }}>Booking Details</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
          <span style={{ padding: '0.4rem 1rem', background: status.bg, color: status.color, borderRadius: '5rem', fontSize: '0.65rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.35rem', border: `1px solid ${status.color}33` }}>
            <Clock size={12} /> {status.label.toUpperCase()}
          </span>
          <span style={{ padding: '0.4rem 1rem', background: serviceStatus.bg, color: serviceStatus.color, borderRadius: '5rem', fontSize: '0.65rem', fontWeight: '800', border: `1px solid ${serviceStatus.color}33` }}>
            {serviceStatus.label.toUpperCase()}
          </span>
          <span style={{ padding: '0.4rem 1rem', background: paymentStatus.bg, color: paymentStatus.color, borderRadius: '5rem', fontSize: '0.65rem', fontWeight: '800', border: `1px solid ${paymentStatus.color}33` }}>
            {paymentStatus.label.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '1rem' : '2rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Service Details */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: isMobile ? '1.25rem' : '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>
              <Box size={18} color="var(--primary-color)" /> Service Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {booking.booking_services.map(bs => (
                <div key={bs.service_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '0.95rem', fontWeight: '700' }}>{bs.service_name}</h3>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '800' }}>SERVICE</span>
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '1rem' }}>₱{bs.service_price.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Total Amount</span>
              <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#fff' }}>₱{(intent.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Vehicle Information */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: isMobile ? '1.25rem' : '1.5rem' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>
              <Car size={18} color="var(--primary-color)" /> Vehicle Info
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>TYPE</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{booking.vehicle_type || 'Sedan'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>PLATE</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{booking.plate_number}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>BRAND</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{booking.vehicle_brand || '---'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>MODEL</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{booking.vehicle_model || '---'}</span>
              </div>
            </div>
          </div>

          {/* Booking Notes */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: isMobile ? '1.25rem' : '1.5rem' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>
              <FileText size={18} color="var(--primary-color)" /> Notes
            </h2>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.75rem', color: booking.customer_notes ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              {booking.customer_notes || 'No special instructions provided for this booking.'}
            </div>
          </div>

          {/* Activity Trail (Desktop Only or simplified on mobile) */}
          {!isMobile && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} color="var(--primary-color)" /> Activity Trail
              </h2>
              <BookingAuditTrail bookingId={id} />
            </div>
          )}

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Appointment */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>
              <Calendar size={18} color="var(--primary-color)" /> Appointment
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary-color)', lineHeight: '1' }}>
                 {new Date(booking.scheduled_start).getDate()}
               </span>
               <div>
                 <span style={{ display: 'block', fontWeight: '800', fontSize: '0.9rem' }}>
                   {new Date(booking.scheduled_start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: '700' }}>
                   <Clock size={12} /> {new Date(booking.scheduled_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                 </span>
               </div>
            </div>
          </div>

          {/* Payment Status */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>
              <Banknote size={18} color="var(--primary-color)" /> Payment
            </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Method</span>
                  <span style={{ fontWeight: '800' }}>{intent.method || '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Paid</span>
                  <span style={{ fontWeight: '800', color: 'var(--accent-green)' }}>₱{(intent.amount_paid || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Balance</span>
                  <span style={{ fontWeight: '800', color: 'var(--danger-color)' }}>₱{((intent.total_amount || 0) - (intent.amount_paid || 0)).toLocaleString()}</span>
                </div>

                {intent.method === 'GCASH' && intent.receipt_url && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '800' }}>UPLOADED RECEIPT</span>
                    <div 
                      onClick={() => window.open(intent.receipt_url, '_blank')}
                      style={{ width: '100%', height: '120px', background: '#000', borderRadius: '0.5rem', overflow: 'hidden', cursor: 'pointer' }}
                    >
                      <img src={intent.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
              </div>
          </div>

          {/* Cancel Button */}
          {(booking.booking_status === 'PENDING_ASSIGNMENT' || booking.booking_status === 'CONFIRMED') && (
            <button 
              onClick={() => setShowCancelModal(true)}
              style={{ 
                width: '100%', 
                padding: '1rem', 
                background: 'rgba(239, 68, 68, 0.04)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: 'var(--danger-color)', 
                borderRadius: '0.75rem', 
                cursor: 'pointer', 
                fontWeight: '800', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontSize: '0.75rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)'}
            >
              <AlertTriangle size={16} /> {intent.method === 'GCASH' ? 'Cancel & Refund' : 'Cancel Booking'}
            </button>
          )}

          {/* Unified Booking Chat */}
          <div style={{ marginTop: '1rem' }}>
            <BookingChat bookingId={id} />
          </div>
        </div>
      </div>

      {/* Audit Trail on Mobile at the bottom */}
      {isMobile && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.25rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}>
            <History size={18} color="var(--primary-color)" /> Activity Trail
          </h2>
          <BookingAuditTrail bookingId={id} />
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: isMobile ? '1rem' : '0' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <AlertTriangle size={48} color="var(--danger-color)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.75rem 0', fontWeight: '900' }}>Confirm?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {intent.method === 'GCASH' 
                ? 'Your refund will be the total payment minus any material costs already purchased. We will coordinate this in the Refund Hub.'
                : 'Are you sure you want to cancel this booking? This will release your time slot.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowCancelModal(false)}
                style={{ flex: 1, padding: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '700' }}
              >
                Back
              </button>
              <button 
                onClick={async () => {
                  if (booking.service_status === 'IN_PROGRESS' || booking.service_status === 'FINISHED') {
                    toast.error("Cannot cancel ongoing service.");
                    setShowCancelModal(false);
                    return;
                  }

                  setIsCancelling(true);
                  try {
                    const { data, error } = await supabase
                      .from('bookings')
                      .update({ booking_status: 'CANCELLED' })
                      .eq('id', id)
                      .eq('customer_id', user.id)
                      .select();
                    
                    if (error) throw error;
                    if (!data || data.length === 0) throw new Error('Update failed.');
                    
                    await supabase.from('notifications').insert({
                      user_id: user.id,
                      title: 'Booking Cancelled',
                      message: `Your booking for ${new Date(booking.scheduled_start).toLocaleDateString()} has been cancelled.`,
                      type: 'warning',
                      action_url: `/my-bookings/${id}`
                    });

                    supabase.functions.invoke('send-email', {
                      body: { type: 'booking_cancelled', to: user.email, data: { date: new Date(booking.scheduled_start).toLocaleDateString() } }
                    }).catch(() => {});

                    setBooking({ ...booking, booking_status: 'CANCELLED' });
                    toast.success('Cancelled successfully.');
                    setShowCancelModal(false);
                  } catch (err) {
                    toast.error('Failed to cancel.');
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                disabled={isCancelling}
                style={{ flex: 1, padding: '0.85rem', background: 'var(--danger-color)', border: 'none', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '800' }}
              >
                {isCancelling ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetails;
