import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Play, CheckSquare, DollarSign, Clock, X, Banknote, Car, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

const StaffTasks = () => {
  const { user, profile } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [cashModal, setCashModal] = useState({ open: false, bookingId: null, balance: 0 });
  const [cashInput, setCashInput] = useState('');
  
  // Batch Action Confirmation
  const [batchConfirm, setBatchConfirm] = useState({ open: false, bookingId: null, count: 0 });

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
    const { data } = await supabase.from('bookings')
      .select('*, customer:profiles!customer_id(full_name, email), vehicles:booking_vehicles(*, services:booking_vehicle_services(*)), payments:payments(*)')
      .eq('staff_id', user.id)
      .in('status', ['scheduled', 'completed', 'ongoing'])
      .order('start_datetime', { ascending: true });
    if (data) setTasks(data);
    setLoading(false);
  };

  const handleVehicleAction = async (type, vehicleId, bookingId) => {
    setActionLoading(vehicleId);
    try {
      const status = type === 'start' ? 'in_progress' : 'completed';
      const { error } = await supabase.from('booking_vehicles').update({ status }).eq('id', vehicleId);
      if (error) throw error;
      
      // Notify customer of individual unit completion
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

      // Notification for full fleet completion
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

  const cardStyle = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '1.25rem', overflow: 'hidden', color: 'var(--admin-text-primary)' };

  if (loading) return <LoadingState message="Syncing task queue..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
      <PageHeader badge="STAFF HUB" title="OPERATIONAL QUEUE" subtitle="Manage your assigned detailing units and finalize sessions." onRefresh={fetchTasks} />

      {tasks.length === 0 ? (
        <div style={{ ...cardStyle, padding: '5rem 2rem', textAlign: 'center', opacity: 0.6 }}>No active assignments for today.</div>
      ) : tasks.map(task => {
        const totalPaid = (task.payments || []).filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
        const balance = Math.max(0, (task.total_amount || 0) - totalPaid);
        const incompleteCount = task.vehicles?.filter(v => v.status !== 'completed').length || 0;

        return (
          <div key={task.id} style={cardStyle}>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: '950', fontSize: '1.25rem' }}>{task.customer?.full_name}</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text-secondary)', fontWeight: '800' }}>
                  <span><Clock size={14} /> {new Date(task.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span><Car size={14} /> {task.vehicles?.length} Units</span>
                </div>
              </div>
              {incompleteCount > 1 && (
                <button onClick={() => setBatchConfirm({ open: true, bookingId: task.id, count: incompleteCount })} style={{ padding: '0.6rem 1.25rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.6rem', fontWeight: '900', fontSize: '0.7rem', cursor: 'pointer' }}>COMPLETE ALL UNITS</button>
              )}
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {task.vehicles?.map(v => (
                <div key={v.id} style={{ border: '1px solid var(--admin-border)', borderRadius: '0.75rem', overflow: 'hidden', background: v.status === 'completed' ? 'rgba(16, 185, 129, 0.02)' : 'transparent' }}>
                   <div style={{ padding: '0.75rem 1.25rem', background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between' }}>
                     <div style={{ fontWeight: '900' }}>{v.make} {v.model} ({v.plate_number})</div>
                     <span style={{ fontSize: '0.65rem', fontWeight: '950', color: v.status === 'completed' ? '#10b981' : (v.status === 'in_progress' ? 'var(--admin-brand)' : 'var(--admin-text-secondary)') }}>{v.status.toUpperCase()}</span>
                   </div>
                   <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {v.services?.map(s => <span key={s.id} style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.4rem', border: '1px solid var(--admin-border)' }}>{s.service_name_snapshot}</span>)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {v.status === 'scheduled' && <button onClick={() => handleVehicleAction('start', v.id, task.id)} style={{ padding: '0.6rem 1rem', background: 'var(--admin-brand)', color: 'white', borderRadius: '0.5rem', border: 'none', fontWeight: '900', cursor: 'pointer' }}><Play size={16} /></button>}
                        {v.status === 'in_progress' && <button onClick={() => handleVehicleAction('finish', v.id, task.id)} style={{ padding: '0.6rem 1rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', border: 'none', fontWeight: '900', cursor: 'pointer' }}><CheckCircle2 size={16} /></button>}
                      </div>
                   </div>
                </div>
              ))}

              {incompleteCount === 0 && balance > 0 && (
                <button onClick={() => setCashModal({ open: true, bookingId: task.id, balance })} style={{ width: '100%', padding: '1.25rem', background: '#fbbf24', color: 'black', borderRadius: '0.75rem', border: 'none', fontWeight: '950', fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <Banknote size={24} /> COLLECT SETTLEMENT: ₱{balance.toLocaleString()}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* SAFETY MODAL: BATCH COMPLETE */}
      {batchConfirm.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ ...cardStyle, width: '400px', padding: '2.5rem', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 1.5rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '950' }}>BATCH COMPLETION</h3>
            <p style={{ color: 'var(--admin-text-secondary)', fontWeight: '600', margin: '1rem 0 2rem' }}>Are you sure you want to finalize all <strong>{batchConfirm.count} remaining units</strong>? This action will notify the customer for pickup.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setBatchConfirm({ open: false, bookingId: null, count: 0 })} style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>CANCEL</button>
              <button onClick={handleBatchComplete} style={{ flex: 2, padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}>YES, FINALIZE ALL</button>
            </div>
          </div>
        </div>
      )}

      {/* CASH MODAL */}
      {cashModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ ...cardStyle, width: '400px', padding: '2.5rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: '950' }}>Handover Settlement</h3>
            <div style={{ background: 'var(--admin-bg)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid var(--admin-border)', marginBottom: '1.5rem' }}>
               <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Balance to Collect</div>
               <div style={{ fontSize: '2.5rem', fontWeight: '950', color: '#fbbf24' }}>₱{cashModal.balance.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setCashModal({ open: false, bookingId: null, balance: 0 })} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}>CANCEL</button>
              <button onClick={() => handlePayment(cashModal.bookingId, cashModal.balance)} style={{ flex: 2, padding: '1rem', background: '#fbbf24', color: 'black', borderRadius: '0.75rem', border: 'none', fontWeight: '950', cursor: 'pointer' }}>RECORD RECEIVED</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTasks;
