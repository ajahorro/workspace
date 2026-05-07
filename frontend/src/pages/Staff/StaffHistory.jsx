import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { History, Clock, DollarSign, CheckCircle2, ChevronRight, Search } from 'lucide-react';
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
      const { data, error } = await supabase
        .from('bookings_v2')
        .select(`
          *,
          customer:profiles!customer_id(full_name, email),
          booking_services:booking_services_v2(service:services_v2(name))
        `)
        .eq('staff_id', user.id)
        .eq('status', 'completed')
        .order('start_datetime', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map(t => ({
          ...t,
          booking_services: t.booking_services.map(bs => ({ service_name: bs.service?.name }))
        }));
        setHistory(mapped);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => 
    h.vehicle_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cardStyle = {
    background: 'var(--admin-card)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid var(--admin-border)',
    borderRadius: '1.25rem',
    overflow: 'hidden',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)',
    transition: 'all 0.3s ease'
  };

  if (loading) return <LoadingState message="Loading your service history..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="STAFF RECORDS"
        title="History of Services"
        subtitle="A comprehensive log of all detailing services you have completed."
        onRefresh={fetchHistory}
      />

      {/* Search & Stats Bar */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', width: isMobile ? '100%' : '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)', opacity: 0.5 }} />
          <input 
            type="text" 
            placeholder="Search by vehicle, plate, or customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1rem 0.85rem 3rem',
              background: 'var(--admin-card)',
              border: '1px solid var(--admin-border)',
              borderRadius: '0.75rem',
              color: 'var(--admin-text-primary)',
              fontSize: '0.9rem',
              fontWeight: '600',
              outline: 'none'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', width: isMobile ? '100%' : 'auto' }}>
           <div style={{ flex: 1, padding: '0.75rem 1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#10b981' }}>{history.length}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Jobs Done</div>
           </div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div style={{ ...cardStyle, padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--admin-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--admin-border)' }}>
            <History size={40} style={{ color: 'var(--admin-text-secondary)', opacity: 0.2 }} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>NO HISTORY FOUND</h3>
            <p style={{ color: 'var(--admin-text-secondary)', opacity: 0.7, fontWeight: '600' }}>
              {searchTerm ? 'No records match your search criteria.' : 'You haven\'t completed any services yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredHistory.map(item => (
            <div key={item.id} className="history-item" style={{ ...cardStyle, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', padding: '1.5rem', gap: '1.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--admin-border)', flexShrink: 0 }}>
                <CheckCircle2 size={24} color="#10b981" />
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{item.vehicle_brand} {item.vehicle_model}</h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', background: 'var(--admin-bg)', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--admin-border)', fontFamily: 'monospace' }}>{item.plate_number}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} color="var(--admin-brand)" /> {new Date(item.start_datetime).toLocaleDateString()}</span>
                   <span style={{ width: '4px', height: '4px', background: 'var(--admin-border)', borderRadius: '50%' }}></span>
                   <span>Customer: {item.customer?.full_name || 'Anonymous'}</span>
                </div>
              </div>

              <div style={{ minWidth: '150px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Services Performed</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {item.booking_services.slice(0, 2).map((bs, i) => (
                    <span key={i} style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.25rem 0.5rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '0.4rem' }}>{bs.service_name}</span>
                  ))}
                  {item.booking_services.length > 2 && <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.25rem 0.5rem' }}>+{item.booking_services.length - 2} more</span>}
                </div>
              </div>

              <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: '120px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem' }}>FINAL PRICE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{item.total_price?.toLocaleString()}</div>
              </div>

              {!isMobile && <ChevronRight size={20} color="var(--admin-text-secondary)" opacity={0.3} />}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .history-item:hover {
          border-color: var(--admin-brand) !important;
          transform: translateX(5px);
          background: rgba(var(--admin-brand-rgb), 0.02);
        }
      `}</style>
    </div>
  );
};

export default StaffHistory;
