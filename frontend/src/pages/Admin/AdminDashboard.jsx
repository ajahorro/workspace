import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, CalendarCheck, CreditCard, Activity } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingPayments: 0,
    staffCount: 0,
    completedServices: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Very basic mock aggregations. In a real app, you would use a backend RPC or Edge Function to aggregate safely.
      const [{ count: totalBookings }, { count: pendingPayments }, { count: staffCount }] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('payment_intents').select('*', { count: 'exact', head: true }).eq('status', 'FOR_VERIFICATION'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STAFF')
      ]);

      setStats({
        totalBookings: totalBookings || 0,
        pendingPayments: pendingPayments || 0,
        staffCount: staffCount || 0,
        completedServices: 0 // Mock for now
      });
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ background: color, padding: '1rem', borderRadius: '0.75rem', color: '#000' }}>
        <Icon size={24} />
      </div>
      <div>
        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>{title}</p>
        <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>{value}</h3>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard Overview</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard title="Total Bookings" value={stats.totalBookings} icon={CalendarCheck} color="var(--primary-color)" />
        <StatCard title="Pending Payments" value={stats.pendingPayments} icon={CreditCard} color="orange" />
        <StatCard title="Active Staff" value={stats.staffCount} icon={Users} color="#4ade80" />
        <StatCard title="Completed Services" value={stats.completedServices} icon={Activity} color="#60a5fa" />
      </div>

      <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Detailed activity feed will be implemented here (Phase 6.4).</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
