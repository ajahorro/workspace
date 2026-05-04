import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, Clock, CreditCard, User, Car, ClipboardList,
  History, CheckCircle, XCircle, AlertCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import BookingAuditTrail from '../../components/BookingAuditTrail';
import BookingChat from '../../components/BookingChat';
import { Eye, ExternalLink, MessageCircle } from 'lucide-react';
import { sendStaffAssignmentNotification, sendPaymentReceiptNotification, sendStatusUpdateNotification } from '../../services/EmailService';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminBookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    fetchBookingDetails();
    fetchStaffList();
    fetchAuditLogs();
  }, [id]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(full_name, phone_number, email),
        payments:payment_intents(*),
        assigned_staff:profiles!bookings_staff_id_fkey(full_name)
      `)
      .eq('id', id)
      .single();

    if (data) {
      setBooking(data);
      // Fetch services for this booking
      const { data: bsData } = await supabase
        .from('booking_services')
        .select(`
          *,
          service:services(description)
        `)
        .eq('booking_id', id);
      if (bsData) setServices(bsData);
    }
    if (error) {
      toast.error('Booking not found');
      navigate('/admin/bookings');
    }
    setLoading(false);
  };

  const fetchStaffList = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'STAFF');
    if (data) setStaffList(data);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from('booking_events')
      .select(`
        *,
        actor:profiles!actor_id(full_name, role)
      `)
      .eq('booking_id', id)
      .order('created_at', { ascending: false });
    if (data) setAuditLogs(data);
  };

  const handleAssignStaff = async (staffId) => {
    if (!staffId) return;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Update staff_id and auto-confirm if it was pending assignment
      const { error } = await supabase
        .from('bookings')
        .update({ 
          staff_id: staffId,
          booking_status: booking.booking_status === 'PENDING_ASSIGNMENT' ? 'CONFIRMED' : booking.booking_status
        })
        .eq('id', id);
      if (error) throw error;

      // Add audit log
      const staff = staffList.find(s => s.id === staffId);
      await supabase.from('booking_events').insert({
        booking_id: id,
        actor_id: user.id,
        event_type: 'STAFF_ASSIGNED',
        metadata: {
          details: `Assigned staff member ${staff.full_name || staff.email} to booking.`,
          description: `Staff assignment updated for booking #${id.slice(0, 4)}`
        }
      });

      toast.success('Staff assigned successfully');
      
      // Notify Staff via Email
      if (staff && staff.email) {
        sendStaffAssignmentNotification(staff.email, {
          vehicle: `${booking.vehicle_brand} ${booking.vehicle_model}`,
          plate: booking.plate_number,
          services: services.map(s => s.service_name).join(', '),
          date: new Date(booking.scheduled_start).toLocaleDateString(),
          time: new Date(booking.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }).catch(err => console.error('Staff email failed:', err));
      }

      fetchBookingDetails();
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payment = booking.payments?.[0];
      if (!payment) throw new Error('No payment intent found');

      const newAmountPaid = (payment.amount_paid || 0) + amount;
      const isFullyPaid = newAmountPaid >= payment.total_amount;

      const { error } = await supabase.from('payment_intents').update({
        amount_paid: newAmountPaid,
        status: isFullyPaid ? 'VERIFIED' : 'PARTIALLY_PAID',
        method: 'CASH'
      }).eq('id', payment.id);

      if (error) throw error;

      // Add audit log
      await supabase.from('booking_events').insert({
        booking_id: id,
        actor_id: user.id,
        event_type: 'PAYMENT_RECORDED',
        metadata: {
          details: `Recorded cash payment of ₱${amount.toLocaleString()}. Total paid: ₱${newAmountPaid.toLocaleString()}`,
          description: `Payment of ₱${amount.toLocaleString()} recorded for booking #${id.slice(0, 4)}`
        }
      });

      toast.success('Payment recorded');
      
      // Notify Customer via Email
      if (booking.customer?.email) {
        sendPaymentReceiptNotification(booking.customer.email, amount, {
          vehicle: `${booking.vehicle_brand} ${booking.vehicle_model}`
        }).catch(err => console.error('Receipt email failed:', err));
      }

      setPaymentAmount('');
      fetchBookingDetails();
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payment = booking.payments?.[0];
      if (!payment) throw new Error('No payment intent found');

      const { error } = await supabase.from('payment_intents').update({
        status: 'VERIFIED'
      }).eq('id', payment.id);

      if (error) throw error;

      await supabase.from('booking_events').insert({
        booking_id: id,
        actor_id: user.id,
        event_type: 'PAYMENT_VERIFIED',
        metadata: {
          details: 'GCash payment receipt verified by admin.',
          description: `GCash payment verified for booking #${id.slice(0, 4)}`
        }
      });

      toast.success('Payment verified successfully');
      
      // Notify Customer via Email
      if (booking.customer?.email) {
        sendPaymentReceiptNotification(booking.customer.email, payment.total_amount, {
          vehicle: `${booking.vehicle_brand} ${booking.vehicle_model}`
        }).catch(err => console.error('Receipt email failed:', err));
      }

      fetchBookingDetails();
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('bookings').update({
        booking_status: 'CANCELLED',
        cancellation_status: 'APPROVED'
      }).eq('id', id);
      if (error) throw error;

      // Add audit log
      await supabase.from('booking_events').insert({
        booking_id: id,
        actor_id: user.id,
        event_type: 'APPROVE_CANCEL',
        metadata: {
          details: 'Booking cancelled by admin.',
          description: `Booking #${id.slice(0, 4)} cancelled by admin`
        }
      });

      toast.success('Booking cancelled');
      fetchBookingDetails();
      fetchAuditLogs();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading details...</div>;
  if (!booking) return null;

  const payment = booking.payments?.[0] || { total_amount: 0, amount_paid: 0, status: 'UNPAID' };
  const balance = payment.total_amount - payment.amount_paid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button
            onClick={() => navigate('/admin/bookings')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to Bookings
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', margin: 0, color: 'var(--text-primary)' }}>
              Booking for {booking.customer?.full_name || 'Guest'}
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', color: 'var(--card-text)', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: '900', border: '1px solid var(--glass-border)' }}>
                <Clock size={12} /> {(booking.service_status || 'NOT_STARTED').replace('_', ' ')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-card)', color: 'var(--card-text)', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: '900', border: '1px solid var(--glass-border)' }}>
                <CreditCard size={12} /> {(payment.status || 'UNPAID').replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handleCancelBooking}
          disabled={booking.booking_status === 'CANCELLED'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.75rem',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: booking.booking_status === 'CANCELLED' ? 'not-allowed' : 'pointer'
          }}
        >
          <XCircle size={18} /> Cancel Booking
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Service Details */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(var(--blur-amount))', WebkitBackdropFilter: 'blur(var(--blur-amount))', borderRadius: '1.25rem', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--card-shadow)', color: 'var(--card-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--card-text)' }}>
              <ClipboardList size={22} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>Service Details</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {services.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                  <div>
                    <div style={{ fontWeight: '900', color: 'var(--card-text)', marginBottom: '0.25rem' }}>{s.service_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--card-text)', opacity: 0.7, maxWidth: '400px' }}>{s.service?.description}</div>
                  </div>
                  <div style={{ fontWeight: '900', color: 'var(--card-text)' }}>₱{Number(s.service_price).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'var(--card-text)', opacity: 0.6 }}>Total Amount</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--card-text)' }}>₱{payment.total_amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Staff Assignment */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(var(--blur-amount))', WebkitBackdropFilter: 'blur(var(--blur-amount))', borderRadius: '1.25rem', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--card-shadow)', color: 'var(--card-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--card-text)' }}>
              <User size={22} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>Staff Assignment</h2>
            </div>
            {booking.staff_id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '1rem' }}>
                <CheckCircle size={24} color="var(--card-text)" />
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--card-text)', opacity: 0.6, fontWeight: '900', textTransform: 'uppercase' }}>Assigned Staff</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--card-text)' }}>{booking.assigned_staff?.full_name}</div>
                </div>
                <button
                  onClick={() => handleAssignStaff(null)}
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--card-text)', opacity: 0.3, cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--card-text)', opacity: 0.5, fontSize: '0.9rem' }}>
                  <Clock size={20} /> No staff assigned yet
                </div>
                <select
                  onChange={(e) => handleAssignStaff(e.target.value)}
                  disabled={isProcessing}
                  style={{ 
                    width: '100%', padding: '1rem', borderRadius: '0.75rem', 
                    background: 'var(--bg-input)', border: '1px solid var(--glass-border)', 
                    color: 'var(--card-text)', fontSize: '0.9rem', cursor: 'pointer',
                    outline: 'none'
                  }}
                  defaultValue=""
                >
                  <option value="" disabled style={{ background: 'var(--bg-card)', color: 'var(--card-text)' }}>Select staff to assign...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id} style={{ background: 'var(--bg-card)', color: 'var(--card-text)' }}>
                      {s.full_name || s.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Payment Verification */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(var(--blur-amount))', WebkitBackdropFilter: 'blur(var(--blur-amount))', borderRadius: '1.25rem', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--card-shadow)', color: 'var(--card-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--card-text)' }}>
              <CreditCard size={22} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>Payment Verification</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.5rem', fontWeight: '900' }}>Total</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>₱{payment.total_amount.toLocaleString()}</div>
              </div>
              <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.5rem', fontWeight: '900' }}>Amount Paid</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>₱{payment.amount_paid.toLocaleString()}</div>
              </div>
              <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.5rem', fontWeight: '900' }}>Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>₱{balance.toLocaleString()}</div>
              </div>
            </div>

            {/* GCash Receipt View */}
            {payment.method === 'GCASH' && payment.receipt_url && (
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1.25rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--card-text)', textTransform: 'uppercase' }}>GCash Receipt Upload</div>
                  <a href={payment.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--card-text)', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                    <ExternalLink size={12} /> View Full
                  </a>
                </div>
                <div style={{ width: '100%', height: '200px', borderRadius: '0.75rem', overflow: 'hidden', background: '#000', cursor: 'pointer' }} onClick={() => window.open(payment.receipt_url, '_blank')}>
                  <img src={payment.receipt_url} alt="GCash Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                {payment.status === 'FOR_VERIFICATION' && (
                  <button
                    onClick={handleVerifyPayment}
                    disabled={isProcessing}
                    style={{ width: '100%', marginTop: '1rem', padding: '1rem', background: 'var(--card-text)', border: 'none', color: 'var(--bg-card)', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}
                  >
                    {isProcessing ? 'Verifying...' : 'Verify Receipt & Confirm Payment'}
                  </button>
                )}
              </div>
            )}

            {balance > 0 && (
              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1.25rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--card-text)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Record Cash Payment</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--card-text)', opacity: 0.6, fontWeight: '900' }}>₱</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      style={{ width: '100%', padding: '1rem 1rem 1rem 2.5rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--card-text)', fontSize: '1rem' }}
                    />
                  </div>
                  <button
                    onClick={handleRecordPayment}
                    disabled={isProcessing}
                    style={{ background: 'var(--card-text)', border: 'none', color: 'var(--bg-card)', padding: '0 2rem', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}
                  >
                    Record
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refund & Communication Chat */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(var(--blur-amount))', WebkitBackdropFilter: 'blur(var(--blur-amount))', borderRadius: '1.25rem', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--card-shadow)', color: 'var(--card-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--card-text)' }}>
              <MessageCircle size={22} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>Customer Communication</h2>
            </div>
            <BookingChat bookingId={id} />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Customer & Vehicle */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(var(--blur-amount))', WebkitBackdropFilter: 'blur(var(--blur-amount))', borderRadius: '1.25rem', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--card-shadow)', color: 'var(--card-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--card-text)', opacity: 0.7 }}>
              <Car size={22} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>Customer & Vehicle</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.25rem' }}>Customer</div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)' }}>{booking.customer?.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.25rem' }}>Contact</div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)' }}>{booking.customer?.phone_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.25rem' }}>Vehicle Type</div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)' }}>{booking.vehicle_type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.25rem' }}>Plate Number</div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)' }}>{booking.plate_number}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.25rem' }}>Appointment</div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)' }}>{new Date(booking.scheduled_start).toLocaleString()}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.25rem' }}>Payment Method</div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)', textTransform: 'uppercase' }}>{booking.payments?.[0]?.method || 'CASH'}</div>
              </div>
            </div>
          </div>

          {/* Audit History */}
          <div style={{ background: 'var(--bg-card)', backdropFilter: 'blur(var(--blur-amount))', WebkitBackdropFilter: 'blur(var(--blur-amount))', borderRadius: '1.25rem', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--card-shadow)', color: 'var(--card-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--card-text)', opacity: 0.7 }}>
                <History size={22} />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>Secure Activity Trail</h2>
              </div>
            </div>
            <BookingAuditTrail bookingId={id} isAdmin={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingDetails;
