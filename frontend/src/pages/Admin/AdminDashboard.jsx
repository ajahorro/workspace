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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_status,
          service_status,
          scheduled_start,
          staff_id,
          created_at,
          customer:profiles!bookings_customer_id_fkey(full_name),
          payments:payment_intents(status, total_amount, amount_paid)
        `)
        .order('created_at', { ascending: false });

      if (bookings) setData(bookings);
      if (error) console.error('Error fetching dashboard data:', error);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Metrics calculation
  let totalBookings = data.length;
  let completedBookingsCount = 0;
  let totalRevenue = 0;
  let pendingPayments = 0;
  let pendingVerificationsCount = 0;
  let refundRequestsCount = 0;

  // Discrete counts for the simple list
  const bookingStats = { PENDING_ASSIGNMENT: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 };
  const serviceStats = { NOT_STARTED: 0, ONGOING: 0, COMPLETED: 0 };

  const recentActivity = [];
  const needsAssignment = [];

  data.forEach(booking => {
    // Financials
    let bookingRevenue = 0;
    let bookingPending = 0;
    let mainPaymentStatus = 'PENDING';

    if (booking.payments && booking.payments.length > 0) {
      const payment = booking.payments[0];
      mainPaymentStatus = payment.status;
      if (payment.status === 'COMPLETED' || payment.status === 'VERIFIED') {
        bookingRevenue += Number(payment.total_amount || 0);
      } else if (payment.status === 'PENDING' || payment.status === 'FOR_VERIFICATION') {
        bookingPending += Number(payment.total_amount || 0);
      } else if (payment.status === 'DOWNPAYMENT_PAID') {
        bookingPending += Number(payment.total_amount || 0) - Number(payment.amount_paid || 0);
      }
    }
    totalRevenue += bookingRevenue;
    pendingPayments += bookingPending;

    // Stat counts
    if (bookingStats[booking.booking_status] !== undefined) bookingStats[booking.booking_status]++;
    const sStat = booking.service_status || 'NOT_STARTED';
    if (serviceStats[sStat] !== undefined) serviceStats[sStat]++;
    if (booking.booking_status === 'COMPLETED') completedBookingsCount++;

    // Recent Activity
    if (recentActivity.length < 5) {
      let pStat = mainPaymentStatus;
      if (pStat === 'VERIFIED') pStat = 'COMPLETED';
      if (pStat === 'FOR_VERIFICATION') pStat = 'PENDING';
      recentActivity.push({
        id: booking.id,
        shortId: booking.id.substring(0, 8),
        customer: booking.customer?.full_name || 'Unknown',
        amount: booking.payments?.[0]?.total_amount || 0,
        status: pStat
      });
    }

    // Attention Needed (Unassigned or Pending Verification)
    const needsAction = 
      (booking.booking_status === 'PENDING_ASSIGNMENT' || booking.booking_status === 'CONFIRMED') && !booking.staff_id;
    
    const needsVerification = mainPaymentStatus === 'FOR_VERIFICATION';
    if (needsVerification) pendingVerificationsCount++;
    const needsRefund = (mainPaymentStatus === 'FOR_VERIFICATION' || mainPaymentStatus === 'VERIFIED' || mainPaymentStatus === 'PAID' || (booking.payments?.[0]?.amount_paid > 0)) && mainPaymentStatus !== 'REFUNDED';
    if (booking.booking_status === 'CANCELLED' && needsRefund) refundRequestsCount++;

    if (needsAction || needsVerification) {
      if (needsAssignment.length < 5) {
        needsAssignment.push({
          id: booking.id,
          customer: booking.customer?.full_name || 'Unknown',
          date: new Date(booking.scheduled_start).toLocaleDateString(),
          amount: booking.payments?.[0]?.total_amount || 0,
          type: needsVerification ? 'PAYMENT' : 'ASSIGNMENT'
        });
      }
    }
  });

  const handleStatusClick = (status) => {
    navigate('/admin/bookings', { state: { filter: status } });
  };

  const getStatusDotColor = (status) => {
    switch(status) {
      case 'PENDING_ASSIGNMENT': return '#f59e0b';
      case 'CONFIRMED': return 'var(--primary-color)';
      case 'CANCELLED': return '#ef4444';
      case 'COMPLETED': return '#10b981';
      case 'NOT_STARTED': return 'rgba(255,255,255,0.4)';
      case 'ONGOING': return '#8b5cf6';
      default: return '#fff';
    }
  };

  const panelStyle = {
    background: 'var(--glass-red)',
    backdropFilter: 'var(--blur-amount)',
    WebkitBackdropFilter: 'var(--blur-amount)',
    border: '1px solid var(--glass-border)',
    borderRadius: '1.5rem',
    padding: '1.75rem',
    boxShadow: 'var(--card-shadow)',
    color: 'var(--card-text)'
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
            style={{ ...panelStyle, cursor: 'pointer', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff', padding: '0.75rem', borderRadius: '1rem' }}>
                <stat.icon size={22} />
              </div>
              <ArrowRight size={18} style={{ opacity: 0.15 }} />
            </div>
            <p style={{ margin: '0 0 0.25rem 0', color: 'var(--gray-shade)', fontSize: isMobile ? '0.65rem' : '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{stat.label}</p>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', color: 'var(--card-text)' }}>{stat.value}</h2>
          </div>
        ))}
      </div>

      {/* Workflow Status & Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Simple Workflow Status List */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '0.9rem', fontWeight: '900', color: 'var(--card-text)', opacity: 0.9, letterSpacing: '2px', textTransform: 'uppercase' }}>Workflow Status</h3>
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
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--white-shade)', letterSpacing: '0.5px' }}>{status}</span>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: '900' }}>{count}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }}></div>
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
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--gray-shade)', letterSpacing: '0.5px' }}>{status.replace('_', ' ')}</span>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--gray-shade)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.75rem 1.75rem 1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: 'var(--white-shade)', opacity: 0.8, letterSpacing: '2px', textTransform: 'uppercase' }}>Recent Bookings</h3>
            <ArrowRight size={18} style={{ opacity: 0.2 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentActivity.map((activity, i) => (
              <div 
                key={i} 
                onClick={() => navigate(`/admin/bookings/${activity.id}`)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1.25rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'var(--white-shade)' }}>{activity.customer}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--gray-shade)', letterSpacing: '0.5px' }}>#{activity.shortId.toUpperCase()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#10b981' }}>₱{activity.amount.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '900', color: activity.status === 'COMPLETED' ? '#10b981' : '#ffb347', textTransform: 'uppercase' }}>{activity.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Required */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffb347', animation: 'pulse 2s infinite' }}></div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: '#ffb347', letterSpacing: '2px', textTransform: 'uppercase' }}>Needs Assignment</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {needsAssignment.map((item, i) => (
              <div 
                key={i} 
                onClick={() => navigate(`/admin/bookings/${item.id}`)}
                style={{ 
                  background: 'var(--glass-red)',
                  backdropFilter: 'var(--blur-amount)',
                  WebkitBackdropFilter: 'var(--blur-amount)',
                  border: '1px solid var(--glass-border)',
                  padding: '1.25rem', borderRadius: '1rem', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--glass-red)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'var(--card-text)' }}>{item.customer}</h4>
                  <span style={{ fontSize: '0.6rem', fontWeight: '900', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', background: item.type === 'PAYMENT' ? 'rgba(255, 179, 71, 0.2)' : 'rgba(255, 255, 255, 0.2)', color: item.type === 'PAYMENT' ? '#ffb347' : '#ffffff' }}>
                    {item.type}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: 'var(--gray-shade)' }}>
                  <span>{item.date}</span>
                  <span style={{ color: item.type === 'PAYMENT' ? '#ffb347' : '#ffffff' }}>₱{item.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
