import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, 
  ChevronRight, Printer, Download, Filter, 
  ArrowLeft, BarChart3, PieChart, ShoppingBag, Car
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminSalesReport = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [data, setData] = useState({
    grossRevenue: 0,
    refundedAmount: 0,
    netRevenue: 0,
    transactionCount: 0,
    averageTicket: 0,
    growth: 0,
    topServices: []
  });

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      let prevStartDate = new Date();

      if (period === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        prevStartDate.setDate(now.getDate() - 1);
        prevStartDate.setHours(0, 0, 0, 0);
      } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 7);
        prevStartDate.setDate(now.getDate() - 14);
      } else {
        startDate.setMonth(now.getMonth() - 1);
        prevStartDate.setMonth(now.getMonth() - 2);
      }

      const { data: currentPayments } = await supabase
        .from('payments')
        .select(`
          *, 
          booking:bookings(
            customer_id,
            start_datetime,
            vehicles:booking_vehicles(
              make, model, plate_number,
              services:booking_vehicle_services(service_name_snapshot)
            )
          )
        `)
        .gte('verified_at', startDate.toISOString())
        .eq('status', 'PAID')
        .order('verified_at', { ascending: false });

      const { data: prevPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('verified_at', prevStartDate.toISOString())
        .lt('verified_at', startDate.toISOString())
        .eq('status', 'PAID');

      const { data: refundedPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('verified_at', startDate.toISOString())
        .eq('status', 'REFUNDED');

      if (currentPayments) {
        const customerIds = [...new Set(currentPayments.map(p => p.booking?.customer_id).filter(Boolean))];
        let profileMap = {};
        if (customerIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', customerIds);
          if (profiles) profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }

        const enrichedTransactions = currentPayments.map(p => ({
          ...p,
          customer_name: profileMap[p.booking?.customer_id]?.full_name || 'Walk-in'
        }));
        
        setTransactions(enrichedTransactions);

        const gross = enrichedTransactions.reduce((sum, p) => sum + Number(p.amount), 0);
        const refAmount = refundedPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const net = gross - refAmount;
        
        const prevGross = prevPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const growth = prevGross > 0 ? ((gross - prevGross) / prevGross) * 100 : 100;

        const serviceMap = {};
        enrichedTransactions.forEach(p => {
          p.booking?.vehicles?.forEach(v => {
            v.services?.forEach(s => {
              const name = s.service_name_snapshot || 'Unknown';
              serviceMap[name] = (serviceMap[name] || 0) + 1;
            });
          });
        });

        setData({
          grossRevenue: gross,
          refundedAmount: refAmount,
          netRevenue: net,
          transactionCount: enrichedTransactions.length,
          averageTicket: enrichedTransactions.length > 0 ? gross / enrichedTransactions.length : 0,
          growth,
          topServices: Object.entries(serviceMap).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5)
        });
      }
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = { background: 'var(--admin-card)', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-card-shadow)' };

  return (
    <div className="sales-report-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      <style>{`
        @media print {
          /* Force everything to white background for print */
          html, body, #root, .admin-theme, .admin-main-wrapper, .sales-report-page {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Hide UI elements */
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          
          /* Reset layout margins */
          .admin-main-wrapper {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            display: block !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }

          /* Report Styling */
          .report-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
            margin-bottom: 30px !important;
            border-bottom: 3px solid #000 !important;
            padding-bottom: 15px !important;
          }

          .metric-card {
            border: 2px solid #eee !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            margin-bottom: 15px !important;
            page-break-inside: avoid !important;
          }

          .metric-card-primary {
            border: 3px solid #000 !important;
            background: #f8f9fa !important;
          }

          .card-metrics {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
          }

          .table-print {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 20px !important;
          }

          .table-print th, .table-print td {
            border: 1px solid #ddd !important;
            padding: 10px !important;
            text-align: left !important;
            font-size: 11px !important;
            color: black !important;
          }

          .table-print th {
            background: #f2f2f2 !important;
            font-weight: 950 !important;
          }

          .print-badge {
            display: inline-block !important;
            border: 1px solid #000 !important;
            padding: 2px 8px !important;
            font-weight: bold !important;
            font-size: 10px !important;
          }
        }
        .print-only { display: none; }
      `}</style>

      {/* PRINT HEADER */}
      <div className="print-only report-header">
        <div>
          <div style={{ fontSize: '32px', fontWeight: '950', letterSpacing: '-1px' }}>SPEEDWAY AUTOXMOTO</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Sales Performance & Operations Audit</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px' }}>
          <div>Report ID: SAL-{Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
          <div>Period: <strong>{period.toUpperCase()}</strong></div>
          <div>Generated: {new Date().toLocaleString()}</div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={() => navigate('/admin/analytics')} style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', fontWeight: '800', cursor: 'pointer', marginBottom: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={14} /> BACK TO ANALYTICS
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '950', color: 'var(--admin-text-primary)' }}>Sales Performance</h1>
        </div>
        <button onClick={() => window.print()} style={{ padding: '0.75rem 1.25rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}><Printer size={16} /> PRINT REPORT</button>
      </div>

      <div className="no-print" style={{ display: 'flex', background: 'var(--admin-card)', padding: '0.4rem', borderRadius: '1rem', border: '1px solid var(--admin-border)', width: 'fit-content' }}>
        {['daily', 'weekly', 'monthly'].map(t => (
          <button key={t} onClick={() => setPeriod(t)} style={{ padding: '0.6rem 1.5rem', borderRadius: '0.75rem', border: 'none', background: period === t ? 'var(--admin-brand)' : 'transparent', color: period === t ? '#FFFFFF' : 'var(--admin-text-secondary)', fontWeight: '900', textTransform: 'uppercase', fontSize: '0.7rem', cursor: 'pointer' }}>{t}</button>
        ))}
      </div>

      <div className="card-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="metric-card metric-card-primary" style={{ ...cardStyle, background: 'linear-gradient(135deg, var(--admin-brand), #ef4444)', color: 'white' }}>
          <div style={{ opacity: 0.8, fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Gross Revenue ({period})</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '950' }}>₱{data.grossRevenue.toLocaleString()}</div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '800' }}>
            {data.growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(data.growth).toFixed(1)}% vs previous {period}
          </div>
        </div>

        <div className="metric-card" style={cardStyle}>
          <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Net Revenue (Verified)</div>
          <div style={{ fontSize: '2rem', fontWeight: '950', color: 'var(--admin-text-primary)' }}>₱{data.netRevenue.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '800', marginTop: '1rem' }}>- ₱{data.refundedAmount.toLocaleString()} in refunds</div>
        </div>

        <div className="metric-card" style={cardStyle}>
          <div style={{ color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Efficiency</div>
          <div style={{ fontSize: '2rem', fontWeight: '950', color: 'var(--admin-text-primary)' }}>{data.transactionCount} Sales</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginTop: '1rem' }}>Avg. ₱{data.averageTicket.toFixed(0)} per detail</div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--admin-text-primary)' }}><ShoppingBag size={20} color="var(--admin-brand)" /> TOP SERVICES</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.topServices.map((svc, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-border)' }}>
                <span style={{ fontWeight: '800', color: 'var(--admin-text-primary)' }}>{svc.name}</span>
                <span style={{ fontWeight: '900', color: 'var(--admin-brand)' }}>{svc.count} sales</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}><DollarSign size={40} color="#10b981" /></div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Target Achievement</h4>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.75rem', margin: '0.5rem 0 1.5rem 0', fontWeight: '600' }}>Based on Detailing volume targets.</p>
          <div style={{ fontSize: '2.5rem', fontWeight: '950', color: 'var(--admin-text-primary)' }}>{Math.min(100, (data.transactionCount / (period === 'daily' ? 7 : 49)) * 100).toFixed(0)}%</div>
          <div style={{ width: '100%', height: '8px', background: 'var(--admin-bg)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (data.transactionCount / (period === 'daily' ? 7 : 49)) * 100)}%`, height: '100%', background: '#10b981' }} /></div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3 className="no-print" style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '950', color: 'var(--admin-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} color="var(--admin-brand)" /> RECENT TRANSACTIONS
        </h3>
        <div className="report-container" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table className="table-print">
            <thead>
              <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ width: '15%' }}>DATE</th>
                <th style={{ width: '20%' }}>CUSTOMER</th>
                <th style={{ width: '25%' }}>FLEET / VEHICLE</th>
                <th style={{ width: '25%' }}>SERVICES</th>
                <th style={{ width: '15%', textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>No transactions recorded for this period.</td></tr>
              ) : transactions.map((t, idx) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--admin-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ fontWeight: '700' }}>{new Date(t.verified_at).toLocaleDateString()}</td>
                  <td style={{ fontWeight: '700' }}>{t.customer_name}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {t.booking?.vehicles?.map((v, i) => (
                      <div key={i}>{v.make} {v.model} ({v.plate_number})</div>
                    ))}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {t.booking?.vehicles?.flatMap(v => v.services?.map(s => s.service_name_snapshot) || []).join(', ')}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--admin-brand)' }}>₱{Number(t.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="print-only" style={{ marginTop: '40px', fontSize: '11px', color: '#333', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '20px', fontStyle: 'italic' }}>
        End of Report - Confidential Financial Information
      </div>
    </div>
  );
};

export default AdminSalesReport;
