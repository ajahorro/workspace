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
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*, bookings(id, customer_id, scheduled_start, profiles!bookings_customer_id_fkey(email, full_name))')
      .order('created_at', { ascending: false });

    if (data) setPayments(data);
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FOR_VERIFICATION': return '#f59e0b';
      case 'VERIFIED': return '#10b981';
      case 'PAID': return 'var(--primary-color)';
      default: return 'var(--card-text)';
    }
  };

  const filteredPayments = payments.filter(p => {
    const searchStr = `
      ${p.id} 
      ${p.bookings?.profiles?.email || ''} 
      ${p.bookings?.profiles?.full_name || ''} 
      ${p.total_amount} 
      ${p.method || ''} 
      ${p.reference_number || ''} 
      ${p.status || ''}
    `.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const handleVerifyPayment = async (payment) => {
    try {
      const { error } = await supabase
        .from('payment_intents')
        .update({ status: 'VERIFIED', amount_paid: payment.total_amount })
        .eq('id', payment.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: payment.bookings.customer_id,
        title: 'Payment Verified! 💸',
        message: `Your payment of ₱${payment.total_amount} has been verified successfully.`,
        type: 'success',
        action_url: `/my-bookings/${payment.booking_id}`
      });

      supabase.functions.invoke('send-email', {
        body: {
          type: 'payment_verified',
          to: payment.bookings?.profiles?.email,
          data: {
            amount: payment.total_amount,
            date: new Date(payment.bookings?.scheduled_start).toLocaleDateString()
          }
        }
      }).catch(err => console.error('Email trigger failed:', err));

      toast.success('Payment verified and customer notified');
      fetchPayments();
    } catch (err) {
      toast.error(`Verification error: ${err.message}`);
    }
  };

  const ViewReceiptModal = ({ payment, onClose }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '1rem' : '2rem', backdropFilter: 'blur(10px)' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '1.5rem', padding: isMobile ? '1.5rem' : '2rem', maxWidth: '600px', width: '100%', position: 'relative', border: 'var(--glass-border)', boxShadow: 'var(--card-shadow)', color: 'var(--card-text)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--card-text)', opacity: 0.5, cursor: 'pointer' }}><XCircle size={24} /></button>
        <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: '900', fontSize: isMobile ? '1.1rem' : '1.25rem', color: 'var(--card-text)' }}>GCASH RECEIPT</h3>
        <div style={{ width: '100%', height: isMobile ? '300px' : '400px', background: '#000', borderRadius: '1rem', overflow: 'hidden', border: 'var(--glass-border)' }}>
          <img src={payment.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--card-text)', opacity: 0.6, fontWeight: '800' }}>REFERENCE</div>
            <div style={{ fontWeight: '900', color: 'var(--card-text)' }}>{payment.reference_number || 'N/A'}</div>
          </div>
          <button 
            onClick={() => { handleVerifyPayment(payment); onClose(); }}
            style={{ width: isMobile ? '100%' : 'auto', padding: '0.85rem 2rem', background: 'var(--card-text)', color: 'var(--bg-card)', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}
          >
            VERIFY NOW
          </button>
        </div>
      </div>
    </div>
  );

  const [viewingPayment, setViewingPayment] = useState(null);

  const containerStyle = {
    background: 'var(--bg-card)',
    borderRadius: '1.25rem',
    border: '1px solid var(--glass-border)',
    padding: isMobile ? '1rem' : '1.75rem',
    boxShadow: 'var(--card-shadow)',
    color: 'var(--card-text)',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      <PageHeader 
        badge="FINANCIAL AUDIT"
        title="PAYMENTS"
        subtitle="Verify and manage customer payment intents."
        onRefresh={() => { fetchPayments(); toast.success('Refreshing transactions...'); }}
      />

      <div style={{ ...containerStyle, padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-input)', padding: '0.85rem 1.5rem', borderRadius: '0.75rem', flex: 1, border: 'var(--glass-border)' }}>
          <Search size={18} color="var(--card-text)" style={{ opacity: 0.5 }} />
          <input 
            placeholder="Search Reference, ID or Customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--card-text)', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '500' }} 
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
                  <div style={{ fontWeight: '800', color: 'var(--card-text)', fontSize: '1rem' }}>{payment.bookings?.profiles?.full_name || 'Unknown'}</div>
                </div>
                <div style={{ fontWeight: '900', color: 'var(--card-text)', fontSize: '1.25rem' }}>₱{payment.total_amount?.toLocaleString()}</div>
              </div>
              
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 0', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--card-text)', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase' }}>Method / Ref</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--card-text)' }}>{payment.method}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--card-text)', opacity: 0.5 }}>{payment.reference_number}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--card-text)', opacity: 0.6, fontWeight: '800', textTransform: 'uppercase' }}>Status</div>
                    <div style={{ color: getStatusColor(payment.status), fontSize: '0.85rem', fontWeight: '900' }}>{payment.status.replace('_', ' ')}</div>
                  </div>
                </div>

              {payment.status === 'FOR_VERIFICATION' && payment.method === 'GCASH' ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setViewingPayment(payment)}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--card-text)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', fontWeight: '800', fontSize: '0.75rem' }}
                  >
                    VIEW RECEIPT
                  </button>
                  <button 
                    onClick={() => handleVerifyPayment(payment)}
                    style={{ flex: 1, padding: '0.75rem', background: 'var(--card-text)', color: 'var(--bg-card)', border: 'none', borderRadius: '0.5rem', fontWeight: '900', fontSize: '0.75rem' }}
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
              <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Intent ID</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Customer</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Amount</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Method / Ref</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Status</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ color: 'var(--card-text)', fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.5px', opacity: 0.8 }}>
                      #{payment.id.split('-')[0].toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '800', color: 'var(--card-text)', fontSize: '0.9rem' }}>
                      {payment.bookings?.profiles?.full_name || 'Unknown'}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ fontWeight: '900', color: 'var(--card-text)', fontSize: '1.1rem' }}>
                      ₱{payment.total_amount?.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '800', color: 'var(--card-text)', fontSize: '0.85rem' }}>{payment.method}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{payment.reference_number}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ color: getStatusColor(payment.status), fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' }}>{payment.status.replace('_', ' ')}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {payment.status === 'FOR_VERIFICATION' && payment.method === 'GCASH' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setViewingPayment(payment)} style={{ padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--card-text)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>VIEW</button>
                        <button onClick={() => handleVerifyPayment(payment)} style={{ padding: '0.5rem 1.5rem', background: 'var(--card-text)', border: 'none', color: 'var(--bg-card)', borderRadius: '0.5rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem' }}>VERIFY</button>
                      </div>
                    ) : <span style={{ opacity: 0.2, fontSize: '0.75rem' }}>SETTLED</span>}
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
