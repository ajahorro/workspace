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
  const [bookingPayments, setBookingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    fetchBookingDetails();
    fetchStaffList();
    fetchAuditLogs();
    fetchPayments();
  }, [id]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings_v2')
      .select(`
        *,
        customer:profiles!customer_id(full_name, phone_number, email),
        assigned_staff:profiles!staff_id(full_name)
      `)
      .eq('id', id)
      .single();

    if (data) {
      setBooking(data);
      // Fetch services for this booking
      const { data: bsData } = await supabase
        .from('booking_services_v2')
        .select(`
          *,
          service:services_v2(description, name)
        `)
        .eq('booking_id', id);
      
      if (bsData) {
        // Map to expected format
        const mappedServices = bsData.map(s => ({
          id: s.id,
          service_name: s.service?.name,
          service_price: s.price_at_booking,
          service: { description: s.service?.description }
        }));
        setServices(mappedServices);
      }
    }
    if (error) {
      toast.error('Booking not found');
      navigate('/admin/bookings');
    }
    setLoading(false);
  };

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });
    if (data) setBookingPayments(data.filter(p => p.amount > 0));
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
        .from('bookings_v2')
        .update({ 
          staff_id: staffId,
          status: booking.status === 'scheduled' && !booking.staff_id ? 'scheduled' : booking.status
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
          date: new Date(booking.start_datetime).toLocaleDateString(),
          time: new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      // Use record_payment_v2 RPC (overpayment-safe)
      const { error } = await supabase.rpc('record_payment_v2', {
        p_booking_id: id,
        p_amount: amount,
        p_method: 'CASH'
      });

      if (error) throw error;

      toast.success('Payment recorded');
      
      // Notify Customer via Email
      if (booking.customer?.email) {
        sendPaymentReceiptNotification(booking.customer.email, amount, {
          vehicle: `${booking.vehicle_brand} ${booking.vehicle_model}`
        }).catch(err => console.error('Receipt email failed:', err));
      }

      setPaymentAmount('');
      fetchBookingDetails();
      fetchPayments();
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
      
      // Find the FOR_VERIFICATION payment
      const pendingPayment = bookingPayments.find(p => p.status === 'FOR_VERIFICATION');
      if (pendingPayment) {
        const { error } = await supabase
          .from('payments_v2')
          .update({
            status: 'PAID',
            verified_by: user.id,
            verified_at: new Date().toISOString()
          })
          .eq('id', pendingPayment.id);
        if (error) throw error;
      }

      toast.success('Payment verified successfully');
      
      // Notify Customer via Email
      if (booking.customer?.email) {
        sendPaymentReceiptNotification(booking.customer.email, booking.total_price, {
          vehicle: `${booking.vehicle_brand} ${booking.vehicle_model}`
        }).catch(err => console.error('Receipt email failed:', err));
      }

      fetchBookingDetails();
      fetchPayments();
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
      const { error } = await supabase.from('bookings_v2').update({
        status: 'cancelled'
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

  // Derive balance from payments_v2 (not from booking columns)
  const totalPaid = bookingPayments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = (booking.total_price || 0) - totalPaid;
  const hasPendingVerification = bookingPayments.some(p => p.status === 'FOR_VERIFICATION');

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
              <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: '800' }}>
                <Clock size={12} /> {(booking.service_status || 'NOT_STARTED').replace('_', ' ')}
              </div>
              <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: '800' }}>
                <CreditCard size={12} /> {(booking.payment_status || 'UNPAID').replace('_', ' ')}
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
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--admin-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <ClipboardList size={22} color="var(--admin-brand)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Service Details</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {services.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', background: 'var(--admin-input-bg)', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', marginBottom: '0.25rem' }}>{s.service_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', maxWidth: '400px' }}>{s.service?.description}</div>
                  </div>
                  <div style={{ fontWeight: '800', color: 'var(--admin-text-primary)' }}>₱{Number(s.service_price).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: 'var(--admin-text-secondary)' }}>Total Amount</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>₱{(booking.total_price || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Staff Assignment */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--admin-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <User size={22} color="var(--admin-brand)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Staff Assignment</h2>
            </div>
            {booking.staff_id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', borderRadius: '1rem' }}>
                <CheckCircle size={24} color="#10b981" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Staff</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>{booking.assigned_staff?.full_name}</div>
                </div>
                <button
                  onClick={() => handleAssignStaff(null)}
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>
                  <Clock size={20} /> No staff assigned yet
                </div>
                <select
                  onChange={(e) => handleAssignStaff(e.target.value)}
                  disabled={isProcessing}
                  style={{ 
                    width: '100%', padding: '1rem', borderRadius: '0.75rem', 
                    background: 'var(--admin-input-bg)', border: '1px solid var(--admin-input-border)', 
                    color: 'var(--admin-text-primary)', fontSize: '0.95rem', cursor: 'pointer',
                    outline: 'none'
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select staff to assign...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Payment Verification */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--admin-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <CreditCard size={22} color="var(--admin-brand)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Payment Verification</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1.25rem', background: '#F8FAFC', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', fontWeight: '700' }}>Total</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>₱{(booking.total_price || 0).toLocaleString()}</div>
              </div>
              <div style={{ padding: '1.25rem', background: '#F8FAFC', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', fontWeight: '700' }}>Amount Paid</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#10b981' }}>₱{totalPaid.toLocaleString()}</div>
              </div>
              <div style={{ padding: '1.25rem', background: '#F8FAFC', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', fontWeight: '700' }}>Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: balance > 0 ? 'var(--admin-brand)' : '#10b981' }}>₱{balance.toLocaleString()}</div>
              </div>
            </div>

            {/* GCash Receipt View */}
            {booking.payment_method === 'GCASH' && bookingPayments.some(p => p.receipt_url) && (
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1.25rem', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--card-text)', textTransform: 'uppercase' }}>GCash Receipt Upload</div>
                  <a 
                    href={bookingPayments.find(p => p.receipt_url)?.receipt_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ fontSize: '0.7rem', color: 'var(--card-text)', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                  >
                    <ExternalLink size={12} /> View Full
                  </a>
                </div>
                <div 
                  style={{ width: '100%', height: '200px', borderRadius: '0.75rem', overflow: 'hidden', background: '#000', cursor: 'pointer' }} 
                  onClick={() => window.open(bookingPayments.find(p => p.receipt_url)?.receipt_url, '_blank')}
                >
                  <img src={bookingPayments.find(p => p.receipt_url)?.receipt_url} alt="GCash Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                {hasPendingVerification && (
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
              <div style={{ padding: '1.5rem', background: 'var(--admin-input-bg)', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Record Cash Payment</div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>₱</span>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.75rem', background: '#FFFFFF', border: '1px solid var(--admin-input-border)', color: 'var(--admin-text-primary)', fontSize: '1rem', outline: 'none' }}
                    />
                  </div>
                  <button
                    onClick={handleRecordPayment}
                    disabled={isProcessing}
                    style={{ background: 'var(--admin-brand)', border: 'none', color: '#FFFFFF', padding: '0 2rem', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)' }}
                  >
                    Record
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Communication Chat */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--admin-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <MessageCircle size={22} color="var(--admin-brand)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Customer Communication</h2>
            </div>
            <BookingChat bookingId={id} />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Customer & Vehicle */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--admin-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Car size={22} color="var(--admin-brand)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Customer & Vehicle</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>Customer</div>
                <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)' }}>{booking.customer?.full_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>Contact</div>
                <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)' }}>{booking.customer?.phone_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>Vehicle Type</div>
                <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)' }}>{booking.vehicle_type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>Plate Number</div>
                <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)' }}>{booking.plate_number}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>Appointment</div>
                <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)' }}>{new Date(booking.start_datetime).toLocaleString()}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem', fontWeight: '600' }}>Payment Method</div>
                <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', textTransform: 'uppercase' }}>{booking.payment_method || 'CASH'}</div>
              </div>
            </div>
          </div>

          {/* Audit History */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--admin-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <History size={22} color="var(--admin-brand)" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Secure Activity Trail</h2>
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
