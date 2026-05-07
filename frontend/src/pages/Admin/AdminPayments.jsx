import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Search, RotateCw, Filter, CreditCard, XCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminPayments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(location.state?.filter || '');

  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel('admin-payments-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments_v2' }, () => fetchPayments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings_v2' }, () => fetchPayments())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const confirmAction = (actionText, actionFn) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '250px' }}>
        <div style={{ fontWeight: '800', color: 'var(--admin-text-primary)' }}>{actionText}</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => { toast.dismiss(t.id); actionFn(); }}
            style={{ flex: 1, padding: '0.5rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer' }}
          >
            Confirm
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'var(--admin-text-primary)', border: 'none', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 10000, position: 'top-center' });
  };

  const handleVerifyPayment = async (payment) => {
    try {
      const { data: { user: verifier } } = await supabase.auth.getUser();
      
      // Direct update — no RPC needed
      const { error } = await supabase
        .from('payments_v2')
        .update({ 
          status: 'PAID', 
          verified_by: verifier?.id, 
          verified_at: new Date().toISOString() 
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Notify customer
      if (payment.booking?.customer_id) {
        await supabase.from('notifications').insert({
          user_id: payment.booking.customer_id,
          title: 'Payment Verified! 💸',
          message: `Your payment of ₱${payment.amount?.toLocaleString()} has been verified and recorded successfully.`,
          type: 'success',
          action_url: `/my-bookings/${payment.booking_id}`
        });
      }

      // Trigger email
      if (payment.booking?.customer?.email) {
        supabase.functions.invoke('send-email', {
          body: {
            type: 'payment_verified',
            to: payment.booking.customer.email,
            data: {
              amount: payment.amount,
              date: new Date(payment.booking?.start_datetime).toLocaleDateString()
            }
          }
        }).catch(err => console.error('Email trigger failed:', err));
      }

      toast.success('Payment verified and customer notified');
      fetchPayments();
      setSelectedItem(null);
    } catch (err) {
      toast.error(`Verification error: ${err.message}`);
    }
  };

  const handleRejectPayment = async (payment) => {
    try {
      const { error } = await supabase
        .from('payments_v2')
        .update({ status: 'UNPAID', receipt_url: null, reference_number: null, ocr_text: null })
        .eq('id', payment.id);

      if (error) throw error;

      // Notify customer of rejection
      if (payment.booking?.customer_id) {
        await supabase.from('notifications').insert({
          user_id: payment.booking.customer_id,
          title: 'Proof of Payment Rejected',
          message: 'Please re-upload the correct proof of payment. The earlier one you submitted has been rejected by the admin due to it being unclear, payment was never received, or other details.',
          type: 'warning',
          action_url: `/my-bookings/${payment.booking_id}`
        });
      }

      toast.error('Payment rejected. Customer has been notified to re-upload.');
      fetchPayments();
      setSelectedItem(null);
    } catch (err) {
      toast.error(`Rejection error: ${err.message}`);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Query payments_v2 (scalable payment architecture)
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments_v2')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      if (paymentData && paymentData.length > 0) {
        // Get booking details for each payment
        const bookingIds = [...new Set(paymentData.map(p => p.booking_id).filter(Boolean))];

        if (bookingIds.length > 0) {
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings_v2')
            .select('id, customer_id, start_datetime, total_price, plate_number, vehicle_type')
            .in('id', bookingIds);

          if (!bookingError && bookingData) {
            const customerIds = [...new Set(bookingData.map(b => b.customer_id).filter(Boolean))];

            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', customerIds);

            const profileMap = profileData?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}) || {};
            const bookingMap = bookingData.reduce((acc, b) => ({
              ...acc,
              [b.id]: { ...b, customer: profileMap[b.customer_id] }
            }), {});

            const combinedData = paymentData
              .filter(p => p.amount > 0)
              .map(p => ({
                ...p,
                booking: bookingMap[p.booking_id]
              }));
            setPayments(combinedData);
          } else {
            setPayments(paymentData.filter(p => p.amount > 0));
          }
        } else {
          setPayments([]);
        }
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FOR_VERIFICATION': return 'var(--admin-brand)';
      case 'PAID': return '#10b981';
      case 'PARTIALLY_PAID': return '#f59e0b';
      case 'REFUNDED': return '#8b5cf6';
      default: return 'var(--admin-text-secondary)';
    }
  };

  const [filter, setFilter] = useState('PENDING'); // PENDING, PROCESSED, ALL
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredItems = payments.filter(p => {
    const searchStr = `
      ${p.id}
      ${p.booking?.customer?.email || ''}
      ${p.booking?.customer?.full_name || ''}
      ${p.amount}
      ${p.method || ''}
      ${p.reference_number || ''}
      ${p.status || ''}
    `.toLowerCase();
    
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    
    if (filter === 'PENDING') return matchesSearch && p.status === 'FOR_VERIFICATION';
    if (filter === 'PROCESSED') return matchesSearch && (p.status === 'PAID' || p.status === 'REFUNDED');
    return matchesSearch;
  });

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
        badge="FINANCIAL AUDIT"
        title="PAYMENTS"
        subtitle="Verify and manage customer payment records."
        onRefresh={() => { fetchPayments(); toast.success('Refreshing transactions...'); }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '2rem' }}>

        {/* Left Side: List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ ...panelStyle, padding: '1rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search Reference, ID or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            {loading ? (
              <LoadingState message="Verifying financial transactions..." />
            ) : filteredItems.length === 0 ? (
              <div style={{ ...panelStyle, padding: '4rem', textAlign: 'center', color: 'var(--admin-text-secondary)', fontWeight: '700', opacity: 0.5 }}>
                No records found.
              </div>
            ) : (
              filteredItems.map(p => {
                const isSelected = selectedItem?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedItem(p)}
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
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem' }}>#{p.id.slice(0, 8).toUpperCase()}</div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>{p.booking?.customer?.full_name || 'Unknown'}</h3>
                      </div>
                      <div className="badge" style={{
                        padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.65rem', fontWeight: '800',
                        textTransform: 'uppercase', color: getStatusColor(p.status), background: p.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : (p.status === 'FOR_VERIFICATION' ? 'rgba(var(--admin-brand-rgb), 0.1)' : 'rgba(255,255,255,0.05)')
                      }}>
                        {p.status === 'FOR_VERIFICATION' ? 'PENDING' : p.status}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '700', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Method / Ref</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{p.method}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{p.reference_number || 'N/A'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '700', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Amount</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>₱{p.amount?.toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>{new Date(p.created_at).toLocaleDateString()}</div>
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
                <h3 style={{ margin: 0, fontWeight: '800', letterSpacing: '1px', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--admin-text-secondary)' }}>PAYMENT DETAILS</h3>
                <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}><XCircle size={20}/></button>
              </div>

              <div style={{ background: 'var(--admin-bg)', padding: '1.25rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--admin-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CreditCard size={20} color="var(--admin-brand)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--admin-text-primary)' }}>{selectedItem.booking?.customer?.full_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '500' }}>{selectedItem.booking?.customer?.email}</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Financial Info</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--admin-bg)', borderRadius: '0.5rem', marginBottom: '0.5rem', border: '1px solid var(--admin-border)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{selectedItem.method} • {selectedItem.reference_number || 'N/A'}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)' }}>{new Date(selectedItem.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ fontWeight: '800', color: getStatusColor(selectedItem.status) }}>₱{Number(selectedItem.amount).toLocaleString()}</div>
                </div>
              </div>

              {selectedItem.receipt_url && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Customer Receipt
                    <a href={selectedItem.receipt_url} target="_blank" rel="noreferrer" style={{ color: 'var(--admin-brand)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '700' }}>
                      OPEN
                    </a>
                  </div>
                  <div
                    onClick={() => window.open(selectedItem.receipt_url, '_blank')}
                    style={{ width: '100%', height: '250px', background: 'var(--admin-bg)', borderRadius: '0.75rem', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--admin-border)' }}
                  >
                    <img src={selectedItem.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              {selectedItem.ocr_text && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={12} /> OCR System Analysis
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-primary)', fontStyle: 'italic', opacity: 0.9, lineHeight: '1.4' }}>
                    "{selectedItem.ocr_text}"
                  </div>
                </div>
              )}

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                {selectedItem.status === 'FOR_VERIFICATION' && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => confirmAction('Reject this receipt?', () => handleRejectPayment(selectedItem))}
                      style={{ flex: 1, padding: '0.85rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      REJECT
                    </button>
                    <button
                      onClick={() => confirmAction('Approve this payment?', () => handleVerifyPayment(selectedItem))}
                      style={{ flex: 2, padding: '0.85rem', background: 'var(--admin-brand)', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(var(--admin-brand-rgb), 0.3)' }}
                    >
                      APPROVE & SETTLE
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => navigate(`/admin/bookings/${selectedItem.booking_id}`)}
                  style={{ width: '100%', padding: '0.85rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
                >
                  Go to Booking Details <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ ...panelStyle, padding: '5rem 2rem', textAlign: 'center', color: 'var(--admin-text-secondary)', borderStyle: 'dashed', border: '2px dashed var(--admin-border)', background: 'transparent' }}>
              <CreditCard size={40} style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Select a payment to verify</p>
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

export default AdminPayments;
