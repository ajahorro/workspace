import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Box, Car, FileText, Calendar, Clock, Banknote, AlertTriangle, Check, History, User } from 'lucide-react';
import toast from 'react-hot-toast';
import BookingAuditTrail from '../../components/BookingAuditTrail';
import BookingChat from '../../components/BookingChat';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/PageHeader';

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
    if (user) {
      fetchBooking();
      fetchBusinessSettings();
      fetchRefund();

      // Real-time listener for this specific booking
      const channel = supabase
        .channel(`booking-update-${id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'bookings_v2', 
          filter: `id=eq.${id}` 
        }, () => {
          fetchBooking();
          fetchRefund();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'payments_v2', 
          filter: `booking_id=eq.${id}` 
        }, () => {
          fetchBooking();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, user]);

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
    if (!user) {
      setLoading(false);
      return;
    }
    try {
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
          payments_v2 (*),
          assigned_staff:profiles!staff_id(full_name)
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

  const handleOCR = async (file) => {
    if (!file) return;
    setReuploading(true);
    setOcrError(null);
    setOcrProgress(0);

    try {
      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

      // 2. Perform OCR check (Basic confirmation)
      const worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
        }
      });
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const textUpper = text.toUpperCase();
      const isGCash = textUpper.includes('GCASH') || textUpper.includes('REF NO') || textUpper.includes('SUCCESS');

      if (!isGCash) {
        setOcrError("This doesn't look like a valid GCash receipt. Please ensure the screenshot is clear.");
        // We still allow it but warn them? No, let's be strict for "premium" feel.
        return;
      }

      // 3. Record Payment
      const { error: payErr } = await supabase.rpc('record_payment_v2', {
        p_booking_id: id,
        p_amount: booking.total_price - totalPaid, // Pay remaining balance
        p_method: 'GCASH',
        p_receipt_url: publicUrl
      });

      if (payErr) throw payErr;

      toast.success('Receipt uploaded! Awaiting verification.');
      fetchBooking();
    } catch (err) {
      console.error('OCR/Upload Error:', err);
      setOcrError(err.message || 'Failed to process receipt.');
    } finally {
      setReuploading(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  if (loading) return <div style={{ padding: '2rem' }}>Loading details...</div>;
  if (!booking) return <div style={{ padding: '2rem' }}>Booking not found.</div>;

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'scheduled': return { label: 'Scheduled', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'in_progress': return { label: 'In Progress', color: 'var(--admin-brand)', bg: 'rgba(169, 27, 24, 0.1)' };
      case 'completed': return { label: 'COMPLETED', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'cancelled': return { label: 'CANCELLED', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { label: status, color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' };
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

  const getPaymentStatusDisplay = (status, bookingStatus, paidAmount = 0) => {
    // Fix #11: Show REFUND REQUIRED when booking is cancelled but customer had paid
    if (bookingStatus === 'cancelled') {
      if (paidAmount > 0) return { label: 'REFUND REQUIRED', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      return { label: 'CANCELLED (UNPAID)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    }
    switch (status) {
      case 'UNPAID': return { label: 'UNPAID', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'VERIFYING': return { label: 'VERIFYING', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'PARTIAL': return { label: 'PARTIAL', color: 'var(--admin-brand)', bg: 'rgba(169, 27, 24, 0.1)' };
      case 'PAID': return { label: 'PAID', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      default: return { label: status || 'UNKNOWN', color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' };
    }
  };

  const status = getStatusDisplay(booking.status);
  const serviceStatus = getServiceStatusDisplay(booking.service_status, booking.status);
  
  const payments = booking.payments_v2 || [];
  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
  const isVerifying = payments.some(p => p.status === 'FOR_VERIFICATION');
  const derivedPaymentStatus = totalPaid >= booking.total_price ? 'PAID' : (isVerifying ? 'VERIFYING' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID'));
  const paymentStatus = getPaymentStatusDisplay(derivedPaymentStatus, booking.status, totalPaid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: isMobile ? '5rem' : '0' }}>
      <PageHeader 
        showBack
        onBack={() => navigate(-1)}
        badge="BOOKING RECORD"
        title="Details"
        subtitle={`Summary for #${booking.id.slice(0, 8).toUpperCase()}`}
        onRefresh={() => fetchBooking()}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
          <span style={{ padding: '0.45rem 1rem', background: status.bg, color: status.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', border: `1px solid ${status.color}33` }}>
            <span style={{ opacity: 0.7, fontWeight: '700' }}>BOOKING:</span>
            <Clock size={12} /> {status.label.toUpperCase()}
          </span>
          <span style={{ padding: '0.45rem 1rem', background: serviceStatus.bg, color: serviceStatus.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '800', border: `1px solid ${serviceStatus.color}33`, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ opacity: 0.7, fontWeight: '700' }}>SERVICE:</span>
            {serviceStatus.label.toUpperCase()}
          </span>
          <span style={{ padding: '0.45rem 1rem', background: paymentStatus.bg, color: paymentStatus.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '800', border: `1px solid ${paymentStatus.color}33`, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ opacity: 0.7, fontWeight: '700' }}>PAYMENT:</span>
            {paymentStatus.label.toUpperCase()}
          </span>
        </div>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Service Details */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.25rem' : '1.5rem', boxShadow: 'var(--admin-card-shadow)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>
              <Box size={18} color="var(--admin-brand)" /> Service Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {booking.booking_services_v2?.map((bs, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--admin-border)' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{bs.services_v2?.name}</h3>
                    <span style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '800' }}>SERVICE</span>
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--admin-text-primary)' }}>₱{(bs.price_at_booking || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--admin-text-secondary)' }}>Total Amount</span>
              <span style={{ fontWeight: '900', fontSize: '1.4rem', color: 'var(--admin-text-primary)' }}>₱{(booking.total_price || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Vehicle Information */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.25rem' : '1.5rem', boxShadow: 'var(--admin-card-shadow)' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>
              <Car size={18} color="var(--admin-brand)" /> Vehicle Info
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>TYPE</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{booking.vehicle_type || 'Sedan'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>PLATE</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{booking.plate_number}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>BRAND</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{booking.vehicle_brand || '---'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-secondary)', marginBottom: '0.2rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase' }}>MODEL</span>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>{booking.vehicle_model || '---'}</span>
              </div>
            </div>
          </div>

          {/* Booking Notes */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.25rem' : '1.5rem', boxShadow: 'var(--admin-card-shadow)' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>
              <FileText size={18} color="var(--admin-brand)" /> Notes
            </h2>
            <div style={{ background: 'var(--admin-bg)', padding: '1rem', borderRadius: '0.75rem', color: booking.customer_notes ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', border: '1px solid var(--admin-border)' }}>
              {booking.customer_notes || 'No special instructions provided for this booking.'}
            </div>
          </div>

          {/* Activity Trail (Desktop Only or simplified on mobile) */}
          {booking.assigned_staff && (
            <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '1.25rem', boxShadow: 'var(--admin-card-shadow)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <User size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', opacity: 0.6 }}>Assigned Technician</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{booking.assigned_staff.full_name}</div>
              </div>
            </div>
          )}

          {!isMobile && (
            <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '1.5rem', boxShadow: 'var(--admin-card-shadow)', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--admin-text-primary)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(var(--admin-brand-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={18} color="var(--admin-brand)" />
                </div>
                Activity Trail
              </h2>
              <div style={{ padding: '0.5rem 0' }}>
                <BookingAuditTrail bookingId={id} />
              </div>
            </div>
          )}

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Appointment */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '1.25rem', boxShadow: 'var(--admin-card-shadow)' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>
              <Calendar size={18} color="var(--admin-brand)" /> Appointment
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--admin-brand)', lineHeight: '1' }}>
                 {new Date(booking.start_datetime).getDate()}
               </span>
               <div>
                 <span style={{ display: 'block', fontWeight: '800', fontSize: '0.9rem', color: 'var(--admin-text-primary)' }}>
                   {new Date(booking.start_datetime).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginTop: '0.2rem', fontWeight: '700' }}>
                   <Clock size={12} /> {new Date(booking.start_datetime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                 </span>
               </div>
            </div>
          </div>

          {/* Payment Section - Replicated from Admin for Professional Look */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '1.25rem', boxShadow: 'var(--admin-card-shadow)' }}>
             <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>
              <Banknote size={18} color="var(--admin-brand)" /> Payment & Balance
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--admin-text-secondary)' }}>Grand Total</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{(booking.total_price || 0).toLocaleString()}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--admin-text-secondary)' }}>Total Paid</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>₱{totalPaid.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>Balance Due</span>
                <div style={{ 
                  padding: '0.3rem 0.6rem', 
                  borderRadius: '0.4rem', 
                  background: (booking.total_price - totalPaid) === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: (booking.total_price - totalPaid) === 0 ? '#10b981' : '#f59e0b',
                  fontSize: '0.75rem',
                  fontWeight: '900'
                }}>
                  ₱{(booking.total_price - totalPaid).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Mini Transaction History */}
            {payments.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--admin-border)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', opacity: 0.5 }}>Transaction History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {payments.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--admin-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{p.method}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: '900', color: p.status === 'PAID' ? '#10b981' : '#f59e0b', background: p.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '0.2rem' }}>{p.status}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>₱{Number(p.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Receipt Upload Section */}
          {booking.payment_method === 'GCASH' && derivedPaymentStatus !== 'PAID' && (
            <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '1.25rem', boxShadow: 'var(--admin-card-shadow)', marginTop: '1rem' }}>
               <h2 style={{ fontSize: '0.85rem', fontWeight: '800', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-brand)' }}>
                <Check size={16} /> Upload Receipt
              </h2>
              <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', marginBottom: '1rem', opacity: 0.7 }}>
                Send the balance (₱{(booking.total_price - totalPaid).toLocaleString()}) to GCash and upload the receipt here.
              </p>
              
              <div style={{ background: 'var(--admin-bg)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem' }}>GCASH NUMBER</div>
                <div style={{ fontWeight: '900', color: 'var(--admin-text-primary)', fontSize: '1.1rem' }}>0917 123 4567</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', opacity: 0.5 }}>Account: RENEW DETAILING</div>
              </div>

              <label style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '1.5rem', 
                border: '2px dashed var(--admin-border)', 
                borderRadius: '0.75rem', 
                cursor: reuploading ? 'not-allowed' : 'pointer',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <Banknote size={24} color={reuploading ? 'var(--admin-text-secondary)' : 'var(--admin-brand)'} />
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>
                  {reuploading ? `Processing... ${ocrProgress}%` : 'SELECT RECEIPT IMAGE'}
                </span>
                <input type="file" hidden accept="image/*" disabled={reuploading} onChange={(e) => handleOCR(e.target.files[0])} />
              </label>
              
              {ocrError && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.4rem', fontSize: '0.65rem', color: '#ef4444', fontWeight: '700', textAlign: 'center' }}>
                  {ocrError}
                </div>
              )}
            </div>
          )}

          {/* Cancel Button - Only visible if not ongoing/finished */}
          {(booking.status === 'scheduled' && booking.service_status !== 'IN_PROGRESS' && booking.service_status !== 'FINISHED') && (
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
              <AlertTriangle size={16} /> Cancel Booking
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
        <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '1.25rem', marginTop: '1.5rem', boxShadow: 'var(--admin-card-shadow)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>
            <History size={18} color="var(--admin-brand)" /> Activity Trail
          </h2>
          <BookingAuditTrail bookingId={id} />
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: isMobile ? '1rem' : '0' }}>
          <div style={{ background: 'var(--admin-card)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: 'var(--admin-card-shadow)' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.75rem 0', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Confirm?</h2>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.6', opacity: 0.6 }}>
              {booking.payment_method === 'GCASH' 
                ? 'Your refund will be the total payment minus any material costs already purchased. We will coordinate this in the Refund Hub.'
                : 'Are you sure you want to cancel this booking? This will release your time slot.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowCancelModal(false)}
                style={{ flex: 1, padding: '0.85rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '700' }}
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
                      .from('bookings_v2')
                      .update({ status: 'cancelled' })
                      .eq('id', id)
                      .eq('customer_id', user.id)
                      .select();
                    
                    if (error) throw error;
                    if (!data || data.length === 0) throw new Error('Update failed.');
                // Notify customer via DB
      if (booking.customer_id) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: `Booking CANCELLED 🔄`,
          message: `Your booking status has been updated to cancelled.`,
          type: 'error',
          action_url: `/my-bookings/${id}`
        });
      }
               // Fix: Notify Admins & Staff of cancellation
                    try {
                      const { data: admins } = await supabase.from('profiles').select('id').in('role', ['ADMIN', 'SUPER_ADMIN']);
                      const recipients = [...(admins || [])];
                      if (booking?.staff_id) recipients.push({ id: booking.staff_id });

                      if (recipients.length > 0) {
                        await supabase.from('notifications').insert(
                          recipients.map(r => ({
                            user_id: r.id,
                            title: 'Booking Cancelled by Customer 🛑',
                            message: `The booking for ${new Date(booking.start_datetime).toLocaleDateString()} has been cancelled.`,
                            type: 'error',
                            action_url: booking?.staff_id === r.id ? '/staff/tasks' : `/admin/bookings/${id}`
                          }))
                        );
                      }
                    } catch (notifErr) { console.error(notifErr); }

                    supabase.functions.invoke('send-email', {
                      body: { type: 'booking_cancelled', to: user.email, data: { date: new Date(booking.start_datetime).toLocaleDateString() } }
                    }).catch(() => {});

                    setBooking({ ...booking, status: 'cancelled' });
                    toast.success('Booking cancelled successfully', {
                      style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
                    });
                    setShowCancelModal(false);
                  } catch (err) {
                    toast.error('Failed to cancel.', {
                      style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
                    });
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                disabled={isCancelling}
                style={{ flex: 1, padding: '0.85rem', background: '#ef4444', border: 'none', color: '#FFFFFF', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '800' }}
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
