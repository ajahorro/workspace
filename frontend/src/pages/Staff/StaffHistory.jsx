import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { History, Clock, CheckCircle2, ChevronRight, Search, Car } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import LoadingState from '../../components/LoadingState';

const StaffHistory = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // 1. Fetch completed bookings for this staff
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('staff_id', user.id)
        .eq('status', 'completed')
        .order('start_datetime', { ascending: false });

      if (bErr) throw bErr;
      if (!bookings || bookings.length === 0) {
        setHistory([]);
        return;
      }

      const bookingIds = bookings.map(b => b.id);

      // 2. Fetch profiles
      const customerIds = [...new Set(bookings.map(b => b.customer_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', customerIds);
      const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

      // 3. Fetch vehicles
      const { data: vehicles } = await supabase.from('booking_vehicles').select('*').in('booking_id', bookingIds);
      const vehicleIds = (vehicles || []).map(v => v.id);

      // 4. Fetch services
      let serviceMap = {};
      if (vehicleIds.length > 0) {
        const { data: services } = await supabase.from('booking_vehicle_services').select('*').in('vehicle_id', vehicleIds);
        serviceMap = (services || []).reduce((acc, s) => {
          if (!acc[s.vehicle_id]) acc[s.vehicle_id] = [];
          acc[s.vehicle_id].push(s);
          return acc;
        }, {});
      }

      // Assemble
      const assembled = bookings.map(b => ({
        ...b,
        customer: profileMap[b.customer_id],
        vehicles: (vehicles || []).filter(v => v.booking_id === b.id).map(v => ({
          ...v,
          services: serviceMap[v.id] || []
        }))
      }));

      setHistory(assembled);
    } catch (err) {
      console.error('History Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => {
    const searchStr = `${h.customer?.full_name} ${h.id} ${h.vehicles?.map(v => `${v.make} ${v.model} ${v.plate_number}`).join(' ')}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const cardStyle = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: 'var(--admin-card-shadow)', color: 'var(--admin-text-primary)', transition: 'all 0.3s ease' };

  if (loading) return <LoadingState message="Aggregating service records..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      <PageHeader badge="STAFF RECORDS" title="SERVICE HISTORY" subtitle="Audit log of your completed fleet detailing sessions." onRefresh={fetchHistory} />

      <div style={{ position: 'relative', width: isMobile ? '100%' : '500px' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)', opacity: 0.5 }} />
        <input type="text" placeholder="Search by customer, vehicle, or plate..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontSize: '0.9rem', fontWeight: '600', outline: 'none' }} />
      </div>

      {filteredHistory.length === 0 ? (
        <div style={{ ...cardStyle, padding: '5rem 2rem', textAlign: 'center', opacity: 0.6 }}>No records found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredHistory.map(item => (
            <div key={item.id} style={cardStyle}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--admin-border)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <CheckCircle2 size={24} color="#10b981" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900' }}>{item.customer?.full_name || 'Walk-in'}</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--admin-text-secondary)' }}>
                       <span>{new Date(item.start_datetime).toLocaleDateString()}</span>
                       <span>• {item.vehicles?.length} Units</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>SESSION TOTAL</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '950' }}>₱{item.total_amount?.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {item.vehicles?.map(v => (
                   <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <Car size={16} color="var(--admin-brand)" />
                         <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>{v.make} {v.model}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--admin-text-secondary)' }}>{v.plate_number}</div>
                         </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '200px' }}>
                         {v.services?.map((s, idx) => (
                           <span key={idx} style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.2rem 0.5rem', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '0.4rem' }}>{s.service_name_snapshot}</span>
                         ))}
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffHistory;
