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
      const startOfDay = new Date(date);
      startOfDay.setHours(0,0,0,0);
      const { data } = await supabase
        .from('resource_time_slots')
        .select('slot_start, is_available')
        .gte('slot_start', startOfDay.toISOString())
        .lte('slot_start', new Date(startOfDay.getTime() + 86400000).toISOString())
        .eq('is_available', true);
      if (data) {
        const now = new Date();
        const selectedDate = new Date(date);
        
        // Normalize both to YYYY-MM-DD for comparison
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        const isToday = date === todayStr;

        let filteredData = data;
        if (isToday) {
          // Only show slots that start at least 1 hour from now for same-day bookings
          const bufferTime = new Date(now.getTime() + 60 * 60000);
          filteredData = data.filter(d => new Date(d.slot_start) > bufferTime);
        }

        const times = [...new Set(filteredData.map(d => {
          const slotDate = new Date(d.slot_start);
          return slotDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }))];
        
        setAvailableSlots(times.sort((a, b) => {
          const timeA = new Date('1970/01/01 ' + a);
          const timeB = new Date('1970/01/01 ' + b);
          return timeA - timeB;
        }));
      }
    };
    fetchSlots();
  }, [date]);

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
      if (!cleanText.includes('athea') || !cleanText.includes(businessSettings?.gcash_number?.replace(/\s/g, '') || '')) {
        setOcrError('UNVERIFIED: Incorrect receipt. Must be sent to Athea Jayne Ahorro.');
      } else {
        setOcrVerified(true);
        toast.success('Receipt Verified!');
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
        p_payment_method: paymentMethod, // NEW
        p_start_datetime: scheduledStart.toISOString(),
        p_plate_number: vehicle.plateNumber,
        p_vehicle_brand: vehicle.brand,
        p_vehicle_model: vehicle.model,
        p_customer_notes: vehicle.notes || ''
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
          
          const { error: payErr } = await supabase.rpc('record_payment_v2', {
            p_booking_id: bookingId,
            p_amount: amount,
            p_method: 'GCASH',
            p_receipt_url: publicUrl
          });

          if (payErr) {
            console.error('Payment record failed:', payErr);
            toast.error('Booking saved, but payment registration failed.');
          }
        }
      }
      
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
      <PageHeader badge="OFFICIAL BOOKING PORTAL" title="SCHEDULE SERVICE" subtitle="Select your vehicle and preferred time slot below." />
      
      {step > 0 && (
        <button onClick={() => setStep(step - 1)} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: '800' }}>
          <ChevronLeft size={16} /> BACK
        </button>
      )}

      {/* STEP 0: MACHINE SELECTION */}
      {step === 0 && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '900', marginBottom: '3rem', fontSize: '2rem', color: 'var(--admin-text-primary)' }}>CHOOSE YOUR MACHINE</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: '1.5rem' }}>
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
                className="action-btn"
                style={{ 
                  background: 'var(--admin-card)', 
                  border: '1px solid var(--admin-border)', 
                  borderRadius: '1.5rem', 
                  padding: '3rem 1rem', 
                  textAlign: 'center', 
                  cursor: 'pointer', 
                  boxShadow: 'var(--admin-card-shadow)' 
                }}
              >
                <div style={{ color: 'var(--admin-brand)', marginBottom: '1.5rem' }}>{v.icon}</div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--admin-text-primary)' }}>{v.label}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: SERVICES & DETAILS */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr', gap: '2.5rem', animation: 'fadeIn 0.5s' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem', color: 'var(--admin-text-primary)' }}>Available Services for {vehicle.type}</h2>
            {Object.entries(groupedServices).map(([cat, list]) => (
              <div key={cat} style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px', opacity: 0.6 }}>{cat}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {list.map(s => {
                    const isSelected = selectedServiceIds.includes(s.id);
                    return (
                      <div key={s.id} onClick={() => setSelectedServiceIds(isSelected ? selectedServiceIds.filter(id => id !== s.id) : [...selectedServiceIds, s.id])} style={{ background: isSelected ? 'rgba(169, 27, 24, 0.1)' : 'var(--admin-card)', border: isSelected ? '1px solid var(--admin-brand)' : '1px solid var(--admin-border)', borderRadius: '1.25rem', padding: '1.5rem', cursor: 'pointer', boxShadow: isSelected ? '0 0 20px rgba(169, 27, 24, 0.1)' : 'none' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '800', color: 'var(--admin-text-primary)' }}>{s.name}</h4>
                        {s.description && <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', marginBottom: '1rem', opacity: 0.6 }}>{s.description}</p>}
                        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: isSelected ? 'var(--admin-brand)' : 'var(--admin-text-primary)' }}>₱{getServicePrice(s)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ background: 'var(--admin-card)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', position: 'sticky', top: '2rem', boxShadow: 'var(--admin-card-shadow)' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Booking Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>DATE & TIME</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--admin-text-primary)', marginTop: '0.5rem', colorScheme: 'dark' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {availableSlots.map(t => <button key={t} onClick={() => setTime(t)} style={{ padding: '0.5rem', background: time === t ? 'var(--admin-brand)' : 'var(--admin-bg)', color: time === t ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}>{t}</button>)}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>VEHICLE PROFILE</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input placeholder="Brand" value={vehicle.brand} onChange={e => setVehicle({...vehicle, brand: e.target.value})} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--admin-text-primary)' }} />
                    <input placeholder="Model" value={vehicle.model} onChange={e => setVehicle({...vehicle, model: e.target.value})} style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--admin-text-primary)' }} />
                  </div>
                  <input placeholder="Plate Number" value={vehicle.plateNumber} onChange={e => setVehicle({...vehicle, plateNumber: e.target.value})} style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--admin-text-primary)', marginTop: '0.5rem' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>CONTACT & NOTES</label>
                  <input placeholder="Contact Number" value={vehicle.contactNumber} onChange={e => setVehicle({...vehicle, contactNumber: e.target.value})} style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--admin-text-primary)', marginTop: '0.5rem' }} />
                  <textarea placeholder="Special instructions (optional)" value={vehicle.notes} onChange={e => setVehicle({...vehicle, notes: e.target.value})} style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--admin-text-primary)', marginTop: '0.5rem', height: '80px', resize: 'none' }} />
                </div>

                <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '800', color: 'var(--admin-text-secondary)' }}>TOTAL</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{totalAmount}</span>
                </div>

                <button onClick={() => { if(!date || !time || !vehicle.plateNumber || selectedServiceIds.length === 0) return toast.error('Please complete all fields.'); setStep(2); }} style={{ background: 'var(--admin-brand)', color: '#FFFFFF', padding: '1rem', borderRadius: '0.5rem', fontWeight: '900', cursor: 'pointer', border: 'none' }}>REVIEW & PAY →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW & PAYMENT */}
      {step === 2 && (
        <div style={{ maxWidth: '700px', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '900', marginBottom: '2.5rem', color: 'var(--admin-text-primary)' }}>FINAL REVIEW</h2>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '2rem', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-card-shadow)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>SCHEDULE</label>
                <p style={{ fontWeight: '800', color: 'var(--admin-text-primary)' }}>{date} at {time}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>VEHICLE</label>
                <p style={{ fontWeight: '800', color: 'var(--admin-text-primary)' }}>{vehicle.brand} {vehicle.model} ({vehicle.plateNumber})</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>SELECTED SERVICES</label>
              {selectedServicesData.map(s => <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--admin-text-primary)', fontWeight: '600' }}><span>{s.name}</span><span>₱{getServicePrice(s)}</span></div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: 'var(--admin-text-primary)', marginTop: '1rem', fontSize: '1.25rem' }}><span>TOTAL</span><span>₱{totalAmount}</span></div>
            </div>

            <div style={{ height: '1px', background: 'var(--admin-border)', margin: '2rem 0' }} />

            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--admin-text-primary)', fontWeight: '800' }}>Payment Method</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => setPaymentMethod('GCASH')} style={{ flex: 1, padding: '1rem', background: paymentMethod === 'GCASH' ? 'var(--admin-brand)' : 'var(--admin-bg)', color: paymentMethod === 'GCASH' ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}>GCASH</button>
              <button 
                onClick={() => totalAmount < 1000 && setPaymentMethod('CASH')} 
                disabled={totalAmount >= 1000}
                style={{ 
                  flex: 1, padding: '1rem', 
                  background: paymentMethod === 'CASH' ? 'var(--admin-brand)' : 'var(--admin-bg)', 
                  color: paymentMethod === 'CASH' ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '900',
                  opacity: totalAmount >= 1000 ? 0.3 : 1,
                  cursor: totalAmount >= 1000 ? 'not-allowed' : 'pointer'
                }}
              >CASH</button>
            </div>

            {totalAmount >= 1000 && (
              <p style={{ fontSize: '0.65rem', color: 'var(--admin-text-secondary)', textAlign: 'center', marginBottom: '1.5rem', fontWeight: '800', opacity: 0.8 }}>
                <Info size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> 
                HIGH-VALUE BOOKINGS (₱1,000+) REQUIRE GCASH DOWNPAYMENT
              </p>
            )}

            {paymentMethod === 'GCASH' && (
              <div style={{ background: 'var(--admin-bg)', padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', marginBottom: '2rem', border: '1px solid var(--admin-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                   <button onClick={() => setPaymentOption('DOWNPAYMENT')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem', borderRadius: '2rem', border: '1px solid var(--admin-brand)', background: paymentOption === 'DOWNPAYMENT' ? 'var(--admin-brand)' : 'transparent', color: paymentOption === 'DOWNPAYMENT' ? '#FFFFFF' : 'var(--admin-brand)', fontWeight: '900', cursor: 'pointer' }}>DOWNPAYMENT (30%)</button>
                   <button onClick={() => setPaymentOption('FULL')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem', borderRadius: '2rem', border: '1px solid var(--admin-brand)', background: paymentOption === 'FULL' ? 'var(--admin-brand)' : 'transparent', color: paymentOption === 'FULL' ? '#FFFFFF' : 'var(--admin-brand)', fontWeight: '900', cursor: 'pointer' }}>FULL PAYMENT</button>
                </div>

                <p style={{ opacity: 0.5, fontSize: '0.75rem', color: 'var(--admin-text-primary)' }}>Send {paymentOption === 'DOWNPAYMENT' ? 'Downpayment (30%)' : 'Full Payment'} To:</p>
                <h4 style={{ fontSize: '2rem', color: 'var(--admin-brand)', fontWeight: '900' }}>₱{paymentOption === 'DOWNPAYMENT' ? (totalAmount * 0.3).toFixed(0) : totalAmount}</h4>
                <img src={businessSettings?.gcash_qr_url} style={{ width: '150px', margin: '1rem auto', borderRadius: '1rem', border: '2px solid var(--admin-border)' }} alt="QR" />
                <p style={{ fontWeight: '900', color: 'var(--admin-text-primary)' }}>{businessSettings?.gcash_number}</p>
                <p style={{ opacity: 0.6, color: 'var(--admin-text-secondary)' }}>{businessSettings?.gcash_name}</p>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--admin-card)', padding: '1.25rem', borderRadius: '1rem', cursor: 'pointer', border: '1px dashed var(--admin-brand)', marginTop: '2rem' }}>
                  <Upload size={20} color="var(--admin-brand)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: '700' }}>{receipt ? receipt.name : 'UPLOAD GCASH RECEIPT'}</span>
                  <input type="file" hidden accept="image/*" onChange={handleReceiptUpload} />
                </label>
                {isOCRProcessing && <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-primary)', marginTop: '0.5rem', fontWeight: '800' }}>AI SCANNING... {ocrProgress}%</p>}
                {ocrError && <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.5rem', fontWeight: '800' }}>{ocrError}</p>}
              </div>
            )}

            <label style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', cursor: 'pointer', alignItems: 'center' }}>
              <input type="checkbox" checked={agreedToPolicy} onChange={e => setAgreedToPolicy(e.target.checked)} />
              <span style={{ fontSize: '0.8rem', opacity: 0.7, color: 'var(--admin-text-primary)', fontWeight: '600' }}>I agree to the cancellation and shop policies.</span>
            </label>

            <button onClick={processBooking} disabled={submitting || (paymentMethod === 'GCASH' && !ocrVerified) || !agreedToPolicy} style={{ width: '100%', background: (paymentMethod === 'GCASH' && !ocrVerified || !agreedToPolicy) ? 'var(--admin-bg)' : 'var(--admin-brand)', color: (paymentMethod === 'GCASH' && !ocrVerified || !agreedToPolicy) ? 'var(--admin-text-secondary)' : '#FFFFFF', padding: '1.5rem', borderRadius: '1.25rem', fontWeight: '900', border: 'none', cursor: (paymentMethod === 'GCASH' && !ocrVerified || !agreedToPolicy) ? 'not-allowed' : 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
              {submitting ? 'PROCESSING...' : 'SECURE BOOKING NOW'}
            </button>
          </div>
        </div>
      )}
      <style>{`
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
        input, select, button {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default BookAppointment;
