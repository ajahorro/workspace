import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Play, CheckSquare, DollarSign, Clock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const StaffTasks = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    // Fetch assigned bookings not yet closed/cancelled
    const { data, error } = await supabase
      .from('bookings')
      .select('*, payment_intents(*), profiles!bookings_customer_id_fkey(full_name, email), booking_services(service_name)')
      .eq('staff_id', user.id)
      .in('booking_status', ['CONFIRMED', 'COMPLETED'])
      .order('scheduled_start', { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  const handleRpcAction = async (rpcName, bookingId, payload = {}) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.rpc(rpcName, { p_booking_id: bookingId, ...payload });
      if (error) throw error;
      
      // Notify Customer
      const task = tasks.find(t => t.id === bookingId);
      if (task) {
        let title = '';
        let message = '';
        if (rpcName === 'start_service') {
          title = 'Service Started';
          message = `Great news! We've started working on your ${task.vehicle_brand}.`;
        } else if (rpcName === 'finish_service') {
          title = 'Service Completed';
          message = `Your detailing service is finished! Your car is ready for pick up or after-care review.`;
        } else if (rpcName === 'record_cash_payment') {
          title = 'Payment Received';
          message = `We have successfully recorded your payment of ₱${payload.p_amount}. Thank you!`;
        }

        if (title) {
          await supabase.from('notifications').insert({
            user_id: task.customer_id,
            title,
            message,
            type: 'info',
            action_url: `/my-bookings/${task.id}`
          });
        }
      }

      await fetchTasks();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollectCash = async (bookingId, intentId, totalAmount) => {
    const amount = prompt(`Enter amount collected (Total due: ₱${totalAmount}):`, totalAmount);
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    await handleRpcAction('record_cash_payment', bookingId, { p_amount: parseFloat(amount) });
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading your tasks...</div>;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="STAFF PORTAL"
        title="MY ASSIGNED TASKS"
        subtitle="Manage your daily detailing operations and payments."
        onRefresh={fetchTasks}
      />

      {tasks.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.03)' }}>
          <CheckSquare size={48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '900' }}>YOU'RE ALL CAUGHT UP!</h3>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>No active tasks assigned to you right now.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {tasks.map(task => {
            const isStarted = task.service_status === 'IN_PROGRESS';
            const isFinished = task.service_status === 'FINISHED';
            const paymentIntent = task.payment_intents?.[0];
            const needsCashCollection = isFinished && paymentIntent?.method === 'CASH' && paymentIntent?.status !== 'PAID';

            return (
              <div key={task.id} style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: `1px solid ${isStarted ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)'}`, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0' }}>{task.vehicle_brand} {task.vehicle_model}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{task.plate_number}</span>
                    </div>
                    <span style={{ background: isStarted ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)', color: isStarted ? '#4ade80' : 'var(--text-secondary)', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                      {task.service_status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <Clock size={16} /> Scheduled: {new Date(task.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                    <strong>Services:</strong>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                      {task.booking_services.map((bs, i) => <li key={i}>{bs.service_name}</li>)}
                    </ul>
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '0.5rem' }}>
                  {!isStarted && !isFinished && (
                    <button 
                      onClick={() => handleRpcAction('start_service', task.id)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '0.75rem', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Play size={18} fill="#fff" /> Start Service
                    </button>
                  )}

                  {isStarted && !isFinished && (
                    <button 
                      onClick={() => handleRpcAction('finish_service', task.id)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '0.75rem', background: '#4ade80', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <CheckSquare size={18} /> Finish Service
                    </button>
                  )}

                  {needsCashCollection && (
                    <button 
                      onClick={() => handleCollectCash(task.id, paymentIntent.id, paymentIntent.total_amount)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '0.75rem', background: 'orange', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <DollarSign size={18} /> Collect ₱{paymentIntent.total_amount}
                    </button>
                  )}

                  {!needsCashCollection && isFinished && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      Service Completed & Paid
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaffTasks;
