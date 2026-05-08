import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Box, Car, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from './PageHeader';
import { useMediaQuery } from '../hooks/useMediaQuery';

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

      const channel = supabase.channel(`my-bookings-live-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${user.id}` }, () => fetchBookings())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchBusinessSettings = async () => {
    const { data } = await supabase.from('business_settings').select('cancellation_window_hours').maybeSingle();
    if (data) setCancelPolicy(data);
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase.from('bookings').select('*, vehicles:booking_vehicles (*), payments:payments (*)')
      .eq('customer_id', user.id).order('created_at', { ascending: false });
    if (!error && data) setBookings(data);
    setLoading(false);
  };

  const getStatusDisplay = (status, pStatus) => {
    const app = {
      scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
      completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
      cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
      no_show: { label: 'No Show', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
    };

    const pay = {
      unpaid: { label: 'Unpaid', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
      partially_paid: { label: 'Partial', color: 'var(--admin-brand)', bg: 'rgba(169, 27, 24, 0.1)' },
      paid: { label: 'Paid', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
      refunded: { label: 'Refunded', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }
    };

    return {
      app: app[status] || app.scheduled,
      pay: pay[pStatus] || pay.unpaid
    };
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', fontWeight: '800' }}>Syncing your fleet...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
      <PageHeader badge="PERSONAL FLEET" title="MY BOOKINGS" subtitle="Track detailing progress and manage your scheduled sessions." onRefresh={fetchBookings} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {bookings.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center', background: 'var(--admin-card)', borderRadius: '1.5rem', border: '1px solid var(--admin-border)' }}>No active bookings.</div>
        ) : bookings.map(booking => {
          const tracks = getStatusDisplay(booking.status, booking.payment_status);
          const vehicleCount = booking.vehicles?.length || 0;

          return (
            <div key={booking.id} onClick={() => navigate(`/my-bookings/${booking.id}`)} style={{ background: 'var(--admin-card)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', cursor: 'pointer', transition: 'all 0.3s ease' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--admin-text-secondary)' }}>#{booking.id.slice(0, 8).toUpperCase()}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', background: tracks.app.bg, color: tracks.app.color, borderRadius: '2rem', fontSize: '0.6rem', fontWeight: '900', border: '1px solid currentColor' }}>{tracks.app.label.toUpperCase()}</span>
                    <span style={{ padding: '0.2rem 0.6rem', background: tracks.pay.bg, color: tracks.pay.color, borderRadius: '2rem', fontSize: '0.6rem', fontWeight: '900', border: '1px solid currentColor' }}>{tracks.pay.label.toUpperCase()}</span>
                  </div>
               </div>
               
               <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={24} color="var(--admin-brand)" /></div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem' }}>{vehicleCount > 1 ? `Fleet Session (${vehicleCount} Units)` : `${booking.vehicles?.[0]?.make} ${booking.vehicles?.[0]?.model}`}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>{new Date(booking.start_datetime).toLocaleDateString()} at {new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyBookings;
