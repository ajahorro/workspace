import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Smartphone, 
  Wallet,
  ChevronDown,
  Sparkles,
  BarChart2,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';

const AdminAnalytics = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [timeRange, setTimeRange] = useState('All Time');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completed: 0,
    pending: 0,
    revenue: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0,
    avgPerDay: 0,
    topServices: [],
    statusDist: [],
    peakHours: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get all bookings
      let query = supabase.from('bookings_v2').select('*');
      
      const { data: bookings } = await query;
      const { data: payments } = await supabase.from('payments_v2').select('*').eq('status', 'PAID');
      const { data: bServices } = await supabase.from('booking_services_v2').select('service_id, services_v2(name)');

      if (bookings) {
        const total = bookings.length;
        const completed = bookings.filter(b => b.status === 'completed').length;
        const pending = bookings.filter(b => b.status === 'scheduled').length;
        const revenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // Date-based filters
        const today = new Date();
        today.setHours(0,0,0,0);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const todayCount = bookings.filter(b => new Date(b.created_at) >= today).length;
        const weekCount = bookings.filter(b => new Date(b.created_at) >= startOfWeek).length;
        const monthCount = bookings.filter(b => new Date(b.created_at) >= startOfMonth).length;

        // Top Services
        const serviceCounts = {};
        bServices?.forEach(bs => {
          const name = bs.services_v2?.name || 'Unknown';
          serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        });
        const topServices = Object.entries(serviceCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Status Distribution
        const statusDist = [
          { label: 'Pending', count: bookings.filter(b => b.status === 'scheduled' && b.service_status === 'NOT_STARTED').length, color: '#f59e0b' },
          { label: 'Ongoing', count: bookings.filter(b => b.service_status === 'IN_PROGRESS').length, color: '#a855f7' },
          { label: 'Completed', count: completed, color: '#10b981' },
          { label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length, color: '#ef4444' },
        ];

        // Peak Hours (based on start_datetime)
        const hourCounts = {};
        bookings.forEach(b => {
          const hour = new Date(b.start_datetime).getHours();
          const label = `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
          hourCounts[label] = (hourCounts[label] || 0) + 1;
        });
        const peakHours = Object.entries(hourCounts)
          .map(([time, count]) => ({ time, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalBookings: total,
          completed,
          pending,
          revenue,
          todayCount,
          weekCount,
          monthCount,
          avgPerDay: (total / 30).toFixed(1), // Rough estimate
          topServices,
          statusDist,
          peakHours
        });
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const mainStats = [
    { label: 'Total Bookings', value: stats.totalBookings.toString(), icon: BarChart2, color: 'var(--admin-brand)' },
    { label: 'Completed', value: stats.completed.toString(), icon: CheckCircle, color: '#10b981' },
    { label: 'Pending/Confirmed', value: stats.pending.toString(), icon: Clock, color: '#f59e0b' },
    { label: 'Total Revenue', value: `₱${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'var(--admin-brand)' },
  ];

  const trendStats = [
    { label: "Today's Bookings", value: stats.todayCount.toString() },
    { label: 'This Week', value: stats.weekCount.toString() },
    { label: 'This Month', value: stats.monthCount.toString() },
    { label: 'Avg/Day', value: stats.avgPerDay.toString() },
  ];

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
    gap: '1rem'
  };

  const cardStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1rem',
    border: '1px solid var(--admin-border)',
    padding: '1.5rem',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--admin-text-primary)',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease'
  };

  const sectionTitleStyle = {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: 'var(--admin-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 1.5rem 0'
  };

  if (loading) return <LoadingState message="Aggregating performance data..." />;

  return (
    <div style={containerStyle}>
      <PageHeader 
        badge="SYSTEM PERFORMANCE"
        title="ANALYTICS"
        subtitle="Real-time data visualization and business insights."
        onRefresh={fetchAnalytics}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative' }}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem',
              background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem',
              color: 'var(--admin-text-primary)', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            <Calendar size={18} color="var(--admin-brand)" />
            {timeRange}
            <ChevronDown size={16} />
          </button>
          {isDropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', overflow: 'hidden', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              {['Today', 'This Week', 'This Month', 'All Time'].map(range => (
                <div 
                  key={range}
                  onClick={() => { setTimeRange(range); setIsDropdownOpen(false); }}
                  style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: range === timeRange ? 'var(--admin-brand)' : 'var(--admin-text-primary)', background: range === timeRange ? 'var(--admin-bg)' : 'transparent' }}
                >
                  {range}
                </div>
              ))}
            </div>
          )}
        </div>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem' }}>
        {mainStats.map((stat, idx) => (
          <div key={idx} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={22} color={stat.color} />
              </div>
              <Activity size={14} style={{ opacity: 0.2 }} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--admin-text-primary)', marginTop: '0.25rem' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '2rem' }}>
          {trendStats.map((trend, idx) => (
            <div key={idx}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{trend.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {trend.value}
                <TrendingUp size={16} color="#10b981" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Service Popularity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {stats.topServices.length === 0 ? <p style={{ opacity: 0.3 }}>No data</p> : stats.topServices.map((svc, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  <span>{svc.name}</span>
                  <span style={{ color: 'var(--admin-brand)' }}>{svc.count} sales</span>
                </div>
                <div style={{ height: '8px', background: 'var(--admin-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(svc.count / (stats.topServices[0]?.count || 1)) * 100}%`, height: '100%', background: 'var(--admin-brand)', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Booking Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {stats.statusDist.map((status, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: status.color }} />
                <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: '700' }}>{status.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>{status.count}</div>
                <div style={{ width: '100px', height: '6px', background: 'var(--admin-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(status.count / (stats.totalBookings || 1)) * 100}%`, height: '100%', background: status.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Peak Booking Hours</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '200px', marginTop: '1rem' }}>
            {stats.peakHours.length === 0 ? <p style={{ opacity: 0.3 }}>No data</p> : stats.peakHours.map((hour, idx) => (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '100%', background: 'linear-gradient(to top, var(--admin-brand), #ef4444)', borderRadius: '4px 4px 0 0', height: `${(hour.count / (stats.peakHours[0]?.count || 1)) * 100}%`, transition: 'height 1s ease' }} />
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textAlign: 'center', whiteSpace: 'nowrap' }}>{hour.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, background: 'var(--admin-brand)', color: '#FFFFFF', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <Sparkles size={48} style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Growth Insight</h2>
          <p style={{ margin: '1rem 0 0 0', opacity: 0.9, fontSize: '0.95rem', fontWeight: '600', lineHeight: '1.5' }}>
            Your revenue has been derived from {stats.completed} successful details. 
            Peak demand is typically at {stats.peakHours[0]?.time || 'N/A'}.
          </p>
          <div style={{ marginTop: '2rem', padding: '1rem 2rem', background: '#FFFFFF', color: 'var(--admin-brand)', borderRadius: '0.75rem', fontWeight: '800', fontSize: '0.9rem' }}>
            VIEW FULL REPORT
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminAnalytics;
