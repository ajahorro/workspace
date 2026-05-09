import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Play, CheckCircle2, Clock, Car, Banknote, Loader2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import toast from 'react-hot-toast';

const StaffTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
      const sub = supabase.channel(`staff-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_vehicles' }, fetchTasks)
        .subscribe();
      return () => supabase.removeChannel(sub);
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('bookings')
      .select('*, customer:profiles!customer_id(*), vehicles:booking_vehicles(*, services:booking_vehicle_services(*))')
      .eq('staff_id', user.id)
      .in('status', ['scheduled', 'confirmed'])
      .order('start_datetime', { ascending: true });
    
    if (data) setTasks(data);
    setLoading(false);
  };

  const updateVehicleStatus = async (vehicleId, status) => {
    const { error } = await supabase.from('booking_vehicles').update({ status }).eq('id', vehicleId);
    if (error) toast.error('Update failed');
    else {
      toast.success(`Unit marked as ${status.replace('_', ' ')}`);
      fetchTasks();
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
      <PageHeader title="OPERATIONAL QUEUE" subtitle="Manage your assigned fleet units" />

      {tasks.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>No active assignments.</div>
      ) : tasks.map(task => (
        <div key={task.id} style={{ background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--admin-border)' }}>
            <h3 style={{ margin: 0 }}>{task.customer?.full_name}</h3>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}><Clock size={12} /> {new Date(task.start_datetime).toLocaleTimeString()}</span>
          </div>

          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {task.vehicles?.map(v => (
              <div key={v.id} style={{ padding: '1rem', border: '1px solid #333', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{v.make} {v.model} ({v.plate_number})</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{v.status.toUpperCase()}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {v.status === 'queued' && (
                    <button onClick={() => updateVehicleStatus(v.id, 'in_progress')} style={{ padding: '0.5rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.4rem' }}><Play size={16}/></button>
                  )}
                  {v.status === 'in_progress' && (
                    <button onClick={() => updateVehicleStatus(v.id, 'completed')} style={{ padding: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.4rem' }}><CheckCircle2 size={16}/></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaffTasks;