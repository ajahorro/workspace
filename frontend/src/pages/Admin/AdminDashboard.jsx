import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Users, Clipboard, CreditCard, ArrowRight, Check, Clock, Play, CheckCircle, XCircle, AlertTriangle, Calendar, Activity } from 'lucide-react';
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
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Global operational listener
    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings_v2' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments_v2' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds_v2' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

        // Fetch notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(2);
        setNotifications(notifs || []);

        // Fetch audit logs
        const { data: logs } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        setAuditLogs(logs || []);

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

  // Metrics calculation
  let totalBookings = data.length;
  // Financials from payments_v2
  const totalRevenue = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const pendingVerificationsCount = payments.filter(p => p.status === 'FOR_VERIFICATION').length;
  const refundRequestsCount = refunds.filter(r => r.status === 'PENDING').length;

  const bookingStats = { scheduled: 0, completed: 0, cancelled: 0 };
  const serviceStats = { PENDING_ASSIGNMENT: 0, NOT_STARTED: 0, IN_PROGRESS: 0, FINISHED: 0 };

  data.forEach(b => {
    if (bookingStats.hasOwnProperty(b.status)) bookingStats[b.status]++;
    
    // Fix: Workflow tracker logic
    if (b.status === 'cancelled') return; // Cancelled bookings are removed from workflow
    
    let sStatus = b.service_status;
    if (b.status === 'completed') {
      sStatus = 'FINISHED'; // All completed bookings are "Finished"
    } else if (!sStatus) {
      sStatus = b.staff_id ? 'NOT_STARTED' : 'PENDING_ASSIGNMENT';
    }

    if (serviceStats.hasOwnProperty(sStatus)) serviceStats[sStatus]++;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBookingsCount = data.filter(b => b.start_datetime?.startsWith(todayStr)).length;
  
  const activityItems = auditLogs.map(l => ({
      id: l.id,
      title: (l.action_type || 'Activity').replace(/_/g, ' '),
      subtitle: l.details || 'System event',
      date: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'LOG',
      path: '/admin/audit-logs'
  })).slice(0, 5);
  // 1. Build master Attention Needed list
  const attentionItems = [];
  
  // Priority 1: Payments needing verification (URGENT)
  payments.filter(p => p.status === 'FOR_VERIFICATION').forEach(p => {
    const booking = data.find(b => b.id === p.booking_id);
    attentionItems.push({
      id: p.booking_id,
      customer: booking?.customer?.full_name || 'Unknown',
      date: booking ? new Date(booking.start_datetime).toLocaleDateString() : 'N/A',
      amount: p.amount,
      type: 'VERIFYING',
      priority: 1
    });
  });

  // Priority 2: Payments Rejected or Awaiting (Scheduled but no PAID records)
  data.filter(b => b.status === 'scheduled').forEach(b => {
    const bookingPayments = payments.filter(p => p.booking_id === b.id);
    const totalPaid = bookingPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
    const hasPending = bookingPayments.some(p => p.status === 'FOR_VERIFICATION');

    // If scheduled, has no successful payments, and not currently pending verification, it needs follow-up
    if (totalPaid === 0 && !hasPending) {
      if (!attentionItems.find(item => item.id === b.id)) {
        attentionItems.push({
          id: b.id,
          customer: b.customer?.full_name || 'Unknown',
          date: new Date(b.start_datetime).toLocaleDateString(),
          amount: b.total_price || 0,
          type: 'PAYMENT REQ',
          priority: 2
        });
      }
    }
  });

  // Priority 3: Missing assignments (Not closed, no staff_id)
  data.filter(b => b.status === 'scheduled' && !b.staff_id).forEach(b => {
    if (!attentionItems.find(item => item.id === b.id)) {
      attentionItems.push({
        id: b.id,
        customer: b.customer?.full_name || 'Unknown',
        date: new Date(b.start_datetime).toLocaleDateString(),
        amount: b.total_price || 0,
        type: 'ASSIGNMENT',
        priority: 3
      });
    }
  });

  // Sort and take top 5
  attentionItems.sort((a, b) => a.priority - b.priority);
  const finalAttentionList = attentionItems.slice(0, 5);

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
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    color: 'var(--admin-text-primary)',
    transition: 'all 0.3s ease'
  };

  if (loading) {
    return <LoadingState message="Fetching operational data..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
      
      {/* Welcome Header Area */}
      <PageHeader 
        badge="OPERATIONS OVERVIEW"
        title={`Hello, ${profile?.full_name?.split(' ')[0] || 'Admin'}`}
        subtitle="Operational metrics and real-time system performance."
        onRefresh={() => window.location.reload()}
      />

      {/* Primary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? '1rem' : '1.5rem' }}>
        {[
          { label: "Today's Bookings", value: todayBookingsCount, color: 'var(--admin-brand)', icon: Calendar, path: '/admin/schedule' },
          { label: 'Total Bookings', value: totalBookings, color: 'var(--primary-color)', icon: Clipboard, path: '/admin/bookings' },
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

      {/* Dashboard Operational Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '0.8fr 1.1fr 1.1fr', 
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* RECENT ACTIVITY (MIXED FEED) */}
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden', opacity: 0.9 }}>
          <div 
            onClick={() => navigate('/admin/audit-logs')}
            style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>System Activity</h3>
            <ArrowRight size={14} style={{ color: 'var(--admin-text-secondary)', opacity: 0.3 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activityItems.map((item, i) => (
              <div 
                key={i} 
                onClick={() => navigate(item.path)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1.1rem 1.5rem', borderTop: '1px solid var(--admin-border)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '750', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.subtitle}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 'fit-content', marginLeft: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>{item.date}</p>
                  <span style={{ fontSize: '0.65rem', fontWeight: '900', color: item.type === 'NOTIFICATION' ? 'var(--admin-brand)' : '#10b981', textTransform: 'uppercase' }}>{item.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WORKFLOW (IMPORTANT) */}
        <div style={{ ...panelStyle, background: 'linear-gradient(145deg, var(--admin-card), rgba(var(--admin-brand-rgb), 0.02))' }}>
          <h3 style={{ margin: '0 0 2.5rem 0', fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={18} color="var(--admin-brand)" /> Workflow
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {Object.entries(serviceStats).map(([status, count]) => {
              if (status === 'PENDING_ASSIGNMENT') return null;
              return (
                <div 
                  key={status} 
                  onClick={() => handleStatusClick(status)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusDotColor(status), boxShadow: status === 'IN_PROGRESS' ? '0 0 8px rgba(139, 92, 246, 0.4)' : 'none' }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--admin-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status.replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{count.toString().padStart(2, '0')}</span>
                </div>
              );
            })}
            
            <div style={{ height: '1px', background: 'var(--admin-border)', margin: '0.75rem 0', opacity: 0.5 }}></div>

            {Object.entries(bookingStats).map(([status, count]) => (
              <div 
                key={status} 
                onClick={() => handleStatusClick(status)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusDotColor(status), opacity: 0.7 }}></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '750', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status}</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>{count.toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MASTER ATTENTION PANEL (MOST IMPORTANT) */}
        <div style={{ 
          ...panelStyle, 
          border: '1.5px solid rgba(239, 68, 68, 0.2)',
          background: 'linear-gradient(145deg, var(--admin-card), rgba(239, 68, 68, 0.03))',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite', boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)' }}></div>
              <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-primary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Action Required</h3>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--admin-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '2rem' }}>{finalAttentionList.length} TASKS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {finalAttentionList.length === 0 ? (
              <div style={{ padding: '4rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '1.25rem', border: '1px dashed var(--admin-border)' }}>
                <CheckCircle size={40} color="#10b981" style={{ opacity: 0.15, marginBottom: '1.5rem' }} />
                <p style={{ margin: 0, color: 'var(--admin-text-secondary)', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px' }}>SYSTEM OPTIMIZED 🏁</p>
              </div>
            ) : (
              finalAttentionList.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(`/admin/bookings/${item.id}`)}
                  style={{ 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--admin-border)',
                    padding: '1rem', 
                    borderRadius: '0.75rem', 
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--admin-brand)'; 
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.background = 'rgba(var(--admin-brand-rgb), 0.03)';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--admin-border)'; 
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '0.6rem', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.type === 'VERIFYING' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: item.type === 'VERIFYING' ? '#8b5cf6' : '#f59e0b',
                    flexShrink: 0
                  }}>
                    {item.type === 'VERIFYING' ? <CreditCard size={18} /> : <Users size={18} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.customer}</h4>
                      <span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--admin-text-primary)', fontFamily: 'monospace' }}>₱{item.amount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                      <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '700', color: 'var(--admin-text-secondary)', opacity: 0.7 }}>{item.date}</p>
                      <span style={{ 
                        fontSize: '0.55rem', 
                        fontWeight: '900', 
                        color: item.type === 'VERIFYING' ? '#8b5cf6' : '#f59e0b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); transform: scale(1); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); transform: scale(1.1); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
