import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Search, RotateCw, Filter, CreditCard, XCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminPayments = () => {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(location.state?.filter || '');

  useEffect(() => {
    fetchPayments();
  }, []);

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
              .filter(p => p.amount > 0) // Hide the initial $0 placeholder records
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

  const filteredPayments = payments.filter(p => {
    const searchStr = `
      ${p.id}
      ${p.booking?.customer?.email || ''}
      ${p.booking?.customer?.full_name || ''}
      ${p.amount}
      ${p.method || ''}
      ${p.reference_number || ''}
      ${p.status || ''}
    `.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const handleVerifyPayment = async (payment) => {
    try {
      const { error } = await supabase
        .from('payments_v2')
        .update({
          status: 'PAID',
          verified_by: (await supabase.auth.getUser()).data.user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Notify customer
      if (payment.booking?.customer_id) {
        await supabase.from('notifications').insert({
          user_id: payment.booking.customer_id,
          title: 'Payment Verified! 💸',
          message: `Your payment of ₱${payment.amount?.toLocaleString()} has been verified successfully.`,
          type: 'success',
          action_url: `/my-bookings/${payment.booking_id}`
        }).catch(() => {});
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
    } catch (err) {
      toast.error(`Verification error: ${err.message}`);
    }
  };

  const ViewReceiptModal = ({ payment, onClose }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '1rem' : '2rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--admin-card)', borderRadius: '1rem', padding: isMobile ? '1.5rem' : '2rem', maxWidth: '500px', width: '100%', position: 'relative', border: '1px solid var(--admin-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', color: 'var(--admin-text-primary)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}><XCircle size={24} /></button>
        <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', fontSize: '1.25rem', color: 'var(--admin-text-primary)' }}>GCash Receipt</h3>
        <div style={{ width: '100%', height: isMobile ? '300px' : '400px', background: 'var(--admin-bg)', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
          <img src={payment.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>REFERENCE</div>
            <div style={{ fontWeight: '800', color: 'var(--admin-text-primary)', fontSize: '1.1rem' }}>{payment.reference_number || 'N/A'}</div>
          </div>
          <button
            onClick={() => { handleVerifyPayment(payment); onClose(); }}
            style={{ width: isMobile ? '100%' : 'auto', padding: '0.85rem 2rem', background: 'var(--admin-brand)', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)' }}
          >
            Verify Now
          </button>
        </div>
      </div>
    </div>
  );

  const [viewingPayment, setViewingPayment] = useState(null);

  const containerStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1rem',
    border: '1px solid var(--admin-border)',
    padding: isMobile ? '1rem' : '1.75rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    color: 'var(--admin-text-primary)',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>

      <PageHeader
        badge="FINANCIAL AUDIT"
        title="PAYMENTS"
        subtitle="Verify and manage customer payment records."
        onRefresh={() => { fetchPayments(); toast.success('Refreshing transactions...'); }}
      />

      <div style={{ ...containerStyle, padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--admin-input-bg)', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--admin-input-border)' }}>
          <Search size={18} color="var(--admin-text-secondary)" />
          <input
            placeholder="Search Reference, ID or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--admin-text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '500' }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Verifying financial transactions..." />
      ) : filteredPayments.length === 0 ? (
        <div style={{ ...containerStyle, padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No records found.</div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredPayments.map(payment => (
            <div key={payment.id} style={{ ...containerStyle, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--card-text)', opacity: 0.8, fontWeight: '900', marginBottom: '0.25rem' }}>#{payment.id.split('-')[0].toUpperCase()}</div>
                  <div style={{ fontWeight: '800', color: 'var(--card-text)', fontSize: '1rem' }}>{payment.booking?.customer?.full_name || 'Unknown'}</div>
                </div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)', fontSize: '1.25rem' }}>₱{payment.amount?.toLocaleString()}</div>
              </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--card-text)', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase' }}>Method / Ref</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--card-text)' }}>{payment.method}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--card-text)', opacity: 0.5 }}>{payment.reference_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--card-text)', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase' }}>Status</div>
                    <div style={{ color: getStatusColor(payment.status), fontSize: '0.85rem', fontWeight: '900' }}>{payment.status?.replace('_', ' ')}</div>
                  </div>
                </div>

              {payment.status === 'FOR_VERIFICATION' && payment.method === 'GCASH' ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setViewingPayment(payment)}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--card-text)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    VIEW RECEIPT
                  </button>
                  <button
                    onClick={() => handleVerifyPayment(payment)}
                    style={{ flex: 1, padding: '0.75rem', background: 'var(--card-text)', color: 'var(--bg-card)', border: 'none', borderRadius: '0.5rem', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    VERIFY
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: 'rgba(255, 255, 255, 0.1)' }}>TRANSACTION SETTLED</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={containerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Amount</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Method / Ref</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: '1px solid var(--admin-border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ color: 'var(--admin-text-secondary)', fontWeight: '700', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                      #{payment.id.split('-')[0].toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', fontSize: '0.9rem' }}>
                      {payment.booking?.customer?.full_name || 'Unknown'}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ fontWeight: '800', color: 'var(--admin-text-primary)', fontSize: '1.1rem' }}>
                      ₱{payment.amount?.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '700', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}>{payment.method}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>{payment.reference_number}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div className="badge" style={{ padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: getStatusColor(payment.status) }}>{payment.status?.replace('_', ' ')}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {payment.status === 'FOR_VERIFICATION' && payment.method === 'GCASH' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setViewingPayment(payment)} style={{ padding: '0.5rem 1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-input-border)', color: 'var(--admin-text-primary)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}>VIEW</button>
                        <button onClick={() => handleVerifyPayment(payment)} style={{ padding: '0.5rem 1.5rem', background: 'var(--admin-brand)', border: 'none', color: '#FFFFFF', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}>VERIFY</button>
                      </div>
                    ) : <span style={{ opacity: 0.3, fontSize: '0.75rem', fontWeight: '700' }}>SETTLED</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {viewingPayment && <ViewReceiptModal payment={viewingPayment} onClose={() => setViewingPayment(null)} />}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminPayments;
