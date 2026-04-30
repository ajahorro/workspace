import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [bookingsRes, staffRes] = await Promise.all([
      supabase.from('bookings').select('*, profiles!bookings_customer_id_fkey(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'STAFF')
    ]);

    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (staffRes.data) setStaff(staffRes.data);
    setLoading(false);
  };

  const handleAssignStaff = async (bookingId, staffId) => {
    if (!staffId) return;
    setAssigningId(bookingId);
    try {
      const { error } = await supabase.rpc('assign_staff', {
        p_booking_id: bookingId,
        p_staff_id: staffId
      });
      if (error) throw error;
      
      // Notify Customer
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: 'Booking Confirmed',
          message: `Staff has been assigned to your booking for ${new Date(booking.scheduled_start).toLocaleString()}.`,
          type: 'success'
        });

        // Send Email Notification via Edge Function
        supabase.functions.invoke('send-email', {
          body: {
            type: 'staff_assigned',
            to: booking.profiles?.email,
            data: {
              date: new Date(booking.scheduled_start).toLocaleDateString()
            }
          }
        }).catch(err => console.error('Email trigger failed:', err));
      }

      await fetchData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAssigningId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT': return 'orange';
      case 'CONFIRMED': return 'var(--primary-color)';
      case 'COMPLETED': return '#4ade80';
      case 'CLOSED': return '#9ca3af';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Booking Management</h1>
        <button onClick={fetchData} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer' }}>Refresh</button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>ID / Date</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Customer</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Vehicle</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Staff Assignment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>No bookings found.</td></tr>
            ) : (
              bookings.map(booking => (
                <tr key={booking.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{booking.id.split('-')[0]}</div>
                    <div>{new Date(booking.scheduled_start).toLocaleString()}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {booking.profiles?.email || 'Unknown'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>{booking.vehicle_brand} {booking.vehicle_model}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{booking.plate_number}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      background: `${getStatusColor(booking.booking_status)}20`, 
                      color: getStatusColor(booking.booking_status),
                      padding: '0.25rem 0.5rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {booking.booking_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {booking.staff_id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                        <CheckCircle size={16} /> Assigned
                      </div>
                    ) : booking.booking_status === 'PENDING_ASSIGNMENT' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select 
                          onChange={(e) => handleAssignStaff(booking.id, e.target.value)}
                          disabled={assigningId === booking.id}
                          style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                          defaultValue=""
                        >
                          <option value="" disabled>Select Staff...</option>
                          {staff.map(s => <option key={s.id} value={s.id}>{s.email || s.id}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBookings;
