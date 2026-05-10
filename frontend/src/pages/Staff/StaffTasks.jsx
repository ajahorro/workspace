import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  Play, CheckCircle2, Clock, Car, Calendar as CalendarIcon, 
  List, PlusSquare, ArrowRight, ShieldAlert
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const StaffTasks = () => {
  const { user, profile } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  
  const [activeTab, setActiveTab] = useState('QUEUE'); 
  const [myTasks, setMyTasks] = useState([]);
  const [openTasks, setOpenTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const waitTimer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(waitTimer);
    }

    fetchData(); 

    const failsafe = setTimeout(() => {
      setLoading(false);
    }, 3000);

    const sub = supabase.channel(`staff-hub-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_vehicles' }, () => fetchData())
      .subscribe();
      
    return () => {
      clearTimeout(failsafe);
      supabase.removeChannel(sub);
    };
  }, [user]);

  const fetchData = async () => {
    try {
      // 1. Fetch My Assigned Bookings (FIXED HINT: !customer_id)
      const { data: myBookings, error: myError } = await supabase.from('bookings')
        .select('*, customer:profiles!customer_id(*)')
        .eq('staff_id', user.id)
        .in('status', ['scheduled', 'in_progress', 'confirmed'])
        .order('start_datetime', { ascending: true });
        
      if (myError) throw myError;

      // 2. Fetch Unassigned "Open Board" Bookings (FIXED HINT: !customer_id)
      const { data: openBookings, error: openError } = await supabase.from('bookings')
        .select('*, customer:profiles!customer_id(*)')
        .is('staff_id', null)
        .in('status', ['scheduled', 'confirmed'])
        .order('start_datetime', { ascending: true });

      if (openError) throw openError;

      // 3. Gather all Booking IDs we just found
      const allBookingIds = [...(myBookings || []), ...(openBookings || [])].map(b => b.id);

      // 4. Safely fetch all vehicles (and their services) for these specific bookings
      let allVehicles = [];
      if (allBookingIds.length > 0) {
        const { data: vData, error: vError } = await supabase
          .from('booking_vehicles')
          .select('*, services:booking_vehicle_services(*)')
          .in('booking_id', allBookingIds);
          
        if (vError) throw vError;
        allVehicles = vData || [];
      }

      // 5. Stitch them together
      const myDataWithVehicles = (myBookings || []).map(b => ({
        ...b,
        vehicles: allVehicles.filter(v => v.booking_id === b.id)
      }));

      const openDataWithVehicles = (openBookings || []).map(b => ({
        ...b,
        vehicles: allVehicles.filter(v => v.booking_id === b.id)
      }));

      setMyTasks(myDataWithVehicles);
      setOpenTasks(openDataWithVehicles);

    } catch (error) {
      console.error("Operations Sync Error:", error);
      toast.error('Failed to sync operations board');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTask = async (bookingId) => {
    try {
      const { error } = await supabase.from('bookings').update({ staff_id: user.id }).eq('id', bookingId);
      if (error) throw error;
      toast.success('Reservation Claimed! Added to your Queue.');
      fetchData();
    } catch (err) {
      toast.error('Failed to claim task. Someone else may have grabbed it!');
    }
  };

  const updateVehicleStatus = async (vehicleId, currentStatus, bookingId, vehiclesArray) => {
    const newStatus = currentStatus === 'in_progress' ? 'completed' : 'in_progress';
    try {
      await supabase.from('booking_vehicles').update({ status: newStatus }).eq('id', vehicleId);
      
      if (newStatus === 'completed') {
        const updatedVehicles = vehiclesArray.map(v => v.id === vehicleId ? { ...v, status: 'completed' } : v);
        if (updatedVehicles.every(v => v.status === 'completed')) {
          await supabase.from('bookings').update({ service_status: 'completed', status: 'completed' }).eq('id', bookingId);
          toast.success('All units finished. Booking completed!');
        } else {
          toast.success(`Vehicle marked as completed.`);
        }
      } else {
        await supabase.from('bookings').update({ service_status: 'in_progress' }).eq('id', bookingId);
        toast.success('Vehicle service started.');
      }
      fetchData();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  if (loading) return <LoadingState message="Syncing Dispatch Board..." />;

  const cardStyle = { background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', overflow: 'hidden' };
  const tabStyle = (tabName) => ({
    padding: '0.75rem 1.5rem', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
    background: activeTab === tabName ? 'var(--admin-brand)' : 'transparent',
    color: activeTab === tabName ? 'white' : 'var(--admin-text-secondary)',
    borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
  });

  const groupedSchedule = myTasks.reduce((acc, task) => {
    const date = new Date(task.start_datetime).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        title="OPERATIONS HUB" 
        subtitle={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'Technician'}. Manage your workflow.`} 
        onRefresh={fetchData}
      />

      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--admin-input-bg)', padding: '0.5rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', width: 'fit-content', overflowX: 'auto', maxWidth: '100%' }}>
        <button style={tabStyle('QUEUE')} onClick={() => setActiveTab('QUEUE')}><List size={16}/> MY QUEUE ({myTasks.filter(t => t.status !== 'completed').length})</button>
        <button style={tabStyle('OPEN_BOARD')} onClick={() => setActiveTab('OPEN_BOARD')}><PlusSquare size={16}/> OPEN BOARD ({openTasks.length})</button>
        <button style={tabStyle('CALENDAR')} onClick={() => setActiveTab('CALENDAR')}><CalendarIcon size={16}/> SCHEDULE</button>
      </div>

      {activeTab === 'QUEUE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {myTasks.filter(t => t.status !== 'completed').length === 0 ? (
            <div style={{ ...cardStyle, padding: '4rem', textAlign: 'center', opacity: 0.5, borderStyle: 'dashed' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>QUEUE CLEAR</div>
              <div>Check the Open Board for available reservations.</div>
            </div>
          ) : myTasks.filter(t => t.status !== 'completed').map(task => (
            <div key={task.id} style={cardStyle}>
              <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.2rem', fontWeight: '900' }}>{task.customer?.full_name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--admin-brand)', fontWeight: '700' }}><Clock size={12} style={{ display: 'inline', marginBottom: '-2px' }}/> {new Date(task.start_datetime).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: '900', padding: '0.3rem 0.8rem', borderRadius: '2rem', border: '1px solid currentColor', color: task.service_status === 'in_progress' ? '#a855f7' : 'var(--admin-text-secondary)' }}>
                  MASTER: {task.service_status?.replace('_', ' ').toUpperCase() || 'QUEUED'}
                </div>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {task.vehicles?.map(v => (
                  <div key={v.id} style={{ padding: '1rem 1.5rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900' }}>{v.make} {v.model}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '700', marginBottom: '0.5rem' }}>PLATE: {v.plate_number}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {v.services?.map(s => <span key={s.id} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--admin-border)', borderRadius: '0.3rem', fontSize: '0.7rem', fontWeight: '800' }}>{s.service_name_snapshot}</span>)}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => updateVehicleStatus(v.id, v.status, task.id, task.vehicles)} 
                      style={{ 
                        padding: '0.75rem 1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        background: v.status === 'in_progress' ? '#10b981' : (v.status === 'completed' ? 'var(--admin-bg)' : 'var(--admin-brand)'),
                        color: v.status === 'completed' ? 'var(--admin-text-secondary)' : '#fff'
                      }}
                    >
                      {v.status === 'in_progress' ? <><CheckCircle2 size={16}/> MARK COMPLETED</> : (v.status === 'completed' ? 'FINISHED' : <><Play size={16}/> START UNIT</>)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'OPEN_BOARD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1rem', borderRadius: '0.75rem', color: '#3b82f6', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} /> Unassigned reservations. Click 'Claim' to add them to your queue.
          </div>
          
          {openTasks.length === 0 ? (
            <div style={{ ...cardStyle, padding: '4rem', textAlign: 'center', opacity: 0.5, borderStyle: 'dashed' }}>No open reservations at this time.</div>
          ) : openTasks.map(task => (
            <div key={task.id} style={{ ...cardStyle, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.2rem', fontWeight: '900' }}>{task.customer?.full_name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}><Clock size={12} style={{ display: 'inline', marginBottom: '-2px' }}/> {new Date(task.start_datetime).toLocaleString()}</span>
                <div style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: '800' }}>
                  <Car size={14} style={{ display: 'inline', marginBottom: '-2px', color: 'var(--admin-brand)' }}/> {task.vehicles?.length} Unit(s) to Service
                </div>
              </div>
              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', width: isMobile ? '100%' : 'auto', borderLeft: isMobile ? 'none' : '1px solid var(--admin-border)', borderTop: isMobile ? '1px solid var(--admin-border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button 
                  onClick={() => handleClaimTask(task.id)}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: '900', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                >
                  CLAIM RESERVATION <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'CALENDAR' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.keys(groupedSchedule).length === 0 ? (
            <div style={{ ...cardStyle, padding: '4rem', textAlign: 'center', opacity: 0.5, borderStyle: 'dashed' }}>No upcoming schedules assigned to you.</div>
          ) : Object.keys(groupedSchedule).sort((a,b) => new Date(a) - new Date(b)).map(date => (
            <div key={date}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '900', color: 'var(--admin-brand)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '0.5rem' }}>
                <CalendarIcon size={18} /> {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {groupedSchedule[date].map(task => (
                  <div key={task.id} style={{ background: 'var(--admin-card)', borderLeft: '4px solid var(--admin-brand)', padding: '1.25rem', borderRadius: '0.5rem', borderRight: '1px solid var(--admin-border)', borderTop: '1px solid var(--admin-border)', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '900' }}>{new Date(task.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>{task.customer?.full_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '800' }}>{task.vehicles?.length} Units</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', fontWeight: '900' }}>{task.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffTasks;