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
      const { data: { user: verifier } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('verify_payment_v2', {
        p_payment_id: payment.id,
        p_verifier_id: verifier?.id
      });

      if (error) throw error;

      // Notify customer
      if (payment.booking?.customer_id) {
        await supabase.from('notifications').insert({
          user_id: payment.booking.customer_id,
          title: 'Payment Verified! 💸',
          message: `Your payment of ₱${payment.amount?.toLocaleString()} has been verified successfully.`,
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
    } catch (err) {
      toast.error(`Verification error: ${err.message}`);
    }
  };

  // Fix #3: Reject payment handler — reverts to UNPAID so customer can re-upload
  const handleRejectPayment = async (payment) => {
    try {
      const { error } = await supabase
        .from('payments_v2')
        .update({ status: 'UNPAID', receipt_url: null, reference_number: null })
        .eq('id', payment.id);

      if (error) throw error;

      // Notify customer of rejection
      if (payment.booking?.customer_id) {
        await supabase.from('notifications').insert({
          user_id: payment.booking.customer_id,
          title: 'Receipt Rejected',
          message: 'Your GCash receipt could not be verified. Please re-upload a clear, valid receipt.',
          type: 'warning',
          action_url: `/my-bookings/${payment.booking_id}`
        });
      }

      toast.error('Payment rejected. Customer has been notified to re-upload.');
      fetchPayments();
    } catch (err) {
      toast.error(`Rejection error: ${err.message}`);
    }
  };

  const ViewReceiptModal = ({ payment, onClose }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '1rem' : '2rem', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--admin-card)', borderRadius: '1.5rem', padding: isMobile ? '1.5rem' : '2.5rem', maxWidth: '600px', width: '100%', position: 'relative', border: '1px solid var(--admin-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', color: 'var(--admin-text-primary)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XCircle size={24} /></button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(var(--admin-brand-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={24} color="var(--admin-brand)" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.5rem' }}>Verify GCash Receipt</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>Amount: ₱{payment.amount?.toLocaleString()} • Ref: {payment.reference_number || 'N/A'}</div>
          </div>
        </div>

        <div style={{ width: '100%', height: isMobile ? '350px' : '450px', background: 'var(--admin-bg)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--admin-border)', position: 'relative' }}>
          <img src={payment.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {payment.ocr_text && (
          <div style={{ marginTop: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={14} /> OCR System Analysis
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontStyle: 'italic', opacity: 0.9, lineHeight: '1.5' }}>
              "{payment.ocr_text}"
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => { handleRejectPayment(payment); onClose(); }}
            style={{ flex: 1, padding: '1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            REJECT RECEIPT
          </button>
          <button
            onClick={() => { handleVerifyPayment(payment); onClose(); }}
            style={{ flex: 2, padding: '1rem', background: 'var(--admin-brand)', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(var(--admin-brand-rgb), 0.3)' }}
          >
            APPROVE & SETTLE
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
    padding: '1.5rem',
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

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ ...containerStyle, padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--admin-input-bg)', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--admin-input-border)' }}>
          <Search size={18} color="var(--admin-text-secondary)" />
          <input
            placeholder="Search Reference, ID or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--admin-text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '500' }}
          />
        </div>
        <button 
          onClick={() => setSearchTerm(searchTerm === 'FOR_VERIFICATION' ? '' : 'FOR_VERIFICATION')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            borderRadius: '0.75rem', 
            background: searchTerm === 'FOR_VERIFICATION' ? 'rgba(var(--admin-brand-rgb), 0.1)' : 'var(--admin-card)', 
            border: `1px solid ${searchTerm === 'FOR_VERIFICATION' ? 'var(--admin-brand)' : 'var(--admin-border)'}`,
            color: searchTerm === 'FOR_VERIFICATION' ? 'var(--admin-brand)' : 'var(--admin-text-primary)',
            fontWeight: '800',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <Filter size={16} /> {searchTerm === 'FOR_VERIFICATION' ? 'Showing Pending' : 'Show Pending Only'}
        </button>
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
                    <div style={{ color: getStatusColor(payment.status), fontSize: '0.85rem', fontWeight: '900' }}>{payment.status?.replace(/_/g, ' ')}</div>
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
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>Ref</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>Client</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>Receipt</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>Analysis</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>Financials</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase' }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <button 
                      onClick={() => navigate(`/admin/bookings/${payment.booking_id}`)}
                      style={{ background: 'rgba(var(--admin-brand-rgb), 0.1)', color: 'var(--admin-brand)', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', fontWeight: '900', fontSize: '0.65rem', border: '1px solid rgba(var(--admin-brand-rgb), 0.2)', cursor: 'pointer' }}
                    >
                      #{payment.id.split('-')[0].toUpperCase()}
                    </button>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '800', color: 'var(--admin-text-primary)', fontSize: '0.85rem' }}>{payment.booking?.customer?.full_name || 'User'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>{new Date(payment.created_at).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {payment.receipt_url ? (
                      <div onClick={() => setViewingPayment(payment)} style={{ width: '40px', height: '54px', background: 'var(--admin-bg)', borderRadius: '0.4rem', overflow: 'hidden', border: '1px solid var(--admin-border)', cursor: 'pointer' }}>
                        <img src={payment.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : <span style={{ opacity: 0.2 }}>—</span>}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', maxWidth: '200px' }}>
                    {payment.ocr_text && payment.ocr_text.trim().length > 2 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-primary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.4rem', borderLeft: '2px solid var(--admin-brand)', lineHeight: '1.4' }}>
                        {payment.ocr_text.length > 60 ? payment.ocr_text.substring(0, 60) + '...' : payment.ocr_text}
                      </div>
                    ) : <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '800', letterSpacing: '0.5px' }}>{payment.method === 'GCASH' ? 'LOW QUALITY' : 'N/A'}</span>}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '900', color: 'var(--admin-text-primary)', fontSize: '1rem' }}>₱{payment.amount?.toLocaleString()}</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: payment.status === 'PAID' ? '#10b981' : 'var(--admin-brand)' }}>{payment.status}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {payment.status === 'FOR_VERIFICATION' ? (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => window.confirm('Approve?') && handleVerifyPayment(payment)} style={{ padding: '0.4rem 0.8rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '0.3rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.65rem' }}>APPROVE</button>
                        <button onClick={() => window.confirm('Reject?') && handleRejectPayment(payment)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.65rem', fontWeight: '900' }}>REJECT</button>
                      </div>
                    ) : <span style={{ opacity: 0.2, fontSize: '0.65rem', fontWeight: '900' }}>SETTLED</span>}
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
