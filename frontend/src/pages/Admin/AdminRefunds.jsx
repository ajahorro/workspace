import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  AlertTriangle, CreditCard, ArrowRight, Clock,
  CheckCircle, XCircle, Search, Filter, MessageCircle,
  Car, Calendar, User, Eye, Download, Box
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
  const [filter, setFilter] = useState('PENDING');
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmRefundItem, setConfirmRefundItem] = useState(null);

  useEffect(() => {
    fetchRefundData();
    const channel = supabase.channel('admin-refunds-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchRefundData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRefundData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching Refund-eligible bookings...');

      // Fetch bookings that are either cancelled or no-shows
      const { data: potentialRefunds, error: bookingError } = await supabase
        .from('bookings')
        .select('*, vehicles:booking_vehicles(*), payments:payments(*)')
        .in('status', ['cancelled', 'no_show'])
        .order('created_at', { ascending: false });

      if (bookingError) throw bookingError;

      if (!potentialRefunds || potentialRefunds.length === 0) {
        setRefundItems([]);
        return;
      }

      const customerIds = [...new Set(potentialRefunds.map(b => b.customer_id).filter(Boolean))];
      let profileMap = {};
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone_number, email').in('id', customerIds);
        if (profiles) profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }

      // Filter: Only include bookings that HAVE at least one confirmed 'PAID' transaction
      const items = potentialRefunds
        .filter(b => (b.payments || []).some(p => p.status === 'PAID'))
        .map(b => {
          const payments = b.payments || [];
          const totalPaid = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
          const isFullyRefunded = payments.some(p => p.status === 'REFUNDED');

          return {
            ...b,
            customer: profileMap[b.customer_id] || { full_name: 'Walk-in' },
            totalPaid,
            refundStatus: isFullyRefunded ? 'PROCESSED' : 'PENDING'
          };
        });

      setRefundItems(items);
    } catch (error) {
      console.error('Refund Fetch Error:', error);
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (item) => {
    try {
      const paidPayment = item.payments.find(p => p.status === 'PAID');
      if (!paidPayment) return toast.error('No paid payment found');

      const { error } = await supabase.from('payments').update({ status: 'REFUNDED' }).eq('id', paidPayment.id);
      if (error) throw error;

      toast.success('Refund marked as PROCESSED');
      fetchRefundData();
      setSelectedItem(null);
    } catch (err) { toast.error('Refund update failed'); }
  };

  const filteredItems = refundItems.filter(b => {
    const matchesSearch = b.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'PENDING') return matchesSearch && b.refundStatus === 'PENDING';
    if (filter === 'PROCESSED') return matchesSearch && b.refundStatus === 'PROCESSED';
    return matchesSearch;
  });

  const cardStyle = { background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '1rem', overflow: 'hidden', boxShadow: 'var(--admin-card-shadow)', color: 'var(--admin-text-primary)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      <PageHeader showBack onBack={() => navigate(-1)} badge="FINANCIAL" title="REFUND HUB" subtitle="Manage money-back requests for cancelled fleet bookings." onRefresh={fetchRefundData} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: isMobile ? '1rem' : '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'var(--admin-input-bg)',
            borderRadius: '1rem',
            border: '1px solid var(--admin-border)',
            padding: '0.75rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: isMobile ? '100%' : '200px', position: 'relative' }}>
              <Search size={18} color="var(--admin-text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <input type="text" placeholder="Search customer or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, background: 'var(--admin-bg)', border: '1px solid var(--admin-input-border)', borderRadius: '0.75rem', padding: '0.75rem 1rem 0.75rem 2.75rem', color: 'var(--admin-text-primary)', outline: 'none', fontWeight: '800', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--admin-card)', padding: '0.25rem', borderRadius: '0.75rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start', border: '1px solid var(--admin-border)' }}>
              {['PENDING', 'PROCESSED', 'ALL'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ flex: isMobile ? 1 : 'none', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', border: 'none', background: filter === f ? 'var(--admin-brand)' : 'transparent', color: filter === f ? 'white' : 'var(--admin-text-secondary)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer' }}>{f}</button>
              ))}
            </div>
          </div>

          {filteredItems.map(b => (
            <div key={b.id} onClick={() => setSelectedItem(b)} style={{ ...cardStyle, padding: isMobile ? '1rem' : '1.25rem', cursor: 'pointer', border: selectedItem?.id === b.id ? '2px solid var(--admin-brand)' : '1px solid var(--admin-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>#{b.id.slice(0, 8).toUpperCase()}</div>
                  <h3 style={{ margin: 0, fontWeight: '900', fontSize: isMobile ? '0.9rem' : '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customer?.full_name}</h3>
                </div>
                <span style={{ flexShrink: 0, fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '2rem', background: b.refundStatus === 'PROCESSED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: b.refundStatus === 'PROCESSED' ? '#10b981' : '#ef4444', fontWeight: '900', height: 'fit-content' }}>{b.refundStatus}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--admin-border)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--admin-text-secondary)', fontSize: '0.75rem', fontWeight: '700' }}>
                  <Car size={14} /> {b.vehicles?.length || 0} Units
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>REFUND AMOUNT</div>
                  <div style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: '950', color: 'var(--admin-text-primary)' }}>₱{b.totalPaid.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isMobile && (
          <div style={{ position: 'sticky', top: '1.5rem', height: 'fit-content' }}>
            {selectedItem ? (
              <div style={{ ...cardStyle, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontWeight: '950', fontSize: '0.9rem', color: 'var(--admin-brand)' }}>REFUND DETAILS</h3>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}><XCircle size={20} /></button>
                </div>

                <div style={{ background: 'var(--admin-bg)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)' }}>
                  <div style={{ fontWeight: '900', fontSize: '0.9rem' }}>{selectedItem.customer?.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{selectedItem.customer?.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{selectedItem.customer?.phone_number}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fleet Units</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedItem.vehicles?.map(v => (
                      <div key={v.id} style={{ fontSize: '0.75rem', fontWeight: '800', background: 'var(--admin-bg)', padding: '0.5rem', borderRadius: '0.5rem' }}>{v.make} {v.model} ({v.plate_number})</div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>Refundable Total</span>
                    <span style={{ fontWeight: '950', fontSize: '1.5rem' }}>₱{selectedItem.totalPaid.toLocaleString()}</span>
                  </div>
                  {selectedItem.refundStatus === 'PENDING' && (
                    <button onClick={() => setConfirmRefundItem(selectedItem)} style={{ width: '100%', padding: '0.85rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem' }}>MARK AS REFUNDED</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ ...cardStyle, padding: '5rem 2rem', textAlign: 'center', borderStyle: 'dashed', border: '2px dashed var(--admin-border)', background: 'transparent' }}>
                <Eye size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: '900', color: 'var(--admin-text-secondary)', fontSize: '0.8rem' }}>SELECT A REQUEST</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isMobile && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ ...cardStyle, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: '950', fontSize: '1rem', color: 'var(--admin-brand)' }}>REFUND DETAILS</h3>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>

            <div style={{ background: 'var(--admin-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--admin-border)' }}>
              <div style={{ fontWeight: '900', fontSize: '1rem' }}>{selectedItem.customer?.full_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{selectedItem.customer?.email}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>{selectedItem.customer?.phone_number}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Fleet Units</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedItem.vehicles?.map(v => (
                  <div key={v.id} style={{ fontSize: '0.85rem', fontWeight: '800', background: 'var(--admin-bg)', padding: '0.5rem', borderRadius: '0.5rem' }}>{v.make} {v.model} ({v.plate_number})</div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>Refundable Total</span>
                <span style={{ fontWeight: '950', fontSize: '1.35rem' }}>₱{selectedItem.totalPaid.toLocaleString()}</span>
              </div>
              {selectedItem.refundStatus === 'PENDING' && (
                <button onClick={() => setConfirmRefundItem(selectedItem)} style={{ width: '100%', padding: '1rem', background: 'var(--admin-brand)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.9rem' }}>MARK AS REFUNDED</button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {confirmRefundItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontWeight: '950', fontSize: '1.25rem' }}>Confirm Refund?</h2>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>Ensure you have sent ₱{confirmRefundItem.totalPaid.toLocaleString()} back to the customer before confirming.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setConfirmRefundItem(null)} style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '800' }}>CANCEL</button>
              <button onClick={() => { handleProcessRefund(confirmRefundItem); setConfirmRefundItem(null); }} style={{ flex: 1, padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: '900' }}>YES, REFUNDED</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRefunds;
