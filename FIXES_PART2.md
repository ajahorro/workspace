# Fixes for Second Half of Issues

## Issues Identified from Screenshots:

1. ✅ Refund Hub - Add reason/notes field
2. ✅ Analytics - Working (just verify print functionality)
3. ✅ Audit Logs - Working correctly
4. ✅ Staff Management - Working
5. ✅ User Directory - Working
6. ✅ Notifications - Working (both page and popover)
7. ✅ Admin Profile - Working
8. ⚠️ Staff Operational Queue - **TEXT NEEDS FIXING**
9. ⚠️ Staff Booking Details - **Cannot view booking details properly**

---

## 1. Add Refund Reason Field to Admin Refund Hub

**Location:** `frontend/src/pages/Admin/AdminRefunds.jsx`

Add a reason/notes textarea when processing refunds:

```jsx
// In the refund modal/section, add this field:
<div style={{ marginBottom: '1.5rem' }}>
  <label style={{
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--admin-text-secondary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  }}>
    Refund Reason *
  </label>
  <textarea
    value={refundReason}
    onChange={(e) => setRefundReason(e.target.value)}
    placeholder="Enter the reason for this refund (required for audit trail)..."
    style={{
      width: '100%',
      minHeight: '120px',
      padding: '1rem',
      background: 'var(--admin-bg)',
      border: '1px solid var(--admin-border)',
      borderRadius: '0.75rem',
      color: 'var(--admin-text-primary)',
      fontSize: '0.9rem',
      outline: 'none',
      resize: 'vertical',
      fontFamily: 'inherit',
      lineHeight: '1.6'
    }}
    required
  />
  <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', marginTop: '0.5rem' }}>
    This will be logged in the audit trail for compliance and transparency.
  </div>
</div>
```

**Update refund processing function:**

```jsx
const handleProcessRefund = async (bookingId, amount, reason) => {
  if (!reason || reason.trim().length < 10) {
    toast.error('Please provide a detailed refund reason (minimum 10 characters)');
    return;
  }

  try {
    // Process refund in database
    const { error: refundError } = await supabase
      .from('payments')
      .update({ 
        status: 'REFUNDED',
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
        refunded_by: user.id
      })
      .eq('booking_id', bookingId);

    if (refundError) throw refundError;

    // Update booking payment status
    await supabase
      .from('bookings')
      .update({ payment_status: 'refunded' })
      .eq('id', bookingId);

    // Create audit log
    await supabase.from('audit_logs').insert({
      booking_id: bookingId,
      action_type: 'REFUND_PROCESSED',
      details: `Refund of ${formatCurrency(amount)} processed. Reason: ${reason}`,
      actor_name: profile.full_name,
      actor_role: profile.role
    });

    // Notify customer
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('id', bookingId)
      .single();

    if (booking) {
      await supabase.from('notifications').insert({
        user_id: booking.customer_id,
        title: 'Refund Processed',
        message: `Your refund of ${formatCurrency(amount)} has been processed. Reason: ${reason}`,
        notification_type: 'success',
        action_url: `/my-bookings/${bookingId}`
      });
    }

    toast.success('Refund processed successfully');
    fetchRefunds(); // Refresh the list
  } catch (error) {
    console.error('Refund error:', error);
    toast.error('Failed to process refund');
  }
};
```

---

## 2. Fix Staff Operational Queue Text Issues

**Location:** `frontend/src/pages/Staff/StaffTasks.jsx`

The screenshot shows text that says "FIX IT!" - update the UI text properly:

