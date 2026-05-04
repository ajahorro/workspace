import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Play, CheckSquare, DollarSign, Clock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { sendStatusUpdateNotification, sendPaymentReceiptNotification } from '../../services/EmailService';
import toast from 'react-hot-toast';

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
    // Fetch assigned bookings (including closed/cancelled)
    const { data, error } = await supabase
      .from('bookings')
      .select('*, payment_intents(*), profiles!customer_id(full_name, email), booking_services(service_name)')
      .eq('staff_id', user.id)
      .in('booking_status', ['PENDING_ASSIGNMENT', 'CONFIRMED', 'COMPLETED'])
      .in('service_status', ['NOT_STARTED', 'IN_PROGRESS', 'FINISHED'])
      .order('scheduled_start', { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  const handleUpdateNotes = async (bookingId, notes) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ staff_notes: notes })
        .eq('id', bookingId);
      if (error) throw error;
      toast.success('Notes saved');
    } catch (err) {
      toast.error('Failed to save notes');
    }
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
        const bookingInfo = { vehicle: `${task.vehicle_brand} ${task.vehicle_model}` };

        if (rpcName === 'start_service') {
          title = 'Service Started';
          message = `Great news! We've started working on your ${task.vehicle_brand}.`;
          sendStatusUpdateNotification(task.profiles.email, 'STARTED', bookingInfo);
        } else if (rpcName === 'finish_service') {
          title = 'Service Completed';
          message = `Your detailing service is finished! Your car is ready for pick up or after-care review.`;
          sendStatusUpdateNotification(task.profiles.email, 'FINISHED', bookingInfo);
        } else if (rpcName === 'record_cash_payment') {
          title = 'Payment Received';
          message = `We have successfully recorded your payment of ₱${payload.p_amount}. Thank you!`;
          sendPaymentReceiptNotification(task.profiles.email, payload.p_amount, bookingInfo);
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
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollectCash = async (bookingId, intentId, totalAmount) => {
    const amount = prompt(`Enter amount collected (Total due: ₱${totalAmount}):`, totalAmount);
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    await handleRpcAction('record_cash_payment', bookingId, { p_amount: parseFloat(amount) });
  };

  const cardStyle = {
    background: 'var(--bg-card)',
    backdropFilter: 'var(--blur-amount)',
    WebkitBackdropFilter: 'var(--blur-amount)',
    border: '1px solid var(--glass-border)',
    borderRadius: '1.25rem',
    overflow: 'hidden',
    boxShadow: 'var(--card-shadow)',
    color: 'var(--card-text)'
  };

  const statusBadgeStyle = (status) => {
    const colors = {
      NOT_STARTED: { bg: 'rgba(255,255,255,0.05)', text: 'var(--card-text)', opacity: 0.7 },
      IN_PROGRESS: { bg: 'rgba(56, 189, 248, 0.2)', text: '#38bdf8' },
      FINISHED: { bg: 'var(--success-color)', text: 'var(--bg-card)', opacity: 1 }
    };
    const style = colors[status] || colors.NOT_STARTED;
    return {
      background: style.bg,
      color: style.text,
      opacity: style.opacity || 1,
      padding: '0.35rem 0.75rem',
      borderRadius: '2rem',
      fontSize: '0.7rem',
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    };
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <PageHeader 
        badge="STAFF PORTAL"
        title="My Assigned Tasks"
        subtitle="Manage your daily detailing operations and service milestones."
        onRefresh={fetchTasks}
      />

      {tasks.length === 0 ? (
        <div style={{ ...cardStyle, padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={40} style={{ opacity: 0.2 }} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '900' }}>YOU'RE ALL CAUGHT UP!</h3>
            <p style={{ color: 'var(--card-text)', opacity: 0.7, fontWeight: '600' }}>No active tasks assigned to your schedule today.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
          {tasks.map(task => {
            const isStarted = task.service_status === 'IN_PROGRESS';
            const isFinished = task.service_status === 'FINISHED';
            const paymentIntent = task.payment_intents?.[0];
            const needsCashCollection = isFinished && paymentIntent?.method === 'CASH' && paymentIntent?.status !== 'PAID';

            return (
              <div key={task.id} style={cardStyle}>
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '900', color: 'var(--card-text)' }}>{task.vehicle_brand} {task.vehicle_model}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--card-text)', opacity: 0.8, fontWeight: '900', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        <div style={{ width: '6px', height: '6px', background: 'var(--card-text)', borderRadius: '50%' }}></div>
                        {task.plate_number}
                      </div>
                    </div>
                    <span style={statusBadgeStyle(task.service_status)}>
                      {task.service_status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--card-text)', opacity: 0.7 }}>
                      <Clock size={18} />
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5 }}>SCHEDULED</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--card-text)' }}>{new Date(task.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--card-text)', opacity: 0.7 }}>
                      <DollarSign size={18} />
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5 }}>PAYMENT</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--card-text)' }}>{paymentIntent?.method}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.6, marginBottom: '0.75rem', letterSpacing: '1px' }}>SELECTED SERVICES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {task.booking_services.map((bs, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--card-text)', opacity: 0.7 }}>
                          {bs.service_name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.7, letterSpacing: '1px' }}>SERVICE NOTES</label>
                    <textarea 
                      placeholder="Add observations, damage photos link, or extra work done..."
                      defaultValue={task.staff_notes}
                      onBlur={(e) => handleUpdateNotes(task.id, e.target.value)}
                      style={{ 
                        width: '100%', 
                        minHeight: '80px', 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        borderRadius: '0.75rem', 
                        padding: '0.75rem', 
                        color: 'var(--card-text)', 
                        fontSize: '0.85rem',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ padding: '1rem 2rem 2rem 2rem', display: 'flex', gap: '1rem' }}>
                  {!isStarted && !isFinished && (
                    <button 
                      onClick={() => handleRpcAction('start_service', task.id)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '1rem', background: 'var(--primary-color)', color: 'var(--card-text)', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {actionLoading === task.id ? <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid var(--card-text)', borderTopColor: 'transparent', borderRadius: '50%' }}></div> : <Play size={18} fill="currentColor" />}
                      START SERVICE
                    </button>
                  )}

                  {isStarted && !isFinished && (
                    <button 
                      onClick={() => handleRpcAction('finish_service', task.id)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '1rem', background: '#4ade80', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {actionLoading === task.id ? <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%' }}></div> : <CheckSquare size={18} />}
                      FINISH SERVICE
                    </button>
                  )}

                  {needsCashCollection && (
                    <button 
                      onClick={() => handleCollectCash(task.id, paymentIntent.id, paymentIntent.total_amount)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '1rem', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <DollarSign size={18} /> COLLECT ₱{paymentIntent.total_amount}
                    </button>
                  )}

                  {!needsCashCollection && isFinished && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '700' }}>
                      SERVICE COMPLETED & PAID
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default StaffTasks;
