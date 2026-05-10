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
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchData(isMounted);

    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData(isMounted))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData(isMounted))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, () => fetchData(isMounted))
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async (isMounted = true) => {
      try {
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (bookingsError) throw bookingsError;

        const { data: payData } = await supabase.from('payments').select('*');
        if (isMounted) setPayments(payData || []);

        const { data: refData } = await supabase.from('refunds').select('*');
        if (isMounted) setRefunds(refData || []);

        const { data: logs } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (isMounted) setAuditLogs(logs || []);

        if (bookings && bookings.length > 0) {
          const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))];
          
          if (customerIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', customerIds);

            if (profiles) {
              const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
              const combinedData = bookings.map(b => ({
                ...b,
                customer: profileMap[b.customer_id] || { full_name: 'Unknown' }
              }));
              if (isMounted) setData(combinedData);
            } else {
              if (isMounted) setData(bookings);
            }
          } else {
            if (isMounted) setData(bookings);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

  const totalRevenue = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const pendingVerificationsCount = payments.filter(p => p.status === 'FOR_VERIFICATION').length;
  const refundRequestsCount = refunds.filter(r => r.status === 'pending').length;

  const opStats = { queued: 0, in_progress: 0, completed: 0 };
  data.forEach(b => {
    const sStatus = b.service_status || 'queued';
    if (opStats.hasOwnProperty(sStatus)) opStats[sStatus]++;
  });

  const activityItems = auditLogs.map(l => ({
      id: l.id,
      title: (l.action || 'Activity').replace(/_/g, ' '),
      subtitle: typeof l.details === 'object' ? (l.details?.reason || JSON.stringify(l.details)) : l.details || 'System event',
      date: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'LOG',
      path: '/admin/audit-logs'
  }));

  const attentionItems = [];
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

  data.filter(b => b.status === 'scheduled' && b.payment_status === 'unpaid').forEach(b => {
    attentionItems.push({
      id: b.id,
      customer: b.customer?.full_name || 'Unknown',
      date: new Date(b.start_datetime).toLocaleDateString(),
      amount: b.total_amount || 0,
      type: 'UNPAID',
      priority: 2
    });
  });

  attentionItems.sort((a, b) => a.priority - b.priority);
  const finalAttentionList = attentionItems.slice(0, 5);

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'queued': return 'var(--admin-text-secondary)';
      case 'in_progress': return '#a855f7';
      case 'completed': return '#10b981';
      default: return 'var(--admin-border)';
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

  if (loading) return <LoadingState message="Fetching operational data..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
      <PageHeader 
        badge="OPERATIONS OVERVIEW"
        title={`Hello, ${profile?.full_name?.split(' ')[0] || 'Admin'}`}
        subtitle="Operational metrics and real-time system performance."
        onRefresh={() => fetchData(true)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '1rem' : '1.5rem' }}>
        {[
          { label: 'Total Bookings', value: data.length, color: 'var(--primary-color)', icon: Clipboard, path: '/admin/bookings' },
          { label: 'Pending Verification', value: pendingVerificationsCount, color: '#f59e0b', icon: Clock, path: '/admin/payments' },
          { label: 'Refund Requests', value: refundRequestsCount, color: '#ef4444', icon: AlertTriangle, path: '/admin/refunds' },
          { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, color: '#10b981', icon: TrendingUp, path: '/admin/analytics' }
        ].map((stat, i) => (
          <div key={i} onClick={() => navigate(stat.path)} style={{ ...panelStyle, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--admin-bg)', color: stat.color, padding: '0.6rem', borderRadius: '0.75rem' }}><stat.icon size={20} /></div>
              <ArrowRight size={16} style={{ color: 'var(--admin-text-secondary)', opacity: 0.3 }} />
            </div>
            <p style={{ margin: '0 0 0.4rem 0', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>{stat.label}</p>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '800' }}>{stat.value}</h2>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.8fr 1.1fr 1.1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
          <div onClick={() => navigate('/admin/audit-logs')} style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>System Activity</h3>
            <ArrowRight size={14} style={{ opacity: 0.3 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activityItems.map((item, i) => (
              <div key={i} onClick={() => navigate(item.path)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.5rem', borderTop: '1px solid var(--admin-border)', cursor: 'pointer' }}>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '750', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '600', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.subtitle}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 'fit-content', marginLeft: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Operation Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(opStats).map(([status, count]) => (
              <div key={status} onClick={() => navigate('/admin/bookings', { state: { filter: status } })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusDotColor(status) }}></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>{status.replace('_', ' ')}</span>
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '900' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...panelStyle, border: '1.5px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>Action Required</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {finalAttentionList.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No pending tasks</p>
            ) : (
              finalAttentionList.map((item, i) => (
                <div key={i} onClick={() => navigate(`/admin/bookings/${item.id}`)} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800' }}>{item.customer}</h4>
                      <span style={{ fontSize: '0.85rem', fontWeight: '900' }}>₱{Number(item.amount).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--admin-text-secondary)' }}>{item.type} • {item.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;