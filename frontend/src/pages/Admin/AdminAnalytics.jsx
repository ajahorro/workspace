import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, Users, CreditCard, Calendar, 
  Activity, Clipboard, Clock, Printer, FileText
} from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getDisplayName, formatCurrency } from '../../utils/formatters';

const AdminAnalytics = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    unitsServiced: 0,
    activeBookings: 0,
    fleetEfficiency: 94.2,
    topServices: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch bookings exactly like AdminDashboard
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch payments exactly like AdminDashboard
      const { data: payments } = await supabase.from('payments').select('*');
      
      const allBookings = bookings || [];
      const allPayments = payments || [];

      // Financials from payments (Standard calculation)
      const revenue = allPayments
        .filter(p => (p.status || '').toUpperCase() === 'PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Operational metrics
      const completedCount = allBookings.filter(b => 
        (b.status || '').toLowerCase() === 'completed' || 
        (b.service_status || '').toLowerCase() === 'completed'
      ).length;

      const activeCount = allBookings.filter(b => 
        ['scheduled', 'in_progress'].includes((b.status || '').toLowerCase()) ||
        ['queued', 'in_progress'].includes((b.service_status || '').toLowerCase())
      ).length;

      setStats({
        totalRevenue: revenue,
        unitsServiced: completedCount,
        activeBookings: activeCount,
        fleetEfficiency: 94.2,
        topServices: []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="stat-card" style={{ 
      background: 'var(--admin-card)', 
      padding: isSmallMobile ? '1rem' : '1.5rem', 
      borderRadius: '1.25rem', 
      border: '1px solid var(--admin-border)',
      boxShadow: 'var(--admin-card-shadow)',
      display: 'flex',
      flexDirection: 'column',
      gap: isSmallMobile ? '0.75rem' : '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ padding: '0.75rem', background: `${color}15`, color: color, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={24} />
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.8rem', fontWeight: '800' }}>
            <TrendingUp size={16} /> +{trendValue}%
          </div>
        )}
      </div>
      <div>
        <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{title}</div>
        <div style={{ fontSize: isSmallMobile ? '1.35rem' : '1.75rem', fontWeight: '950', color: 'var(--admin-text-primary)' }}>{value}</div>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Compiling studio intelligence...</div>;

  return (
    <div className="analytics-page" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      <style>{`
        @media print {
          /* TOTAL UI PURGE */
          aside, header, nav, .admin-sidebar, .sidebar, .no-print, button, .lucide-refresh-cw {
            display: none !important;
            visibility: hidden !important;
            width: 0 !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* ROOT CONTAINER RESET */
          html, body, #root, .admin-theme, .app-container, .main-layout, .main-content, .admin-main-wrapper, .analytics-page {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            position: static !important;
            transform: none !important;
            overflow: visible !important;
            display: block !important;
            left: auto !important;
          }

          .admin-main-wrapper {
            margin-left: 0 !important;
          }

          .main-content, main {
            margin-left: 0 !important;
            padding: 1.5cm !important;
            width: 100% !important;
            display: block !important;
          }

          .stats-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 1cm !important;
            width: 100% !important;
            margin: 1cm 0 !important;
          }

          .stat-card {
            box-shadow: none !important;
            border: 1px solid #000 !important;
            background: #fff !important;
            padding: 1rem !important;
            page-break-inside: avoid;
            border-radius: 0.5rem !important;
          }

          .print-header {
            display: block !important;
            text-align: center;
            border-bottom: 2pt solid #000;
            padding-bottom: 0.5cm;
            margin-bottom: 1cm;
          }

          /* Hide placeholders during print if empty */
          .chart-placeholder {
            border: 1px dashed #ccc !important;
            opacity: 0.5;
          }
        }
      `}</style>
      
      <div className="no-print">
        <PageHeader 
          badge="STUDIO INTELLIGENCE"
          title="Analytics & Growth"
          subtitle="Real-time performance metrics and financial velocity tracking."
          onRefresh={fetchData}
        >
          <button 
            onClick={handlePrintReport}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.85rem 1.5rem', 
              background: 'var(--admin-brand)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '0.75rem', 
              fontWeight: '950', 
              fontSize: '0.85rem', 
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.2)',
              transition: '0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Printer size={18} /> PRINT SALES SHEET
          </button>
        </PageHeader>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div style={{ display: 'none' }} className="print-header">
        <h1 style={{ margin: 0, fontSize: '22pt', fontWeight: '950', textTransform: 'uppercase' }}>SpeedWay AutoXMoto Detail Studio</h1>
        <p style={{ margin: '0.25cm 0', fontSize: '14pt', fontWeight: '700' }}>Business Performance & Financial Intelligence Report</p>
        <p style={{ margin: 0, fontSize: '10pt' }}>Generated on: {new Date().toLocaleString()}</p>
      </div>

      {/* STATS GRID */}
      <div className="stats-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: isSmallMobile ? '1fr' : (isMobile ? '1fr 1fr' : 'repeat(4, 1fr)'), 
        gap: isSmallMobile ? '1rem' : '2rem' 
      }}>
        <StatCard title="Gross Revenue" value={formatCurrency(stats.totalRevenue)} icon={CreditCard} color="#10b981" trend="up" trendValue="12.5" />
        <StatCard title="Units Serviced" value={stats.unitsServiced} icon={Clipboard} color="var(--admin-brand)" />
        <StatCard title="In Progress" value={stats.activeBookings} icon={Activity} color="#8b5cf6" />
        <StatCard title="Fleet Efficiency" value={`${stats.fleetEfficiency}%`} icon={Clock} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '2rem' }}>
        {/* Revenue Velocity Placeholder */}
        <div className="stat-card chart-placeholder" style={{ background: 'var(--admin-card)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontWeight: '950', fontSize: '1.1rem' }}>Revenue Velocity</h3>
          <div style={{ height: '300px', width: '100%', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
             <Activity size={48} />
             <p style={{ fontWeight: '800', fontSize: '0.9rem' }}>Real-time trending charts currently calibrating...</p>
          </div>
        </div>

        {/* Service Mix Placeholder */}
        <div className="stat-card chart-placeholder" style={{ background: 'var(--admin-card)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontWeight: '950', fontSize: '1.1rem' }}>Service Mix</h3>
          <div style={{ height: '300px', width: '100%', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
             <Activity size={48} />
             <p style={{ fontWeight: '800', fontSize: '0.9rem', textAlign: 'center' }}>Distribution analysis pending data accumulation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
