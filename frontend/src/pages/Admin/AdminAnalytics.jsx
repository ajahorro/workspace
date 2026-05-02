import React, { useState } from 'react';
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
  Activity
} from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/PageHeader';

const AdminAnalytics = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [timeRange, setTimeRange] = useState('This Month');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const mainStats = [
    { label: 'Total Bookings', value: '1', icon: BarChart2, color: 'var(--primary-color)' },
    { label: 'Completed', value: '0', icon: CheckCircle, color: '#10b981' },
    { label: 'Pending/Confirmed', value: '1', icon: Clock, color: '#f59e0b' },
    { label: 'Total Revenue', value: '₱0.00', icon: DollarSign, color: 'var(--primary-color)' },
  ];

  const trendStats = [
    { label: "Today's Bookings", value: '0' },
    { label: 'This Week', value: '3' },
    { label: 'This Month', value: '1' },
    { label: 'Avg/Day', value: '1' },
  ];

  const services = [
    { name: 'Interior Vacuum', count: 1 },
    { name: 'Wax Protection', count: 1 },
    { name: 'Dashboard Cleaning', count: 1 },
    { name: 'Tire and Rim Cleaning', count: 1 },
    { name: 'Exterior Wash', count: 1 },
  ];

  const statusList = [
    { label: 'Pending', count: 1, color: '#f59e0b' },
    { label: 'Confirmed', count: 0, color: 'var(--primary-color)' },
    { label: 'Ongoing', count: 0, color: '#a855f7' },
    { label: 'Completed', count: 0, color: '#10b981' },
    { label: 'Cancelled', count: 0, color: '#ef4444' },
  ];

  const peakHours = [
    { time: '7:00 AM', count: 1 },
  ];

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    animation: 'fadeIn 0.5s ease'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
    gap: '1rem'
  };

  const cardStyle = {
    background: 'var(--bg-secondary)',
    borderRadius: '1rem',
    border: '1px solid rgba(255,255,255,0.03)',
    padding: '1.25rem',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  const sectionTitleStyle = {
    fontSize: '0.85rem',
    fontWeight: '900',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 1.25rem 0'
  };

  const statLabelStyle = {
    fontSize: '0.7rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const bigValueStyle = {
    fontSize: '1.75rem',
    fontWeight: '950',
    lineHeight: 1
  };

  const smallValueStyle = {
    fontSize: '1rem',
    fontWeight: '950',
    lineHeight: 1
  };

  const midValueStyle = {
    fontSize: '0.85rem',
    fontWeight: '900'
  };

  return (
    <div style={containerStyle}>
      <PageHeader 
        title="Analytics Dashboard" 
        subtitle="Real-time business intelligence and operational performance."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: 'var(--bg-secondary)', 
            padding: '0.4rem 0.85rem', 
            borderRadius: '5rem',
            border: '1px solid rgba(169, 27, 24, 0.15)'
          }}>
            <Sparkles size={12} color="var(--primary-color)" />
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-color)' }}>AI Revenue Forecast: <span style={{ color: '#fff' }}>₱0.00</span></span>
            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#10b981', marginLeft: '0.25rem' }}>+0%</span>
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '0.5rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#fff' 
              }}>
                <Calendar size={14} />
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{timeRange}</span>
                <ChevronDown size={14} />
            </button>
            {isDropdownOpen && (
              <div style={{ 
                position: 'absolute', top: '120%', right: 0, width: '150px', 
                background: 'var(--bg-secondary)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '0.5rem', overflow: 'hidden', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' 
              }}>
                {['Today', 'This Week', 'This Month', 'All Time'].map((range) => (
                  <button 
                    key={range}
                    onClick={() => { setTimeRange(range); setIsDropdownOpen(false); }}
                    style={{ 
                      width: '100%', padding: '0.65rem 1rem', background: timeRange === range ? 'var(--primary-color)' : 'transparent', 
                      border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' 
                    }}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageHeader>

      {/* Primary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem' }}>
        {mainStats.map((stat, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
               <span style={bigValueStyle}>{stat.value}</span>
               <div style={{ background: `${stat.color}15`, padding: '0.45rem', borderRadius: '0.5rem' }}>
                <stat.icon size={18} color={stat.color} />
              </div>
            </div>
            <span style={statLabelStyle}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Booking Trends section */}
      <div>
        <h3 style={sectionTitleStyle}>Booking Trends</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem' }}>
          {trendStats.map((trend, i) => (
            <div key={i} style={{ ...cardStyle, textAlign: 'center', padding: '1.75rem 1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: '950', display: 'block', marginBottom: '0.4rem', lineHeight: 1 }}>{trend.value}</span>
              <span style={statLabelStyle}>{trend.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div style={gridStyle}>
        {/* Bookings by Service */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Bookings by Service</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {services.map((service, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>{service.name}</span>
                  <span style={midValueStyle}>{service.count}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: 'var(--primary-color)', borderRadius: '10px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Service */}
        <div style={{ ...cardStyle, justifyContent: 'center', alignItems: 'center' }}>
          <h3 style={{ ...sectionTitleStyle, position: 'absolute', top: '1.25rem', left: '1.25rem' }}>Revenue by Service</h3>
          <div style={{ textAlign: 'center', opacity: 0.2 }}>
            <PieChart size={44} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.5px' }}>NO DATA AVAILABLE</p>
          </div>
        </div>
      </div>

      {/* Operational Grid */}
      <div style={gridStyle}>
        {/* Payment Methods */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Payment Methods</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Smartphone size={20} color="var(--primary-color)" />
              <div>
                <p style={{ margin: 0, ...smallValueStyle }}>₱0.00</p>
                <p style={{ margin: 0, ...statLabelStyle, fontSize: '0.65rem' }}>GCash</p>
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Wallet size={20} color="#10b981" />
              <div>
                <p style={{ margin: 0, ...smallValueStyle }}>₱0.00</p>
                <p style={{ margin: 0, ...statLabelStyle, fontSize: '0.65rem' }}>Cash</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Paid Bookings</span>
              <span style={{ ...midValueStyle, color: '#10b981' }}>0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Unpaid Bookings</span>
              <span style={{ ...midValueStyle, color: '#ef4444' }}>1</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>Pending Revenue</span>
              <span style={{ ...midValueStyle, color: '#f59e0b' }}>₱2,200.00</span>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Peak Hours</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {peakHours.map((peak, i) => (
              <div key={i} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1.15rem', 
                borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.03)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ color: 'var(--primary-color)', fontWeight: '950', fontSize: '0.75rem' }}>#1</span>
                  <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{peak.time}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)' }}>{peak.count} bookings</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Distribution Grid */}
      <div style={gridStyle}>
        {/* Status Distribution */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Booking Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {statusList.map((status, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.color }}></div>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{status.label}</span>
                </div>
                <span style={midValueStyle}>{status.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Metrics */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Operational Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1 }}>
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}>
              <span style={{ fontSize: '2.25rem', fontWeight: '950', color: '#fff', lineHeight: 1 }}>0%</span>
              <span style={{ ...statLabelStyle, marginTop: '0.5rem' }}>Cancellation Rate</span>
            </div>
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.03)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}>
              <span style={{ fontSize: '2.25rem', fontWeight: '950', color: '#fff', lineHeight: 1 }}>1</span>
              <span style={{ ...statLabelStyle, marginTop: '0.5rem' }}>Days with Bookings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div style={{ ...cardStyle, minHeight: '160px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={sectionTitleStyle}>Staff Performance</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', letterSpacing: '1px' }}>NO STAFF DATA AVAILABLE</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminAnalytics;
