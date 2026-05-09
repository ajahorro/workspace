import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Search, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase.from('payments').select('*, booking:bookings(customer_id)').order('created_at', { ascending: false });
    if (data) setPayments(data);
    setLoading(false);
  };

  const handleAction = async (id, status) => {
    let reason = '';
    if (status === 'failed' || status === 'refunded') {
      reason = window.prompt(`Enter reason for ${status}:`);
      if (!reason) return;
    }

    const { error } = await supabase.from('payments').update({ status, ocr_text: reason }).eq('id', id);
    if (!error) {
      toast.success(`Payment marked as ${status}`);
      fetchPayments();
    }
  };

  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <PageHeader title="PAYMENT AUDIT" subtitle="Verify and process transactions" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        {payments.map(p => (
          <div key={p.id} style={{ background: 'var(--admin-card)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>₱{p.amount} · {p.method}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Status: {p.status.toUpperCase()}</div>
              {p.ocr_text && <div style={{ fontSize: '0.75rem', color: 'var(--admin-brand)', marginTop: '0.2rem' }}>Reason: {p.ocr_text}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {p.status === 'pending' && (
                <>
                  <button onClick={() => handleAction(p.id, 'paid')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>APPROVE</button>
                  <button onClick={() => handleAction(p.id, 'failed')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>REJECT</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPayments;