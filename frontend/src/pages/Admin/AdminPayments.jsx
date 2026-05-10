import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle, XCircle, Search, Banknote, Eye, 
  ExternalLink, Clock, ShieldCheck, AlertCircle, Filter, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminPayments = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setFilter] = useState('FOR_VERIFICATION');
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Direct join to profiles to get customer names
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings (
            id,
            customer:profiles (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus, reason = null) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: newStatus, 
          ocr_text: reason 
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Transaction marked as ${newStatus}`);
      fetchPayments();
      setSelectedPayment(null);
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    if (s === 'paid') return '#10b981';
    if (s === 'for_verification') return '#8b5cf6';
    if (s === 'failed') return '#ef4444';
    return 'var(--admin-text-secondary)';
  };

  const filtered = payments.filter(p => {
    const customerName = p.booking?.customer?.full_name || '';
    const refNum = p.reference_number || '';
    const matchesSearch = refNum.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const cardStyle = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: '1rem',
    padding: '1.25rem',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="FINANCIAL AUDIT"
        title="Payment Verification" 
        subtitle="Cross-reference digital receipts with bank records."
        onRefresh={fetchPayments}
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--admin-input-bg)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--admin-border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                type="text" placeholder="Reference or Customer..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-input-border)', borderRadius: '0.75rem', color: 'white', outline: 'none' }}
              />
            </div>
            <select 
              value={statusFilter} onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '0.75rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-input-border)', borderRadius: '0.75rem', color: 'white' }}
            >
              <option value="FOR_VERIFICATION">FOR VERIFICATION</option>
              <option value="paid">PAID</option>
              <option value="ALL">ALL TRANSACTIONS</option>
            </select>
          </div>

          {loading ? <LoadingState /> : filtered.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedPayment(p)}
              style={{ 
                ...cardStyle, 
                border: selectedPayment?.id === p.id ? '2px solid var(--admin-brand)' : '1px solid var(--admin-border)',
                background: selectedPayment?.id === p.id ? 'rgba(255,255,255,0.02)' : 'var(--admin-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--admin-text-secondary)', marginBottom: '0.25rem' }}>REF: {p.reference_number || 'N/A'}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '950' }}>₱{Number(p.amount).toLocaleString()}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{p.booking?.customer?.full_name || 'System User'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '900', color: getStatusColor(p.status), background: `${getStatusColor(p.status)}15`, padding: '0.3rem 0.7rem', borderRadius: '2rem', border: `1px solid ${getStatusColor(p.status)}30`, textTransform: 'uppercase' }}>
                    {p.status?.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.5rem' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Evidence Panel */}
        <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
          {selectedPayment ? (
            <div style={{ ...cardStyle, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: '950', color: 'var(--admin-brand)', fontSize: '0.8rem', letterSpacing: '1px' }}>VERIFICATION TERMINAL</h3>
                <ShieldCheck size={20} color="var(--admin-brand)" />
              </div>

              {/* FIXED: Using selectedPayment instead of p */}
              {selectedPayment.receipt_url ? (
                 <div style={{ width: '100%', aspectRatio: '3/4', background: '#000', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                   <img src={selectedPayment.receipt_url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                 </div>
              ) : (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px dashed var(--admin-border)' }}>
                  <AlertCircle size={32} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>No visual evidence uploaded.</p>
                </div>
              )}

              <div style={{ background: 'var(--admin-bg)', padding: '1rem', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.5 }}>METHOD</div>
                <div style={{ fontWeight: '800', marginBottom: '1rem' }}>{selectedPayment.method}</div>
                
                <div style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.5 }}>METADATA / REASON</div>
                <div style={{ fontSize: '0.85rem', color: '#10b981', fontFamily: 'monospace' }}>
                  {selectedPayment.ocr_text || 'Awaiting manual audit...'}
                </div>
              </div>

              {selectedPayment.status === 'FOR_VERIFICATION' && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    onClick={() => handleUpdateStatus(selectedPayment.id, 'failed', 'Invalid Reference')}
                    style={{ flex: 1, padding: '1rem', borderRadius: '0.75rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontWeight: '900', cursor: 'pointer' }}
                  >
                    REJECT
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedPayment.id, 'paid')}
                    style={{ flex: 2, padding: '1rem', borderRadius: '0.75rem', background: '#10b981', border: 'none', color: 'white', fontWeight: '950', cursor: 'pointer' }}
                  >
                    APPROVE
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: '5rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}>
              <Banknote size={48} style={{ opacity: 0.1, margin: '0 auto 1.5rem' }} />
              <p style={{ fontWeight: '900', opacity: 0.3, fontSize: '0.8rem' }}>SELECT A TRANSACTION TO AUDIT</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;