import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Check, AlertCircle, Banknote, Sparkles, X, ChevronRight, 
  Calendar, Clock, Car, MousePointer2, ShieldCheck, 
  Upload, Loader2, ChevronLeft, CreditCard, Info, MessageSquare, Phone, Plus, Trash2, ListChecks, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/PageHeader';
import { sendBookingConfirmation } from '../../services/EmailService';

const BookAppointment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [services, setServices] = useState([]);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  // MULTI-VEHICLE STATE
  const [currentView, setCurrentView] = useState('FLEET_OVERVIEW'); // FLEET_OVERVIEW, BUILDER, CHECKOUT
  const [vehicles, setVehicles] = useState([]); // List of built vehicles
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [builderStep, setBuilderStep] = useState(0); // 0: Machine, 1: Services & Details

  // CHECKOUT STATE
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCASH');
  const [paymentOption, setPaymentOption] = useState('FULL'); 
  const [contactNumber, setContactNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  
  // OCR
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);
  const [ocrVerified, setOcrVerified] = useState(false);
  const [ocrText, setOcrText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: srv } = await supabase.from('services').select('*, pricing:service_pricing(*)');
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
      const settings = businessSettings || { opening_hour: '08:00:00', closing_hour: '18:00:00', max_bookings_per_slot: 3 };
      
      const openingHour  = parseInt(settings.opening_hour?.split(':')[0] ?? '8');
      const openingMin   = parseInt(settings.opening_hour?.split(':')[1] ?? '0');
      const closingHour  = parseInt(settings.closing_hour?.split(':')[0] ?? '18');
      const closingMin   = parseInt(settings.closing_hour?.split(':')[1] ?? '0');
      
      const slotDuration = 60;
      const generatedSlots = [];
      const cursor = new Date(`${date}T00:00:00`);
      cursor.setHours(openingHour, openingMin, 0, 0);
      const closingCursor = new Date(`${date}T00:00:00`);
      closingCursor.setHours(closingHour, closingMin, 0, 0);

      while (cursor < closingCursor) {
        generatedSlots.push(new Date(cursor));
        cursor.setTime(cursor.getTime() + slotDuration * 60000);
      }

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

      const maxCapacity = settings.max_bookings_per_slot || 3;
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

  // -- HELPERS --
  const getServicePrice = (s, vType) => s.pricing?.find(p => p.vehicle_type === vType)?.price || 0;
  
  const calculateVehicleTotal = (v) => {
    return v.serviceIds.reduce((sum, sId) => {
      const svc = services.find(s => s.id === sId);
      return sum + parseFloat(getServicePrice(svc, v.type));
    }, 0);
  };

  const calculateGrandTotal = () => vehicles.reduce((sum, v) => sum + calculateVehicleTotal(v), 0);

  const availableServicesForEdit = services.filter(s => s.pricing?.some(p => p.vehicle_type === editingVehicle?.type));
  
  const groupedServicesForEdit = availableServicesForEdit.reduce((acc, curr) => {
    let cat = curr.is_addon ? 'Add-ons & Extras' : (curr.name.toLowerCase().includes('package') ? 'Special Packages' : (curr.booking_type === 'MULTI_DAY' ? 'Elite Protection' : 'Standard Services'));
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  // -- ACTIONS --
  const startNewVehicle = () => {
    if (vehicles.length >= 7) return toast.error('Maximum fleet size (7 vehicles) reached.');
    setEditingVehicle({ id: Date.now(), type: '', brand: '', model: '', plateNumber: '', serviceIds: [] });
    setBuilderStep(0);
    setCurrentView('BUILDER');
  };

  const editVehicle = (v) => {
    setEditingVehicle(structuredClone(v));
    setBuilderStep(1);
    setCurrentView('BUILDER');
  };

  const duplicateVehicle = (v) => {
    if (vehicles.length >= 7) return toast.error('Maximum fleet size (7 vehicles) reached.');
    const clone = structuredClone(v);
    clone.id = Date.now();
    clone.plateNumber = '';
    clone.isDuplicateDraft = true;
    
    setEditingVehicle(clone);
    setBuilderStep(1);
    setCurrentView('BUILDER');
    toast('Adjust details for the duplicated vehicle.');
  };

  const saveVehicle = () => {
    if (editingVehicle.serviceIds.length === 0) return toast.error('Select at least one service.');
    if (!editingVehicle.plateNumber || !editingVehicle.brand || !editingVehicle.model) return toast.error('Please complete vehicle info.');
    
    // Clean up metadata
    const finalVehicle = { ...editingVehicle };
    delete finalVehicle.isDuplicateDraft;

    // Check if it's an update or insert
    const exists = vehicles.find(v => v.id === finalVehicle.id);
    if (exists) {
      setVehicles(vehicles.map(v => v.id === finalVehicle.id ? finalVehicle : v));
    } else {
      setVehicles([...vehicles, finalVehicle]);
    }
    setEditingVehicle(null);
    setCurrentView('FLEET_OVERVIEW');
    toast.success(`${finalVehicle.brand} ${finalVehicle.model} added to fleet!`);
  };

  const removeVehicle = (id) => {
    setVehicles(vehicles.filter(v => v.id !== id));
  };

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
      setOcrText(text); 
      
      const gcashName = (businessSettings?.gcash_name || '').toLowerCase().trim();
      const gcashNumber = (businessSettings?.gcash_number || '').replace(/\s/g, '');
      const nameKeyword = gcashName.split(' ')[0];
      const nameMatch = nameKeyword ? cleanText.includes(nameKeyword) : true;
      const numberMatch = gcashNumber ? cleanText.includes(gcashNumber) : true;

      if (!nameMatch || !numberMatch) {
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
      const grandTotal = calculateGrandTotal();
      if (grandTotal >= 1000 && paymentMethod === 'CASH') {
        throw new Error('CASH payment is not allowed for bookings above ₱1,000. Please use GCash.');
      }

      let [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
      const scheduledStart = new Date(`${date}T${formattedTime}:00`);

      const payloadVehicles = vehicles.map(v => ({
        type: v.type,
        make: v.brand,
        model: v.model,
        plate: v.plateNumber,
        services: v.serviceIds
      }));

      // V3 RPC (Ensure the RPC name create_booking_v3 still refers to the right logic, but internal tables are renamed)
      const { error, data: bookingId } = await supabase.rpc('create_booking_v3', {
        p_customer_id: user.id.replace(/"/g, ''),
        p_start_datetime: scheduledStart.toISOString(),
        p_vehicles: payloadVehicles.map(v => ({
          ...v,
          services: v.services.map(s => s.replace(/"/g, ''))
        })),
        p_customer_phone: contactNumber || null,
        p_customer_notes: notes || null
      });

      if (error) {
        console.error('RPC Error:', error);
        throw new Error(error.message || 'Database rejected the booking');
      }

      // GCash Logic
      if (paymentMethod === 'GCASH' && receipt) {
        const fileExt = receipt.name.split('.').pop();
        const fileName = `${user.id}/${bookingId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receipt);

        if (uploadError) {
          toast.error('Booking saved, but receipt upload failed.');
        } else {
          const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
          const amount = paymentOption === 'DOWNPAYMENT' ? (grandTotal * 0.3) : grandTotal;
          
          await supabase.from('payments').insert({
            booking_id: bookingId,
            amount: amount,
            method: 'GCASH',
            status: 'FOR_VERIFICATION',
            receipt_url: publicUrl,
            ocr_text: ocrText || '',
            receipt_attempt: 1
          });
        }
      }
      
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Booking Confirmed',
        message: `Your fleet booking for ${new Date(scheduledStart).toLocaleDateString()} has been scheduled.`,
        type: 'success',
        action_url: `/my-bookings/${bookingId}`
      });

      toast.success('Booking Successful!', { style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' } });
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.message || 'Booking failed.', { style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      
      {/* HEADER & STEPS */}
      <div style={{ position: 'sticky', top: 0, zIndex: 500, background: 'rgba(var(--admin-bg-rgb), 0.9)', backdropFilter: 'blur(20px)', margin: isMobile ? '0 -1rem 1rem -1rem' : '0 0 2rem 0', padding: isMobile ? '1rem' : '0 0 1.5rem 0', borderBottom: '1px solid var(--admin-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <PageHeader badge="MULTI-VEHICLE BOOKING" title="FLEET SCHEDULER" subtitle="Build your fleet and schedule your premium services." />
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: isMobile ? '0.35rem' : '1rem', marginTop: isMobile ? '1rem' : '1.5rem' }}>
          {[
            { id: 'FLEET_OVERVIEW', label: 'FLEET' },
            { id: 'BUILDER', label: 'BUILDER' },
            { id: 'CHECKOUT', label: 'CHECKOUT' }
          ].map((s, i) => {
            const isActive = currentView === s.id;
            const isPast = (currentView === 'CHECKOUT' && s.id !== 'CHECKOUT') || (currentView === 'BUILDER' && s.id === 'FLEET_OVERVIEW');
            return (
              <React.Fragment key={s.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: (isActive || isPast) ? 1 : 0.4 }}>
                  <div style={{ width: isMobile ? '28px' : '44px', height: isMobile ? '28px' : '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive || isPast ? 'var(--admin-brand)' : 'var(--admin-card)', color: isActive || isPast ? '#fff' : 'var(--admin-text-secondary)', border: `2px solid ${isActive || isPast ? 'var(--admin-brand)' : 'var(--admin-border)'}`, fontWeight: '900', fontSize: isMobile ? '0.7rem' : '1rem' }}>
                    {isPast ? <Check size={isMobile ? 14 : 20} strokeWidth={3} /> : (i + 1)}
                  </div>
                  <span style={{ fontSize: isMobile ? '0.55rem' : '0.7rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>{s.label}</span>
                </div>
                {i < 2 && <div style={{ width: isMobile ? '20px' : '60px', height: '2px', background: isPast ? 'var(--admin-brand)' : 'var(--admin-border)' }} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: FLEET OVERVIEW */}
      {currentView === 'FLEET_OVERVIEW' && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '950', margin: 0, color: 'var(--admin-text-primary)' }}>Your Fleet</h2>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', background: 'rgba(153, 27, 27, 0.1)', color: 'var(--admin-brand)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>{vehicles.length}/7 Vehicles</span>
          </div>

          {vehicles.length === 0 ? (
            <div style={{ background: 'var(--admin-card)', border: '1px dashed var(--admin-brand)', borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <Car size={64} color="var(--admin-brand)" opacity={0.5} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)', margin: '0 0 0.5rem 0' }}>No vehicles added yet.</h3>
                <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', margin: 0 }}>Start by adding a vehicle to your booking fleet.</p>
              </div>
              <button onClick={startNewVehicle} style={{ background: 'var(--admin-brand)', color: '#fff', padding: '1rem 2rem', borderRadius: '1rem', fontWeight: '900', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} /> ADD FIRST VEHICLE
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {vehicles.map((v, idx) => (
                <div 
                  key={v.id} 
                  onClick={() => editVehicle(v)}
                  style={{ 
                    background: 'var(--admin-card)', 
                    border: '1px solid var(--admin-border)', 
                    borderRadius: '1.25rem', 
                    padding: '1.5rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    boxShadow: 'var(--admin-card-shadow)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--admin-brand)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--admin-border)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(153, 27, 27, 0.1)', padding: '1rem', borderRadius: '1rem', color: 'var(--admin-brand)' }}><Car size={24} /></div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '950', margin: 0, color: 'var(--admin-text-primary)' }}>{v.brand} {v.model}</h4>
                        {v.isDuplicateDraft && <span style={{ fontSize: '0.65rem', fontWeight: '900', background: 'var(--admin-brand)', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '0.4rem' }}>COPY</span>}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', margin: 0 }}>{v.plateNumber || 'Pending Details'} · {v.type} · {v.serviceIds.length} Services</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{calculateVehicleTotal(v)}</span>
                    <button onClick={() => duplicateVehicle(v)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer' }} title="Duplicate"><Copy size={18} /></button>
                    <button onClick={() => removeVehicle(v.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer' }} title="Remove"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={startNewVehicle} disabled={vehicles.length >= 7} style={{ flex: 1, background: 'var(--admin-bg)', color: 'var(--admin-text-primary)', border: '1px dashed var(--admin-border)', padding: '1.25rem', borderRadius: '1rem', fontWeight: '900', cursor: vehicles.length >= 7 ? 'not-allowed' : 'pointer', opacity: vehicles.length >= 7 ? 0.5 : 1 }}>+ ADD ANOTHER VEHICLE</button>
                <button onClick={() => setCurrentView('CHECKOUT')} style={{ flex: 2, background: 'var(--admin-brand)', color: '#fff', border: 'none', padding: '1.25rem', borderRadius: '1rem', fontWeight: '900', cursor: 'pointer' }}>PROCEED TO CHECKOUT →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: VEHICLE BUILDER */}
      {currentView === 'BUILDER' && editingVehicle && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button onClick={() => { 
              if (builderStep === 1) {
                const isEdit = vehicles.some(v => v.id === editingVehicle.id);
                if (isEdit || editingVehicle.isDuplicateDraft) {
                  setEditingVehicle(null);
                  setCurrentView('FLEET_OVERVIEW');
                } else {
                  setBuilderStep(0);
                }
              } else {
                setEditingVehicle(null);
                setCurrentView('FLEET_OVERVIEW');
              }
            }} className="bare-back-btn" style={{ cursor: 'pointer', color: 'var(--admin-text-primary)', padding: '0.5rem' }}><ChevronLeft size={24} /></button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '950', margin: 0, color: 'var(--admin-text-primary)' }}>{builderStep === 0 ? 'Select Machine Type' : 'Services & Specs'}</h2>
          </div>

          {builderStep === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)', gap: '1.5rem' }}>
              {[
                { id: 'SEDAN', label: 'Sedan', icon: <Car size={48} /> },
                { id: 'SUV', label: 'SUV', icon: <Car size={48} /> },
                { id: 'VAN_L300', label: 'Van / L300', icon: <Car size={48} /> },
                { id: 'MOTORCYCLE', label: 'Motorcycle', icon: <MousePointer2 size={48} /> },
                { id: 'BIG_BIKE', label: 'Big Bike', icon: <MousePointer2 size={48} /> }
              ].map(v => (
                <div key={v.id} onClick={() => { setEditingVehicle({...editingVehicle, type: v.id}); setBuilderStep(1); }} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '1.25rem', padding: '2.5rem', cursor: 'pointer', textAlign: 'center', boxShadow: 'var(--admin-card-shadow)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ color: 'var(--admin-brand)', marginBottom: '1.5rem' }}>{v.icon}</div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--admin-text-primary)' }}>{v.label}</h3>
                </div>
              ))}
            </div>
          ) : (
            <div className="booking-grid">
              {/* LEFT: Services */}
              <div>
                {Object.entries(groupedServicesForEdit).map(([cat, list]) => (
                  <div key={cat} style={{ marginBottom: '3rem' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>{cat}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {list.map(s => {
                        const isSelected = editingVehicle.serviceIds.includes(s.id);
                        return (
                          <div key={s.id} onClick={() => {
                            const newIds = isSelected ? editingVehicle.serviceIds.filter(id => id !== s.id) : [...editingVehicle.serviceIds, s.id];
                            setEditingVehicle({...editingVehicle, serviceIds: newIds});
                          }} style={{ background: isSelected ? 'rgba(153, 27, 27, 0.08)' : 'var(--admin-card)', border: isSelected ? '2px solid var(--admin-brand)' : '1px solid var(--admin-border)', borderRadius: '1.25rem', padding: '1.5rem', cursor: 'pointer' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '950', color: isSelected ? 'var(--admin-brand)' : 'var(--admin-text-primary)' }}>{s.name}</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', marginBottom: '1.5rem', fontWeight: '600' }}>{s.description || 'Standard exterior wash and dry'}</p>
                            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{getServicePrice(s, editingVehicle.type)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* RIGHT: Specs & Save */}
              <div className="booking-summary-card">
                <div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Vehicle Specs</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input placeholder="Brand (e.g. Toyota)" value={editingVehicle.brand} onChange={e => setEditingVehicle({...editingVehicle, brand: e.target.value})} style={{ flex: 1, background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700' }} />
                      <input placeholder="Model (e.g. Vios)" value={editingVehicle.model} onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})} style={{ flex: 1, background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700' }} />
                    </div>
                    <input placeholder="Plate Number" value={editingVehicle.plateNumber} onChange={e => setEditingVehicle({...editingVehicle, plateNumber: e.target.value})} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700' }} />
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--admin-border)' }} />

                <div>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Summary</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>VEHICLE TOTAL</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{calculateVehicleTotal(editingVehicle)}</span>
                  </div>
                </div>

                <button onClick={saveVehicle} style={{ width: '100%', background: 'var(--admin-brand)', color: '#FFFFFF', padding: '1.25rem', borderRadius: '1rem', fontWeight: '900', cursor: 'pointer', border: 'none' }}>SAVE VEHICLE</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CHECKOUT */}
      {currentView === 'CHECKOUT' && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button onClick={() => setCurrentView('FLEET_OVERVIEW')} className="bare-back-btn" style={{ cursor: 'pointer', color: 'var(--admin-text-primary)', padding: '0.5rem' }}><ChevronLeft size={24} /></button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '950', margin: 0, color: 'var(--admin-text-primary)' }}>Checkout & Finalize</h2>
          </div>

          <div className="review-grid">
            {/* LEFT: Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: 'var(--admin-card)', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-card-shadow)', padding: '2rem' }}>
                 <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', display: 'block' }}>WHEN WILL YOU COME?</label>
                 <input type="date" min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]} value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700', colorScheme: 'dark' }} />
                 {date && (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
                     {availableSlots.map(t => <button key={t} onClick={() => setTime(t)} style={{ padding: '0.75rem', background: time === t ? 'var(--admin-brand)' : 'var(--admin-bg)', color: time === t ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.5rem', fontWeight: '900', cursor: 'pointer' }}>{t}</button>)}
                   </div>
                 )}
              </div>

              <div style={{ background: 'var(--admin-card)', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-card-shadow)', padding: '2rem' }}>
                 <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.75rem', display: 'block' }}>CONTACT DETAILS</label>
                 <input placeholder="Phone Number" value={contactNumber} onChange={e => setContactNumber(e.target.value)} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '700', marginBottom: '0.75rem' }} />
                 <textarea placeholder="Any additional notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', height: '90px', resize: 'none', fontWeight: '700' }} />
              </div>
            </div>

            {/* RIGHT: Payment */}
            <div style={{ background: 'var(--admin-card)', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', boxShadow: 'var(--admin-card-shadow)', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--admin-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Payment & Confirmation</span>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--admin-bg)', padding: '1rem', borderRadius: '1rem' }}>
                  <span style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--admin-text-secondary)' }}>GRAND TOTAL</span>
                  <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>₱{calculateGrandTotal()}</span>
                </div>

                {/* Method Toggle */}
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setPaymentMethod('GCASH')} style={{ flex: 1, padding: '1rem', background: paymentMethod === 'GCASH' ? 'var(--admin-brand)' : 'var(--admin-bg)', color: paymentMethod === 'GCASH' ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer' }}>GCASH</button>
                    <button onClick={() => calculateGrandTotal() < 1000 && setPaymentMethod('CASH')} disabled={calculateGrandTotal() >= 1000} style={{ flex: 1, padding: '1rem', background: paymentMethod === 'CASH' ? 'var(--admin-brand)' : 'var(--admin-bg)', color: paymentMethod === 'CASH' ? '#FFFFFF' : 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '900', opacity: calculateGrandTotal() >= 1000 ? 0.35 : 1, cursor: calculateGrandTotal() >= 1000 ? 'not-allowed' : 'pointer' }}>CASH</button>
                  </div>
                </div>

                {/* GCash Section */}
                {paymentMethod === 'GCASH' && (
                  <div style={{ background: 'var(--admin-bg)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setPaymentOption('DOWNPAYMENT')} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '2rem', border: '1px solid var(--admin-brand)', background: paymentOption === 'DOWNPAYMENT' ? 'var(--admin-brand)' : 'transparent', color: paymentOption === 'DOWNPAYMENT' ? '#FFFFFF' : 'var(--admin-brand)', fontWeight: '900', cursor: 'pointer' }}>DOWNPAYMENT (30%)</button>
                      <button onClick={() => setPaymentOption('FULL')} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '2rem', border: '1px solid var(--admin-brand)', background: paymentOption === 'FULL' ? 'var(--admin-brand)' : 'transparent', color: paymentOption === 'FULL' ? '#FFFFFF' : 'var(--admin-brand)', fontWeight: '900', cursor: 'pointer' }}>FULL PAYMENT</button>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--admin-text-primary)', fontWeight: '700' }}>Send {paymentOption === 'DOWNPAYMENT' ? 'Downpayment (30%)' : 'Full Payment'} To:</p>
                      <p style={{ fontSize: '2.75rem', fontWeight: '950', color: 'var(--admin-brand)', margin: '0 0 1rem 0' }}>₱{paymentOption === 'DOWNPAYMENT' ? (calculateGrandTotal() * 0.3).toFixed(0) : calculateGrandTotal()}</p>
                    </div>
                    
                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '2.5rem', border: '10px solid #007dfe', width: '100%', maxWidth: '300px', height: 'auto', display: 'flex', justifyContent: 'center' }}>
                      <img src={businessSettings?.gcash_qr_url} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} alt="GCash QR" />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--admin-card)', padding: '1rem 1.25rem', borderRadius: '1rem', cursor: 'pointer', border: '1px dashed var(--admin-brand)', width: '100%' }}>
                      <Upload size={18} color="var(--admin-brand)" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: '700' }}>{receipt ? receipt.name : 'UPLOAD GCASH RECEIPT'}</span>
                      <input type="file" hidden accept="image/*" onChange={handleReceiptUpload} />
                    </label>
                    {isOCRProcessing && <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-primary)', fontWeight: '800' }}>DIGITAL VERIFICATION... {ocrProgress}%</p>}
                    {ocrError && <p style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '800' }}>{ocrError}</p>}
                    {ocrVerified && <p style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '800' }}>✓ Receipt Verified</p>}
                  </div>
                )}

                <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={agreedToPolicy} onChange={e => setAgreedToPolicy(e.target.checked)} style={{ marginTop: '3px' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: '600' }}>I agree to the cancellation and shop policies.</span>
                </label>

                <button onClick={processBooking} disabled={submitting || (paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy || !date || !time} style={{ width: '100%', background: ((paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy || !date || !time) ? 'var(--admin-input-bg)' : 'var(--admin-brand)', color: ((paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy || !date || !time) ? 'var(--admin-text-secondary)' : '#FFFFFF', padding: '1.25rem', borderRadius: '1rem', fontWeight: '900', cursor: ((paymentMethod === 'GCASH' && !receipt) || !agreedToPolicy || !date || !time) ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'PROCESSING...' : 'SECURE FLEET BOOKING NOW'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .booking-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2.5rem; align-items: start; }
        .booking-summary-card { background: var(--admin-card); padding: 2rem; border-radius: 1.5rem; border: 1px solid var(--admin-border); position: sticky; top: 2rem; box-shadow: var(--admin-card-shadow); display: flex; flex-direction: column; gap: 1.5rem; }
        .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start; }
        @media (max-width: 1024px) {
          .review-grid, .booking-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .booking-summary-card { position: static !important; padding: 1.25rem !important; top: auto !important; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        input, select, button, textarea { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; }
        .bare-back-btn { background: transparent !important; border: none !important; box-shadow: none !important; }
        .bare-back-btn:hover { opacity: 1 !important; transform: translateX(-4px); }
      `}</style>
    </div>
  );
};

export default BookAppointment;
