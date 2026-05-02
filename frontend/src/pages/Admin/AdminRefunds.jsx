import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  AlertTriangle, CreditCard, ArrowRight, Clock, 
  CheckCircle, XCircle, Search, Filter, MessageCircle
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
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, PROCESSED

  useEffect(() => {
    fetchRefundableBookings();
  }, []);

  const fetchRefundableBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey(full_name),
        payments:payment_intents(*)
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
    } catch (err) {
      toast.error('Failed to update refund status');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const payment = b.payments?.[0];
    const matchesSearch = b.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'PENDING') return matchesSearch && payment?.status !== 'REFUNDED' && payment?.amount_paid > 0;
    if (filter === 'PROCESSED') return matchesSearch && payment?.status === 'REFUNDED';
    return matchesSearch && payment?.amount_paid > 0;
  });

  if (loading) return <LoadingState message="Loading refund requests..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="FINANCIAL MANAGEMENT"
        title="REFUND HUB"
        subtitle="Manage and process money-back requests for cancelled bookings."
        onRefresh={fetchRefundableBookings}
      />

      {/* Filters & Search */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
          <input 
            type="text" 
            placeholder="Search by customer or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff', fontSize: '0.9rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          {['ALL', 'PENDING', 'PROCESSED'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{ 
                padding: '0.6rem 1.25rem', borderRadius: '0.75rem', border: 'none', 
                background: filter === f ? 'var(--primary-color)' : 'transparent', 
                color: filter === f ? '#000' : 'rgba(255,255,255,0.5)', 
                fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' 
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Refunds Table/List */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
        {filteredBookings.length === 0 ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle size={40} color="rgba(255,255,255,0.1)" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)' }}>All caught up!</h3>
            <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.9rem' }}>No refund requests found matching your criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '1.5rem', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Booking</th>
                  <th style={{ padding: '1.5rem', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer</th>
                  <th style={{ padding: '1.5rem', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Paid Amount</th>
                  <th style={{ padding: '1.5rem', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                  <th style={{ padding: '1.5rem', fontSize: '0.75rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(b => {
                  const payment = b.payments?.[0] || {};
                  const isRefunded = payment.status === 'REFUNDED';
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.5rem' }}>
                        <div 
                          onClick={() => navigate(`/admin/bookings/${b.id}`)}
                          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                        >
                          <span style={{ fontWeight: '800', color: 'var(--primary-color)', fontSize: '0.9rem' }}>#{b.id.slice(0, 8).toUpperCase()}</span>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>{new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.5rem' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{b.customer?.full_name}</div>
                      </td>
                      <td style={{ padding: '1.5rem' }}>
                        <div style={{ fontWeight: '900', fontSize: '1.1rem', color: '#fff' }}>₱{payment.amount_paid?.toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '1.5rem' }}>
                        <div style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                          padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: '900',
                          background: isRefunded ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: isRefunded ? '#10b981' : '#ef4444',
                          border: `1px solid ${isRefunded ? '#10b98133' : '#ef444433'}`
                        }}>
                          {isRefunded ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {isRefunded ? 'REFUNDED' : 'PENDING'}
                        </div>
                      </td>
                      <td style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button 
                            onClick={() => navigate(`/admin/bookings/${b.id}`)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                            title="Open Chat"
                          >
                            <MessageCircle size={18} />
                          </button>
                          {!isRefunded && (
                            <button 
                              onClick={() => handleProcessRefund(b.id, payment.id)}
                              style={{ background: 'var(--primary-color)', border: 'none', color: '#000', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                            >
                              Process
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRefunds;
