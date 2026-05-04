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
  const [refundItems, setRefundItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('PENDING'); // PENDING, PROCESSED, ALL
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchRefundData();
  }, []);

  const fetchRefundData = async () => {
    setLoading(true);
    try {
      // Fetch cancelled bookings that had payments
      const { data: cancelledBookings, error: bookingError } = await supabase
        .from('bookings_v2')
        .select('*')
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (bookingError) throw bookingError;
      if (!cancelledBookings || cancelledBookings.length === 0) {
        setRefundItems([]);
        setLoading(false);
        return;
      }

      const bookingIds = cancelledBookings.map(b => b.id);
      const customerIds = [...new Set(cancelledBookings.map(b => b.customer_id).filter(Boolean))];

      // Get payments for these bookings
      const { data: payments } = await supabase
        .from('payments_v2')
        .select('*')
        .in('booking_id', bookingIds)
        .gt('amount', 0);

      // Get existing refunds
      const { data: refunds } = await supabase
        .from('refunds_v2')
        .select('*')
        .in('booking_id', bookingIds);

      // Get customer profiles
      const { data: profiles } = customerIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, phone_number').in('id', customerIds)
        : { data: [] };

      const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      const paymentsByBooking = (payments || []).reduce((acc, p) => {
        if (!acc[p.booking_id]) acc[p.booking_id] = [];
        acc[p.booking_id].push(p);
        return acc;
      }, {});
      const refundsByBooking = (refunds || []).reduce((acc, r) => {
        if (!acc[r.booking_id]) acc[r.booking_id] = [];
        acc[r.booking_id].push(r);
        return acc;
      }, {});

      // Build combined items — only bookings that had actual payments
      const items = cancelledBookings
        .filter(b => paymentsByBooking[b.id]?.some(p => p.status === 'PAID' || p.status === 'FOR_VERIFICATION'))
        .map(b => ({
          ...b,
          customer: profileMap[b.customer_id] || { full_name: 'Unknown' },
          payments: paymentsByBooking[b.id] || [],
          refunds: refundsByBooking[b.id] || [],
          totalPaid: (paymentsByBooking[b.id] || [])
            .filter(p => p.status === 'PAID')
            .reduce((sum, p) => sum + Number(p.amount), 0),
          hasRefund: (refundsByBooking[b.id] || []).length > 0,
          refundStatus: (refundsByBooking[b.id] || [])[0]?.status || null
        }));

      setRefundItems(items);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      toast.error('Failed to load refund requests');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (item) => {
    if (!window.confirm('Mark this refund as processed? Ensure you have sent the money back via GCash.')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const paidPayment = item.payments.find(p => p.status === 'PAID');

      if (!paidPayment) {
        toast.error('No paid payment found for this booking');
        return;
      }

      if (item.hasRefund) {
        // Update existing refund
        const refund = item.refunds[0];
        const { error } = await supabase
          .from('refunds_v2')
          .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
          .eq('id', refund.id);
        if (error) throw error;
      } else {
        // Create new refund record (required FK to payment)
        const { error } = await supabase
          .from('refunds_v2')
          .insert({
            booking_id: item.id,
            payment_id: paidPayment.id,
            amount: item.totalPaid,
            reason: 'Booking cancelled — customer refund',
            status: 'PROCESSED',
            created_by: user.id,
            processed_at: new Date().toISOString()
          });
        if (error) throw error;
      }

      // Update payment status to REFUNDED
      await supabase
        .from('payments_v2')
        .update({ status: 'REFUNDED' })
        .eq('id', paidPayment.id);

      toast.success('Refund marked as PROCESSED');
      fetchRefundData();
      setSelectedItem(null);
    } catch (err) {
      toast.error(`Failed to process refund: ${err.message}`);
    }
  };

  const filteredItems = refundItems.filter(b => {
    const matchesSearch =
      b.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.plate_number?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'PENDING') return matchesSearch && b.refundStatus !== 'PROCESSED';
    if (filter === 'PROCESSED') return matchesSearch && b.refundStatus === 'PROCESSED';
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'PROCESSED': return '#10b981';
      case 'FOR_VERIFICATION': return 'var(--admin-brand)';
      default: return '#ef4444';
    }
  };

  if (loading) return <LoadingState message="Loading refund requests..." />;

  const panelStyle = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    color: 'var(--admin-text-primary)',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        badge="FINANCIAL RECONCILIATION"
        title="REFUND HUB"
        subtitle="Manage money-back requests for cancelled bookings."
        onRefresh={fetchRefundData}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '2rem' }}>

        {/* Left Side: List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ ...panelStyle, padding: '1rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search customer, ID or plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-input-border)', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)' }}>
              {['PENDING', 'PROCESSED', 'ALL'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.6rem', border: 'none',
                    background: filter === f ? 'var(--admin-brand)' : 'transparent',
                    color: filter === f ? '#FFFFFF' : 'var(--admin-text-secondary)',
                    fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredItems.length === 0 ? (
              <div style={{ ...panelStyle, padding: '4rem', textAlign: 'center', color: 'var(--card-text)', opacity: 0.2, fontWeight: '700' }}>
                No refund records found.
              </div>
            ) : (
              filteredItems.map(b => {
                const isSelected = selectedItem?.id === b.id;
                const displayStatus = b.refundStatus || 'PENDING';
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedItem(b)}
                    style={{
                      ...panelStyle,
                      padding: '1.25rem',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--admin-brand)' : '1px solid var(--admin-border)',
                      transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem' }}>#{b.id.slice(0, 8).toUpperCase()}</div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>{b.customer?.full_name}</h3>
                      </div>
                      <div className="badge" style={{
                        padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: '800',
                        textTransform: 'uppercase', color: getStatusColor(displayStatus)
                      }}>
                        {displayStatus}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '700', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Vehicle Details</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{b.vehicle_brand} {b.vehicle_model}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{b.plate_number}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '700', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Amount to Refund</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>₱{b.totalPaid.toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>VIA {b.payments[0]?.method || 'N/A'}</div>
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
          {selectedItem ? (
            <div style={{ ...panelStyle, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: '800', letterSpacing: '1px', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--admin-text-secondary)' }}>REFUND SUMMARY</h3>
                <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}><XCircle size={20}/></button>
              </div>

              <div style={{ background: 'var(--admin-bg)', padding: '1.25rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--admin-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <User size={20} color="var(--admin-brand)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--admin-text-primary)' }}>{selectedItem.customer?.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '500' }}>{selectedItem.customer?.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '500' }}>{selectedItem.customer?.phone_number}</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle Details</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{selectedItem.vehicle_brand} {selectedItem.vehicle_model}</span>
                  <span style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{selectedItem.plate_number}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment History</div>
                {selectedItem.payments.filter(p => p.amount > 0).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--admin-bg)', borderRadius: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--admin-border)' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{p.method} • {p.reference_number || 'N/A'}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontWeight: '800', color: getStatusColor(p.status) }}>₱{Number(p.amount).toLocaleString()} • {p.status}</div>
                  </div>
                ))}
              </div>

              {selectedItem.payments.find(p => p.receipt_url) && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Customer Receipt
                    <a href={selectedItem.payments.find(p => p.receipt_url).receipt_url} target="_blank" rel="noreferrer" style={{ color: 'var(--admin-brand)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '700' }}>
                      OPEN <Download size={12} />
                    </a>
                  </div>
                  <div
                    onClick={() => window.open(selectedItem.payments.find(p => p.receipt_url).receipt_url, '_blank')}
                    style={{ width: '100%', height: '200px', background: '#F8FAFC', borderRadius: '0.75rem', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--admin-border)' }}
                  >
                    <img src={selectedItem.payments.find(p => p.receipt_url).receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => navigate(`/admin/bookings/${selectedItem.id}`)}
                  style={{ flex: 1, padding: '0.85rem', background: '#FFFFFF', border: '1px solid var(--admin-input-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
                >
                  <MessageCircle size={18} /> Booking
                </button>
                {selectedItem.refundStatus !== 'PROCESSED' && (
                  <button
                    onClick={() => handleProcessRefund(selectedItem)}
                    style={{ flex: 1, padding: '0.85rem', background: 'var(--admin-brand)', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)' }}
                  >
                    Mark Refunded
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ ...panelStyle, padding: '5rem 2rem', textAlign: 'center', color: 'var(--admin-text-secondary)', borderStyle: 'dashed', border: '2px dashed var(--admin-border)', background: 'transparent' }}>
              <Eye size={40} style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Select a request to process</p>
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
