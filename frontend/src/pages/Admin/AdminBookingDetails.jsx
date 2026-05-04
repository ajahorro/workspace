import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, Clock, CreditCard, User, Car, ClipboardList,
  History, CheckCircle, XCircle, AlertCircle, MessageCircle,
  Hash, Calendar, Phone, Shield, Activity, Play, CheckCircle2,
  Package, Truck, Trash2, Banknote, Loader2
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
  const isMobile = useMediaQuery('(max-width: 1024px)');

  useEffect(() => {
    fetchBookingDetails();
    fetchStaffList();
    fetchAuditLogs();
    fetchPayments();
  }, [id]);

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
    if (data) setBookingPayments(data.filter(p => p.amount > 0));
  };

  const fetchStaffList = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'STAFF');
    if (data) setStaffList(data);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase.from('booking_events').select('*').eq('booking_id', id).order('created_at', { ascending: false });
    if (data) {
      const actorIds = [...new Set(data.map(log => log.actor_id).filter(Boolean))];
      let profileMap = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', actorIds);
        if (profiles) profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
      setAuditLogs(data.map(log => ({ ...log, actor: profileMap[log.actor_id] || { full_name: 'System' } })));
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('bookings_v2').update({ status: newStatus }).eq('id', id);
      if (error) throw error;

      // Manual logging removed, now handled by DB trigger
      toast.success(`Booking ${newStatus}`);
      fetchBookingDetails();
      fetchAuditLogs();

      if (booking.customer?.email) {
        sendStatusUpdateNotification(booking.customer.email, newStatus, {
          date: new Date(booking.scheduled_at).toLocaleDateString(),
          vehicle: booking.vehicle_type
        });
      }
    } catch (error) { toast.error('Status update failed'); }
  };

  const handleAssignStaff = async (staffId) => {
    if (!staffId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('bookings_v2').update({ staff_id: staffId }).eq('id', id);
      if (error) throw error;

      // Manual logging removed, now handled by DB trigger
      toast.success('Staff Updated');
      fetchBookingDetails();
      fetchAuditLogs();
      
      if (staff?.email) {
        sendStaffAssignmentNotification(staff.email, {
          vehicle: booking.vehicle_type, 
          plate: booking.plate_number || 'N/A',
          date: booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString() : 'N/A',
          time: booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleTimeString() : 'N/A',
          services: booking.services?.join(', ') || 'Auto Detailing'
        });
      }
    } catch (error) { toast.error('Assignment error'); }
  };

  const handleRecordPayment = async () => {
    const amount = Number(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      return toast.error('Enter a valid amount');
    }
    
    // Prevent overpayment at the UI level
    const totalPaid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Math.max(0, (booking.total_price || 0) - totalPaid);
    
    if (amount > balance) {
      return toast.error(`Amount cannot exceed the remaining balance of ₱${balance}`);
    }

    setSubmittingPayment(true);
    try {
      const { error } = await supabase.rpc('record_payment_v2', {
        p_booking_id: id,
        p_amount: amount,
        p_method: 'CASH'
      });

      if (error) throw error;
      
      toast.success('Payment recorded successfully!');
      setPaymentModal(false);
      setPaymentAmount('');
      fetchPayments();
      fetchAuditLogs();
      fetchBookingDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !booking) return <LoadingState message="Retrieving appointment records..." />;

  const totalPaid = bookingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Math.max(0, (booking.total_price || 0) - totalPaid);

  const cardStyle = { background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.25rem' : '1.5rem', display: 'flex', flexDirection: 'column', color: 'var(--admin-text-primary)', boxShadow: 'var(--admin-card-shadow)' };
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' };
  const labelStyle = { fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6 };
  const valueStyle = { fontSize: '1rem', fontWeight: '900', color: 'var(--admin-text-primary)', marginTop: '0.25rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '4rem' }}>
      <PageHeader badge={`REF: ${id.slice(0, 8).toUpperCase()}`} title="ADMIN CONTROL CENTER" subtitle="Full lifecycle management for this appointment.">
        <button onClick={() => navigate('/admin/bookings')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}>
          <ArrowLeft size={18} color="var(--admin-brand)" /> BACK
        </button>
      </PageHeader>

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
            <h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={18} color="var(--admin-brand)" /></div>Service Particulars</h3>
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
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {balance > 0 ? (
                <button 
                  onClick={() => { setPaymentAmount(balance); setPaymentModal(true); }}
                  style={{ background: 'var(--admin-brand)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Banknote size={16} /> RECORD PAYMENT
                </button>
              ) : <div />}
              <div style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', background: balance === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: balance === 0 ? '#10b981' : '#f59e0b', fontSize: '0.7rem', fontWeight: '900' }}>{balance === 0 ? 'FULLY PAID' : `BALANCE: ₱${balance.toLocaleString()}`}</div>
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={18} color="#10b981" /></div>Operations Team</h3>
            {booking.staff_id ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><User size={20} /></div><div><div style={labelStyle}>Assigned Lead</div><div style={valueStyle}>{booking.assigned_staff?.full_name}</div></div></div>
                <button onClick={() => setBooking({ ...booking, staff_id: null })} style={{ background: 'var(--admin-card)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>CHANGE</button>
              </div>
            ) : (
              <select onChange={(e) => handleAssignStaff(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '0.75rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', fontWeight: '800', fontSize: '0.95rem', appearance: 'none', cursor: 'pointer' }}>
                <option value="">Select Technician...</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
              </select>
            )}
          </div>

          <div style={cardStyle}><h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageCircle size={18} color="var(--admin-brand)" /></div>Live Communication</h3><BookingChat bookingId={id} /></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={cardStyle}><h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={18} color="var(--admin-brand)" /></div>Client & Vehicle</h3><div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}><div><div style={labelStyle}>Owner & Contact</div><div style={valueStyle}>{booking.customer?.full_name} <span style={{ color: 'var(--admin-brand)', fontSize: '0.9rem', marginLeft: '0.5rem', fontWeight: '800' }}>({booking.customer_phone || booking.customer?.phone_number || 'No Phone'})</span></div></div><div><div style={labelStyle}>Vehicle / Plate</div><div style={valueStyle}>{booking.vehicle_type} - {booking.plate_number || 'N/A'}</div></div><div><div style={labelStyle}>Scheduled</div><div style={valueStyle}>{new Date(booking.start_datetime).toLocaleString()}</div></div></div></div>
          
          {/* PAYMENTS HISTORY */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={18} color="#f59e0b" /></div>Payments Log</h3>
            {bookingPayments.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>No payments recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bookingPayments.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--admin-bg)', borderRadius: '0.5rem', border: '1px solid var(--admin-border)' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}>{p.method}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)' }}>{new Date(p.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: '900', color: '#10b981' }}>+₱{Number(p.amount).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
    </div>
  );
};

export default AdminBookingDetails;
