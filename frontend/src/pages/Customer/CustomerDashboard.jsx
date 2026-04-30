import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, FileText, Bell, ChevronRight, Clock, User, Phone, Car, CreditCard, CalendarPlus, History, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      // Fetch latest active booking
      const { data: activeData, error: activeError } = await supabase
        .from('bookings')
        .select('*, booking_services(service_name), payment_intents(status, total_amount, amount_paid, method)')
        .eq('customer_id', user.id)
        .in('booking_status', ['PENDING_ASSIGNMENT', 'CONFIRMED'])
        .order('scheduled_start', { ascending: true })
        .limit(1)
        .maybeSingle();
        
      if (activeError) console.error('Dashboard: Booking query error:', activeError);
      if (activeData) {
        setActiveBooking(activeData);
      }

      // Fetch recent history (completed/closed/cancelled)
      const { data: historyData } = await supabase
        .from('bookings')
        .select('id, scheduled_start, booking_status')
        .eq('customer_id', user.id)
        .in('booking_status', ['COMPLETED', 'CLOSED', 'CANCELLED'])
        .order('scheduled_start', { ascending: false })
        .limit(3);
      
      if (historyData) setRecentHistory(historyData);

      // Fetch notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (notifData) setNotifications(notifData);

      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  const processCancellation = async () => {
    if (!activeBooking) return;
    
    // Safety check: Don't allow cancellation if already in progress or completed
    if (activeBooking.booking_status !== 'PENDING_ASSIGNMENT' && activeBooking.booking_status !== 'CONFIRMED') {
      toast.error('This booking is already in progress and cannot be cancelled.');
      setShowCancelModal(false);
      return;
    }

    setIsCancelling(true);
    try {
      const { data, error, count } = await supabase
        .from('bookings')
        .update({ booking_status: 'CANCELLED' })
        .eq('id', activeBooking.id)
        .eq('customer_id', user.id) // Security: ensure it's their booking
        .select();
      
      if (error) throw error;
      
      // If count is 0, it means RLS or the ID didn't match
      if (!data || data.length === 0) {
        throw new Error('Database rejection: The update was not applied. Please check permissions.');
      }
      
      setActiveBooking(null);
      
      // Notify customer via in-app notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Booking Cancelled',
        message: `Your booking for ${new Date(activeBooking.scheduled_start).toLocaleDateString()} has been cancelled.`,
        type: 'warning'
      });
      if (notifError) console.error('Notification insert failed:', notifError);

      // Send Cancellation Email via Edge Function
      supabase.functions.invoke('send-email', {
        body: {
          type: 'booking_cancelled',
          to: user.email,
          data: {
            date: new Date(activeBooking.scheduled_start).toLocaleDateString()
          }
        }
      }).catch(err => console.error('Email trigger failed:', err));

      toast.success('Booking cancelled successfully.');
    } catch (err) {
      console.error('Cancellation Error:', err);
      toast.error(err.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '2rem' }}>
        WELCOME BACK!
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Active Booking Widget */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>
          ) : activeBooking ? (
             <>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                 <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>
                   <FileText size={20} color="var(--primary-color)" />
                   Booking Details
                 </h2>
                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(255, 165, 0, 0.1)', color: 'orange', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12}/> {activeBooking.booking_status === 'CONFIRMED' ? 'Confirmed' : 'Scheduled'}</span>
                   <span style={{ padding: '0.25rem 0.75rem', background: activeBooking.payment_intents?.[0]?.status === 'PAID' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: activeBooking.payment_intents?.[0]?.status === 'PAID' ? 'var(--accent-green)' : 'var(--danger-color)', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                      {activeBooking.payment_intents?.[0]?.status === 'PAID' ? 'Paid' : 'Unpaid'}
                   </span>
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                  <div>
                     <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Calendar size={14}/> Appointment</h3>
                     <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', fontSize: '1.1rem' }}>{new Date(activeBooking.scheduled_start).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                     <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>{new Date(activeBooking.scheduled_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                     
                     <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--primary-color)', fontWeight: '600', fontSize: '0.95rem' }}>
                          {activeBooking.booking_services?.map((bs, i) => (
                             <li key={i} style={{ marginBottom: '0.25rem' }}>{bs.service_name}</li>
                          ))}
                        </ul>
                     </div>
                  </div>
                  <div>
                     <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Car size={14}/> Vehicle & Contact</h3>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <User size={16} color="var(--text-secondary)" />
                           <span style={{ fontSize: '0.95rem' }}>{user.user_metadata?.full_name || 'Customer'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <Car size={16} color="var(--text-secondary)" />
                           <span style={{ fontSize: '0.95rem' }}>{activeBooking.vehicle_type || 'Sedan'} - {activeBooking.plate_number}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                           <CreditCard size={16} color="var(--text-secondary)" />
                           <span style={{ fontSize: '0.95rem' }}>{activeBooking.payment_intents?.[0]?.method || 'Cash'}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</h3>
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', minHeight: '60px', color: activeBooking.customer_notes ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: activeBooking.customer_notes ? 'normal' : 'italic' }}>
                     {activeBooking.customer_notes || 'No extra notes for this booking.'}
                  </div>
               </div>

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '1.25rem 2rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                     <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>TOTAL AMOUNT</p>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>₱{activeBooking.payment_intents?.[0]?.total_amount || 0}</p>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', fontSize: '0.85rem' }}>
                           <span style={{ color: 'var(--text-secondary)' }}>Amount Paid</span>
                           <span style={{ fontWeight: '600' }}>₱{activeBooking.payment_intents?.[0]?.amount_paid || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', fontSize: '0.85rem' }}>
                           <span style={{ color: 'var(--text-secondary)' }}>Remaining Balance</span>
                           <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>₱{(activeBooking.payment_intents?.[0]?.total_amount || 0) - (activeBooking.payment_intents?.[0]?.amount_paid || 0)}</span>
                        </div>
                     </div>
                  </div>
                   {(activeBooking.booking_status === 'PENDING_ASSIGNMENT' || activeBooking.booking_status === 'CONFIRMED') && (
                    <button 
                      onClick={() => setShowCancelModal(true)}
                      style={{ 
                        padding: '0.6rem 1.25rem', 
                        background: 'rgba(239, 68, 68, 0.05)', 
                        border: '1px solid var(--danger-color)', 
                        color: 'var(--danger-color)', 
                        borderRadius: '0.5rem',
                        cursor: 'pointer', 
                        fontWeight: '700', 
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {activeBooking.payment_intents?.[0]?.method === 'GCASH' ? 'Cancel & Get Refund' : 'Cancel Booking'}
                    </button>
                   )}
               </div>
             </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
              <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                <CalendarPlus size={48} color="var(--text-secondary)" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700' }}>No active booking found</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 2rem 0', fontSize: '1rem', textAlign: 'center', maxWidth: '300px' }}>Your garage is empty! Schedule a detailing service to keep your vehicle shining.</p>
              <button 
                onClick={() => navigate('/book')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer', fontSize: '1rem', transition: 'transform 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <CalendarPlus size={20} /> Book Now
              </button>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* History Widget */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>
              <History size={18} color="var(--primary-color)" />
              Recent History
            </h2>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {recentHistory.length > 0 ? (
                recentHistory.map(item => (
                  <div key={item.id} onClick={() => navigate(`/my-bookings/${item.id}`)} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', cursor: 'pointer', background: 'var(--bg-input)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>#{item.id.substring(0, 4)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: '700' }}>DONE</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(item.scheduled_start).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No completed services yet.
                </div>
              )}
            </div>
            <button onClick={() => navigate('/my-bookings')} style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
              View All Bookings <ChevronRight size={14} />
            </button>
          </div>

          {/* Notifications Widget */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '600' }}>
              <Bell size={18} color="var(--primary-color)" />
              Notifications
            </h2>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {notifications.length > 0 ? (
                notifications.map(n => (
                  <div key={n.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ width: '8px', height: '8px', background: 'var(--primary-color)', borderRadius: '50%', marginTop: '0.35rem', flexShrink: 0 }}></div>
                    <p style={{ margin: 0, lineHeight: '1.4' }}>{n.title || n.message}</p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No new notifications.
                </div>
              )}
            </div>
            <button onClick={() => navigate('/notifications')} style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
              View Notifications <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Footer Banner */}
      <div style={{ background: 'linear-gradient(to right, #0f172a, #334155)', borderRadius: '1rem', padding: '2.5rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', border: '1px solid var(--border-color)' }}>
         <div style={{ maxWidth: '600px' }}>
            <h2 style={{ margin: '0 0 0.75rem 0', fontWeight: '900', fontSize: '1.75rem', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>READY FOR YOUR NEXT SERVICE?</h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.05rem', lineHeight: '1.5', fontWeight: '500' }}>Keep your vehicle in showroom condition with our premium detailing packages. Schedule your next appointment today!</p>
         </div>
         <button 
            onClick={() => navigate('/book')}
            style={{ padding: '1rem 3rem', background: '#0f172a', color: 'var(--primary-color)', border: 'none', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '1.1rem', transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
         >
            Book Now
         </button>
      </div>
      {/* Premium Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <AlertTriangle size={36} color="var(--danger-color)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', fontWeight: '800' }}>Confirm Cancellation?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              {activeBooking.payment_intents?.[0]?.method === 'GCASH' 
                ? 'Are you sure you want to cancel and get a refund? This will release your time slot.'
                : 'Are you sure you want to cancel this booking? This will release your time slot.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowCancelModal(false)}
                style={{ flex: 1, padding: '1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
              >
                No, Keep it
              </button>
              <button 
                onClick={processCancellation}
                disabled={isCancelling}
                style={{ flex: 1, padding: '1rem', background: 'var(--danger-color)', border: 'none', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
              >
                {isCancelling ? 'Processing...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
