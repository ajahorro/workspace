import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    // Fetch payment intents and join with bookings
    const { data, error } = await supabase
      .from('payment_intents')
      .select('*, bookings(id, customer_id, scheduled_start, profiles!bookings_customer_id_fkey(email))')
      .order('created_at', { ascending: false });

    if (data) setPayments(data);
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FOR_VERIFICATION': return 'orange';
      case 'VERIFIED': return '#4ade80';
      case 'PAID': return 'var(--primary-color)';
      case 'INITIATED': return 'var(--text-secondary)';
      default: return 'var(--text-primary)';
    }
  };

  const handleVerifyPayment = async (payment) => {
    try {
      const { error } = await supabase
        .from('payment_intents')
        .update({ status: 'VERIFIED', amount_paid: payment.total_amount })
        .eq('id', payment.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: payment.bookings.customer_id,
        title: 'Payment Verified',
        message: `Your GCash payment of ₱${payment.total_amount} has been successfully verified.`,
        type: 'success'
      });

      // Send Email Notification via Edge Function
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Payment Verification</h1>
        <button onClick={fetchPayments} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer' }}>Refresh</button>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', flex: 1, border: '1px solid var(--border-color)' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input placeholder="Search by Reference Number or Customer..." style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', width: '100%', outline: 'none' }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Intent ID</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Customer / Booking Date</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Amount</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Method / Ref</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>No payments found.</td></tr>
            ) : (
              payments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {payment.id.split('-')[0]}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>{payment.bookings?.profiles?.email || 'Unknown'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {payment.bookings ? new Date(payment.bookings.scheduled_start).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>
                    ₱{payment.total_amount}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>{payment.method}</div>
                    {payment.reference_number && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Ref: {payment.reference_number}</div>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      background: `${getStatusColor(payment.status)}20`, 
                      color: getStatusColor(payment.status),
                      padding: '0.25rem 0.5rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {payment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {payment.status === 'FOR_VERIFICATION' && payment.method === 'GCASH' ? (
                      <button 
                        onClick={() => handleVerifyPayment(payment)}
                        style={{ padding: '0.5rem 1rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <CheckCircle size={16} /> Verify
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>--</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPayments;
