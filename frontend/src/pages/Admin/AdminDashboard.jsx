import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Users, Clipboard, CreditCard, ArrowRight, Check, Clock, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [data, setData] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch bookings
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings_v2')
          .select('*')
          .order('created_at', { ascending: false });

        if (bookingsError) throw bookingsError;

        // Fetch payments
        const { data: payData } = await supabase.from('payments_v2').select('*');
        setPayments(payData || []);

        // Fetch refunds
        const { data: refData } = await supabase.from('refunds_v2').select('*');
        setRefunds(refData || []);

        if (bookings && bookings.length > 0) {
          const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))];
          
          if (customerIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', customerIds);

            if (!profilesError && profiles) {
              const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
              const combinedData = bookings.map(b => ({
                ...b,
                customer: profileMap[b.customer_id] || { full_name: 'Unknown' }
              }));
              setData(combinedData);
            } else {
              setData(bookings);
            }
          } else {
            setData(bookings);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Metrics calculation
  let totalBookings = data.length;
  // Financials from payments_v2
  const totalRevenue = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const pendingVerificationsCount = payments.filter(p => p.status === 'FOR_VERIFICATION').length;
  const refundRequestsCount = refunds.filter(r => r.status === 'PENDING').length;

  const bookingStats = { scheduled: 0, completed: 0, cancelled: 0 };
  const serviceStats = { NOT_STARTED: 0, IN_PROGRESS: 0, FINISHED: 0 };

  data.forEach(b => {
    if (bookingStats.hasOwnProperty(b.status)) bookingStats[b.status]++;
    if (serviceStats.hasOwnProperty(b.service_status)) serviceStats[b.service_status]++;
  });

  const completedBookingsCount = bookingStats.completed;

  const recentActivity = [];
  const needsAssignment = [];

  // Map bookings for easy lookup
  const bookingMap = data.reduce((acc, b) => ({ ...acc, [b.id]: b }), {});

  // Build Recent Activity from payments (more granular)
  payments.filter(p => p.amount > 0).slice(-5).reverse().forEach(p => {
    const booking = bookingMap[p.booking_id];
    recentActivity.push({
      id: p.id,
      shortId: p.id.substring(0, 8),
      customer: booking?.customer?.full_name || 'Unknown',
      amount: p.amount,
      status: p.status === 'FOR_VERIFICATION' ? 'VERIFYING' : p.status
    });
  });

  data.forEach(booking => {
    // Attention Needed (Unassigned)
    const needsAction = (booking.status === 'scheduled') && !booking.staff_id;
    if (needsAction && needsAssignment.length < 5) {
      needsAssignment.push({
        id: booking.id,
        customer: booking.customer?.full_name || 'Unknown',
        date: new Date(booking.start_datetime).toLocaleDateString(),
        amount: booking.total_price || 0,
        type: 'ASSIGNMENT'
      });
    }
  });

  // Add payments needing verification to "Needs Assignment" list (reusing for "Attention Needed")
  payments.filter(p => p.status === 'FOR_VERIFICATION').slice(0, 5).forEach(p => {
    const booking = bookingMap[p.booking_id];
    if (needsAssignment.length < 5) {
      needsAssignment.push({
        id: p.booking_id,
        customer: booking?.customer?.full_name || 'Unknown',
        date: booking ? new Date(booking.start_datetime).toLocaleDateString() : 'N/A',
        amount: p.amount,
        type: 'PAYMENT'
      });
    }
  });

  const handleStatusClick = (status) => {
    navigate('/admin/bookings', { state: { filter: status } });
  };

  const getStatusDotColor = (status) => {
    switch(status) {
      case 'scheduled': return 'var(--admin-brand)';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'NOT_STARTED': return '#CBD5E1';
      case 'IN_PROGRESS': return '#8b5cf6';
      case 'FINISHED': return '#10b981';
      default: return 'var(--admin-text-primary)';
    }
  };

  const panelStyle = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: '1rem',
    padding: '1.75rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    color: 'var(--admin-text-primary)',
    transition: 'all 0.3s ease'
  };

  if (loading) {
    return <LoadingState message="Fetching operational data..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      {/* Welcome Header Area */}
      <PageHeader 
        badge="OPERATIONS OVERVIEW"
        title={`Hello, ${profile?.full_name?.split(' ')[0] || 'Admin'}`}
        subtitle="Here's a summary of the system performance today."
        onRefresh={() => window.location.reload()}
      />

      {/* Primary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? '1rem' : '1.5rem' }}>
        {[
          { label: 'Total Bookings', value: totalBookings, color: 'var(--primary-color)', icon: Clipboard, path: '/admin/bookings' },
          { label: 'Completed', value: completedBookingsCount, color: '#10b981', icon: Check, path: '/admin/bookings' },
          { label: 'Pending Verification', value: pendingVerificationsCount, color: '#f59e0b', icon: Clock, path: '/admin/payments' },
          { label: 'Refund Requests', value: refundRequestsCount, color: '#ef4444', icon: AlertTriangle, path: '/admin/refunds' },
          { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, color: '#10b981', icon: TrendingUp, path: '/admin/analytics' }
        ].map((stat, i) => (
          <div 
            key={i}
            onClick={() => navigate(stat.path)}
            style={{ ...panelStyle, cursor: 'pointer' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'var(--admin-brand)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--admin-border)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ background: i === 0 || i === 4 ? 'var(--admin-sidebar-active-bg)' : 'var(--admin-bg)', color: i === 0 || i === 4 ? 'var(--admin-sidebar-active-text)' : 'var(--admin-text-secondary)', padding: '0.6rem', borderRadius: '0.75rem' }}>
                <stat.icon size={20} />
              </div>
              <ArrowRight size={16} style={{ color: 'var(--admin-text-secondary)', opacity: 0.3 }} />
            </div>
            <p style={{ margin: '0 0 0.4rem 0', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</p>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>{stat.value}</h2>
          </div>
        ))}
      </div>

      {/* Workflow Status & Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Simple Workflow Status List */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Workflow Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(bookingStats).map(([status, count]) => (
              <div 
                key={status} 
                onClick={() => handleStatusClick(status)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusDotColor(status) }}></div>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>{count}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: 'var(--admin-border)', margin: '0.5rem 0' }}></div>
            {Object.entries(serviceStats).map(([status, count]) => (
              <div 
                key={status} 
                onClick={() => handleStatusClick(status)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusDotColor(status) }}></div>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>{status.replace('_', ' ')}</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Recent Bookings</h3>
            <ArrowRight size={18} style={{ color: 'var(--admin-text-secondary)', opacity: 0.3 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentActivity.map((activity, i) => (
              <div 
                key={i} 
                onClick={() => navigate(`/admin/bookings/${activity.id}`)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1.25rem 1.75rem', borderTop: '1px solid var(--admin-border)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '750', color: 'var(--admin-text-primary)' }}>{activity.customer}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>#{activity.shortId.toUpperCase()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#10b981' }}>₱{activity.amount.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: activity.status === 'PAID' ? '#10b981' : 'var(--admin-brand)', textTransform: 'uppercase' }}>{activity.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Required */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }}></div>
            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Attention Needed</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {needsAssignment.map((item, i) => (
              <div 
                key={i} 
                onClick={() => navigate(`/admin/bookings/${item.id}`)}
                style={{ 
                  background: 'var(--admin-bg)',
                  border: '1px solid var(--admin-border)',
                  padding: '1.25rem', borderRadius: '1rem', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--admin-brand)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--admin-border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '750', color: 'var(--admin-text-primary)' }}>{item.customer}</h4>
                  <span style={{ fontSize: '0.6rem', fontWeight: '800', padding: '0.25rem 0.6rem', borderRadius: '0.5rem', background: item.type === 'PAYMENT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: item.type === 'PAYMENT' ? '#ef4444' : '#f59e0b' }}>
                    {item.type}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)' }}>
                  <span>{item.date}</span>
                  <span style={{ color: 'var(--admin-text-primary)', fontWeight: '800' }}>₱{item.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
