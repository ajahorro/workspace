import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Play, CheckSquare, DollarSign, Clock, X, Banknote } from 'lucide-react';
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

  // Fix #1: Cash collection modal state (replaces browser prompt())
  const [cashModal, setCashModal] = useState({ open: false, bookingId: null, balance: 0 });
  const [cashInput, setCashInput] = useState('');

  useEffect(() => {
    if (user) {
      fetchTasks();

      // Fix #2: Real-time listener — re-fetch tasks whenever bookings assigned to this staff change
      const channel = supabase
        .channel(`staff-tasks-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookings_v2',
          filter: `staff_id=eq.${user.id}`
        }, () => {
          fetchTasks();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    // Fetch assigned bookings (including closed/cancelled)
    const { data, error } = await supabase
      .from('bookings_v2')
      .select(`
        *,
        customer:profiles!customer_id(full_name, email),
        booking_services:booking_services_v2(service:services_v2(name)),
        payments:payments_v2(*)
      `)
      .eq('staff_id', user.id)
      .in('status', ['scheduled', 'in_progress', 'completed'])
      .order('start_datetime', { ascending: true });

    if (data) {
      const mappedTasks = data.map(t => ({
        ...t,
        booking_services: t.booking_services.map(bs => ({ service_name: bs.service?.name })),
        payments: t.payments || []
      }));
      setTasks(mappedTasks);
    }
    setLoading(false);
  };

  const handleUpdateNotes = async (bookingId, notes) => {
    try {
      const { error } = await supabase
        .from('bookings_v2')
        .update({ staff_notes: notes })
        .eq('id', bookingId);
      if (error) throw error;
      toast.success('Notes saved', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
    } catch (err) {
      toast.error('Failed to save notes', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    }
  };

  const handleAction = async (type, bookingId, payload = {}) => {
    setActionLoading(bookingId);
    try {
      let updateData = {};
      let title = '';
      let message = '';
      const task = tasks.find(t => t.id === bookingId);
      const bookingInfo = { vehicle: `${task.vehicle_brand} ${task.vehicle_model}` };

      if (type === 'start') {
        updateData = { service_status: 'IN_PROGRESS', status: 'in_progress' };
        title = 'Service Started';
        message = `Great news! We've started working on your ${task.vehicle_brand}.`;
        sendStatusUpdateNotification(task.customer.email, 'in_progress', bookingInfo);
      } else if (type === 'finish') {
        updateData = { service_status: 'FINISHED', status: 'completed' };
        title = 'Service Completed';
        message = `Your detailing service is finished! Your car is ready for pick up.`;
        sendStatusUpdateNotification(task.customer.email, 'completed', bookingInfo);
      } else if (type === 'pay') {
        const { error: payErr } = await supabase.rpc('record_payment_v2', {
          p_booking_id: bookingId,
          p_amount: payload.amount,
          p_method: 'CASH'
        });
        if (payErr) throw payErr;

        title = 'Payment Received';
        message = `We have successfully recorded your payment of ₱${payload.amount}. Thank you!`;
        sendPaymentReceiptNotification(task.customer.email, payload.amount, bookingInfo);
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('bookings_v2')
          .update(updateData)
          .eq('id', bookingId);
        if (error) throw error;
      }

      if (title) {
        // Notify Customer
        await supabase.from('notifications').insert({
          user_id: task.customer_id,
          title,
          message,
          type: 'info',
          action_url: `/my-bookings/${task.id}`
        });

        // Notify Admins
        try {
          const { data: admins } = await supabase.from('profiles').select('id').in('role', ['ADMIN', 'SUPER_ADMIN']);
          if (admins && admins.length > 0) {
            const adminNotifs = admins.map(admin => ({
              user_id: admin.id,
              title,
              message: `[STAFF UPDATE] ${message}`,
              type: 'info',
              action_url: `/admin/bookings/${task.id}`
            }));
            await supabase.from('notifications').insert(adminNotifs);
          }
        } catch (adminErr) {
          console.error('Admin notification failed:', adminErr);
        }
      }

      toast.success(title || 'Action completed', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });

      await fetchTasks();
    } catch (err) {
      toast.error(`Action failed: ${err.message}`, {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Fix #1: Proper modal-based cash collection (replaces browser prompt())
  // Fix #6: Shows remaining balance, not total price
  const openCashModal = (bookingId, totalPrice, totalPaid) => {
    const balance = Math.max(0, totalPrice - totalPaid);
    setCashModal({ open: true, bookingId, balance });
    setCashInput(String(balance));
  };

  const handleCashModalSubmit = async () => {
    const amount = parseFloat(cashInput);
    if (!cashInput || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (amount > cashModal.balance) {
      toast.error(`Amount cannot exceed the balance of ₱${cashModal.balance}`);
      return;
    }
    setCashModal({ open: false, bookingId: null, balance: 0 });
    setCashInput('');
    await handleAction('pay', cashModal.bookingId, { amount });
  };

  const cardStyle = {
    background: 'var(--admin-card)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid var(--admin-border)',
    borderRadius: '1.25rem',
    overflow: 'hidden',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)'
  };

  const statusBadgeStyle = (status) => {
    const colors = {
      NOT_STARTED: { bg: 'var(--admin-bg)', text: 'var(--admin-text-secondary)', opacity: 0.7 },
      IN_PROGRESS: { bg: 'rgba(169, 27, 24, 0.1)', text: 'var(--admin-brand)' },
      FINISHED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', opacity: 1 }
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
      letterSpacing: '1px',
      border: `1px solid ${style.text}33`
    };
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="STAFF PORTAL"
        title="My Assigned Tasks"
        subtitle="Manage your daily detailing operations and service milestones."
        onRefresh={fetchTasks}
      />

      {tasks.length === 0 ? (
        <div style={{ ...cardStyle, padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--admin-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--admin-border)' }}>
            <CheckSquare size={40} style={{ color: 'var(--admin-text-secondary)', opacity: 0.2 }} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>YOU'RE ALL CAUGHT UP!</h3>
            <p style={{ color: 'var(--admin-text-secondary)', opacity: 0.7, fontWeight: '600' }}>No active tasks assigned to your schedule today.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
          {tasks.map(task => {
            const isStarted = task.service_status === 'IN_PROGRESS';
            const isFinished = task.service_status === 'FINISHED';
            
            const totalPaid = task.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
            // Fix #6: Calculate remaining balance, not just total
            const balance = Math.max(0, task.total_price - totalPaid);
            const needsCashCollection = isFinished && task.payment_method === 'CASH' && balance > 0;

            return (
              <div key={task.id} style={cardStyle}>
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{task.vehicle_brand} {task.vehicle_model}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-secondary)', opacity: 0.8, fontWeight: '900', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                        <div style={{ width: '6px', height: '6px', background: 'var(--admin-brand)', borderRadius: '50%' }}></div>
                        {task.plate_number}
                      </div>
                    </div>
                    {/* Fix #22: Use regex replace for all underscores */}
                    <span style={statusBadgeStyle(task.service_status)}>
                      {task.service_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                      <Clock size={18} color="var(--admin-brand)" />
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5 }}>SCHEDULED</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{new Date(task.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                      <DollarSign size={18} color="var(--admin-brand)" />
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.5 }}>PAYMENT</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{task.payment_method || 'CASH'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--admin-bg)', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', opacity: 0.6, marginBottom: '0.75rem', letterSpacing: '1px' }}>SELECTED SERVICES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {task.booking_services.map((bs, i) => (
                        <span key={i} style={{ background: 'var(--admin-card)', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)' }}>
                          {bs.service_name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', opacity: 0.7, letterSpacing: '1px' }}>SERVICE NOTES</label>
                      <textarea 
                        placeholder="Add observations, damage photos link, or extra work done..."
                        defaultValue={task.staff_notes}
                        onBlur={(e) => handleUpdateNotes(task.id, e.target.value)}
                        style={{ 
                          width: '100%', 
                          minHeight: '80px', 
                          background: 'var(--admin-bg)', 
                          border: '1px solid var(--admin-border)', 
                          borderRadius: '0.75rem', 
                          padding: '0.75rem', 
                          color: 'var(--admin-text-primary)', 
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
                      onClick={() => handleAction('start', task.id)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '1rem', background: 'var(--admin-brand)', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {actionLoading === task.id ? <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%' }}></div> : <Play size={18} fill="currentColor" />}
                      START SERVICE
                    </button>
                  )}

                  {isStarted && !isFinished && (
                    <button 
                      onClick={() => handleAction('finish', task.id)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '1rem', background: '#4ade80', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      {actionLoading === task.id ? <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%' }}></div> : <CheckSquare size={18} />}
                      FINISH SERVICE
                    </button>
                  )}

                  {/* Fix #1 & #6: Collect button now shows balance, opens modal instead of prompt() */}
                  {needsCashCollection && (
                    <button 
                      onClick={() => openCashModal(task.id, task.total_price, totalPaid)}
                      disabled={actionLoading === task.id}
                      style={{ flex: 1, padding: '1rem', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Banknote size={18} /> COLLECT ₱{balance.toLocaleString()}
                    </button>
                  )}

                  {!needsCashCollection && isFinished && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '1rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: '700', border: '1px solid var(--admin-border)' }}>
                      SERVICE COMPLETED & PAID
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fix #1: Cash Collection Modal — replaces browser prompt() */}
      {cashModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
          <div style={{ background: 'var(--admin-card)', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', color: 'var(--admin-text-primary)', animation: 'modalFadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Banknote size={22} color="#fbbf24" />
                </div>
                <div>
                  <div style={{ fontWeight: '900', fontSize: '1rem' }}>COLLECT CASH</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>Balance Due</div>
                </div>
              </div>
              <button onClick={() => { setCashModal({ open: false, bookingId: null, balance: 0 }); setCashInput(''); }} style={{ background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--admin-bg)', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid var(--admin-border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount Due from Customer</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24' }}>₱{cashModal.balance.toLocaleString()}</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount Collected</label>
              <input
                type="number"
                value={cashInput}
                onChange={e => setCashInput(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '1rem', background: 'var(--admin-bg)', border: '2px solid #fbbf24', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontSize: '1.25rem', fontWeight: '800', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => { setCashModal({ open: false, bookingId: null, balance: 0 }); setCashInput(''); }}
                style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCashModalSubmit}
                style={{ flex: 2, padding: '1rem', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.95rem' }}
              >
                Confirm & Record
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default StaffTasks;
