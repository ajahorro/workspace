import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  AlertTriangle, CreditCard, ArrowRight, Clock, 
  CheckCircle, XCircle, Search, Filter, MessageCircle,
  Car, Calendar, User, Eye, Download
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

const AdminRefunds = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('PENDING'); // PENDING, PROCESSED, ALL
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchRefundableBookings();
  }, []);

  const fetchRefundableBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(full_name, email, phone_number),
        payments:payment_intents(*),
        booking_services(service_name)
      `)
      .eq('booking_status', 'CANCELLED')
      .order('created_at', { ascending: false });

    if (data) setBookings(data);
    if (error) console.error('Error fetching refunds:', error);
    setLoading(false);
  };

  const handleProcessRefund = async (bookingId, paymentId) => {
    if (!window.confirm('Mark this refund as processed? Ensure you have sent the money back via GCash.')) return;
    
    try {
      const { error } = await supabase
        .from('payment_intents')
        .update({ status: 'REFUNDED' })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Refund marked as PROCESSED');
      fetchRefundableBookings();
      setSelectedBooking(null);
    } catch (err) {
      toast.error('Failed to update refund status');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const payment = b.payments?.[0];
    const matchesSearch = 
      b.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Logic: If it's cancelled and either paid OR awaiting verification (because money might be in GCash)
    const needsRefund = payment?.amount_paid > 0 || payment?.status === 'FOR_VERIFICATION' || payment?.status === 'VERIFIED' || payment?.status === 'PAID';
    
    if (filter === 'PENDING') return matchesSearch && needsRefund && payment?.status !== 'REFUNDED';
    if (filter === 'PROCESSED') return matchesSearch && payment?.status === 'REFUNDED';
    return matchesSearch && needsRefund;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'REFUNDED': return '#10b981';
      case 'FOR_VERIFICATION': return '#f59e0b';
      default: return '#ef4444';
    }
  };

  if (loading) return <LoadingState message="Loading refund requests..." />;

  const panelStyle = {
    background: 'var(--glass-red)',
    backdropFilter: 'var(--blur-amount)',
    WebkitBackdropFilter: 'var(--blur-amount)',
    border: '1px solid var(--glass-border)',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: 'var(--card-shadow)',
    color: 'var(--card-text)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="FINANCIAL RECONCILIATION"
        title="REFUND HUB"
        subtitle="Manage money-back requests for cancelled bookings."
        onRefresh={fetchRefundableBookings}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '2rem' }}>
        
        {/* Left Side: List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ ...panelStyle, padding: '1rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search customer, ID or plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', background: 'var(--bg-input)', border: 'var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-input)', padding: '0.25rem', borderRadius: '0.75rem', border: 'var(--border-color)' }}>
              {['PENDING', 'PROCESSED', 'ALL'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{ 
                    padding: '0.5rem 1rem', borderRadius: '0.6rem', border: 'none', 
                    background: filter === f ? 'var(--red-shade)' : 'transparent', 
                    color: filter === f ? '#fff' : 'var(--text-secondary)', 
                    fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' 
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredBookings.length === 0 ? (
              <div style={{ ...panelStyle, padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontWeight: '700' }}>
                No refund records found.
              </div>
            ) : (
              filteredBookings.map(b => {
                const payment = b.payments?.[0] || {};
                const isSelected = selectedBooking?.id === b.id;
                return (
                  <div 
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    style={{ 
                      ...panelStyle, 
                      padding: '1.25rem', 
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.03)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#fff', opacity: 0.8, marginBottom: '0.25rem' }}>#{b.id.slice(0, 8).toUpperCase()}</div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{b.customer?.full_name}</h3>
                      </div>
                      <div style={{ 
                        padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: '900',
                        background: 'rgba(255,255,255,0.2)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}>
                        {payment.status.replace('_', ' ')}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: '800', marginBottom: '0.25rem' }}>CAR DETAILS</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>{b.vehicle_brand} {b.vehicle_model}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{b.plate_number}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: '800', marginBottom: '0.25rem' }}>PAID AMOUNT</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>₱{(payment.amount_paid || payment.total_amount || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>VIA {payment.method}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Details View */}
        <div style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
          {selectedBooking ? (
            <div style={{ ...panelStyle, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: '900', letterSpacing: '1px' }}>REFUND DETAILS</h3>
                <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><XCircle size={20}/></button>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: 'var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <User size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedBooking.customer?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedBooking.customer?.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedBooking.customer?.phone_number}</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>SERVICES CANCELLED</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedBooking.booking_services?.map((s, i) => (
                    <span key={i} style={{ background: 'var(--bg-input)', border: 'var(--border-color)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{s.service_name}</span>
                  ))}
                </div>
              </div>

              {selectedBooking.payments?.[0]?.receipt_url && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    GCASH RECEIPT
                    <a href={selectedBooking.payments[0].receipt_url} target="_blank" rel="noreferrer" style={{ color: 'var(--red-shade)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      VIEW <Download size={12} />
                    </a>
                  </div>
                  <div 
                    onClick={() => window.open(selectedBooking.payments[0].receipt_url, '_blank')}
                    style={{ width: '100%', height: '200px', background: '#000', borderRadius: '1rem', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <img src={selectedBooking.payments[0].receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => navigate(`/admin/bookings/${selectedBooking.id}`)}
                  style={{ flex: 1, padding: '1rem', background: 'var(--bg-input)', border: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <MessageCircle size={18} /> OPEN CHAT
                </button>
                {selectedBooking.payments?.[0]?.status !== 'REFUNDED' && (
                  <button 
                    onClick={() => handleProcessRefund(selectedBooking.id, selectedBooking.payments[0].id)}
                    style={{ flex: 1, padding: '1rem', background: 'var(--red-shade)', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    MARK REFUNDED
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ ...panelStyle, padding: '4rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.15)', borderStyle: 'dashed' }}>
              <Eye size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: '700' }}>Select a request to view details and process refund.</p>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminRefunds;
