import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Clock, CreditCard, ExternalLink, RotateCw, Filter, Calendar, ArrowRight, User } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

const AdminBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(location.state?.filter || '');

  useEffect(() => {
    if (location.state?.filter) {
      setSearchTerm(location.state.filter);
    }
  }, [location.state]);

  useEffect(() => {
    fetchData();

    // Real-time subscription — re-fetch on any bookings change
    const channel = supabase
      .channel('admin-bookings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch bookings with their payments and vehicles
      const { data, error } = await supabase
        .from('bookings')
        .select('*, payments(*), vehicles:booking_vehicles(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(b => b.customer_id).filter(Boolean))];
        
        let profileMap = {};
        if (customerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', customerIds);
          if (profiles) profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        }

        const combinedData = data.map(b => {
          const payments = b.payments || [];
          const totalPaid = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
          const isPendingVerification = payments.some(p => p.status === 'FOR_VERIFICATION');
          
          let calcStatus = 'UNPAID';
          if (totalPaid >= b.total_amount && b.total_amount > 0) {
            calcStatus = 'PAID';
          } else if (isPendingVerification) {
            calcStatus = 'VERIFYING';
          } else if (totalPaid >= (b.total_amount * 0.3) && b.total_amount > 0) {
            calcStatus = 'DOWNPAYMENT_PAID';
          }

          return {
            ...b,
            customer: profileMap[b.customer_id] || { full_name: 'Unknown' },
            calculatedPaymentStatus: calcStatus,
            totalPaidAmount: totalPaid
          };
        });
        setBookings(combinedData);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const status = b.status || 'scheduled';
    const sStatus = b.service_status || 'queued';
    const pStatus = b.payment_status || 'unpaid';
    
    const searchStr = `
      ${b.id} 
      ${b.customer?.full_name || ''} 
      ${b.vehicles?.map(v => v.vehicle_type).join(' ') || ''} 
      ${b.vehicles?.map(v => v.make).join(' ') || ''} 
      ${b.vehicles?.map(v => v.model).join(' ') || ''} 
      ${b.vehicles?.map(v => v.plate_number).join(' ') || ''} 
      ${status}
      ${sStatus}
      ${pStatus}
    `.toLowerCase();
    
    const term = searchTerm.toLowerCase().replace(/_/g, ' ');
    return searchStr.includes(searchTerm.toLowerCase()) || searchStr.includes(term);
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'var(--admin-brand)';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'ongoing': return '#a855f7';
      default: return 'var(--admin-text-secondary)';
    }
  };

  const getPaymentStatus = (booking) => {
    const status = booking.calculatedPaymentStatus || 'UNPAID';
    if (status === 'PAID') return { label: 'FULLY PAID', color: '#10b981' };
    if (status === 'VERIFYING') return { label: 'VERIFYING', color: '#8b5cf6' };
    if (status === 'DOWNPAYMENT_PAID') return { label: 'DOWNPAYMENT', color: '#3b82f6' };
    return { label: 'UNPAID', color: '#ef4444' };
  };

  const containerStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    color: 'var(--admin-text-primary)',
    border: '1px solid var(--admin-border)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingLeft: isMobile ? '0.5rem' : 0, paddingRight: isMobile ? '0.5rem' : 0 }}>
      
      <PageHeader 
        badge="RECORDS MANAGEMENT"
        title="BOOKINGS"
        subtitle="Manage and monitor all vehicle detailing appointments."
        onRefresh={() => { fetchData(); toast.success('Refreshing records...'); }}
      />

      {/* Filter & Search Bar */}
      <div style={{ background: 'var(--admin-input-bg)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem' }}>
          <div style={{ position: 'relative', background: 'var(--admin-input-bg)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--admin-input-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Search size={18} color="var(--admin-text-secondary)" style={{ flexShrink: 0 }} />
            <input 
              type="text"
              placeholder="Search by customer, vehicle, plate..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--admin-text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '500' }} 
            />
          </div>
          <button style={{ padding: '0.75rem 1.5rem', background: 'var(--admin-bg)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-input-border)', borderRadius: '0.75rem', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <Filter size={16} /> FILTERS
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Retrieving booking records..." />
      ) : filteredBookings.length === 0 ? (
        <div style={{ ...containerStyle, padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: '600' }}>No matching records found.</div>
      ) : isMobile ? (
        /* Mobile Card Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredBookings.map(booking => {
            const pStatus = getPaymentStatus(booking);
            return (
              <div 
                key={booking.id}
                onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                style={{ ...containerStyle, padding: '1.25rem', position: 'relative', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ color: 'var(--card-text)', fontWeight: '900', fontSize: '0.7rem', opacity: 0.8, letterSpacing: '0.5px' }}>#{booking.id.substring(0, 8).toUpperCase()}</span>
                    <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--card-text)' }}>{booking.customer?.full_name || 'Unknown'}</h3>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', color: 'var(--card-text)', padding: '0.4rem 0.8rem', 
                    borderRadius: '2rem', fontSize: '0.65rem', fontWeight: '900',
                    border: '1px solid rgba(255,255,255,0.05)', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(booking.status) }}></div>
                    {booking.status?.toUpperCase()}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle(s)</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--card-text)' }}>
                      {booking.vehicles?.length > 1 ? `Fleet (${booking.vehicles.length} Units)` : (booking.vehicles?.[0]?.vehicle_type || 'N/A')}
                    </p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', fontWeight: '600', color: 'var(--card-text)', opacity: 0.8 }}>
                      {booking.vehicles?.length > 1 ? 'Multiple Plates' : (booking.vehicles?.[0]?.plate_number || 'N/A')}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--card-text)' }}>{new Date(booking.start_datetime).toLocaleDateString()}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                   <div style={{ color: pStatus.color, fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', background: `${pStatus.color}15`, padding: '0.2rem 0.6rem', borderRadius: '0.4rem', border: `1px solid ${pStatus.color}30` }}>
                     ₱{(booking.total_amount || 0).toLocaleString()} • {pStatus.label}
                   </div>
                   <ArrowRight size={16} style={{ color: 'var(--card-text)', opacity: 0.3 }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Table Layout */
        <div style={containerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Schedule</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(booking => {
                const pStatus = getPaymentStatus(booking);
                const initial = booking.customer?.full_name?.charAt(0).toUpperCase() || 'U';
                return (
                  <tr key={booking.id} style={{ borderBottom: '1px solid var(--admin-border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ color: 'var(--admin-text-secondary)', fontWeight: '700', fontSize: '0.75rem' }}>
                        #{filteredBookings.length - filteredBookings.indexOf(booking)}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--admin-bg)', color: 'var(--admin-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.75rem' }}>{initial}</div>
                        <span style={{ fontWeight: '700', color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{booking.customer?.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                     <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>
                        {booking.vehicles?.length > 1 ? `Fleet (${booking.vehicles.length} Units)` : (booking.vehicles?.[0]?.vehicle_type || 'N/A')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
                        {booking.vehicles?.length > 1 ? 'Multiple Plates' : (booking.vehicles?.[0]?.plate_number || 'N/A')}
                      </div>
                    </td>
                     <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{new Date(booking.start_datetime).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                     <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {/* Appointment Status */}
                        <span style={{ 
                          fontSize: '0.6rem', fontWeight: '900', padding: '0.2rem 0.6rem', borderRadius: '2rem', 
                          background: booking.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : (booking.status === 'cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'),
                          color: booking.status === 'completed' ? '#10b981' : (booking.status === 'cancelled' ? '#ef4444' : '#3b82f6'),
                          textTransform: 'uppercase', border: '1px solid currentColor', width: 'fit-content'
                        }}>
                          APP: {booking.status}
                        </span>
                        {/* Service Status */}
                        <span style={{ 
                          fontSize: '0.6rem', fontWeight: '900', padding: '0.2rem 0.6rem', borderRadius: '2rem', 
                          background: booking.service_status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : (booking.service_status === 'in_progress' ? 'rgba(168, 85, 247, 0.1)' : 'var(--admin-bg)'),
                          color: booking.service_status === 'completed' ? '#10b981' : (booking.service_status === 'in_progress' ? '#a855f7' : 'var(--admin-text-secondary)'),
                          textTransform: 'uppercase', border: '1px solid currentColor', width: 'fit-content'
                        }}>
                          SRV: {booking.service_status?.replace('_', ' ')}
                        </span>
                        {/* Payment Status */}
                        <span style={{ 
                          fontSize: '0.6rem', fontWeight: '900', padding: '0.2rem 0.6rem', borderRadius: '2rem', 
                          background: booking.payment_status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : (booking.payment_status === 'unpaid' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.1)'),
                          color: booking.payment_status === 'paid' ? '#10b981' : (booking.payment_status === 'unpaid' ? '#f59e0b' : '#8b5cf6'),
                          textTransform: 'uppercase', border: '1px solid currentColor', width: 'fit-content'
                        }}>
                          PAY: {booking.payment_status?.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: '900', color: 'var(--admin-text-primary)', fontSize: '1rem' }}>
                        ₱{(booking.total_amount || 0).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <button 
                        onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '0.5rem', 
                          background: 'var(--admin-bg)', border: '1px solid var(--admin-input-border)', 
                          color: 'var(--admin-text-primary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', 
                          fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-card)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--admin-bg)'}
                      >
                        DETAILS <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminBookings;
