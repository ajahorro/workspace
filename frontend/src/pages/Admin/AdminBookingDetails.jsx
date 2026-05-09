import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Car, Shield, Play, CheckCircle2, Banknote, User, MessageCircle, History, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import BookingChat from '../../components/BookingChat';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';

const AdminBookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const sub = supabase.channel(`admin-booking-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [id]);

  const fetchData = async () => {
    const { data: b } = await supabase.from('bookings').select('*, customer:profiles!customer_id(*), staff:profiles!staff_id(*)').eq('id', id).single();
    const { data: v } = await supabase.from('booking_vehicles').select('*, services:booking_vehicle_services(*)').eq('booking_id', id);
    const { data: p } = await supabase.from('payments').select('*').eq('booking_id', id);
    const { data: s } = await supabase.from('profiles').select('*').eq('role', 'STAFF');
    
    setBooking(b);
    setVehicles(v || []);
    setPayments(p || []);
    setStaffList(s || []);
    setLoading(false);
  };

  const updateStatus = async (table, targetId, status) => {
    const { error } = await supabase.from(table).update({ status }).eq('id', targetId);
    if (error) toast.error('Update failed');
    else { toast.success('Status updated'); fetchData(); }
  };

  const handleAssign = async (staffId) => {
    await supabase.from('bookings').update({ staff_id: staffId }).eq('id', id);
    toast.success('Technician Assigned');
    fetchData();
  };

  if (loading || !booking) return <LoadingState />;

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', color: 'white' }}>
      <PageHeader title="ADMIN CONSOLE" badge={`ID: ${id.slice(0,8)}`} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Fleet Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1rem', border: '2px solid var(--admin-brand)' }}>
                <h3>Status: {booking.status.toUpperCase()}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['scheduled', 'cancelled', 'completed'].map(s => (
                        <button key={s} onClick={() => updateStatus('bookings', id, s)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: booking.status === s ? 'var(--admin-brand)' : '#333', color: 'white', border: 'none' }}>{s}</button>
                    ))}
                </div>
            </div>

            {vehicles.map(v => (
                <div key={v.id} style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4>{v.make} {v.model} ({v.plate_number})</h4>
                        <span style={{ color: 'var(--admin-brand)', fontWeight: 'bold' }}>{v.status.toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
                        {v.services?.map(s => <span key={s.id} style={{ padding: '0.2rem 0.5rem', background: '#333', borderRadius: '0.3rem', fontSize: '0.8rem' }}>{s.service_name_snapshot}</span>)}
                    </div>
                    <button onClick={() => updateStatus('booking_vehicles', v.id, v.status === 'in_progress' ? 'completed' : 'in_progress')} style={{ padding: '0.7rem', width: '100%', borderRadius: '0.5rem', background: 'var(--admin-brand)', color: 'white', border: 'none', fontWeight: 'bold' }}>
                        {v.status === 'in_progress' ? 'MARK COMPLETED' : 'OVERRIDE START'}
                    </button>
                </div>
            ))}
        </div>

        {/* Info & Finance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1rem' }}>
                <h4 style={{ marginTop: 0 }}>FINANCIALS</h4>
                <p>Total: ₱{booking.total_amount}</p>
                <p style={{ color: '#10b981' }}>Paid: ₱{totalPaid}</p>
                <p style={{ color: '#f59e0b' }}>Balance: ₱{booking.total_amount - totalPaid}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {payments.map(p => (
                        <div key={p.id} style={{ background: '#222', padding: '0.8rem', borderRadius: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>₱{p.amount} ({p.status})</span>
                                {p.status === 'pending' && <button onClick={() => updateStatus('payments', p.id, 'paid')} style={{ background: '#10b981', color: 'white', border: 'none', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.2rem' }}>APPROVE</button>}
                            </div>
                            {p.receipt_url && <img src={p.receipt_url} style={{ width: '100%', marginTop: '0.5rem', borderRadius: '0.3rem' }} />}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1rem' }}>
                <h4 style={{ marginTop: 0 }}>ASSIGNMENT</h4>
                <select onChange={(e) => handleAssign(e.target.value)} value={booking.staff_id || ''} style={{ width: '100%', padding: '0.8rem', background: '#222', color: 'white', borderRadius: '0.5rem' }}>
                    <option value="">Select Technician</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
            </div>

            <div style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1rem', height: '400px' }}>
                <BookingChat bookingId={id} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBookingDetails;