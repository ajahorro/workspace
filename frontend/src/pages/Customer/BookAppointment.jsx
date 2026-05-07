import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Check, AlertCircle, Banknote, Sparkles, X, ChevronRight, 
  Calendar, Clock, Car, MousePointer2, ShieldCheck, 
  Upload, Loader2, ChevronLeft, CreditCard, Info, MessageSquare, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/PageHeader';
import { sendBookingConfirmation } from '../../services/EmailService';

const BookAppointment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  
  const [step, setStep] = useState(0); // 0: Select Machine, 1: Details & Services, 2: Review & Payment
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [services, setServices] = useState([]);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCASH');
  const [paymentOption, setPaymentOption] = useState('FULL'); 
  
  const [vehicle, setVehicle] = useState({
    type: '', 
    plateNumber: '',
    brand: '',
    model: '',
    contactNumber: '',
    notes: ''
  });

  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);
  const [ocrVerified, setOcrVerified] = useState(false);
  const [ocrText, setOcrText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: srv } = await supabase.from('services_v2').select('*, pricing:service_pricing(*)');
      const { data: set } = await supabase.from('business_settings').select('*').maybeSingle();
      if (srv) setServices(srv);
      if (set) setBusinessSettings(set);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!date) return;

      // Use settings from DB if available, otherwise use defaults
      const settings = businessSettings || { opening_hour: '08:00:00', closing_hour: '18:00:00', max_bookings_per_slot: 3 };
      
      const openingHour  = parseInt(settings.opening_hour?.split(':')[0] ?? '8');
      const openingMin   = parseInt(settings.opening_hour?.split(':')[1] ?? '0');
      const closingHour  = parseInt(settings.closing_hour?.split(':')[0] ?? '18');
      const closingMin   = parseInt(settings.closing_hour?.split(':')[1] ?? '0');
      
      const slotDuration = 60;

      // Generate all expected slots for the day from open to close
      const generatedSlots = [];
      const cursor = new Date(`${date}T00:00:00`);
      cursor.setHours(openingHour, openingMin, 0, 0);
      const closingCursor = new Date(`${date}T00:00:00`);
      closingCursor.setHours(closingHour, closingMin, 0, 0);

      while (cursor < closingCursor) {
        generatedSlots.push(new Date(cursor));
        cursor.setTime(cursor.getTime() + slotDuration * 60000);
      }

      // Fetch counts of booked slots
      const startOfDay = new Date(`${date}T00:00:00`);
      startOfDay.setHours(0, 0, 0, 0);
      const { data: bookedData } = await supabase
        .from('resource_time_slots')
        .select('slot_start')
        .gte('slot_start', startOfDay.toISOString())
        .lte('slot_start', new Date(startOfDay.getTime() + 86400000).toISOString())
        .eq('is_available', false);

      const bookingCounts = (bookedData || []).reduce((acc, d) => {
        const s = new Date(d.slot_start);
        const key = `${s.getHours()}:${s.getMinutes()}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      // Filter out slots that have reached max capacity
      const maxCapacity = businessSettings?.max_bookings_per_slot || 3;
      const now = new Date();
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      const isToday = date === todayStr;
      const bufferTime = new Date(now.getTime() + 60 * 60000);

      const available = generatedSlots.filter(slot => {
        const key = `${slot.getHours()}:${slot.getMinutes()}`;
        if ((bookingCounts[key] || 0) >= maxCapacity) return false;
        if (isToday && slot <= bufferTime) return false;
        return true;
      });

      setAvailableSlots(available.map(slot =>
        slot.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      ));
    };
    fetchSlots();
  }, [date, businessSettings]);

  const availableServices = services.filter(s => s.pricing?.some(p => p.vehicle_type === vehicle.type));
  const getServicePrice = (s) => s.pricing?.find(p => p.vehicle_type === vehicle.type)?.price || 0;
  const selectedServicesData = services.filter(s => selectedServiceIds.includes(s.id));
  const totalAmount = selectedServicesData.reduce((sum, s) => sum + parseFloat(getServicePrice(s)), 0);

  const groupedServices = availableServices.reduce((acc, curr) => {
    let cat = curr.is_addon ? 'Add-ons & Extras' : (curr.name.toLowerCase().includes('package') ? 'Special Packages' : (curr.booking_type === 'MULTI_DAY' ? 'Elite Protection' : 'Standard Services'));
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReceipt(file);
    setIsOCRProcessing(true);
    setOcrError(null);
    setOcrVerified(false);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => { if (m.status === 'recognizing text') setOcrProgress(parseInt(m.progress * 100)); }
      });
      const cleanText = text.toLowerCase();
      setOcrText(text); // Save full text for admin review
      
      // Dynamically check against gcash_name from business settings
      const gcashName = (businessSettings?.gcash_name || '').toLowerCase().trim();
      const gcashNumber = (businessSettings?.gcash_number || '').replace(/\s/g, '');
      const nameKeyword = gcashName.split(' ')[0];
      const nameMatch = nameKeyword ? cleanText.includes(nameKeyword) : true;
      const numberMatch = gcashNumber ? cleanText.includes(gcashNumber) : true;

      if (!nameMatch || !numberMatch) {
        const displayName = businessSettings?.gcash_name || 'the shop GCash account';
        setOcrError(`UNVERIFIED: OCR analysis suggests this may be an incorrect receipt. Admins will review.`);
        setOcrVerified(false);
      } else {
        setOcrVerified(true);
        setOcrError(null);
        toast.success('OCR Check Passed!');
      }
    } catch (err) {
      setOcrError('Scan failed. Ensure clear receipt image.');
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const processBooking = async () => {
    setSubmitting(true);
    try {
      // Fix #15: Server-side guard — block CASH payment for high-value bookings
      const totalAmount = selectedServiceIds.reduce((sum, id) => {
        const svc = services.find(s => s.id === id);
        const pricing = svc?.pricing?.find(p => p.vehicle_type === vehicle.type);
        return sum + (pricing?.price || 0);
      }, 0);
      if (totalAmount >= 1000 && paymentMethod === 'CASH') {
        throw new Error('CASH payment is not allowed for bookings above ₱1,000. Please use GCash.');
      }
      // Convert 12-hour (AM/PM) back to 24-hour for the database
      let [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;

      const scheduledStart = new Date(`${date}T${formattedTime}:00`);
      
      const { error, data: bookingId } = await supabase.rpc('create_booking_v2', {
        p_customer_id: user.id,
        p_vehicle_type: vehicle.type,
        p_service_ids: selectedServiceIds,
        p_payment_method: paymentMethod,
        p_start_datetime: scheduledStart.toISOString(),
        p_plate_number: vehicle.plateNumber || null,
        p_vehicle_brand: vehicle.brand || null,
        p_vehicle_model: vehicle.model || null,
        p_customer_notes: vehicle.notes || null,
        p_customer_phone: vehicle.contactNumber || null
      });

      if (error) {
        console.error('RPC Error details:', error);
        throw new Error(error.message || 'Database rejected the booking');
      }

      // Handle GCash Payment Recording
      if (paymentMethod === 'GCASH' && receipt) {
        const fileExt = receipt.name.split('.').pop();
        const fileName = `${user.id}/${bookingId}/${Date.now()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receipt);

        if (uploadError) {
          console.error('Receipt upload failed:', uploadError);
          toast.error('Booking saved, but receipt upload failed. Please upload it in your booking details.');
        } else {
          const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
          
          const amount = paymentOption === 'DOWNPAYMENT' ? (totalAmount * 0.3) : totalAmount;
          
          // Direct INSERT — no RPC function dependency
          const { error: payErr } = await supabase
            .from('payments_v2')
            .insert({
              booking_id: bookingId,
              amount: amount,
              method: 'GCASH',
              status: 'FOR_VERIFICATION',
              receipt_url: publicUrl,
              ocr_text: ocrText || '',
              receipt_attempt: 1
            });

          if (payErr) {
            console.error('Payment insert failed:', payErr);
            toast.error('Booking saved, but payment registration failed.');
          } else {
            console.log('Payment recorded successfully with FOR_VERIFICATION status');
          }
        }
      }
      
      // 1. Create In-App Notification for Customer
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Booking Confirmed',
        message: `Your booking for ${new Date(scheduledStart).toLocaleDateString()} has been successfully scheduled.`,
        type: 'success',
        action_url: `/my-bookings/${bookingId}`
      });

      // 1b. Notify Admins about the new booking
      try {
        const { data: admins } = await supabase.from('profiles').select('id').in('role', ['ADMIN', 'SUPER_ADMIN']);
        if (admins && admins.length > 0) {
          const adminNotifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'New Booking Received',
            message: `${vehicle.brand || ''} ${vehicle.model || ''} (${vehicle.type}) booked by ${user.email}`,
            type: 'info',
            action_url: `/admin/bookings/${bookingId}`
          }));

          // Add payment verification notification if GCash was used
          if (paymentMethod === 'GCASH' && receipt) {
            admins.forEach(admin => {
              adminNotifications.push({
                user_id: admin.id,
                title: 'Payment Verification Required',
                message: `New GCash payment received for booking ${bookingId}. Please verify the receipt.`,
                type: 'warning',
                action_url: `/admin/bookings/${bookingId}`
              });
            });
          }

          await supabase.from('notifications').insert(adminNotifications);
        }
      } catch (adminNotifErr) {
        console.error('Failed to notify admins:', adminNotifErr);
      }

      // 2. Send Email Confirmation via Local Backend
      sendBookingConfirmation(user.email, {
        date: new Date(scheduledStart).toLocaleDateString(),
        time: formattedTime,
        totalPrice: totalAmount,
        serviceName: `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || vehicle.type || 'Vehicle',
        vehicle: `${vehicle.brand || ''} ${vehicle.model || ''} (${vehicle.type})`
      }).catch(err => console.error('Email trigger failure:', err));

      toast.success('Booking Successful!', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.message || 'Booking failed.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* STICKY HEADER & STEP INDICATOR */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 500, 
        background: 'rgba(var(--admin-bg-rgb), 0.9)', 
        backdropFilter: 'blur(20px)',
        margin: isMobile ? '0 -1rem 1rem -1rem' : '0 0 2rem 0',
        padding: isMobile ? '1rem' : '0 0 1.5rem 0',
        borderBottom: '1px solid var(--admin-border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <PageHeader badge="OFFICIAL BOOKING PORTAL" title="SCHEDULE SERVICE" subtitle="Select your vehicle and preferred time slot below." />
        
        {/* STEP INDICATOR */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: isMobile ? '0.35rem' : '1rem', 
          padding: isMobile ? '0' : '0 2rem',
          maxWidth: '500px',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginTop: isMobile ? '1rem' : '1.5rem',
          marginBottom: '0'
        }}>
          {[
            { id: 0, label: 'MACHINE' },
            { id: 1, label: 'SERVICES' },
            { id: 2, label: 'REVIEW' }
          ].map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <div style={{ 
                  width: isMobile ? '28px' : '44px', height: isMobile ? '28px' : '44px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step === s.id ? 'var(--admin-brand)' : (step > s.id ? 'var(--admin-brand)' : 'var(--admin-card)'),
                  color: step >= s.id ? '#fff' : 'var(--admin-text-secondary)',
                  border: `2px solid ${step >= s.id ? 'var(--admin-brand)' : 'var(--admin-border)'}`,
                  fontWeight: '900', fontSize: isMobile ? '0.7rem' : '1rem',
                  boxShadow: step === s.id ? '0 0 20px rgba(153, 27, 27, 0.4)' : 'none',
                  transition: 'all 0.3s ease',
                  zIndex: 2
                }}>
                  {step > s.id ? <Check size={isMobile ? 14 : 20} strokeWidth={3} /> : s.id + 1}
                </div>
                <span style={{ fontSize: isMobile ? '0.55rem' : '0.7rem', fontWeight: '900', color: step >= s.id ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)', letterSpacing: '1px' }}>{s.label}</span>
              </div>
              {i < 2 && (
                <div style={{ 
                  flex: 1,
                  minWidth: isMobile ? '15px' : '60px',
                  height: '2px', 
                  background: step > i ? 'var(--admin-brand)' : 'var(--admin-border)', 
                  marginTop: isMobile ? '-0.65rem' : '-1rem', 
                  transition: 'all 0.3s ease',
                  zIndex: 1
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 0: MACHINE SELECTION */}
      {step === 0 && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '900', marginBottom: isMobile ? '1.5rem' : '3rem', fontSize: isMobile ? '1.25rem' : '2rem', color: 'var(--admin-text-primary)' }}>What is your vehicle?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: isMobile ? '0.75rem' : '1.5rem' }}>
            {[
              { id: 'SEDAN', label: 'Sedan', icon: <Car size={48} /> },
              { id: 'SUV', label: 'SUV', icon: <Car size={48} /> },
              { id: 'VAN_L300', label: 'Van / L300', icon: <Car size={48} /> },
              { id: 'MOTORCYCLE', label: 'Motorcycle', icon: <MousePointer2 size={48} /> },
              { id: 'BIG_BIKE', label: 'Big Bike', icon: <MousePointer2 size={48} /> }
            ].map(v => (
              <div 
                key={v.id} 
                onClick={() => { setVehicle({...vehicle, type: v.id}); setStep(1); }} 
                style={{ 
                  background: 'var(--admin-card)', 
                  border: '1px solid var(--admin-border)', 
                  borderRadius: '1.25rem', 
                  padding: isMobile ? '1.5rem' : '2.5rem', 
                  cursor: 'pointer', 
                  textAlign: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'var(--admin-card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.borderColor = 'var(--admin-brand)';
                  e.currentTarget.style.boxShadow = '0 15px 30px rgba(169, 27, 24, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--admin-border)';
                  e.currentTarget.style.boxShadow = 'var(--admin-card-shadow)';
                }}
              >
                <div style={{ color: 'var(--admin-brand)', marginBottom: isMobile ? '1rem' : '1.5rem', transform: isMobile ? 'scale(0.8)' : 'scale(1)' }}>{v.icon}</div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--admin-text-primary)', letterSpacing: '0.5px' }}>{v.label}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: SERVICES + DETAILS combined */}
      {step === 1 && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '1rem', marginBottom: isMobile ? '1.25rem' : '2.5rem', padding: isMobile ? '0 0.5rem' : '0' }}>
            <button onClick={() => setStep(0)} className="bare-back-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6, color: 'var(--admin-text-primary)', padding: isMobile ? '0.15rem' : '0.5rem' }} title="Back to Machine Selection">
              <ChevronLeft size={isMobile ? 22 : 32} />
            </button>
            <h2 style={{ 
              fontSize: isMobile ? 'min(1.1rem, 4vw)' : '1.75rem', 
              fontWeight: '950', 
              margin: 0, 
              color: 'var(--admin-text-primary)', 
              lineHeight: '1.2',
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}>
              Available Services for <span style={{ color: 'var(--admin-brand)', display: isMobile ? 'block' : 'inline' }}>{vehicle.type?.replace('_', ' ')}</span>
            </h2>
          </div>
          <div className="booking-grid">
            {/* LEFT: service cards */}
            <div>
              {Object.entries(groupedServices).map(([cat, list]) => (
                <div key={cat} style={{ marginBottom: isMobile ? '2rem' : '3rem' }}>
                  <h3 style={{ fontSize: isMobile ? '0.65rem' : '0.8rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px', opacity: 0.6 }}>{cat}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '0.75rem' : '1rem' }}>
                    {list.map(s => {
                      const isSelected = selectedServiceIds.includes(s.id);
                      return (
                        <div key={s.id} onClick={() => setSelectedServiceIds(isSelected ? selectedServiceIds.filter(id => id !== s.id) : [...selectedServiceIds, s.id])} style={{ background: isSelected ? 'rgba(153, 27, 27, 0.08)' : 'var(--admin-card)', border: isSelected ? '2px solid var(--admin-brand)' : '1px solid var(--admin-border)', borderRadius: '1.25rem', padding: isMobile ? '1.25rem' : '1.5rem', cursor: 'pointer', boxShadow: isSelected ? '0 8px 20px rgba(153, 27, 27, 0.15)' : 'var(--admin-card-shadow)', display: 'flex', flexDirection: 'column', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '950', fontSize: isMobile ? '0.95rem' : '1.05rem', color: isSelected ? 'var(--admin-brand)' : 'var(--admin-text-primary)', lineHeight: '1.3', wordBreak: 'break-word' }}>{s.name}</h4>
                          {s.description ? (
                            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: '1.5rem', fontWeight: '600', lineHeight: '1.5', opacity: 0.85 }}>{s.description}</p>
                          ) : (
                            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: '1.5rem', fontWeight: '600', lineHeight: '1.5', opacity: 0.85 }}>Standard exterior wash and dry</p>
                          )}
                          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)', marginTop: 'auto' }}>₱{getServicePrice(s)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: selected services + booking details */}
            <div>
              <div className="booking-summary-card">
                {/* Selected Services Summary */}
                <div>
                  <h3 style={{ marginBottom: '1.25rem', fontSize: '1.15rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Selected Services</h3>
                  {selectedServicesData.length === 0 ? (
                    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.95rem', opacity: 0.6 }}>No services selected yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedServicesData.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--admin-text-primary)', fontWeight: '700' }}>
                          <span>{s.name}</span>
                          <span>₱{getServicePrice(s)}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>TOTAL</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{totalAmount}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: 'var(--admin-border)' }} />

                {/* Date & Time */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', display: 'block', letterSpacing: '1px' }}>WHEN WILL YOU COME?</label>
                  <input type="date" min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', colorScheme: 'dark', fontWeight: '700', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                  {date && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
                      {availableSlots.map(t => <button key={t} onClick={() => setTime(t)} style={{ padding: '0.75rem 0.5rem', background: time === t ? 'var(--admin-brand)' : 'var(--admin-bg)', color: time === t ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer' }}>{t}</button>)}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', display: 'block', letterSpacing: '1px' }}>VEHICLE SPECS</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                      <input placeholder="Brand" value={vehicle.brand} onChange={e => setVehicle({...vehicle, brand: e.target.value})} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                      <input placeholder="Model" value={vehicle.model} onChange={e => setVehicle({...vehicle, model: e.target.value})} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                    </div>
                    <input placeholder="Plate Number" value={vehicle.plateNumber} onChange={e => setVehicle({...vehicle, plateNumber: e.target.value})} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', display: 'block', letterSpacing: '1px' }}>CONTACT</label>
                  <input placeholder="Phone Number" value={vehicle.contactNumber} onChange={e => setVehicle({...vehicle, contactNumber: e.target.value})} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                  <textarea placeholder="Notes or location details..." value={vehicle.notes} onChange={e => setVehicle({...vehicle, notes: e.target.value})} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', marginTop: '0.75rem', height: '90px', resize: 'none', fontWeight: '700', fontSize: '0.95rem', boxSizing: 'border-box' }} />
                </div>

                <button onClick={() => {
                  if (selectedServiceIds.length === 0) return toast.error('Select at least one service.');
                  if (!date || !time) return toast.error('Please select a date and time.');
                  if (!vehicle.plateNumber || !vehicle.brand || !vehicle.model) return toast.error('Please complete vehicle info.');
                  setStep(2);
                }} style={{ width: '100%', background: 'var(--admin-brand)', color: '#FFFFFF', padding: '1rem', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', border: 'none' }}>PROCEED TO REVIEW →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW & PAYMENT */}
      {step === 2 && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: isMobile ? '1.5rem' : '3rem' }}>
            <button onClick={() => setStep(1)} className="bare-back-btn" style={{ position: 'absolute', left: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.6, color: 'var(--admin-text-primary)', padding: isMobile ? '0.25rem' : '0.5rem' }} title="Back to Services">
              <ChevronLeft size={isMobile ? 24 : 32} />
            </button>
            <h2 style={{ fontWeight: '900', margin: 0, color: 'var(--admin-text-primary)', fontSize: isMobile ? '1.25rem' : '2rem' }}>FINAL REVIEW</h2>
          </div>

          {/* Two-column layout */}
          <div className="review-grid">

            {/* LEFT: Booking Summary */}
            <div style={{ background: 'var(--admin-card)', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-card-shadow)', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Booking Summary</span>
              </div>
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {/* Schedule */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '1px', marginBottom: '0.4rem' }}>SCHEDULE</p>
                    <p style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--admin-text-primary)', margin: 0 }}>{date}</p>
                    <p style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--admin-brand)', margin: '0.25rem 0 0 0' }}>{time}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '1px', marginBottom: '0.4rem' }}>VEHICLE</p>
                    <p style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--admin-text-primary)', margin: 0 }}>{vehicle.brand} {vehicle.model}</p>
                    <p style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--admin-text-secondary)', margin: '0.25rem 0 0 0', opacity: 0.7 }}>{vehicle.plateNumber} · {vehicle.type}</p>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--admin-border)' }} />

                {/* Services */}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '1px', marginBottom: '1rem' }}>SELECTED SERVICES</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedServicesData.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--admin-text-primary)' }}>{s.name}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{getServicePrice(s)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--admin-border)' }} />

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--admin-text-secondary)', letterSpacing: '1px' }}>TOTAL</span>
                  <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{totalAmount}</span>
                </div>

                {/* Contact / Notes if present */}
                {(vehicle.contactNumber || vehicle.notes) && (
                  <>
                    <div style={{ height: '1px', background: 'var(--admin-border)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {vehicle.contactNumber && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-secondary)', fontWeight: '600' }}>📞 {vehicle.contactNumber}</p>}
                      {vehicle.notes && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-secondary)', fontWeight: '600', fontStyle: 'italic' }}>"{vehicle.notes}"</p>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: Payment */}
            <div style={{ background: 'var(--admin-card)', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-card-shadow)', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Payment</span>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Method Toggle */}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '1px', marginBottom: '0.75rem' }}>PAYMENT METHOD</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setPaymentMethod('GCASH')} style={{ flex: 1, padding: '1rem', background: paymentMethod === 'GCASH' ? 'var(--admin-brand)' : 'var(--admin-bg)', color: paymentMethod === 'GCASH' ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', fontSize: '0.9rem' }}>GCASH</button>
                    <button onClick={() => totalAmount < 1000 && setPaymentMethod('CASH')} disabled={totalAmount >= 1000} style={{ flex: 1, padding: '1rem', background: paymentMethod === 'CASH' ? 'var(--admin-brand)' : 'var(--admin-bg)', color: paymentMethod === 'CASH' ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '900', fontSize: '0.9rem', opacity: totalAmount >= 1000 ? 0.35 : 1, cursor: totalAmount >= 1000 ? 'not-allowed' : 'pointer' }}>CASH</button>
                  </div>
                  {totalAmount >= 1000 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--admin-brand)', marginTop: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Info size={13} /> High-value bookings (₱1,000+) require GCash downpayment.
                    </p>
                  )}
                </div>

                {/* GCash Section */}
                {paymentMethod === 'GCASH' && (
                  <div style={{ background: 'var(--admin-bg)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setPaymentOption('DOWNPAYMENT')} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '2rem', border: '1px solid var(--admin-brand)', background: paymentOption === 'DOWNPAYMENT' ? 'var(--admin-brand)' : 'transparent', color: paymentOption === 'DOWNPAYMENT' ? '#FFFFFF' : 'var(--admin-brand)', fontWeight: '900', cursor: 'pointer' }}>DOWNPAYMENT (30%)</button>
                      <button onClick={() => setPaymentOption('FULL')} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '2rem', border: '1px solid var(--admin-brand)', background: paymentOption === 'FULL' ? 'var(--admin-brand)' : 'transparent', color: paymentOption === 'FULL' ? '#FFFFFF' : 'var(--admin-brand)', fontWeight: '900', cursor: 'pointer' }}>FULL PAYMENT</button>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.6, color: 'var(--admin-text-primary)', fontWeight: '700' }}>Send {paymentOption === 'DOWNPAYMENT' ? 'Downpayment (30%)' : 'Full Payment'} To:</p>
                      <p style={{ fontSize: '2.75rem', fontWeight: '950', color: 'var(--admin-brand)', margin: '0 0 1rem 0', letterSpacing: '-1px' }}>₱{paymentOption === 'DOWNPAYMENT' ? (totalAmount * 0.3).toFixed(0) : totalAmount}</p>
                    </div>
                    
                    {/* ENLARGED & ZOOMED QR CODE */}
                      <div style={{ 
                        background: '#fff', 
                        padding: '1rem', 
                        borderRadius: '2.5rem', 
                        boxShadow: '0 25px 70px rgba(0,0,0,0.5)',
                        border: '10px solid #007dfe', 
                        marginBottom: '1.5rem',
                        width: '100%', 
                        maxWidth: '400px', // Wider but still vertical
                        height: 'auto', // Responsive height to eliminate white space on mobile
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}>
                        <img 
                          src={businessSettings?.gcash_qr_url} 
                          style={{ 
                            width: '100%', 
                            height: 'auto',
                            display: 'block',
                            objectFit: 'contain',
                          }} 
                          alt="GCash QR Code" 
                        />
                      </div>

                    <div style={{ textAlign: 'center', background: 'rgba(0, 125, 254, 0.05)', padding: '1rem 2rem', borderRadius: '1rem', width: '100%', boxSizing: 'border-box' }}>
                      <p style={{ fontWeight: '950', color: '#007dfe', margin: '0 0 0.25rem 0', fontSize: '1.25rem', letterSpacing: '1px' }}>{businessSettings?.gcash_number}</p>
                      <p style={{ fontWeight: '800', color: 'var(--admin-text-primary)', margin: 0, fontSize: '0.9rem', textTransform: 'uppercase' }}>{businessSettings?.gcash_name}</p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--admin-card)', padding: '1rem 1.25rem', borderRadius: '1rem', cursor: 'pointer', border: '1px dashed var(--admin-brand)', width: '100%', boxSizing: 'border-box' }}>
                      <Upload size={18} color="var(--admin-brand)" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: '700' }}>{receipt ? receipt.name : 'UPLOAD GCASH RECEIPT'}</span>
                      <input type="file" hidden accept="image/*" onChange={handleReceiptUpload} />
                    </label>
                    {isOCRProcessing && <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-primary)', fontWeight: '800', margin: 0 }}>AI SCANNING... {ocrProgress}%</p>}
                    {ocrError && <p style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '800', margin: 0 }}>{ocrError}</p>}
                    {ocrVerified && <p style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '800', margin: 0 }}>✓ Receipt Verified</p>}
                  </div>
                )}

                {/* Policy + Submit */}
                <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={agreedToPolicy} onChange={e => setAgreedToPolicy(e.target.checked)} style={{ marginTop: '3px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', opacity: 0.7, color: 'var(--admin-text-primary)', fontWeight: '600', lineHeight: '1.5' }}>I agree to the cancellation and shop policies.</span>
                </label>

                <button onClick={processBooking} disabled={submitting || (paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy} style={{ width: '100%', background: ((paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy) ? 'var(--admin-input-bg)' : 'var(--admin-brand)', color: ((paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy) ? 'var(--admin-text-secondary)' : '#FFFFFF', padding: '1.25rem', borderRadius: '1rem', fontWeight: '900', fontSize: '1rem', border: 'none', cursor: ((paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy) ? 'not-allowed' : 'pointer', letterSpacing: '1px' }}>
                  {submitting ? 'PROCESSING...' : 'SECURE BOOKING NOW'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      <style>{`
        .booking-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2.5rem;
          align-items: start;
        }
        .booking-summary-card {
          background: var(--admin-card);
          padding: 2rem;
          border-radius: 1.5rem;
          border: 1px solid var(--admin-border);
          position: sticky;
          top: 2rem;
          box-shadow: var(--admin-card-shadow);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .review-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .review-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .booking-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .booking-summary-card {
            position: static !important;
            padding: 1.25rem !important;
            top: auto !important;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .action-btn {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-btn:hover {
          transform: translateY(-4px);
          border-color: var(--admin-brand) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        input, select, button, textarea {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }
        .bare-back-btn {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .bare-back-btn:hover {
          opacity: 1 !important;
          transform: translateX(-4px);
        }
      `}</style>
    </div>
  );
};

export default BookAppointment;