```jsx
// Replace any placeholder text with proper content:

// Header section:
<PageHeader 
  badge="WORKSHOP FLOOR"
  title="Operational Queue"
  subtitle="Your assigned detailing tasks for today's shift."
/>

// Empty state:
{assignments.length === 0 && (
  <div style={{ 
    textAlign: 'center', 
    padding: '4rem 2rem',
    background: 'var(--admin-card)',
    borderRadius: '1.25rem',
    border: '1px solid var(--admin-border)'
  }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🔧</div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '0.5rem' }}>
      No Active Assignments
    </h3>
    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>
      You currently have no vehicles assigned to you. Check back soon for new tasks.
    </p>
  </div>
)}

// Assignment cards text:
{assignments.map(assignment => (
  <div key={assignment.id} style={{ /* card styles */ }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: '900' }}>
          {assignment.vehicle_make} {assignment.vehicle_model}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '800' }}>
          PLATE: {assignment.plate_number} • BOOKING: {assignment.booking_id.substring(0, 8).toUpperCase()}
        </div>
      </div>
      <span style={{ 
        padding: '0.5rem 1rem',
        background: assignment.status === 'in_progress' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        color: assignment.status === 'in_progress' ? '#a855f7' : '#f59e0b',
        borderRadius: '5rem',
        fontSize: '0.7rem',
        fontWeight: '950',
        border: '1px solid currentColor'
      }}>
        {assignment.status === 'in_progress' ? 'IN PROGRESS' : 'QUEUED'}
      </span>
    </div>

    {/* Service list */}
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem' }}>
        SERVICES TO COMPLETE:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {assignment.services.map((service, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '0.5rem',
            border: '1px solid var(--admin-border)'
          }}>
            <Wrench size={14} color="var(--admin-brand)" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>
              {service.service_name_snapshot}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* Action buttons */}
    <div style={{ display: 'flex', gap: '1rem' }}>
      {assignment.status === 'queued' && (
        <button
          onClick={() => handleStartWork(assignment.id)}
          style={{
            flex: 1,
            padding: '1rem',
            background: 'var(--admin-brand)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: '900',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          START WORK
        </button>
      )}
      {assignment.status === 'in_progress' && (
        <button
          onClick={() => handleCompleteWork(assignment.id)}
          style={{
            flex: 1,
            padding: '1rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: '900',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          MARK AS COMPLETED
        </button>
      )}
    </div>
  </div>
))}
```

**Add the handler functions:**

```jsx
const handleStartWork = async (vehicleId) => {
  try {
    const { error } = await supabase
      .from('booking_vehicles')
      .update({ status: 'in_progress' })
      .eq('id', vehicleId);

    if (error) throw error;

    // Create audit log
    await supabase.from('audit_logs').insert({
      booking_id: assignments.find(a => a.id === vehicleId)?.booking_id,
      action_type: 'WORK_STARTED',
      details: `Staff ${profile.full_name} started working on vehicle`,
      actor_name: profile.full_name,
      actor_role: 'STAFF'
    });

    toast.success('Work started - status updated');
    fetchAssignments();
  } catch (error) {
    console.error('Error starting work:', error);
    toast.error('Failed to update status');
  }
};

const handleCompleteWork = async (vehicleId) => {
  try {
    const { error } = await supabase
      .from('booking_vehicles')
      .update({ status: 'completed' })
      .eq('id', vehicleId);

    if (error) throw error;

    // Create audit log
    await supabase.from('audit_logs').insert({
      booking_id: assignments.find(a => a.id === vehicleId)?.booking_id,
      action_type: 'WORK_COMPLETED',
      details: `Staff ${profile.full_name} completed work on vehicle`,
      actor_name: profile.full_name,
      actor_role: 'STAFF'
    });

    // Notify customer
    const assignment = assignments.find(a => a.id === vehicleId);
    if (assignment) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_id')
        .eq('id', assignment.booking_id)
        .single();

      if (booking) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: 'Vehicle Service Completed',
          message: `Your ${assignment.vehicle_make} ${assignment.vehicle_model} has been completed!`,
          notification_type: 'success',
          action_url: `/my-bookings/${assignment.booking_id}?vehicle=${vehicleId}`
        });
      }
    }

    toast.success('Vehicle marked as completed!');
    fetchAssignments();
  } catch (error) {
    console.error('Error completing work:', error);
    toast.error('Failed to update status');
  }
};
```

---

## 3. Fix Staff Booking Details View

**Location:** `frontend/src/pages/Staff/StaffBookingDetails.jsx`

Create this file if it doesn't exist, or fix it to match the admin booking details UI:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Car, Wrench, Calendar, Clock, MessageCircle, History } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import BookingChat from '../../components/BookingChat';
import BookingAuditTrail from '../../components/BookingAuditTrail';
import { formatCurrency } from '../../utils/formatters';

const StaffBookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [booking, setBooking] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBooking();
      
      // Real-time subscription
      const channel = supabase
        .channel(`booking-staff-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, fetchBooking)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_vehicles', filter: `booking_id=eq.${id}` }, fetchBooking)
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [id, user]);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(full_name, email, phone_number),
          vehicles:booking_vehicles(*, 
            services:booking_vehicle_services(*)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setBooking(data);
        setVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVehicleStatus = async (vehicleId, newStatus) => {
    try {
      const { error } = await supabase
        .from('booking_vehicles')
        .update({ status: newStatus })
        .eq('id', vehicleId);

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        booking_id: id,
        action_type: `VEHICLE_${newStatus.toUpperCase()}`,
        details: `Vehicle status updated to ${newStatus} by ${profile.full_name}`,
        actor_name: profile.full_name,
        actor_role: 'STAFF'
      });

      toast.success(`Vehicle status updated to ${newStatus}`);
      fetchBooking();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--admin-brand)', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: '900', color: 'var(--admin-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Booking not found</h2>
        <button onClick={() => navigate('/staff')} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      <PageHeader
        showBack
        onBack={() => navigate('/staff')}
        badge={`BOOKING: ${id.substring(0, 8).toUpperCase()}`}
        title="Service Details"
        subtitle={`Customer: ${booking.customer?.full_name || 'Unknown'}`}
        onRefresh={fetchBooking}
      />

      {/* Customer Info Card */}
      <div style={{
        background: 'var(--admin-card)',
        borderRadius: '1.25rem',
        border: '1px solid var(--admin-border)',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Customer Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.25rem' }}>NAME</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>{booking.customer?.full_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.25rem' }}>PHONE</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>{booking.customer?.phone_number || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.25rem' }}>SCHEDULED</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>
              {new Date(booking.start_datetime).toLocaleDateString()} at {new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        {/* Vehicles Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--admin-text-secondary)' }}>
            Vehicles ({vehicles.length})
          </h2>

          {vehicles.map((vehicle) => (
            <div key={vehicle.id} style={{
              background: 'var(--admin-card)',
              borderRadius: '1.25rem',
              border: '1px solid var(--admin-border)',
              overflow: 'hidden'
            }}>
              {/* Vehicle Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid var(--admin-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem' }}>
                    <Car size={18} color="var(--admin-brand)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '900', fontSize: '1rem' }}>{vehicle.make} {vehicle.model}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>
                      {vehicle.plate_number}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: '950',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '5rem',
                  background: vehicle.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : (vehicle.status === 'in_progress' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.05)'),
                  color: vehicle.status === 'completed' ? '#10b981' : (vehicle.status === 'in_progress' ? '#a855f7' : 'var(--admin-text-secondary)'),
                  border: '1px solid currentColor'
                }}>
                  {vehicle.status.toUpperCase()}
                </span>
              </div>

              {/* Services */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {vehicle.services?.map(s => (
                    <span key={s.id} style={{
                      padding: '0.4rem 0.8rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: '0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--admin-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <Wrench size={10} /> {s.service_name_snapshot}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {vehicle.status === 'queued' && (
                    <button
                      onClick={() => handleUpdateVehicleStatus(vehicle.id, 'in_progress')}
                      style={{
                        flex: 1,
                        padding: '0.85rem',
                        background: 'var(--admin-brand)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontWeight: '900',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      START WORK
                    </button>
                  )}
                  {vehicle.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateVehicleStatus(vehicle.id, 'completed')}
                      style={{
                        flex: 1,
                        padding: '0.85rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontWeight: '900',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      MARK COMPLETED
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Chat */}
          <div style={{
            background: 'var(--admin-card)',
            borderRadius: '1.25rem',
            border: '1px solid var(--admin-border)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={16} /> Customer Chat
            </h3>
            <div style={{ minHeight: '350px', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <BookingChat bookingId={id} />
            </div>
          </div>

          {/* Activity History */}
          <div style={{
            background: 'var(--admin-card)',
            borderRadius: '1.25rem',
            border: '1px solid var(--admin-border)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={16} /> Activity Log
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <BookingAuditTrail bookingId={id} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default StaffBookingDetails;
```

**Add the route in App.jsx:**

```jsx
// In the staff routes section:
<Route path="/staff/booking/:id" element={
  <ProtectedRoute allowedRoles={['STAFF']}>
    <StaffLayout>
      <StaffBookingDetails />
    </StaffLayout>
  </ProtectedRoute>
} />
```

**Update StaffTasks.jsx to link to booking details:**

```jsx
// In the assignment card, add a link/button to view full details:
<button
  onClick={() => navigate(`/staff/booking/${assignment.booking_id}`)}
  style={{
    padding: '0.75rem 1.25rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--admin-border)',
    borderRadius: '0.75rem',
    color: 'var(--admin-text-primary)',
    fontWeight: '800',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  }}
>
  <FileText size={14} /> VIEW FULL DETAILS
</button>
```

---

## Summary of Part 2 Fixes:

1. ✅ **Refund Hub** - Added refund reason textarea with audit logging
2. ✅ **Staff Operational Queue** - Fixed all placeholder text
3. ✅ **Staff Booking Details** - Created complete booking details view matching admin UI

All other pages (Analytics, Audit Logs, Staff Management, User Directory, Notifications, Profile) appear to be working correctly based on the screenshots.

---

## Next Steps:

1. Apply these fixes to your project
2. Test the refund flow with reason logging
3. Test staff can view booking details properly
4. Verify all text is displaying correctly in Staff Operational Queue

I will now create the complete database schema and setup guide in the next documents.
