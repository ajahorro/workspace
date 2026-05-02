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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        scheduled_start,
        service_status,
        booking_status,
        vehicle_type,
        plate_number,
        vehicle_brand,
        vehicle_model,
        customer:profiles!bookings_customer_id_fkey(full_name),
        payments:payment_intents(status, total_amount)
      `)
      .order('created_at', { ascending: false });

    if (data) setBookings(data);
    if (error) console.error('Error fetching bookings:', error);
    setLoading(false);
  };

  const filteredBookings = bookings.filter(b => {
    const searchStr = `
      ${b.id} 
      ${b.customer?.full_name || ''} 
      ${b.vehicle_type || ''} 
      ${b.vehicle_brand || ''} 
      ${b.vehicle_model || ''} 
      ${b.plate_number || ''} 
      ${(b.service_status || 'NOT_STARTED').replace('_', ' ')} 
      ${b.booking_status || ''}
    `.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT': return '#f59e0b';
      case 'CONFIRMED': return 'var(--primary-color)';
      case 'COMPLETED': return '#10b981';
      case 'CANCELLED': return '#ef4444';
      case 'ONGOING': return '#8b5cf6';
      case 'IN_PROGRESS': return '#8b5cf6';
      case 'FINISHED': return '#10b981';
      default: return 'rgba(255,255,255,0.4)';
    }
  };

  const getPaymentStatus = (payments) => {
    if (!payments || payments.length === 0) return { label: 'UNPAID', color: '#f59e0b' };
    const payment = payments[0];
    const status = payment.status;
    if (status === 'COMPLETED' || status === 'VERIFIED' || status === 'PAID') return { label: 'PAID', color: '#10b981' };
    if (status === 'FOR_VERIFICATION') return { label: 'VERIFYING', color: '#f59e0b' };
    if (status === 'PARTIALLY_PAID' || status === 'DOWNPAYMENT_PAID') return { label: 'PARTIAL', color: 'var(--primary-color)' };
    return { label: 'UNPAID', color: '#f59e0b' };
  };

  const containerStyle = {
    background: 'var(--bg-secondary)',
    borderRadius: '1rem',
    border: '1px solid rgba(255,255,255,0.03)',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      <PageHeader 
        badge="RECORDS MANAGEMENT"
        title="BOOKINGS"
        subtitle="Manage and monitor all vehicle detailing appointments."
        onRefresh={() => { fetchData(); toast.success('Refreshing records...'); }}
      />

      {/* Filter & Search Bar */}
      <div style={{ ...containerStyle, padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1.5rem', borderRadius: '0.75rem', flex: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
            <Search size={18} color="rgba(255,255,255,0.3)" />
            <input 
              type="text"
              placeholder="Search by customer, vehicle, plate..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', color: '#fff', width: '100%', outline: 'none', fontSize: '0.9rem', fontWeight: '500' }} 
            />
          </div>
          <button style={{ padding: '0.85rem 1.5rem', background: 'rgba(169, 27, 24, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(169, 27, 24, 0.2)', borderRadius: '0.75rem', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
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
            const pStatus = getPaymentStatus(booking.payments);
            return (
              <div 
                key={booking.id}
                onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                style={{ ...containerStyle, padding: '1.25rem', position: 'relative', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ color: 'var(--primary-color)', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '0.5px' }}>#{booking.id.substring(0, 8).toUpperCase()}</span>
                    <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: '800' }}>{booking.customer?.full_name || 'Unknown'}</h3>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', color: '#fff', padding: '0.4rem 0.8rem', 
                    borderRadius: '2rem', fontSize: '0.65rem', fontWeight: '900',
                    border: '1px solid rgba(255,255,255,0.05)', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(booking.booking_status === 'CONFIRMED' ? booking.service_status : booking.booking_status) }}></div>
                    {(booking.booking_status === 'CONFIRMED' ? booking.service_status : booking.booking_status).replace('_', ' ')}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: '700' }}>{booking.vehicle_type} ({booking.plate_number})</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: '700' }}>{new Date(booking.scheduled_start).toLocaleDateString()}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                   <div style={{ color: pStatus.color, fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>
                     ₱{(booking.payments?.[0]?.total_amount || 0).toLocaleString()} • {pStatus.label}
                   </div>
                   <ArrowRight size={16} color="rgba(255,255,255,0.2)" />
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
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>ID</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Customer</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Vehicle</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Schedule</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Status</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Payment</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(booking => {
                const pStatus = getPaymentStatus(booking.payments);
                const initial = booking.customer?.full_name?.charAt(0).toUpperCase() || 'U';
                return (
                  <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ color: 'var(--primary-color)', fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                        #{booking.id.substring(0, 4).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(169, 27, 24, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(169, 27, 24, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.7rem' }}>{initial}</div>
                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem' }}>{booking.customer?.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.85rem' }}>{booking.vehicle_type}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase' }}>{booking.plate_number}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.85rem' }}>{new Date(booking.scheduled_start).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: '900' }}>{new Date(booking.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                        background: 'rgba(255,255,255,0.03)', color: '#fff', padding: '0.4rem 0.8rem', 
                        borderRadius: '2rem', fontSize: '0.7rem', fontWeight: '900',
                        border: '1px solid rgba(255,255,255,0.05)', textTransform: 'uppercase'
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(booking.booking_status === 'CONFIRMED' ? booking.service_status : booking.booking_status) }}></div>
                        {(booking.booking_status === 'CONFIRMED' ? booking.service_status : booking.booking_status).replace('_', ' ')}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                        color: pStatus.color, fontSize: '0.75rem', fontWeight: '900',
                        textTransform: 'uppercase'
                      }}>
                        ₱{(booking.payments?.[0]?.total_amount || 0).toLocaleString()} • {pStatus.label}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <button 
                        onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '0.5rem', 
                          background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', 
                          color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '0.6rem', 
                          fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
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
