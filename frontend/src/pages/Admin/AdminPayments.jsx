import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Search, RotateCw, Filter, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';

const AdminPayments = () => {
  const location = useLocation();
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
      default: return 'rgba(255,255,255,0.4)';
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
      alert(`Error: ${err.message}`);
    }
  };

  const containerStyle = {
    background: 'var(--bg-secondary)',
    borderRadius: '1rem',
    border: '1px solid rgba(255,255,255,0.03)',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      {/* Header Area Area */}
      <PageHeader 
        badge="FINANCIAL AUDIT"
        title="PAYMENTS"
        subtitle="Verify and manage customer payment intents."
        onRefresh={() => { fetchPayments(); toast.success('Refreshing transactions...'); }}
      />

      {/* Search Bar */}
      <div style={{ ...containerStyle, padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1.5rem', borderRadius: '0.75rem', flex: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Search size={18} color="rgba(255,255,255,0.3)" />
          <input 
            placeholder="Search by Reference Number, ID or Customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: '#fff', width: '100%', outline: 'none', fontSize: '0.95rem', fontWeight: '500' }} 
          />
        </div>
      </div>

      {/* Data Table */}
      <div style={containerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Intent ID</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Customer</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Amount</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Method / Ref</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Status</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">
                  <LoadingState message="Verifying financial transactions..." />
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: '600' }}>No records found.</td></tr>
            ) : (
              filteredPayments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ color: 'var(--primary-color)', fontWeight: '900', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                      #{payment.id.split('-')[0].toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.9rem' }}>
                      {payment.bookings?.profiles?.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '800' }}>
                      {payment.bookings ? new Date(payment.bookings.scheduled_start).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ fontWeight: '900', color: '#fff', fontSize: '1.1rem', letterSpacing: '-0.5px' }}>
                      ₱{payment.total_amount?.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.85rem' }}>{payment.method}</div>
                    {payment.reference_number && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: '0.5px' }}>
                        REF: {payment.reference_number}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                      background: 'rgba(255,255,255,0.03)', color: getStatusColor(payment.status), 
                      padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: '900',
                      border: `1px solid ${getStatusColor(payment.status)}40`, textTransform: 'uppercase'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(payment.status) }}></div>
                      {payment.status.replace('_', ' ')}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    {payment.status === 'FOR_VERIFICATION' && payment.method === 'GCASH' ? (
                      <button 
                        onClick={() => handleVerifyPayment(payment)}
                        style={{ 
                          padding: '0.65rem 1.5rem', background: 'var(--primary-color)', color: '#fff', 
                          border: 'none', borderRadius: '5rem', fontWeight: '900', 
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                          fontSize: '0.8rem', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        VERIFY <CheckCircle size={14} />
                      </button>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>SETTLED</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminPayments;
