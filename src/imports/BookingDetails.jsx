import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Box, Car, FileText, Calendar, Clock, Banknote, AlertTriangle, Check, History, User, CheckCircle2, Wrench, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import BookingAuditTrail from '../../components/BookingAuditTrail';
import BookingChat from '../../components/BookingChat';
import { useMediaQuery } from '../hooks/useMediaQuery';
import PageHeader from './PageHeader';
import { formatCurrency } from '../../utils/formatters';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reuploading, setReuploading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  
  const vehicleRefs = useRef({});

  useEffect(() => {
    if (user) {
      fetchBooking();
      const channel = supabase.channel(`booking-live-cust-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, () => fetchBooking())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_vehicles', filter: `booking_id=eq.${id}` }, () => fetchBooking())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `booking_id=eq.${id}` }, () => fetchBooking())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [id, user]);

  useEffect(() => {
    // Handle Scroll Anchors (e.g. from notifications ?vehicle=ID)
    const params = new URLSearchParams(location.search);
    const vehicleId = params.get('vehicle');
    if (vehicleId && vehicleRefs.current[vehicleId]) {
      setTimeout(() => {
        vehicleRefs.current[vehicleId].scrollIntoView({ behavior: 'smooth', block: 'center' });
        vehicleRefs.current[vehicleId].style.border = '2px solid var(--admin-brand)';
        vehicleRefs.current[vehicleId].style.boxShadow = '0 0 20px rgba(169, 27, 24, 0.2)';
      }, 500);
    }
  }, [vehicles, location.search]);

  const fetchBooking = async () => {
    try {
      console.log('🔄 Syncing Booking Details for ID:', id);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          vehicles:booking_vehicles(*, 
            services:booking_vehicle_services(*)
          ),
          payments:payments(*)
        `)
        .eq('id', id)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        console.log('📦 Raw Booking Data:', data);

        // 1. Process Vehicles & Services with robust snapshot logic
        const processedVehicles = (data.vehicles || []).map(v => {
          const snapshotSubtotal = (v.services || []).reduce((sum, s) => {
            // Robust fallback: price_snapshot -> service.price (if joined) -> 0
            const price = Number(s.price_snapshot || s.price || 0);
            return sum + price;
          }, 0);

          return {
            ...v,
            subtotal: Number(v.subtotal) > 0 ? Number(v.subtotal) : snapshotSubtotal
          };
        });
        
        // 2. Calculate Grand Total
        const calculatedTotal = processedVehicles.reduce((sum, v) => sum + v.subtotal, 0);
        
        // 3. Process Payments & Receipt URLs
        const processedPayments = (data.payments || []).map(p => {
          let url = p.receipt_url;
          // If it's a relative path, convert to Public URL
          if (url && !url.startsWith('http')) {
            const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(url);
            url = publicUrl;
          }
          return { ...p, receipt_url: url };
        });

        const finalBooking = {
          ...data,
          total_amount: Number(data.total_amount) > 0 ? Number(data.total_amount) : calculatedTotal,
          payments: processedPayments
        };

        console.log('✅ Processed Booking:', finalBooking);
        setBooking(finalBooking);
        setVehicles(processedVehicles);
      }
    } catch (err) { 
      console.error('❌ Fetch Error:', err);
      toast.error('Data pipeline error. Check console.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleOCR = async (file) => {
    if (!file) return;
    setReuploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${id}/${Date.now()}.${fileExt}`;
      await supabase.storage.from('receipts').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
      
      const { data: { text } } = await Tesseract.recognize(file, 'eng', { logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); } });

      const verifiedPaid = (booking.payments || []).filter(p => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0);
      const balanceDue = Math.max(0, (booking.total_amount || 0) - verifiedPaid);

      const { error } = await supabase.from('payments').insert({
        booking_id: id, 
        amount: balanceDue, 
        method: 'GCASH', 
        status: 'FOR_VERIFICATION', 
        receipt_url: publicUrl, 
        ocr_text: text || '', 
        receipt_attempt: (booking.payments?.length || 0) + 1
      });
      if (error) throw error;
      toast.success('Receipt queued for verification.');
      fetchBooking();
    } catch (err) { 
      console.error('OCR Error:', err);
      toast.error('Upload failed'); 
    } finally { 
      setReuploading(false); 
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--admin-bg)' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--admin-brand)', borderRadius: '50%' }} />
      <span style={{ fontWeight: '900', letterSpacing: '2px', color: 'var(--admin-text-secondary)' }}>SYNCING FLEET DATA...</span>
    </div>
  );

  if (!booking) return <div style={{ padding: '4rem', textAlign: 'center' }}>Booking not found.</div>;

  const tracks = {
    app: { 
      scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
      completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
      cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
    }[booking.status] || { label: booking.status, color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' },
    pay: {
      unpaid: { label: 'Unpaid', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
      partially_paid: { label: 'Partial', color: 'var(--admin-brand)', bg: 'rgba(169, 27, 24, 0.1)' },
      paid: { label: 'Paid', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
    }[booking.payment_status] || { label: 'Settling', color: 'var(--admin-text-secondary)', bg: 'var(--admin-bg)' }
  };

  const verifiedPaid = (booking.payments || [])
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(0, (booking.total_amount || 0) - verifiedPaid);

  // 1. Progress Steps Logic
  const steps = [
    { id: 'submitted', label: 'Submitted', icon: <FileText size={14} />, color: '#3b82f6' },
    { id: 'confirmed', label: 'Confirmed', icon: <CheckCircle2 size={14} />, color: '#10b981' },
    { id: 'queued', label: 'In Queue', icon: <Clock size={14} />, color: '#f59e0b' },
    { id: 'in_progress', label: 'In Progress', icon: <Wrench size={14} />, color: '#a855f7' },
    { id: 'completed', label: 'Completed', icon: <Check size={14} />, color: '#10b981' }
  ];

  const getCurrentStep = () => {
    if (booking.status === 'completed') return 4;
    if (vehicles.some(v => v.status === 'in_progress')) return 3;
    if (vehicles.some(v => v.status === 'queued')) return 2;
    if (booking.status === 'scheduled') return 1;
    return 0;
  };
  const currentStepIndex = getCurrentStep();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
      <PageHeader 
        showBack 
        onBack={() => navigate(-1)} 
        badge={`ID: ${id.slice(0, 8).toUpperCase()}`} 
        title="FLEET STATUS" 
        subtitle="Live unit-level tracking for your detailing appointment." 
        onRefresh={fetchBooking}
      >
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
          <span style={{ padding: '0.45rem 1rem', background: tracks.app.bg, color: tracks.app.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '900', border: '1px solid currentColor', letterSpacing: '0.5px' }}>
            STATUS: {tracks.app.label.toUpperCase()}
          </span>
          <span style={{ padding: '0.45rem 1rem', background: tracks.pay.bg, color: tracks.pay.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '900', border: '1px solid currentColor', letterSpacing: '0.5px' }}>
            PAYMENT: {tracks.pay.label.toUpperCase()}
          </span>
        </div>
      </PageHeader>

      {/* 2. PROGRESS TIMELINE */}
      <div style={{ 
        background: 'var(--admin-card)', 
        borderRadius: '1.25rem', 
        border: '1px solid var(--admin-border)', 
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div style={{ 
            position: 'absolute', top: '22px', left: '10%', right: '10%', height: '2px', 
            background: 'rgba(255,255,255,0.05)', zIndex: 0 
          }} />
          <div style={{ 
            position: 'absolute', top: '22px', left: '10%', 
            width: `${(currentStepIndex / (steps.length - 1)) * 80}%`, 
            height: '2px', background: 'var(--admin-brand)', zIndex: 0,
            transition: 'width 1s ease-in-out'
          }} />

          {steps.map((step, idx) => {
            const isActive = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div key={step.id} style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', 
                gap: '0.75rem', zIndex: 1, position: 'relative', width: '20%' 
              }}>
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '50%', 
                  background: isActive ? 'var(--admin-brand)' : 'var(--admin-bg)',
                  border: `2px solid ${isActive ? 'var(--admin-brand)' : 'var(--admin-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? '#fff' : 'var(--admin-text-secondary)',
                  boxShadow: isCurrent ? '0 0 20px rgba(169, 27, 24, 0.4)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  {step.icon}
                </div>
                <span style={{ 
                  fontSize: '0.65rem', fontWeight: '950', 
                  color: isActive ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.2fr', gap: '1.5rem' }}>
        {/* LEFT COLUMN: FLEET UNITS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: '950', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--admin-text-secondary)' }}>
              Fleet Units ({vehicles.length})
            </h2>
            {booking.status === 'scheduled' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.7rem', fontWeight: '800' }}>
                <Clock size={14} /> ESTIMATED START: {new Date(booking.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          
          {vehicles.map((v) => (
            <div key={v.id} ref={el => vehicleRefs.current[v.id] = el} style={{ 
              background: 'var(--admin-card)', 
              borderRadius: '1.25rem', 
              border: '1px solid var(--admin-border)', 
              overflow: 'hidden', 
              transition: 'all 0.5s ease' 
            }}>
              <div style={{ 
                padding: '1.25rem 1.5rem', 
                background: 'rgba(255,255,255,0.02)', 
                borderBottom: '1px solid var(--admin-border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem' }}>
                    <Car size={18} color="var(--admin-brand)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '900', fontSize: '1rem' }}>{v.make} {v.model}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>{v.plate_number}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '0.65rem', fontWeight: '950', padding: '0.35rem 0.75rem', borderRadius: '5rem',
                    background: v.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : (v.status === 'in_progress' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.05)'),
                    color: v.status === 'completed' ? '#10b981' : (v.status === 'in_progress' ? '#a855f7' : 'var(--admin-text-secondary)'),
                    border: '1px solid currentColor'
                  }}>
                    {v.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ padding: '1.5rem' }}>
                 <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                   {v.services?.map(s => (
                     <span key={s.id} style={{ 
                       padding: '0.4rem 0.8rem', 
                       background: 'rgba(255,255,255,0.03)', 
                       border: '1px solid var(--admin-border)', 
                       borderRadius: '0.6rem', 
                       fontSize: '0.75rem', 
                       fontWeight: '600',
                       color: 'var(--admin-text-primary)',
                       letterSpacing: '0.2px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.4rem',
                       transition: 'all 0.2s ease',
                       cursor: 'default'
                     }}
                     onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'var(--admin-brand)'; }}
                     onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--admin-border)'; }}
                     >
                       <Wrench size={10} /> {s.service_name_snapshot}
                     </span>
                   ))}
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--admin-border)', paddingTop: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '0.5px' }}>UNIT SUBTOTAL</span>
                    <span style={{ fontWeight: '950', fontSize: '1.1rem' }}>{formatCurrency(v.subtotal)}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: FINANCIALS, PROOF & HISTORY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           {/* FINANCIAL SUMMARY */}
           <div style={{ 
             background: 'var(--admin-card)', 
             borderRadius: '1.25rem', 
             border: '1px solid var(--admin-border)', 
             padding: '1.5rem',
             position: 'relative',
             overflow: 'hidden'
           }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'var(--admin-brand)', opacity: 0.03, filter: 'blur(50px)', borderRadius: '50%' }} />
              
              <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Banknote size={16} /> Financial Summary
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ color: 'var(--admin-text-secondary)', fontWeight: '700' }}>Subtotal ({vehicles.length} Units)</span>
                   <span style={{ fontWeight: '800' }}>{formatCurrency(booking.total_amount)}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ color: 'var(--admin-text-secondary)', fontWeight: '700' }}>Payment Method</span>
                   <span style={{ fontWeight: '900', color: 'var(--admin-brand)' }}>{booking.payment_method}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ color: 'var(--admin-text-secondary)', fontWeight: '700' }}>Verified Paid</span>
                   <span style={{ fontWeight: '900', color: '#10b981' }}>{formatCurrency(verifiedPaid)}</span>
                 </div>
                 
                 <div style={{ 
                   display: 'flex', justifyContent: 'space-between', 
                   borderTop: '2px solid var(--admin-border)', paddingTop: '1rem', 
                   marginTop: '0.5rem' 
                 }}>
                   <span style={{ fontWeight: '950', fontSize: '0.9rem' }}>BALANCE DUE</span>
                   <span style={{ fontWeight: '950', fontSize: '1.25rem', color: balanceDue > 0 ? '#f59e0b' : '#10b981' }}>
                     {formatCurrency(balanceDue)}
                   </span>
                 </div>
              </div>

              {balanceDue > 0 && booking.payment_method === 'GCASH' && (
                <label style={{ 
                  marginTop: '1.5rem', display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', gap: '0.5rem', padding: '1.25rem', 
                  border: '2px dashed var(--admin-brand)', borderRadius: '1rem', 
                  cursor: 'pointer', background: 'rgba(169, 27, 24, 0.05)',
                  transition: 'all 0.3s ease'
                }}>
                  <Banknote size={20} color="var(--admin-brand)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--admin-brand)', letterSpacing: '0.5px' }}>
                    {reuploading ? `Scanning... ${ocrProgress}%` : 'RE-UPLOAD RECEIPT'}
                  </span>
                  <input type="file" hidden accept="image/*" onChange={e => handleOCR(e.target.files[0])} />
                </label>
              )}
           </div>

           {/* PROOF OF PAYMENT SECTION */}
           <div style={{ 
             background: 'var(--admin-card)', 
             borderRadius: '1.25rem', 
             border: '1px solid var(--admin-border)', 
             padding: '1.5rem' 
           }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> Proof of Payment
              </h3>
              
              {booking.payments && booking.payments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {booking.payments.filter(p => p.receipt_url).map((payment, pIdx) => (
                    <div key={payment.id} style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '1rem', 
                      border: '1px solid var(--admin-border)',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'relative', height: '140px', background: '#000' }}>
                        <img 
                          src={payment.receipt_url} 
                          alt="Receipt" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, cursor: 'pointer' }}
                          onClick={() => window.open(payment.receipt_url, '_blank')}
                        />
                        <div style={{ 
                          position: 'absolute', bottom: '0.75rem', right: '0.75rem', 
                          padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.6)', 
                          borderRadius: '0.4rem', fontSize: '0.6rem', fontWeight: '900'
                        }}>
                          CLICK TO EXPAND
                        </div>
                      </div>
                      <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>
                            RECEIPT #{pIdx + 1}
                          </span>
                          <span style={{ 
                            fontSize: '0.6rem', fontWeight: '950', padding: '0.2rem 0.5rem', borderRadius: '4px',
                            background: payment.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: payment.status === 'PAID' ? '#10b981' : '#f59e0b',
                            border: '1px solid currentColor'
                          }}>
                            {payment.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--admin-text-secondary)', fontWeight: '700' }}>OCR Value</span>
                          <span style={{ fontWeight: '900' }}>{formatCurrency(payment.amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '1rem', border: '1px dashed var(--admin-border)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>No receipts uploaded.</div>
                </div>
              )}
           </div>

           {/* COMMUNICATION PANEL */}
           <div style={{ 
             background: 'var(--admin-card)', 
             borderRadius: '1.25rem', 
             border: '1px solid var(--admin-border)', 
             padding: '1.5rem' 
           }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={16} /> Communication
              </h3>
              <div style={{ height: '350px', overflow: 'hidden', borderRadius: '0.75rem' }}>
                <BookingChat bookingId={id} />
              </div>
           </div>

           {/* ACTIVITY HISTORY (Moved to Right Column) */}
           <div style={{ 
             background: 'var(--admin-card)', 
             borderRadius: '1.25rem', 
             border: '1px solid var(--admin-border)', 
             padding: '1.5rem' 
           }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={16} /> Activity History
              </h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                <BookingAuditTrail bookingId={id} />
              </div>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        label:hover { transform: translateY(-2px); background: rgba(169, 27, 24, 0.08) !important; }
        button:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
};



export default BookingDetails;
