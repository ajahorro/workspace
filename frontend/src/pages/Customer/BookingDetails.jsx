import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Car, Clock, Banknote, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import BookingChat from '../../components/BookingChat';

const BookingDetails = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    const { data } = await supabase.from('bookings')
      .select('*, vehicles:booking_vehicles(*, services:booking_vehicle_services(*)), payments:payments(*)')
      .eq('id', id).single();
    if (data) setBooking(data);
    setLoading(false);
  };

  if (loading || !booking) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading Fleet Details...</div>;

  const totalPaid = booking.payments?.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) || 0;

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', color: 'white' }}>
      <PageHeader title="FLEET STATUS" badge={`ID: ${id.slice(0,8)}`} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {booking.vehicles?.map(v => (
            <div key={v.id} style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{v.make} {v.model}</h3>
                <span style={{ color: 'var(--admin-brand)', fontWeight: 'bold' }}>{v.status.toUpperCase()}</span>
              </div>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{v.plate_number}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                {v.services?.map(s => <span key={s.id} style={{ padding: '0.3rem 0.6rem', background: '#333', borderRadius: '0.5rem', fontSize: '0.75rem' }}>{s.service_name_snapshot}</span>)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1rem' }}>
            <h4>BILLING & PAYMENT</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Total</span><span>₱{booking.total_amount}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}><span>Paid</span><span>₱{totalPaid}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontWeight: 'bold', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
              <span>Balance</span><span>₱{booking.total_amount - totalPaid}</span>
            </div>
          </div>
          <div style={{ height: '400px' }}><BookingChat bookingId={id} /></div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetails;