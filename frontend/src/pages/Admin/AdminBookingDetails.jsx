import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, Clock, CreditCard, User, Car, ClipboardList,
  History, CheckCircle, XCircle, AlertCircle, MessageCircle,
  Hash, Calendar, Phone, Shield, Activity, Play, CheckCircle2,
  Package, Truck, Trash2, Banknote, Loader2, Eye, ArrowRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import BookingAuditTrail from '../../components/BookingAuditTrail';
import BookingChat from '../../components/BookingChat';
import { sendStaffAssignmentNotification, sendStatusUpdateNotification } from '../../services/EmailService';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';

const AdminBookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [bookingPayments, setBookingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalType, setModalType] = useState(null); // 'approve' or 'reject'
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    fetchBookingDetails();
    fetchStaffList();
    fetchAuditLogs();
    fetchPayments();

    // Fix #23: Real-time listener — Admin sees live updates from Staff actions
    const channel = supabase
      .channel(`admin-booking-detail-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings_v2',
        filter: `id=eq.${id}`
      }, () => {
        fetchBookingDetails();
        fetchAuditLogs();
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleVerifyPayment = async (p) => {
    try {
      const { data: { user: verifier } } = await supabase.auth.getUser();
      
      // Direct update — no RPC needed
      const { error } = await supabase
        .from('payments_v2')
        .update({ 
          status: 'PAID', 
          verified_by: verifier?.id, 
          verified_at: new Date().toISOString() 
        })
        .eq('id', p.id);

      if (error) throw error;
      
      toast.success('Payment Approved — amount recorded!');
      fetchPayments();
      fetchAuditLogs();
      fetchBookingDetails();

      // Notify customer
      if (booking.customer_id) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: 'Payment Verified! 💸',
          message: `Your payment of ₱${p.amount?.toLocaleString()} has been verified and recorded successfully.`,
          type: 'success',
          action_url: `/my-bookings/${id}`
        });
      }
    } catch (err) {
      console.error('Approve error:', err);
      toast.error(err.message || 'Verification failed');
    }
  };

  const handleRejectPayment = async (p) => {
    try {
      // Reset to UNPAID so customer can re-upload
      const { error } = await supabase
        .from('payments_v2')
        .update({ status: 'UNPAID', receipt_url: null, ocr_text: null })
        .eq('id', p.id);

      if (error) throw error;

      toast.success('Receipt rejected — customer will be notified.');
      fetchPayments();
      fetchBookingDetails();
      fetchAuditLogs();

      // Notify customer with detailed rejection message
      if (booking.customer_id) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: 'Proof of Payment Rejected',
          message: 'Please re-upload the correct proof of payment. The earlier one you submitted has been rejected by the admin due to it being unclear, payment was never received, or other details.',
          type: 'warning',
          action_url: `/my-bookings/${id}`
        });
      }
    } catch (err) {
      console.error('Reject error:', err);
      toast.error('Rejection failed');
    }
  };

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('bookings_v2').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) { navigate('/admin/bookings'); return; }

      const profileIds = [data.customer_id, data.staff_id].filter(Boolean);
      let profileMap = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone_number, email').in('id', profileIds);
        if (profiles) profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }

      setBooking({
        ...data,
        customer: profileMap[data.customer_id] || { full_name: 'Walk-in Customer' },
        assigned_staff: profileMap[data.staff_id]
      });

      const { data: bsData } = await supabase.from('booking_services_v2').select('*').eq('booking_id', id);
      if (bsData && bsData.length > 0) {
        const serviceIds = bsData.map(s => s.service_id);
        const { data: sDetails } = await supabase.from('services_v2').select('id, name, description').in('id', serviceIds);
        const sMap = (sDetails || []).reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
        setServices(bsData.map(s => ({
          id: s.id,
          service_name: sMap[s.service_id]?.name || 'Unknown Service',
          service_price: s.price_at_booking,
          description: sMap[s.service_id]?.description
        })));
      }
    } catch (error) { toast.error('Sync failed'); } finally { setLoading(false); }
  };

  const fetchPayments = async () => {
    const { data } = await supabase.from('payments_v2').select('*').eq('booking_id', id).order('created_at', { ascending: true });
    if (data) {
      // Filter out UNPAID placeholders, keeping actual transactions like FOR_VERIFICATION and PAID
      const filteredPayments = data.filter(p => p.status !== 'UNPAID');
      setBookingPayments(filteredPayments);
    }
  };

  const fetchStaffList = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'STAFF');
    if (data) setStaffList(data);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });
    
    if (data) {
      setAuditLogs(data.map(log => ({
        ...log,
        event_type: log.action_type,
        metadata: { details: log.details },
        actor: {
          full_name: log.actor_name,
          role: log.actor_role
        }
      })));
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const { error } = await supabase.from('bookings_v2').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      // Manual logging removed, now handled by DB trigger
      toast.success(`Booking ${newStatus}`);
      fetchBookingDetails();
      fetchAuditLogs();

      if (booking.customer?.email) {
        sendStatusUpdateNotification(booking.customer.email, newStatus, {
          date: new Date(booking.start_datetime).toLocaleDateString(),
          vehicle: booking.vehicle_type
        });
      }

      // Notify customer via DB
      if (booking.customer_id) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: `Booking ${newStatus.toUpperCase()} 🔄`,
          message: `Your booking status has been updated to ${newStatus.replace(/_/g, ' ')}.`,
          type: newStatus === 'cancelled' ? 'error' : 'info',
          action_url: `/my-bookings/${id}`
        });
      }
    } catch (error) { toast.error('Status update failed'); }
  };

  const handleAssignStaff = async (staffId) => {
    if (!staffId) return;
    try {
      const previousStaffId = booking.staff_id;
      const { error } = await supabase.from('bookings_v2').update({ staff_id: staffId }).eq('id', id);
      if (error) throw error;

      // Notify previous staff if they were replaced
      if (previousStaffId && previousStaffId !== staffId) {
        await supabase.from('notifications').insert({
          user_id: previousStaffId,
          title: 'Job Unassigned ⚠️',
          message: `You have been unassigned from the ${booking.vehicle_type} job (${booking.plate_number || 'No Plate'}).`,
          type: 'warning',
          action_url: '/staff/tasks'
        });
      }

      // Manual logging removed, now handled by DB trigger
      toast.success('Staff Updated');
      fetchBookingDetails();
      fetchAuditLogs();
      
      const assignedStaff = staffList.find(s => s.id === staffId);
      if (assignedStaff?.id) {
        // DB Notification for Staff
        await supabase.from('notifications').insert({
          user_id: assignedStaff.id,
          title: 'New Job Assigned! 🛠️',
          message: `You have been assigned to a ${booking.vehicle_type} (${booking.plate_number || 'No Plate'}).`,
          type: 'info',
          action_url: '/staff/tasks'
        });

        if (assignedStaff.email) {
          sendStaffAssignmentNotification(assignedStaff.email, {
            vehicle: booking.vehicle_type, 
            plate: booking.plate_number || 'N/A',
            date: booking.start_datetime ? new Date(booking.start_datetime).toLocaleDateString() : 'N/A',
            time: booking.start_datetime ? new Date(booking.start_datetime).toLocaleTimeString() : 'N/A',
            services: services.map(s => s.service_name).join(', ') || 'Auto Detailing'
          });
        }

        // Notify Customer of Assignment
        if (booking.customer_id) {
          await supabase.from('notifications').insert({
            user_id: booking.customer_id,
            title: 'Technician Assigned! 🛠️',
            message: `${assignedStaff.full_name || 'A technician'} has been assigned to your ${booking.vehicle_type} job.`,
            type: 'info',
            action_url: `/my-bookings/${id}`
          });
        }
      }
    } catch (error) { 
      console.error('Assignment error details:', error);
      toast.error('Assignment error'); 
    }
  };

  const handleRecordPayment = async () => {
    const amount = Number(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      return toast.error('Enter a valid amount');
    }
    
    // Prevent overpayment at the UI level
    const totalPaid = bookingPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Math.max(0, (booking.total_price || 0) - totalPaid);
    
    if (amount > balance) {
      return toast.error(`Amount cannot exceed the remaining balance of ₱${balance}`);
    }

    setSubmittingPayment(true);
    try {
      const { error } = await supabase.rpc('submit_payment', {
        p_booking_id: id,
        p_amount: amount,
        p_method: 'CASH',
        p_reference: null,
        p_receipt_url: null,
        p_ocr_text: null
      });

      if (error) throw error;
      
      toast.success('Payment recorded successfully!');
      setPaymentModal(false);
      setPaymentAmount('');
      fetchPayments();
      fetchAuditLogs();
      fetchBookingDetails();

      // Notify customer
      if (booking.customer_id) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: 'Payment Recorded! 💰',
          message: `An admin has manually recorded a cash payment of ₱${amount.toLocaleString()} for your booking.`,
          type: 'success',
          action_url: `/my-bookings/${id}`
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !booking) return <LoadingState message="Retrieving appointment records..." />;

  const totalPaid = bookingPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Math.max(0, (booking.total_price || 0) - totalPaid);

  const cardStyle = { background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.25rem' : '1.5rem', display: 'flex', flexDirection: 'column', color: 'var(--admin-text-primary)', boxShadow: 'var(--admin-card-shadow)' };
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' };
  const labelStyle = { fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6 };
  const valueStyle = { fontSize: '1rem', fontWeight: '900', color: 'var(--admin-text-primary)', marginTop: '0.25rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '4rem' }}>
      <PageHeader 
        showBack 
        onBack={() => navigate(-1)}
        badge={`REF: ${id.slice(0, 8).toUpperCase()}`} 
        title="ADMIN CONTROL CENTER" 
        subtitle="Full lifecycle management for this appointment."
      />

      {/* ADMIN LIFECYCLE CONTROLS (STICKY COMMAND BAR) */}
      <div style={{ 
        ...cardStyle, 
        background: 'rgba(var(--admin-brand-rgb), 0.05)', 
        border: '1px solid rgba(var(--admin-brand-rgb), 0.2)', 
        position: 'sticky', 
        top: '1rem', 
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        padding: isMobile ? '1rem' : '1.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        marginTop: '-0.5rem'
      }}>
        <h3 style={{ ...sectionTitleStyle, margin: isMobile ? '0 0 1rem 0' : '0 0 1.5rem 0' }}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={18} color="var(--admin-brand)" /></div>SERVICE LIFECYCLE (ADMIN ONLY)</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {booking.status === 'scheduled' && (
            <button onClick={() => handleStatusUpdate('in_progress')} style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto', padding: '1rem', borderRadius: '0.75rem', background: 'var(--admin-brand)', color: 'white', border: 'none', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <Play size={18} /> START SERVICE
            </button>
          )}
          {booking.status === 'in_progress' && (
            <button onClick={() => handleStatusUpdate('completed')} style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto', padding: '1rem', borderRadius: '0.75rem', background: '#10b981', color: 'white', border: 'none', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <CheckCircle2 size={18} /> END SERVICE
            </button>
          )}
          {booking.status === 'scheduled' && (
            <button onClick={() => handleStatusUpdate('cancelled')} style={{ padding: '1rem 1.5rem', minWidth: isMobile ? '100%' : 'auto', borderRadius: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}>
              CANCEL SERVICE
            </button>
          )}
          {(booking.status === 'completed' || booking.status === 'cancelled') && (
            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--admin-text-secondary)', fontWeight: '800', textAlign: 'center', flex: 1 }}>
              THIS BOOKING IS CLOSED ({booking.status.toUpperCase()})
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={18} color="var(--admin-brand)" /></div>Services</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {services.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: i < services.length - 1 ? '1px solid var(--admin-border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{s.service_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>{s.description || 'Professional detailing service'}</div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--admin-brand)' }}>₱{s.service_price.toLocaleString()}</div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Grand Total</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{booking.total_price?.toLocaleString()}</span>
            </div>

            <div style={{ marginTop: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {balance > 0 && booking.status !== 'cancelled' ? (
                <button 
                  onClick={() => { setPaymentAmount(balance); setPaymentModal(true); }}
                  style={{ background: 'var(--admin-brand)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Banknote size={16} /> RECORD PAYMENT
                </button>
              ) : <div />}
              <div style={{ 
                padding: '0.4rem 0.8rem', 
                borderRadius: '0.5rem', 
                background: booking.status === 'cancelled' && totalPaid > 0 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : (balance === 0 ? 'rgba(16, 185, 129, 0.1)' : (bookingPayments.some(p => p.status === 'FOR_VERIFICATION') ? 'rgba(139, 92, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)')), 
                color: booking.status === 'cancelled' && totalPaid > 0 
                  ? '#ef4444' 
                  : (balance === 0 ? '#10b981' : (bookingPayments.some(p => p.status === 'FOR_VERIFICATION') ? '#8b5cf6' : '#f59e0b')), 
                fontSize: '0.7rem', 
                fontWeight: '900' 
              }}>
                {booking.status === 'cancelled' 
                  ? (totalPaid > 0 ? (
                      <button onClick={() => navigate('/admin/refunds')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        REFUND REQUIRED <ArrowRight size={12} />
                      </button>
                    ) : 'CANCELLED (UNPAID)') 
                  : (balance === 0 ? 'FULLY PAID' : (bookingPayments.some(p => p.status === 'FOR_VERIFICATION') ? 'VERIFICATION PENDING' : `BALANCE: ₱${balance.toLocaleString()}`))}
              </div>
            </div>

            {/* INTEGRATED PAYMENTS HISTORY */}
            <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ ...labelStyle, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={14} /> Transaction History</div>
              {bookingPayments.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem' }}>No payments recorded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {bookingPayments.map((p, idx) => (
                    <React.Fragment key={idx}>
                      {p.status === 'FOR_VERIFICATION' ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1rem', background: 'rgba(var(--admin-brand-rgb), 0.05)', borderRadius: '0.75rem', border: '1px dashed var(--admin-brand)', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--admin-brand)', animation: 'pulse 1.5s infinite', boxShadow: '0 0 10px rgba(var(--admin-brand-rgb), 0.4)' }}></div>
                            <div>
                              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Customer submitted proof of payment</span>
                              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--admin-text-secondary)' }}>Awaiting your verification</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => navigate('/admin/payments')}
                            style={{ padding: '0.6rem 1rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(var(--admin-brand-rgb), 0.3)' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            PROCEED TO VERIFICATION
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            {p.receipt_url ? (
                              <div onClick={() => window.open(p.receipt_url, '_blank')} style={{ width: '32px', height: '42px', background: 'var(--admin-bg)', borderRadius: '0.3rem', overflow: 'hidden', border: '1px solid var(--admin-border)', cursor: 'pointer', flexShrink: 0 }}>
                                <img src={p.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ) : (
                              <div style={{ width: '32px', height: '42px', background: 'var(--admin-bg)', borderRadius: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2, border: '1px solid var(--admin-border)' }}>
                                <Banknote size={14} />
                              </div>
                            )}
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: '800', color: 'var(--admin-text-primary)', fontSize: '0.8rem', textDecoration: (p.status === 'VOIDED' || p.status === 'SUPERSEDED') ? 'line-through' : 'none', opacity: (p.status === 'VOIDED' || p.status === 'SUPERSEDED') ? 0.4 : 1 }}>{p.method}</span>
                                <span style={{ 
                                  fontSize: '0.6rem', 
                                  fontWeight: '900', 
                                  color: p.status === 'PAID' ? '#10b981' : (p.status === 'VOIDED' ? '#ef4444' : 'var(--admin-text-secondary)'), 
                                  background: p.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : (p.status === 'VOIDED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)'), 
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: '0.2rem',
                                  fontStyle: p.status === 'SUPERSEDED' ? 'italic' : 'normal'
                                }}>{p.status}</span>
                              </div>
                              {p.ocr_text && p.ocr_text.trim().length > 2 && (
                                <div style={{ fontSize: '0.7rem', color: '#FFFFFF', fontStyle: 'italic', marginTop: '0.25rem', opacity: 0.8 }}>
                                  "{p.ocr_text.substring(0, 40)}..."
                                </div>
                              )}
                              {p.status === 'SUPERSEDED' && (
                                <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-secondary)', fontWeight: '700', marginTop: '0.25rem', opacity: 0.6 }}>
                                  (Auto-archived: Covered by other payment)
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontWeight: '900', 
                              color: p.status === 'PAID' ? '#10b981' : 'var(--admin-text-primary)', 
                              fontSize: '0.95rem',
                              opacity: (p.status === 'VOIDED' || p.status === 'SUPERSEDED') ? 0.4 : 1,
                              textDecoration: (p.status === 'VOIDED' || p.status === 'SUPERSEDED') ? 'line-through' : 'none'
                            }}>+₱{Number(p.amount).toLocaleString()}</div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={18} color="#10b981" /></div>Operations Team</h3>
            {booking.staff_id ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><User size={20} /></div><div><div style={labelStyle}>Assigned Lead</div><div style={valueStyle}>{booking.assigned_staff?.full_name}</div></div></div>
                {!(booking.status === 'completed' || booking.status === 'cancelled') && (
                  <button onClick={() => setBooking({ ...booking, staff_id: null })} style={{ background: 'var(--admin-card)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>CHANGE</button>
                )}
              </div>
            ) : (
              <select 
                disabled={booking.status === 'completed' || booking.status === 'cancelled'}
                onChange={(e) => handleAssignStaff(e.target.value)} 
                style={{ 
                  width: '100%', padding: '1rem', borderRadius: '0.75rem', 
                  background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', 
                  color: 'var(--admin-text-primary)', fontWeight: '800', fontSize: '0.95rem', 
                  appearance: 'none', cursor: (booking.status === 'completed' || booking.status === 'cancelled') ? 'not-allowed' : 'pointer',
                  opacity: (booking.status === 'completed' || booking.status === 'cancelled') ? 0.5 : 1
                }}>
                <option value="">{ (booking.status === 'completed' || booking.status === 'cancelled') ? 'No Technician Assigned' : 'Select Technician...' }</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
              </select>
            )}
          </div>

          <div style={cardStyle}><h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageCircle size={18} color="var(--admin-brand)" /></div>Live Communication</h3><BookingChat bookingId={id} /></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={cardStyle}><h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={18} color="var(--admin-brand)" /></div>Client & Vehicle</h3><div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}><div><div style={labelStyle}>Owner & Contact</div><div style={valueStyle}>{booking.customer?.full_name} <span style={{ color: 'var(--admin-brand)', fontSize: '0.9rem', marginLeft: '0.5rem', fontWeight: '800' }}>({booking.customer_phone || booking.customer?.phone_number || 'No Phone'})</span></div></div><div><div style={labelStyle}>Vehicle / Plate</div><div style={valueStyle}>{booking.vehicle_type} - {booking.plate_number || 'N/A'}</div></div><div><div style={labelStyle}>Scheduled</div><div style={valueStyle}>{new Date(booking.start_datetime).toLocaleString()}</div></div></div></div>
          
          <div style={cardStyle}><h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><History size={18} color="var(--admin-brand)" /></div>Audit History</h3><BookingAuditTrail logs={auditLogs} /></div>
        </div>
      </div>

      {paymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', maxWidth: '400px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem 0', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Record Payment</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Amount to Pay</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)', fontWeight: '900' }}>₱</span>
                <input 
                  type="number" 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '1rem 1rem 1rem 2.5rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '800', fontSize: '1.1rem', boxSizing: 'border-box' }}
                  max={balance}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setPaymentModal(false)}
                disabled={submittingPayment}
                style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleRecordPayment}
                disabled={submittingPayment}
                style={{ flex: 1, padding: '1rem', background: 'var(--admin-brand)', border: 'none', color: '#FFFFFF', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                {submittingPayment ? <Loader2 size={18} className="spin" /> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', maxWidth: '400px', width: '90%', boxShadow: '0 25px 70px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: modalType === 'approve' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              {modalType === 'approve' ? <CheckCircle2 size={30} color="#10b981" /> : <X size={30} color="#ef4444" />}
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.75rem 0', fontWeight: '900', color: 'var(--admin-text-primary)' }}>
              {modalType === 'approve' ? 'Verify Payment' : 'Reject Payment'}
            </h2>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.95rem', margin: '0 0 2rem 0', fontWeight: '600', lineHeight: '1.5' }}>
              Are you sure you want to {modalType === 'approve' ? 'approve' : 'reject'} the payment of <span style={{ color: 'var(--admin-text-primary)', fontWeight: '900' }}>₱{Number(selectedPayment?.amount).toLocaleString()}</span>? This action will be logged in the audit trail.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => { setShowConfirmModal(false); setSelectedPayment(null); }}
                style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (modalType === 'approve') handleVerifyPayment(selectedPayment);
                  else handleRejectPayment(selectedPayment);
                  setShowConfirmModal(false);
                  setSelectedPayment(null);
                }}
                style={{ flex: 1, padding: '1rem', background: modalType === 'approve' ? '#10b981' : '#ef4444', border: 'none', color: '#FFFFFF', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '800' }}
              >
                {modalType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingDetails;
