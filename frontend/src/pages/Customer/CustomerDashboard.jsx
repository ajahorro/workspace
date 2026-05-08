import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, FileText, Bell, ChevronRight, Clock, User, Phone, Car, CreditCard, CalendarPlus, History, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/PageHeader';

const CustomerDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [activeBooking, setActiveBooking] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      const { data: activeData, error: activeError } = await supabase
        .from('bookings')
        .select(`
          *,
          vehicles:booking_vehicles(*, services:booking_vehicle_services(*)),
          payments(*)
        `)
        .eq('customer_id', user.id)
        .eq('status', 'scheduled')
        .order('start_datetime', { ascending: true });

      if (activeError) console.error('Dashboard error:', activeError);
      
      let active = null;
      let upcoming = [];
      if (activeData && activeData.length > 0) {
        active = activeData[0];
        upcoming = activeData.slice(1);
      }
      
      setActiveBooking(active);
      setUpcomingBookings(upcoming);

      const { data: historyData } = await supabase
        .from('bookings')
        .select(`
          id, start_datetime, status, 
          vehicles:booking_vehicles(id, services:booking_vehicle_services(service_name_snapshot))
        `)
        .eq('customer_id', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('start_datetime', { ascending: false })
        .limit(3);

      if (historyData) setHistoryBookings(historyData);
      setLoading(false);
    };

    if (user) {
      fetchDashboardData();
      const channel = supabase
        .channel(`customer-dashboard-live-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${user.id}` }, () => fetchDashboardData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const processCancellation = async () => {
    if (!activeBooking) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', activeBooking.id);
      if (error) throw error;
      toast.success('Booking cancelled successfully.');
      setActiveBooking(null);
      setShowCancelModal(false);
    } catch (err) {
      toast.error('Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Building your dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      <PageHeader 
        badge="CUSTOMER PORTAL"
        title="WELCOME BACK!"
        subtitle={`Hello, ${profile?.full_name?.split(' ')[0] || 'Member'}. Track your Detailing appointments here.`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2.1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'var(--admin-card)', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.5rem' : '2rem', boxShadow: 'var(--admin-card-shadow)' }}>
          {activeBooking ? (() => {
            const totalPaid = (activeBooking.payments || []).filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
            const balance = Math.max(0, activeBooking.total_amount - totalPaid);
            const vehicleLabel = activeBooking.vehicles?.length > 1 ? `Fleet (${activeBooking.vehicles.length} Units)` : (activeBooking.vehicles?.[0]?.make + ' ' + activeBooking.vehicles?.[0]?.model || 'Vehicle');
            const allServices = activeBooking.vehicles?.flatMap(v => v.services?.map(s => s.service_name_snapshot) || []);
            const uniqueServices = Array.from(new Set(allServices)).slice(0, 3);

            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--admin-text-primary)' }}>
                    <FileText size={18} color="var(--admin-brand)" /> Next Appointment
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ padding: '0.3rem 0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '5rem', fontSize: '0.65rem', fontWeight: '900', border: '1px solid currentColor' }}>SCHEDULED</span>
                    <span style={{ padding: '0.3rem 0.75rem', background: balance === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: balance === 0 ? '#10b981' : '#f59e0b', borderRadius: '5rem', fontSize: '0.65rem', fontWeight: '900', border: '1px solid currentColor' }}>{balance === 0 ? 'PAID' : 'PENDING'}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem' }}>
                   <div>
                     <h3 style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Schedule</h3>
                     <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{new Date(activeBooking.start_datetime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                     <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--admin-brand)', marginTop: '0.25rem' }}>{new Date(activeBooking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                   </div>
                   <div>
                     <h3 style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Vehicle(s)</h3>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                       <Car size={18} color="var(--admin-brand)" />
                       <span style={{ fontWeight: '800', color: 'var(--admin-text-primary)' }}>{vehicleLabel}</span>
                     </div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginTop: '0.5rem', fontWeight: '600' }}>
                       Services: {uniqueServices.join(', ')}{allServices.length > 3 ? '...' : ''}
                     </div>
                   </div>
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--admin-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                   <div>
                     <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Total Price</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: '950', color: 'var(--admin-text-primary)' }}>₱{activeBooking.total_amount.toLocaleString()}</div>
                   </div>
                   <div style={{ display: 'flex', gap: '0.75rem' }}>
                     <button onClick={() => navigate(`/my-bookings/${activeBooking.id}`)} style={{ padding: '0.75rem 1.5rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: '800', cursor: 'pointer' }}>DETAILS</button>
                     <button onClick={() => setShowCancelModal(true)} style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.6rem', fontWeight: '800', cursor: 'pointer' }}>CANCEL</button>
                   </div>
                </div>
              </>
            );
          })() : (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
               <CalendarPlus size={48} color="var(--admin-text-secondary)" style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
               <h3 style={{ fontWeight: '900', color: 'var(--admin-text-primary)' }}>No Scheduled Services</h3>
               <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>Keep your vehicle in showroom condition.</p>
               <button onClick={() => navigate('/book')} style={{ padding: '1rem 2.5rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '5rem', fontWeight: '900', cursor: 'pointer' }}>BOOK NOW</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--admin-card)', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', padding: '1.5rem', boxShadow: 'var(--admin-card-shadow)' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--admin-text-secondary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={16} /> Recent History</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {historyBookings.map(item => (
                <div key={item.id} onClick={() => navigate(`/my-bookings/${item.id}`)} style={{ padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{new Date(item.start_datetime).toLocaleDateString()}</span>
                    <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '2rem', background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: item.status === 'completed' ? '#10b981' : '#ef4444', fontWeight: '900' }}>{item.status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', marginTop: '0.25rem' }}>{item.vehicles?.length || 0} Vehicle(s)</div>
                </div>
              ))}
              <button onClick={() => navigate('/my-bookings')} style={{ width: '100%', background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)', padding: '0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>VIEW ALL HISTORY</button>
            </div>
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Cancel Booking?</h2>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>Are you sure you want to cancel? This will release your time slot.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '800' }}>KEEP IT</button>
              <button onClick={processCancellation} disabled={isCancelling} style={{ flex: 1, padding: '1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '900' }}>{isCancelling ? '...' : 'YES, CANCEL'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
