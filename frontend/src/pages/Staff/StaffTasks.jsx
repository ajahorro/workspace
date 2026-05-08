import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Play, 
  CheckSquare, 
  DollarSign, 
  Clock, 
  X, 
  Banknote, 
  Car, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle,
  ChevronRight,
  User,
  Hash,
  Activity,
  MessageCircle
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import BookingChat from '../../components/BookingChat';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

const StaffTasks = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [cashModal, setCashModal] = useState({ open: false, bookingId: null, balance: 0 });
  const [batchConfirm, setBatchConfirm] = useState({ open: false, bookingId: null, count: 0 });
  const [activeChatId, setActiveChatId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
      const channel = supabase.channel(`staff-tasks-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `staff_id=eq.${user.id}` }, () => fetchTasks())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_vehicles' }, () => fetchTasks())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('staff_id', user.id)
        .in('status', ['scheduled', 'ongoing', 'completed', 'curing', 'ready_for_pickup'])
        .order('start_datetime', { ascending: true });

      if (bErr) throw bErr;
      if (!bookings || bookings.length === 0) {
        setTasks([]);
        return;
      }

      const bookingIds = bookings.map(b => b.id);
      const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', customerIds);
      const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

      const { data: vehicles } = await supabase.from('booking_vehicles').select('*').in('booking_id', bookingIds);
      const vehicleIds = (vehicles || []).map(v => v.id);

      let serviceMap = {};
      if (vehicleIds.length > 0) {
        const { data: services } = await supabase.from('booking_vehicle_services').select('*').in('vehicle_id', vehicleIds);
        serviceMap = (services || []).reduce((acc, s) => {
          if (!acc[s.vehicle_id]) acc[s.vehicle_id] = [];
          acc[s.vehicle_id].push(s);
          return acc;
        }, {});
      }

      const { data: payments } = await supabase.from('payments').select('*').in('booking_id', bookingIds);
      const paymentMap = (payments || []).reduce((acc, p) => {
        if (!acc[p.booking_id]) acc[p.booking_id] = [];
        acc[p.booking_id].push(p);
        return acc;
      }, {});

      const assembled = bookings.map(b => ({
        ...b,
        customer: profileMap[b.customer_id],
        vehicles: (vehicles || []).filter(v => v.booking_id === b.id).map(v => ({
          ...v,
          services: serviceMap[v.id] || []
        })),
        payments: paymentMap[b.id] || []
      }));

      setTasks(assembled);
    } catch (err) {
      console.error('Staff Fetch Error:', err);
      toast.error('Failed to sync tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleAction = async (type, vehicleId, bookingId) => {
    setActionLoading(vehicleId);
    try {
      const status = type === 'start' ? 'in_progress' : 'completed';
      const { error } = await supabase.from('booking_vehicles').update({ status }).eq('id', vehicleId);
      if (error) throw error;
      
      // If this is the first vehicle being started, mark the whole booking as 'ongoing'
      if (type === 'start') {
        const task = tasks.find(t => t.id === bookingId);
        if (task.status === 'scheduled') {
          await supabase.from('bookings').update({ status: 'ongoing' }).eq('id', bookingId);
        }
      }

      if (type === 'finish') {
        const task = tasks.find(t => t.id === bookingId);
        const vehicle = task.vehicles.find(v => v.id === vehicleId);
        await supabase.from('notifications').insert({
          user_id: task.customer_id,
          title: 'Vehicle Service Finalized! ✅',
          message: `Your ${vehicle.make} ${vehicle.model} is now ready for pickup.`,
          notification_type: 'VEHICLE_COMPLETED',
          action_url: `/my-bookings/${bookingId}?vehicle=${vehicleId}`
        });
      }

      toast.success(type === 'start' ? 'Service Started' : 'Service Completed');
      await fetchTasks();
    } catch (err) { toast.error('Action failed'); } finally { setActionLoading(null); }
  };

  const handleBatchComplete = async () => {
    const { bookingId } = batchConfirm;
    const task = tasks.find(t => t.id === bookingId);
    const targetVehicles = task.vehicles.filter(v => v.status !== 'completed');
    
    setActionLoading('batch-' + bookingId);
    setBatchConfirm({ open: false, bookingId: null, count: 0 });

    try {
      const { error } = await supabase.from('booking_vehicles').update({ status: 'completed' }).in('id', targetVehicles.map(v => v.id));
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: task.customer_id,
        title: 'Full Fleet Completed! 🏁',
        message: `All ${targetVehicles.length} remaining vehicles in your fleet session are now ready.`,
        notification_type: 'FLEET_COMPLETED',
        action_url: `/my-bookings/${bookingId}`
      });

      toast.success('All units completed successfully');
      await fetchTasks();
    } catch (err) { toast.error('Batch completion failed'); } finally { setActionLoading(null); }
  };

  const handlePayment = async (bookingId, amount) => {
    setActionLoading('payment-' + bookingId);
    try {
      const { error: payErr } = await supabase.rpc('submit_payment', { p_booking_id: bookingId, p_amount: amount, p_method: 'CASH', p_reference: 'HANDOVER_CASH', p_receipt_url: null, p_ocr_text: null });
      if (payErr) throw payErr;
      
      const task = tasks.find(t => t.id === bookingId);
      await supabase.from('notifications').insert({
         user_id: task.customer_id,
         title: 'Cash Payment Received 💵',
         message: `₱${amount.toLocaleString()} has been handed over to the technician and recorded.`,
         notification_type: 'PAYMENT_RECEIVED',
         action_url: `/my-bookings/${bookingId}`
      });

      toast.success('Handover Payment Recorded');
      setCashModal({ open: false, bookingId: null, balance: 0 });
      await fetchTasks();
    } catch (err) { toast.error('Payment failed'); } finally { setActionLoading(null); }
  };

  if (loading) return <LoadingState message="Syncing operational queue..." />;

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', text: 'QUEUED' },
      in_progress: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', text: 'ONGOING' },
      completed: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', text: 'FINISHED' }
    };
    const style = styles[status] || { bg: 'rgba(255,255,255,0.05)', color: '#fff', text: status.toUpperCase() };
    return (
      <span style={{ 
        padding: '0.3rem 0.75rem', 
        borderRadius: '2rem', 
        fontSize: '0.65rem', 
        fontWeight: '900', 
        background: style.bg, 
        color: style.color,
        border: `1px solid ${style.color}33`,
        letterSpacing: '1px'
      }}>
        {style.text}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="TECHNICIAN PORTAL" 
        title="OPERATIONAL QUEUE" 
        subtitle="Professional workflow management for assigned detailing units." 
        onRefresh={fetchTasks} 
      />

      {tasks.length === 0 ? (
        <div style={{ 
          background: 'var(--admin-card)', 
          border: '1px dashed var(--admin-border)', 
          borderRadius: '2rem', 
          padding: '8rem 2rem', 
          textAlign: 'center',
          color: 'var(--admin-text-secondary)'
        }}>
          <Activity size={64} strokeWidth={1} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>No active assignments</h3>
          <p style={{ fontWeight: '600', opacity: 0.7 }}>Enjoy the break! Your queue is currently empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {tasks.map(task => {
            const totalPaid = (task.payments || []).filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
            const balance = Math.max(0, (task.total_amount || 0) - totalPaid);
            const incompleteCount = task.vehicles?.filter(v => v.status !== 'completed').length || 0;

            return (
              <div key={task.id} className="fleet-card" style={{ 
                background: 'var(--admin-card)', 
                border: '1px solid var(--admin-border)', 
                borderRadius: '2rem', 
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
              }}>
                {/* Fleet Header */}
                <div style={{ 
                  padding: '1.5rem 2rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderBottom: '1px solid var(--admin-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem'
                }}>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '1rem', 
                      background: 'var(--admin-bg)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--admin-brand)',
                      border: '1px solid var(--admin-border)'
                    }}>
                      <User size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '950', letterSpacing: '-0.5px', color: 'var(--admin-text-primary)' }}>
                        {task.customer?.full_name}
                      </h3>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '800' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {new Date(task.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Hash size={14} /> {task.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button 
                      onClick={() => setActiveChatId(task.id)}
                      style={{ 
                        padding: '0.75rem 1.25rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--admin-border)', 
                        color: 'var(--admin-text-primary)', 
                        borderRadius: '1rem', 
                        fontWeight: '900', 
                        fontSize: '0.75rem', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <MessageCircle size={16} /> REPORT INCIDENT / CHAT
                    </button>
                    {incompleteCount > 0 && (
                      <button 
                        onClick={() => setBatchConfirm({ open: true, bookingId: task.id, count: incompleteCount })}
                        className="btn-primary"
                        style={{ 
                          padding: '0.75rem 1.5rem', 
                          background: 'transparent', 
                          border: '1px solid var(--admin-brand)', 
                          color: 'var(--admin-brand)', 
                          borderRadius: '1rem', 
                          fontWeight: '900', 
                          fontSize: '0.75rem', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <CheckSquare size={16} /> COMPLETE ALL UNITS
                      </button>
                    )}
                  </div>
                </div>

                {/* Fleet Units */}
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {task.vehicles?.map((v, idx) => (
                    <div key={v.id} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : '1.5fr 2fr 150px',
                      alignItems: 'center',
                      gap: '2rem',
                      padding: '1.5rem',
                      background: v.status === 'completed' ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.02)',
                      borderRadius: '1.5rem',
                      border: '1px solid var(--admin-border)',
                      position: 'relative',
                      opacity: v.status === 'completed' ? 0.7 : 1,
                      transition: 'all 0.3s ease'
                    }}>
                      {/* Vehicle Info */}
                      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '0.75rem', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border)' }}>
                          <Car size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--admin-text-primary)', textTransform: 'uppercase' }}>{v.make} {v.model}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginTop: '0.1rem' }}>PLATE: {v.plate_number}</div>
                        </div>
                      </div>

                      {/* Services */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {v.services?.map(s => (
                          <span key={s.id} style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '800', 
                            padding: '0.4rem 0.8rem', 
                            background: 'var(--admin-bg)', 
                            borderRadius: '0.75rem', 
                            border: '1px solid var(--admin-border)',
                            color: 'var(--admin-text-primary)'
                          }}>
                            {s.service_name_snapshot}
                          </span>
                        ))}
                      </div>

                      {/* Action */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        {v.status === 'scheduled' && (
                          <button 
                            onClick={() => handleVehicleAction('start', v.id, task.id)}
                            className="action-btn"
                            style={{ width: '100%', padding: '0.75rem', background: 'var(--admin-brand)', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                          >
                            <Play size={16} fill="white" /> START
                          </button>
                        )}
                        {v.status === 'in_progress' && (
                          <button 
                            onClick={() => handleVehicleAction('finish', v.id, task.id)}
                            className="action-btn"
                            style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                          >
                            <CheckCircle2 size={16} /> FINISH
                          </button>
                        )}
                        {v.status === 'completed' && getStatusBadge('completed')}
                      </div>
                    </div>
                  ))}

                  {/* Settlement Section */}
                  {incompleteCount === 0 && balance > 0 && (
                    <div style={{ 
                      marginTop: '1rem',
                      padding: '2rem', 
                      background: 'rgba(251, 191, 36, 0.05)', 
                      borderRadius: '1.5rem', 
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1.5rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>Action Required</div>
                        <h4 style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: '950', color: '#fbbf24' }}>Handover Settlement Pending</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>Collect ₱{balance.toLocaleString()} from the customer to finalize the session.</p>
                      </div>
                      <button 
                        onClick={() => setCashModal({ open: true, bookingId: task.id, balance })}
                        style={{ 
                          padding: '1rem 2rem', 
                          background: '#fbbf24', 
                          color: '#000', 
                          borderRadius: '1rem', 
                          border: 'none', 
                          fontWeight: '950', 
                          fontSize: '0.9rem', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          boxShadow: '0 10px 30px rgba(251, 191, 36, 0.2)'
                        }}
                      >
                        <Banknote size={20} /> RECORD CASH RECEIVED
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALS (Styled with premium Glassmorphism) */}
      {batchConfirm.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <AlertTriangle size={64} color="#f59e0b" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: '950', color: '#fff', margin: 0 }}>Batch Completion</h2>
            <p style={{ opacity: 0.7, margin: '1rem 0 2.5rem', fontWeight: '600', lineHeight: '1.6' }}>
              Finalize all {batchConfirm.count} remaining units in this fleet? This will notify the customer for pickup.
            </p>
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button onClick={() => setBatchConfirm({ open: false, bookingId: null, count: 0 })} className="modal-btn-secondary">CANCEL</button>
              <button onClick={handleBatchComplete} className="modal-btn-primary" style={{ background: '#10b981' }}>FINALIZE ALL</button>
            </div>
          </div>
        </div>
      )}

      {cashModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Banknote size={64} color="#fbbf24" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: '950', color: '#fff', margin: 0 }}>Handover Settlement</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '1.5rem', margin: '2rem 0', width: '100%', border: '1px solid var(--admin-border)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Amount to Collect</div>
              <div style={{ fontSize: '3.5rem', fontWeight: '950', color: '#fbbf24', letterSpacing: '-1px' }}>₱{cashModal.balance.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button onClick={() => setCashModal({ open: false, bookingId: null, balance: 0 })} className="modal-btn-secondary">CANCEL</button>
              <button onClick={() => handlePayment(cashModal.bookingId, cashModal.balance)} className="modal-btn-primary" style={{ background: '#fbbf24', color: '#000' }}>RECORD HANDOVER</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {activeChatId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ 
            maxWidth: '700px', 
            height: isMobile ? '100vh' : '85vh', 
            borderRadius: isMobile ? '0' : '2.5rem',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--admin-border)',
            boxShadow: '0 50px 100px rgba(0,0,0,0.5)'
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--admin-brand)11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-brand)' }}>
                  <MessageCircle size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '950' }}>INCIDENT REPORT & CHAT</h3>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>BOOKING #{activeChatId.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setActiveChatId(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', width: '100%' }}>
              <BookingChat bookingId={activeChatId} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fleet-card { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .fleet-card:hover { transform: translateY(-4px); box-shadow: 0 30px 60px rgba(0,0,0,0.2); border-color: var(--admin-brand); }
        .action-btn { transition: all 0.2s ease; }
        .action-btn:hover { filter: brightness(1.1); transform: scale(1.02); }
        .btn-primary:hover { background: rgba(255,255,255,0.05) !important; transform: scale(1.02); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(15px); display: flex; align-items: center; justify-content: center; z-index: 100000; padding: 1rem; }
        .modal-content { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); padding: 3rem; border-radius: 2.5rem; max-width: 500px; width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: 0 50px 100px rgba(0,0,0,0.5); }
        .modal-btn-secondary { flex: 1; padding: 1.25rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 1.25rem; font-weight: 900; cursor: pointer; transition: all 0.3s ease; }
        .modal-btn-primary { flex: 2; padding: 1.25rem; border: none; border-radius: 1.25rem; font-weight: 950; cursor: pointer; transition: all 0.3s ease; }
        .modal-btn-primary:hover, .modal-btn-secondary:hover { transform: translateY(-2px); filter: brightness(1.1); }
      `}</style>
    </div>
  );
};

export default StaffTasks;
