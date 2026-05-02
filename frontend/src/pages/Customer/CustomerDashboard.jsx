import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, FileText, Bell, ChevronRight, Clock, User, Phone, Car, CreditCard, CalendarPlus, History, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [activeBooking, setActiveBooking] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      const { data: activeData, error: activeError } = await supabase
        .from('bookings')
        .select('*, booking_services(service_name), payment_intents(status, total_amount, amount_paid, method)')
        .eq('customer_id', user.id)
        .in('booking_status', ['PENDING_ASSIGNMENT', 'CONFIRMED'])
        .order('scheduled_start', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (activeError) console.error('Dashboard: Booking query error:', activeError);
      if (activeData) setActiveBooking(activeData);

      const { data: historyData } = await supabase
        .from('bookings')
        .select('id, scheduled_start, booking_status')
        .eq('customer_id', user.id)
        .in('booking_status', ['COMPLETED', 'CLOSED', 'CANCELLED'])
        .order('scheduled_start', { ascending: false })
        .limit(3);

      if (historyData) setRecentHistory(historyData);
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  const processCancellation = async () => {
    if (!activeBooking) return;
    if (activeBooking.booking_status !== 'PENDING_ASSIGNMENT' && activeBooking.booking_status !== 'CONFIRMED') {
      toast.error('This booking is already in progress and cannot be cancelled.');
      setShowCancelModal(false);
      return;
    }

    setIsCancelling(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ booking_status: 'CANCELLED' })
        .eq('id', activeBooking.id)
        .eq('customer_id', user.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Update failed.');

      setShowCancelModal(false);
      setActiveBooking(null);

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Booking Cancelled',
        message: `Your booking for ${new Date(activeBooking.scheduled_start).toLocaleDateString()} has been cancelled.`,
        type: 'warning',
        action_url: `/my-bookings/${activeBooking.id}`
      });

      supabase.functions.invoke('send-email', {
        body: {
          type: 'booking_cancelled',
          to: user.email,
          data: { date: new Date(activeBooking.scheduled_start).toLocaleDateString() }
        }
      }).catch(err => console.error('Email trigger failed:', err));

      toast.success('Booking cancelled successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
        WELCOME BACK!
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Active Booking Widget */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.03)', padding: isMobile ? '1.5rem' : '2rem', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>
          ) : activeBooking ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  <FileText size={18} color="var(--primary-color)" />
                  Booking Details
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ padding: '0.3rem 0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '5rem', fontSize: '0.65rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'uppercase' }}>
                    <Clock size={12} /> {activeBooking.booking_status === 'CONFIRMED' ? 'Confirmed' : 'Scheduled'}
                  </span>
                  <span style={{ padding: '0.3rem 0.75rem', background: activeBooking.payment_intents?.[0]?.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: activeBooking.payment_intents?.[0]?.status === 'PAID' ? '#10b981' : '#ef4444', borderRadius: '5rem', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>
                    {activeBooking.payment_intents?.[0]?.status === 'PAID' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}><Calendar size={14} /> Appointment</h3>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: '800', fontSize: '1rem' }}>{new Date(activeBooking.scheduled_start).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: '800' }}>{new Date(activeBooking.scheduled_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#fff', fontWeight: '700', fontSize: '0.85rem' }}>
                      {activeBooking.booking_services?.map((bs, i) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{bs.service_name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}><Car size={14} /> Vehicle</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Car size={16} color="rgba(255,255,255,0.4)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{activeBooking.vehicle_type || 'Sedan'} - {activeBooking.plate_number}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CreditCard size={16} color="rgba(255,255,255,0.4)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{activeBooking.payment_intents?.[0]?.method || 'Cash'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginTop: '1.5rem', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem 1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>TOTAL</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>₱{activeBooking.payment_intents?.[0]?.total_amount || 0}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Paid:</span>
                      <span style={{ fontWeight: '800' }}>₱{activeBooking.payment_intents?.[0]?.amount_paid || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.75rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>Balance:</span>
                      <span style={{ fontWeight: '800', color: 'var(--primary-color)' }}>₱{(activeBooking.payment_intents?.[0]?.total_amount || 0) - (activeBooking.payment_intents?.[0]?.amount_paid || 0)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    padding: '0.85rem 1.5rem',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  Cancel Booking
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <CalendarPlus size={40} color="rgba(255,255,255,0.2)" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '800' }}>NO ACTIVE BOOKING</h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', margin: '0 0 2rem 0', fontSize: '0.9rem', textAlign: 'center', maxWidth: '300px', fontWeight: '600' }}>Your garage is empty! Schedule a service today.</p>
              <button
                onClick={() => navigate('/book')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '50rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s ease' }}
              >
                <CalendarPlus size={18} /> BOOK NOW
              </button>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.03)', padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              <History size={16} color="var(--primary-color)" />
              Recent History
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {recentHistory.length > 0 ? (
                recentHistory.map(item => (
                  <div key={item.id} onClick={() => navigate(`/my-bookings/${item.id}`)} style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '800', fontSize: '0.8rem', color: 'var(--primary-color)' }}>#{item.id.substring(0, 4).toUpperCase()}</span>
                      <span style={{ fontSize: '0.65rem', color: item.booking_status === 'CANCELLED' ? '#ef4444' : '#10b981', fontWeight: '900', textTransform: 'uppercase' }}>
                        {item.booking_status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>{new Date(item.scheduled_start).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem 0', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', fontWeight: '600' }}>
                  No service history yet.
                </div>
              )}
            </div>
            <button onClick={() => navigate('/my-bookings')} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
              VIEW ALL <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Slim Premium CTA Banner */}
      <div style={{ 
        marginTop: '2rem', 
        background: 'linear-gradient(135deg, #A91B18 0%, #181717 100%)', 
        borderRadius: '1rem', 
        padding: isMobile ? '1.25rem' : '1.5rem 2.5rem', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '1.5rem',
        boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.03)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <h2 style={{ 
            fontSize: isMobile ? '1.1rem' : '1.4rem', 
            fontWeight: '900', 
            margin: '0 0 0.25rem 0', 
            color: '#fff', 
            letterSpacing: '0.5px', 
            textTransform: 'uppercase' 
          }}>
            READY FOR YOUR NEXT SERVICE?
          </h2>
          <p style={{ 
            color: 'rgba(255,255,255,0.5)', 
            fontSize: isMobile ? '0.8rem' : '0.85rem', 
            lineHeight: '1.4', 
            margin: 0, 
            maxWidth: '500px',
            fontWeight: '600'
          }}>
            Keep your vehicle in showroom condition with our premium detailing packages.
          </p>
        </div>

        <button 
          onClick={() => navigate('/book')}
          style={{ 
            padding: '0.75rem 2rem', 
            background: 'var(--satin-linen)', 
            color: 'var(--noir-black)', 
            border: 'none', 
            borderRadius: '0.75rem', 
            fontWeight: '900', 
            fontSize: '0.85rem', 
            cursor: 'pointer', 
            transition: 'all 0.2s',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.background = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'var(--satin-linen)';
          }}
        >
          Book Now
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {showCancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', fontWeight: '900' }}>CONFIRM CANCELLATION?</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: '1.6', fontWeight: '500' }}>
              Are you sure you want to cancel this booking? This action will release your time slot immediately.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '0.75rem', fontWeight: '800' }}>KEEP IT</button>
              <button onClick={processCancellation} disabled={isCancelling} style={{ flex: 1, padding: '1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: '900' }}>{isCancelling ? '...' : 'YES, CANCEL'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
