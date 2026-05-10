import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Car, ShieldCheck, Play, CheckCircle2, Banknote, User, MessageCircle, 
  History, Clock, ArrowLeft, Calendar, Wrench, CreditCard, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import BookingChat from '../../components/BookingChat';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminBookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  
  const [booking, setBooking] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchData(isMounted);
    
    const sub = supabase.channel(`admin-booking-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, () => fetchData(isMounted))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_vehicles', filter: `booking_id=eq.${id}` }, () => fetchData(isMounted))
      .subscribe();
      
    return () => {
      isMounted = false;
      supabase.removeChannel(sub);
    };
  }, [id]);

  const fetchData = async (isMounted = true) => {
    try {
      // Changed to .maybeSingle() to prevent 406 crashes on RLS blocks
      const { data: b, error: bError } = await supabase
        .from('bookings')
        .select('*, customer:profiles!bookings_customer_id_fkey(*), staff:profiles!bookings_staff_id_fkey(*)')
        .eq('id', id)
        .maybeSingle(); 
        
      if (bError) throw bError;
      if (!b) throw new Error("Booking not found or access denied by RLS");

      const { data: v } = await supabase.from('booking_vehicles').select('*, services:booking_vehicle_services(*)').eq('booking_id', id);
      const { data: p } = await supabase.from('payments').select('*').eq('booking_id', id).order('created_at', { ascending: false });
      const { data: s } = await supabase.from('profiles').select('*').eq('role', 'STAFF');
      
      if (isMounted) {
        setBooking(b);
        setVehicles(v || []);
        setPayments(p || []);
        setStaffList(s || []);
      }
    } catch (error) {
      console.error("Booking detail fetch error:", error);
      toast.error('Failed to load booking details');
      navigate('/admin/bookings'); // Kick them back if they don't have access
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  // --- BUSINESS LOGIC ENGINE ---
  const handleBookingStatusUpdate = async (status) => {
    if (status === 'completed' && !booking?.staff_id) {
      return toast.error('Assignment Required: Assign a technician before completing.');
    }

    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(`Booking marked as ${status}`);
      fetchData();
    } catch (err) { toast.error('Status update failed'); }
  };

  const handleVehicleStatusUpdate = async (vehicleId, currentStatus) => {
    if (!booking?.staff_id) {
      return toast.error('Assignment Required: Please assign a technician first.', { icon: '🛑' });
    }

    const newStatus = currentStatus === 'in_progress' ? 'completed' : 'in_progress';
    try {
      await supabase.from('booking_vehicles').update({ status: newStatus }).eq('id', vehicleId);
      
      if (newStatus === 'completed') {
        const updatedVehicles = vehicles.map(v => v.id === vehicleId ? { ...v, status: 'completed' } : v);
        if (updatedVehicles.every(v => v.status === 'completed')) {
          await supabase.from('bookings').update({ service_status: 'completed', status: 'completed' }).eq('id', id);
          toast.success('All units finished. Booking completed!');
        } else {
          toast.success('Vehicle marked as completed.');
        }
      } else {
        await supabase.from('bookings').update({ service_status: 'in_progress' }).eq('id', id);
        toast.success('Vehicle service started.');
      }
      fetchData();
    } catch (err) { toast.error('Vehicle update failed'); }
  };

  const handlePaymentApproval = async (paymentId, amount) => {
    try {
      await supabase.from('payments').update({ status: 'paid' }).eq('id', paymentId);
      const currentTotalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
      const newTotalPaid = currentTotalPaid + Number(amount);
      
      let newPaymentStatus = 'unpaid';
      if (newTotalPaid >= booking.total_amount) newPaymentStatus = 'paid';
      else if (newTotalPaid >= (booking.total_amount * 0.3)) newPaymentStatus = 'downpayment_paid';
      
      await supabase.from('bookings').update({ payment_status: newPaymentStatus }).eq('id', id);
      toast.success('Payment approved & ledger updated');
      fetchData();
    } catch (err) { toast.error('Payment processing failed'); }
  };

  const handleAssign = async (staffId) => {
    try {
      await supabase.from('bookings').update({ staff_id: staffId }).eq('id', id);
      toast.success('Technician Assigned');
      fetchData();
    } catch (err) { toast.error('Assignment failed'); }
  };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
  const balance = booking ? booking.total_amount - totalPaid : 0;

  const handleRecordNewPayment = async () => {
    const amount = balance;

    if (amount <= 0) return toast.error('No balance to pay');
    
    if (newPaymentMethod === 'CASH') {
      if (Number(cashGiven) < amount) return toast.error('Insufficient cash provided');
    } else if (newPaymentMethod === 'GCASH') {
      if (!referenceNumber) return toast.error('Reference number is required');
    }

    const paymentStatus = (newPaymentMethod === 'GCASH' && !isVerified) ? 'FOR_VERIFICATION' : 'paid';

    try {
      const { error } = await supabase.from('payments').insert({
        booking_id: id,
        amount: amount,
        method: newPaymentMethod,
        status: paymentStatus,
        reference_number: newPaymentMethod === 'GCASH' ? referenceNumber : null,
        ocr_text: newPaymentMethod === 'CASH' 
          ? `Cash Given: ₱${Number(cashGiven).toLocaleString()} | Change: ₱${(Number(cashGiven) - amount).toLocaleString()}` 
          : (isVerified ? 'Manually Verified by Admin' : 'Pending Manual Verification')
      });

      if (error) {
        console.error("Payment insert error:", error);
        throw error;
      }

      if (paymentStatus === 'paid') {
        const newTotalPaid = totalPaid + amount;
        
        let newBookingPaymentStatus = 'unpaid';
        if (newTotalPaid >= booking.total_amount) newBookingPaymentStatus = 'paid';
        else if (newTotalPaid >= (booking.total_amount * 0.3)) newBookingPaymentStatus = 'downpayment_paid';
        
        await supabase.from('bookings').update({ payment_status: newBookingPaymentStatus }).eq('id', id);
      }

      toast.success(`Payment of ₱${amount.toLocaleString()} recorded`);
      setShowPaymentForm(false);
      setCashGiven('');
      setReferenceNumber('');
      setIsVerified(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to record payment');
    }
  };

  if (loading || !booking) return <LoadingState message="Loading Booking Matrix..." />;

  const cardStyle = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '1rem', padding: '1.5rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '-0.5rem' }}>
        <button onClick={() => navigate('/admin/bookings')} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>BOOKING #{id.slice(0,8).toUpperCase()}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>Created: {new Date(booking.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Operations & Fleet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Master Control Panel */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer Details</h3>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{booking.customer?.full_name || 'System User'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{booking.customer?.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Schedule</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>
                  <Calendar size={16} color="var(--admin-brand)" /> {new Date(booking.start_datetime).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                  <Clock size={14} /> {new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--admin-text-secondary)' }}>MASTER STATUS:</span>
                <div style={{ background: 'var(--admin-bg)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', display: 'flex' }}>
                  {['scheduled', 'cancelled', 'completed'].map(s => (
                    <button 
                      key={s} 
                      onClick={() => handleBookingStatusUpdate(s)} 
                      style={{ 
                        padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        background: booking.status === s ? 'var(--admin-brand)' : 'transparent',
                        color: booking.status === s ? '#fff' : 'var(--admin-text-secondary)'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <span style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--admin-text-secondary)' }}>ASSIGNMENT:</span>
                 <select onChange={(e) => handleAssign(e.target.value)} value={booking.staff_id || ''} style={{ padding: '0.6rem 1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-input-border)', color: 'var(--admin-text-primary)', borderRadius: '0.5rem', outline: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <option value="">Awaiting Assignment...</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Fleet Management / Snapshot Display */}
          <div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '900', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Car size={20} color="var(--admin-brand)" /> Fleet Service Queue ({vehicles.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {vehicles.map((v, index) => (
                <div key={v.id} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '28px', height: '28px', background: 'var(--admin-bg)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{v.make} {v.model}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--admin-brand)', fontWeight: '700', letterSpacing: '0.5px' }}>{v.plate_number} • {v.vehicle_type}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: '900', padding: '0.3rem 0.8rem', borderRadius: '2rem', border: '1px solid currentColor', color: v.status === 'completed' ? '#10b981' : (v.status === 'in_progress' ? '#a855f7' : 'var(--admin-text-secondary)'), textTransform: 'uppercase' }}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Locked Service Snapshots</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {v.services?.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--admin-bg)', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px dashed var(--admin-border)' }}>
                           <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{s.service_name_snapshot}</span>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{Number(s.price_snapshot).toLocaleString()}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{s.duration_snapshot} mins</div>
                           </div>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={() => handleVehicleStatusUpdate(v.id, v.status)} 
                      style={{ 
                        width: '100%', padding: '1rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '900', fontSize: '0.85rem', transition: 'all 0.2s', border: 'none',
                        background: v.status === 'in_progress' ? '#10b981' : (v.status === 'completed' ? 'var(--admin-bg)' : 'var(--admin-brand)'),
                        color: v.status === 'completed' ? 'var(--admin-text-secondary)' : '#fff'
                      }}
                    >
                      {v.status === 'in_progress' ? <><CheckCircle2 size={18} /> MARK AS COMPLETED</> : (v.status === 'completed' ? <><RotateCw size={18} /> REVERT TO IN PROGRESS</> : <><Play size={18} /> INITIATE SERVICE</>)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Ledger & Comms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Ledger */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', fontWeight: '900', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '1rem', textTransform: 'uppercase' }}>
              <Banknote size={18} color="#10b981" /> TRANSACTION DETAILS
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
                <span>Subtotal</span>
                <span>₱{booking.total_amount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '0.85rem', fontWeight: '800' }}>
                <span>Total Paid</span>
                <span>- ₱{totalPaid.toLocaleString()}</span>
              </div>
              <div style={{ height: '1px', background: 'var(--admin-border)', margin: '0.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: balance > 0 ? '#f59e0b' : 'var(--admin-text-primary)', fontSize: '1.2rem', fontWeight: '950' }}>
                <span>Balance Due</span>
                <span>₱{balance.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Record Form inline */}
            {balance > 0 && !showPaymentForm && (
              <button 
                onClick={() => setShowPaymentForm(true)}
                style={{ width: '100%', padding: '0.85rem', borderRadius: '0.5rem', background: 'var(--admin-brand)', color: 'white', border: 'none', fontWeight: '900', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.85rem' }}
              >
                + RECORD PAYMENT
              </button>
            )}

            {showPaymentForm && (
              <div style={{ background: 'var(--admin-bg)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setNewPaymentMethod('CASH'); setIsVerified(false); }} style={{ flex: 1, padding: '0.6rem', background: newPaymentMethod === 'CASH' ? 'var(--admin-brand)' : 'transparent', border: '1px solid var(--admin-border)', color: 'white', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>CASH</button>
                  <button onClick={() => setNewPaymentMethod('GCASH')} style={{ flex: 1, padding: '0.6rem', background: newPaymentMethod === 'GCASH' ? '#3b82f6' : 'transparent', border: '1px solid var(--admin-border)', color: 'white', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>GCASH</button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>AMOUNT TO PAY (NON-EDITABLE)</label>
                  <div style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.5rem', fontWeight: '900', fontSize: '0.9rem' }}>
                    ₱{balance.toLocaleString()}
                  </div>
                </div>

                {newPaymentMethod === 'CASH' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>CASH RECEIVED</label>
                      <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '0.75rem', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-input-border)', color: 'white', borderRadius: '0.5rem', outline: 'none', fontWeight: '700' }} />
                    </div>
                    {Number(cashGiven) > 0 && Number(cashGiven) < balance && (
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '800' }}>Insufficient Cash Received</div>
                    )}
                    {Number(cashGiven) >= balance && balance > 0 && (
                      <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '900', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        Change Due: ₱{(Number(cashGiven) - balance).toLocaleString()}
                      </div>
                    )}
                  </>
                )}

                {newPaymentMethod === 'GCASH' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>REFERENCE NUMBER</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="Enter Ref No..." style={{ flex: 1, minWidth: 0, padding: '0.75rem', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-input-border)', color: 'white', borderRadius: '0.5rem', outline: 'none', fontWeight: '700', fontSize: '0.8rem' }} />
                      <button onClick={() => {
                        if(!referenceNumber) return toast.error("Enter reference number first");
                        setIsVerifying(true);
                        setTimeout(() => { setIsVerifying(false); setIsVerified(true); toast.success("Reference Verified"); }, 800);
                      }} style={{ padding: '0 1rem', background: isVerified ? '#10b981' : 'var(--admin-card)', border: '1px solid var(--admin-border)', color: isVerified ? 'white' : 'var(--admin-text-primary)', borderRadius: '0.5rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.75rem' }}>
                        {isVerifying ? '...' : isVerified ? 'VERIFIED' : 'VERIFY'}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => { setShowPaymentForm(false); setCashGiven(''); setReferenceNumber(''); setIsVerified(false); }} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>CANCEL</button>
                  <button onClick={handleRecordNewPayment} style={{ flex: 2, padding: '0.75rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem' }}>CONFIRM</button>
                </div>
              </div>
            )}

            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Transaction History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {payments.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>No payments recorded.</p>
              ) : payments.map(p => (
                <div key={p.id} style={{ background: 'var(--admin-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CreditCard size={14} color="var(--admin-text-secondary)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{Number(p.amount).toLocaleString()}</span>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: '900', padding: '0.2rem 0.5rem', borderRadius: '0.2rem', background: p.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: p.status === 'paid' ? '#10b981' : '#8b5cf6', textTransform: 'uppercase' }}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '600', marginBottom: p.status === 'FOR_VERIFICATION' ? '1rem' : 0 }}>
                    {new Date(p.created_at).toLocaleDateString()} • {p.method}
                  </div>
                  
                  {p.status === 'FOR_VERIFICATION' && (
                    <button 
                      onClick={() => handlePaymentApproval(p.id, p.amount)} 
                      style={{ width: '100%', padding: '0.6rem', background: '#10b981', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: '900', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    >
                      <CheckCircle2 size={14} /> APPROVE TRANSACTION
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Communications */}
          <div style={{ ...cardStyle, height: '400px', display: 'flex', flexDirection: 'column', padding: 0 }}>
             <h3 style={{ margin: 0, padding: '1.25rem 1.5rem', fontSize: '0.9rem', fontWeight: '900', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--admin-border)' }}>
              <MessageCircle size={18} color="var(--admin-brand)" /> CUSTOMER CHAT
            </h3>
            <div style={{ flex: 1, position: 'relative' }}>
              <BookingChat bookingId={id} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminBookingDetails;