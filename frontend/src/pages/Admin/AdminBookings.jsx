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
    try {
      const { data, error } = await supabase
        .from('bookings_v2')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(b => b.customer_id).filter(Boolean))];
        
        if (customerIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', customerIds);

          if (!profilesError && profiles) {
            const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
            const combinedData = data.map(b => ({
              ...b,
              customer: profileMap[b.customer_id] || { full_name: 'Unknown' }
            }));
            setBookings(combinedData);
          } else {
            setBookings(data);
          }
        } else {
          setBookings(data);
        }
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
    const searchStr = `
      ${b.id} 
      ${b.customer?.full_name || ''} 
      ${b.vehicle_type || ''} 
      ${b.vehicle_brand || ''} 
      ${b.vehicle_model || ''} 
      ${b.plate_number || ''} 
      ${(b.service_status || 'NOT_STARTED').replace('_', ' ')} 
      ${b.status || ''}
    `.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'var(--admin-brand)';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'IN_PROGRESS': return '#8b5cf6';
      case 'FINISHED': return '#10b981';
      default: return 'var(--admin-text-secondary)';
    }
  };

  const getPaymentStatus = (booking) => {
    const status = booking.payment_status || 'INITIATED';
    if (status === 'COMPLETED' || status === 'VERIFIED' || status === 'PAID') return { label: 'PAID', color: '#10b981' };
    if (status === 'FOR_VERIFICATION') return { label: 'VERIFYING', color: 'var(--admin-brand)' };
    if (status === 'PARTIALLY_PAID' || status === 'DOWNPAYMENT_PAID') return { label: 'PARTIAL', color: 'var(--admin-brand)' };
    return { label: 'UNPAID', color: 'var(--admin-brand)' };
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      <PageHeader 
        badge="RECORDS MANAGEMENT"
        title="BOOKINGS"
        subtitle="Manage and monitor all vehicle detailing appointments."
        onRefresh={() => { fetchData(); toast.success('Refreshing records...'); }}
      />

      {/* Filter & Search Bar */}
      <div style={{ ...containerStyle, padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--admin-input-bg)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--admin-input-border)' }}>
            <Search size={18} color="var(--admin-text-secondary)" />
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
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--card-text)' }}>{booking.vehicle_type} ({booking.plate_number})</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--card-text)' }}>{new Date(booking.start_datetime).toLocaleDateString()}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                   <div style={{ color: pStatus.color, fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>
                     ₱{(booking.total_price || 0).toLocaleString()} • {pStatus.label}
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
                      <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{booking.vehicle_type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{booking.plate_number}</div>
                    </td>
                     <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>{new Date(booking.start_datetime).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div className="badge" style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                        padding: '0.4rem 0.8rem', 
                        borderRadius: '2rem', fontSize: '0.7rem', fontWeight: '800',
                        textTransform: 'uppercase'
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(booking.status) }}></div>
                        {booking.status?.toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                        color: pStatus.color, fontSize: '0.8rem', fontWeight: '800'
                      }}>
                        ₱{(booking.total_price || 0).toLocaleString()} • {pStatus.label}
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
