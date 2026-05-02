import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, RotateCw, Filter, CreditCard, MessageSquare, CheckCircle, XCircle, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import toast from 'react-hot-toast';

const AdminRefunds = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [deductionInput, setDeductionInput] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        profiles:user_id (full_name, phone_number),
        bookings:booking_id (id, scheduled_start, plate_number)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) setRefunds(data);
    setLoading(false);
  };

  const updateRefundStatus = async (id, status, notes = '') => {
    setProcessing(true);
    const { error } = await supabase
      .from('refunds')
      .update({ 
        status, 
        admin_notes: notes,
        processed_at: status === 'PROCESSED' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (!error) {
      toast.success(`Refund marked as ${status}`);
      fetchRefunds();
      setSelectedRefund(null);
    } else {
      toast.error('Failed to update status');
    }
    setProcessing(false);
  };

  const applyDeduction = async () => {
    if (!selectedRefund || !deductionInput) return;
    const { error } = await supabase
      .from('refunds')
      .update({ material_deduction: parseFloat(deductionInput) })
      .eq('id', selectedRefund.id);

    if (!error) {
      toast.success('Deduction applied');
      fetchRefunds();
      const updated = { ...selectedRefund, material_deduction: parseFloat(deductionInput) };
      setSelectedRefund(updated);
      setDeductionInput('');
    }
  };

  const sendChatMessage = async () => {
    if (!selectedRefund || !chatMsg) return;
    const updatedChat = [...(selectedRefund.chat_history || []), { role: 'ADMIN', text: chatMsg, time: new Date().toISOString() }];
    const { error } = await supabase
      .from('refunds')
      .update({ chat_history: updatedChat })
      .eq('id', selectedRefund.id);

    if (!error) {
      setChatMsg('');
      const updated = { ...selectedRefund, chat_history: updatedChat };
      setSelectedRefund(updated);
      setRefunds(prev => prev.map(r => r.id === updated.id ? updated : r));
    }
  };

  const filteredRefunds = refunds.filter(r => 
    r.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.profiles?.phone_number?.includes(searchQuery) ||
    r.bookings?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingState message="Synchronizing financial reversals..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="FINANCIAL REVERSALS"
        title="REFUNDS"
        subtitle="Manage material deductions and coordinate GCash payouts."
        onRefresh={fetchRefunds}
      />

      {/* Search Container */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid rgba(255,255,255,0.05)', 
        padding: '1.25rem', 
        borderRadius: '1.25rem'
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input 
            type="text"
            placeholder="Search by Booking ID, Customer Name, or Plate Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '1rem 1.25rem 1rem 3.5rem', 
              background: 'rgba(0, 0, 0, 0.2)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '0.75rem', 
              color: '#fff', 
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary-color)';
              e.target.style.background = 'rgba(0, 0, 0, 0.4)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.background = 'rgba(0, 0, 0, 0.2)';
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedRefund ? '1fr 400px' : '1fr', gap: '1.5rem', transition: 'all 0.3s ease' }}>
        
        {/* Refunds List */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th>
                <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Customer</th>
                <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Booking</th>
                <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Requested</th>
                <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Payout</th>
                <th style={{ padding: '1rem 1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map((refund) => (
                <tr 
                  key={refund.id} 
                  onClick={() => setSelectedRefund(refund)}
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.03)', 
                    cursor: 'pointer', 
                    background: selectedRefund?.id === refund.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                    {new Date(refund.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{refund.profiles?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{refund.profiles?.phone_number}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--primary-color)', fontWeight: '800' }}>#{refund.bookings?.id.substring(0, 4).toUpperCase()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{refund.bookings?.plate_number}</div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: '700', fontSize: '0.9rem' }}>₱{refund.amount_requested}</td>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: '900', color: 'var(--accent-green)', fontSize: '1rem' }}>₱{refund.final_refund_amount || 0}</td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '5rem', 
                      fontSize: '0.65rem', 
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      background: refund.status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : refund.status === 'PROCESSED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: refund.status === 'PENDING' ? '#f59e0b' : refund.status === 'PROCESSED' ? '#10b981' : '#ef4444',
                      border: '1px solid currentColor'
                    }}>
                      {refund.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Coordination Sidebar */}
        {selectedRefund && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Calculation Card */}
            <div style={{ background: 'rgba(24, 23, 23, 0.6)', borderRadius: '1.25rem', border: '1px solid rgba(169, 27, 24, 0.2)', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '900', color: 'var(--primary-color)', letterSpacing: '1px' }}>CALCULATE PAYOUT</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Total Received</span>
                  <span style={{ fontWeight: '700' }}>₱{selectedRefund.amount_requested}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem', fontWeight: '800' }}>MATERIAL DEDUCTION</label>
                    <input 
                      type="number"
                      value={deductionInput}
                      onChange={(e) => setDeductionInput(e.target.value)}
                      placeholder="e.g. 500"
                      style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button 
                    onClick={applyDeduction}
                    style={{ marginTop: '1.25rem', padding: '0.6rem 1rem', background: 'var(--primary-color)', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    APPLY
                  </button>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '800', color: '#fff' }}>FINAL REFUND</span>
                  <span style={{ fontWeight: '900', color: 'var(--accent-green)', fontSize: '1.25rem' }}>₱{selectedRefund.final_refund_amount}</span>
                </div>
              </div>
            </div>

            {/* Hub Chat */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>COORDINATION HUB</h3>
              
              <div style={{ flex: 1, maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(selectedRefund.chat_history || []).map((msg, i) => (
                  <div key={i} style={{ padding: '0.75rem', borderRadius: '0.5rem', background: msg.role === 'ADMIN' ? 'rgba(169, 27, 24, 0.1)' : 'rgba(255,255,255,0.03)', alignSelf: msg.role === 'ADMIN' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: msg.role === 'ADMIN' ? 'var(--primary-color)' : 'rgba(255,255,255,0.3)', marginBottom: '0.2rem' }}>{msg.role}</div>
                    <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>{msg.text}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  placeholder="Ask for payout details..."
                  style={{ flex: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.85rem' }}
                />
                <button 
                  onClick={sendChatMessage}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  <MessageSquare size={18} />
                </button>
              </div>
            </div>

            {/* Final Actions */}
            {selectedRefund.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  disabled={processing}
                  onClick={() => updateRefundStatus(selectedRefund.id, 'PROCESSED')}
                  style={{ flex: 1, padding: '1rem', background: 'var(--accent-green)', border: 'none', color: '#fff', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle size={18} /> SETTLE REFUND
                </button>
                <button 
                  disabled={processing}
                  onClick={() => updateRefundStatus(selectedRefund.id, 'REJECTED')}
                  style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}
                >
                  <XCircle size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRefunds;
