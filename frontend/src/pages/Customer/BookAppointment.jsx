import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, Edit2, AlertCircle, Banknote, Save, Sparkles, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
// Email confirmation removed from client — should be triggered server-side (Edge Function / DB trigger)

const BookAppointment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiStep, setAiStep] = useState(1);
  const [aiAnswers, setAiAnswers] = useState({});
  const [aiThinking, setAiThinking] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  
  const [step, setStep] = useState(1); // 1 = Setup, 2 = Review, 3 = Payment
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Data
  const [services, setServices] = useState([]);
  
  // Form State
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentOption, setPaymentOption] = useState('FULL'); // FULL, DOWNPAYMENT
  
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase.from('services').select('*').eq('is_active', true);
      if (!error && data) setServices(data);
      setLoading(false);
    };
    fetchServices();
  }, []);

  // Computed
  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
  const totalAmount = selectedServices.reduce((sum, s) => sum + parseFloat(s.price), 0);
  
  const groupedServices = services.reduce((acc, curr) => {
    const cat = curr.category || 'Other Services';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  const toggleService = (id) => {
    if (selectedServiceIds.includes(id)) {
      setSelectedServiceIds(selectedServiceIds.filter(sId => sId !== id));
    } else {
      setSelectedServiceIds([...selectedServiceIds, id]);
    }
  };

  const handleAIAnswer = (key, value) => {
    const newAnswers = { ...aiAnswers, [key]: value };
    setAiAnswers(newAnswers);
    if (aiStep < 2) {
      setAiStep(prev => prev + 1);
    } else {
      runAIAnalysis(newAnswers);
    }
  };

  const runAIAnalysis = (answers) => {
    setAiThinking(true);
    setTimeout(() => {
      let recommendations = [];
      
      // Logic based on answers
      if (answers.paint === 'Swirl marks / Scratches') {
        const coating = services.find(s => s.name.toLowerCase().includes('ceramic') || s.name.toLowerCase().includes('protection'));
        if (coating) recommendations.push(coating);
      }
      
      if (answers.usage === 'Daily Commuter' || answers.usage === 'Off-road / Work Truck') {
        const wash = services.find(s => s.name.toLowerCase().includes('wash') || s.name.toLowerCase().includes('exterior'));
        const engine = services.find(s => s.name.toLowerCase().includes('engine'));
        if (wash) recommendations.push(wash);
        if (engine) recommendations.push(engine);
      } else {
        const wash = services.find(s => s.name.toLowerCase().includes('wash'));
        const interior = services.find(s => s.name.toLowerCase().includes('interior'));
        if (wash) recommendations.push(wash);
        if (interior) recommendations.push(interior);
      }

      setAiRecommendation([...new Set(recommendations)].slice(0, 3));
      setAiThinking(false);
    }, 1800);
  };

  const applyAIRecommendation = () => {
    if (aiRecommendation) {
      setSelectedServiceIds([...new Set([...selectedServiceIds, ...aiRecommendation.map(s => s.id)])]);
    }
    setShowAiAssistant(false);
  };

  const handleContinueToReview = () => {
    if (selectedServiceIds.length === 0) {
      toast.error('Please select at least one service.');
      return;
    }
    if (!date || !time) {
      toast.error('Please select a date and available slot.');
      return;
    }
    if (!vehicle.type || !vehicle.plateNumber || !vehicle.brand || !vehicle.contactNumber) {
      toast.error('Please complete all required vehicle and contact information.');
      return;
    }
    
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPayment = () => {
    // Auto-select GCash if >= 1000
    if (totalAmount >= 1000) {
      setPaymentMethod('GCASH');
      setPaymentOption('DOWNPAYMENT');
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitBooking = async () => {
    if (!agreedToPolicy) {
      toast.error('You must agree to the cancellation policy.');
      return;
    }
    
    // OCR ENFORCEMENT
    if (paymentMethod === 'GCASH') {
      if (!receipt) {
        toast.error('Please upload your GCash payment receipt first.');
        return;
      }
      if (ocrError) {
        toast.error('Invalid receipt detected. Please upload a valid payment receipt to Athea Jayne Ahorro.');
        return;
      }
      if (isOCRProcessing) {
        toast.error('Please wait for AI verification to complete.');
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const processBooking = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const scheduledStart = new Date(`${date}T${time}:00`);
      const { data, error } = await supabase.rpc('create_booking', {
        p_customer_id: user.id,
        p_service_ids: selectedServiceIds,
        p_scheduled_start: scheduledStart.toISOString(),
        p_payment_method: paymentMethod,
        p_vehicle_type: vehicle.type,
        p_plate_number: vehicle.plateNumber,
        p_vehicle_brand: vehicle.brand,
        p_vehicle_model: vehicle.model,
        p_customer_notes: vehicle.notes || ''
      });

      if (error) throw error;

      toast.success('Booking submitted successfully!', { duration: 4000 });
      
      // Send Confirmation Email via Edge Function
      supabase.functions.invoke('send-email', {
        body: {
          type: 'booking_confirmed',
          to: user.email,
          data: {
            serviceName: selectedServices.map(s => s.name).join(', '),
            date: new Date(date).toLocaleDateString(),
            time: time,
            totalPrice: totalAmount
          }
        }
      }).catch(err => console.error('Email trigger failed:', err));
      
      navigate('/my-bookings');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // UI Components
  const WizardHeader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>Book an Appointment</h1>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1rem 3rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', width: '100%', justifyContent: 'center' }}>
        {[ { num: 1, label: 'Setup' }, { num: 2, label: 'Review' }, { num: 3, label: 'Payment' } ].map((s, i) => (
          <React.Fragment key={s.num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: step === s.num ? 1 : 0.5 }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= s.num ? 'var(--primary-color)' : 'transparent', border: step >= s.num ? 'none' : '1px solid var(--text-secondary)', color: step >= s.num ? '#000' : 'var(--text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '0.9rem' }}>
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: step === s.num ? '600' : '400' }}>{s.label}</span>
            </div>
            {i < 2 && <div style={{ width: '80px', height: '1px', background: 'var(--border-color)', margin: '0 1rem', transform: 'translateY(-10px)' }}></div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <WizardHeader />

      {/* AI Service Assistant Modal */}
      {showAiAssistant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(12px)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '2rem', border: '1px solid rgba(56, 189, 248, 0.4)', maxWidth: '500px', width: '90%', position: 'relative', boxShadow: '0 0 80px rgba(56, 189, 248, 0.15)' }}>
            <button onClick={() => setShowAiAssistant(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><X size={20} /></button>
            
            {aiThinking ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 2rem auto' }}>
                   <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(56, 189, 248, 0.1)', borderRadius: '50%' }}></div>
                   <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                   <Sparkles size={32} color="var(--primary-color)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>Analyzing Vehicle Needs...</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Our Detailing Expert AI is processing your answers.</p>
              </div>
            ) : aiRecommendation ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
                  <Sparkles size={40} color="var(--primary-color)" />
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>AI Recommended Package</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>Based on your answers, we suggest the following for maximum protection and shine:</p>
                
                <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--primary-color)', marginBottom: '2rem', textAlign: 'left' }}>
                   {aiRecommendation.length > 0 ? aiRecommendation.map(rec => (
                     <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '700', color: '#fff' }}>{rec.name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rec.category}</p>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>₱{rec.price}</span>
                     </div>
                   )) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No specific matches found. Try a Premium Wash!</p>}
                </div>

                <button 
                  onClick={() => {
                    setSelectedServiceIds([...new Set([...selectedServiceIds, ...aiRecommendation.map(r => r.id)])]);
                    setShowAiAssistant(false);
                    toast.success('AI recommendations added to your booking!');
                  }}
                  style={{ width: '100%', padding: '1.25rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '1rem', fontWeight: '800', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 10px 20px rgba(56, 189, 248, 0.2)' }}
                >
                  Apply Recommendations
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                   <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.5rem', borderRadius: '0.75rem' }}>
                    <Sparkles size={24} color="var(--primary-color)" />
                   </div>
                   <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>AI Consultant</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Step {aiStep} of 2</p>
                   </div>
                </div>

                {aiStep === 1 && (
                  <div>
                    <p style={{ marginBottom: '1.5rem', fontWeight: '700', fontSize: '1.1rem' }}>What is the primary condition of your car's paint?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {[
                        { label: 'Swirl marks / Scratches', val: 'Swirl marks / Scratches', desc: 'Circular marks visible in sunlight' },
                        { label: 'Faded / Dull', val: 'Faded / Dull', desc: 'Paint has lost its original depth' },
                        { label: 'New / Good Condition', val: 'New / Good Condition', desc: 'Mostly clean with minor wear' },
                        { label: 'Very Dirty', val: 'Very Dirty', desc: 'Heavy mud, tar, or iron deposits' }
                      ].map(opt => (
                        <button key={opt.val} onClick={() => handleAIAnswer('paint', opt.val)} style={{ padding: '1.25rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '1rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '700' }}>{opt.label}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {aiStep === 2 && (
                  <div>
                    <p style={{ marginBottom: '1.5rem', fontWeight: '700', fontSize: '1.1rem' }}>How often is the vehicle driven?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {[
                        { label: 'Daily Commuter', val: 'Daily Commuter', desc: 'Driven every day in city/highway' },
                        { label: 'Weekend Only', val: 'Weekend', desc: 'Occasional drives for pleasure' },
                        { label: 'Off-road / Work', val: 'Off-road / Work Truck', desc: 'Tough conditions, dirt, and dust' },
                        { label: 'Show Car', val: 'Show Car', desc: 'Kept in garage, absolute perfection' }
                      ].map(opt => (
                        <button key={opt.val} onClick={() => handleAIAnswer('usage', opt.val)} style={{ padding: '1.25rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '700' }}>{opt.label}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); } }
          `}</style>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Select Services</h2>
              <button 
                onClick={() => {
                  setShowAiAssistant(true);
                  setAiStep(1);
                  setAiRecommendation(null);
                }}
                style={{ 
                  background: 'linear-gradient(45deg, var(--primary-color), #0ea5e9)', 
                  color: '#000', 
                  border: 'none', 
                  padding: '0.6rem 1.25rem', 
                  borderRadius: '0.75rem', 
                  fontWeight: '800', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Sparkles size={18} /> AI Service Assistant
              </button>
            </div>
            
            {loading ? <p>Loading services...</p> : Object.entries(groupedServices).map(([category, catservices]) => (
              <div key={category} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ width: '4px', height: '20px', background: 'var(--primary-color)', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{category}</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {catservices.map(s => {
                    const isSelected = selectedServiceIds.includes(s.id);
                    return (
                      <div 
                        key={s.id}
                        onClick={() => toggleService(s.id)}
                        style={{ 
                          background: isSelected ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-secondary)', 
                          border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--border-color)', 
                          borderRadius: '0.75rem', 
                          padding: '1.25rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{s.name}</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{s.description}</p>
                        <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>₱{s.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Summary Form */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem', alignSelf: 'start', position: 'sticky', top: '2rem' }}>
             <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 1rem 0' }}>Booking Summary</h2>
             <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Services: {selectedServiceIds.length}</p>
             
             {selectedServices.length === 0 ? (
               <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1.5rem' }}>No services selected</p>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                 {selectedServices.map(s => (
                   <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                     <span>{s.name}</span>
                     <span>₱{s.price}</span>
                   </div>
                 ))}
               </div>
             )}

             <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0', marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: '600' }}>Total Amount</span>
                <span style={{ fontWeight: '700', color: 'var(--primary-color)', fontSize: '1.1rem' }}>₱{totalAmount}</span>
             </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Select Date *</label>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff', colorScheme: 'dark' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Available Slots *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => {
                      const isToday = date === new Date().toISOString().split('T')[0];
                      const [h] = t.split(':').map(Number);
                      const currentHour = new Date().getHours();
                      const isPast = isToday && h <= currentHour;

                      return (
                        <button 
                          key={t}
                          disabled={isPast}
                          onClick={() => setTime(t)}
                          style={{ 
                            padding: '0.5rem', 
                            background: time === t ? 'var(--primary-color)' : (isPast ? 'rgba(255,255,255,0.02)' : 'var(--bg-input)'), 
                            color: time === t ? '#000' : (isPast ? 'var(--text-secondary)' : '#fff'),
                            border: time === t ? 'none' : '1px solid var(--border-color)',
                            borderRadius: '0.25rem',
                            fontSize: '0.8rem',
                            fontWeight: time === t ? '600' : '400',
                            cursor: isPast ? 'not-allowed' : 'pointer',
                            opacity: isPast ? 0.3 : 1
                          }}
                        >
                          {parseInt(t.split(':')[0]) > 12 ? `${parseInt(t.split(':')[0])-12}:00 PM` : `${t} AM`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Payment Method *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div 
                      onClick={() => totalAmount < 1000 && setPaymentMethod('CASH')} 
                      style={{ 
                        flex: 1, 
                        padding: '1rem', 
                        background: paymentMethod === 'CASH' ? 'rgba(56, 189, 248, 0.05)' : (totalAmount >= 1000 ? 'rgba(255,255,255,0.01)' : 'var(--bg-input)'), 
                        border: paymentMethod === 'CASH' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)', 
                        borderRadius: '0.5rem', 
                        cursor: totalAmount >= 1000 ? 'not-allowed' : 'pointer',
                        opacity: totalAmount >= 1000 ? 0.3 : 1
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>Cash</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{totalAmount >= 1000 ? 'Unavailable for orders ≥ ₱1,000' : 'Pay at the shop on your appointment day.'}</p>
                    </div>
                    <div onClick={() => setPaymentMethod('GCASH')} style={{ flex: 1, padding: '1rem', background: paymentMethod === 'GCASH' ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-input)', border: paymentMethod === 'GCASH' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>GCash</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{totalAmount >= 1000 ? '50% Downpayment Required' : 'Pay in full or 50% downpayment.'}</p>
                    </div>
                  </div>
                </div>

               <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Vehicle Type *</label>
                 <select value={vehicle.type} onChange={e => setVehicle({...vehicle, type: e.target.value})} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff' }}>
                   <option value="">Select type</option>
                   <option value="Sedan">Sedan</option>
                   <option value="SUV">SUV</option>
                   <option value="Motorcycle">Motorcycle</option>
                 </select>
               </div>

               <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Plate Number *</label>
                 <input type="text" value={vehicle.plateNumber} onChange={e => setVehicle({...vehicle, plateNumber: e.target.value})} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff' }} />
               </div>

               <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Contact Number *</label>
                 <input type="tel" value={vehicle.contactNumber} onChange={e => setVehicle({...vehicle, contactNumber: e.target.value})} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff' }} />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div>
                   <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Vehicle Brand *</label>
                   <input type="text" placeholder="e.g. Toyota" value={vehicle.brand} onChange={e => setVehicle({...vehicle, brand: e.target.value})} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff' }} />
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Vehicle Model</label>
                   <input type="text" placeholder="e.g. Vios" value={vehicle.model} onChange={e => setVehicle({...vehicle, model: e.target.value})} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff' }} />
                 </div>
               </div>

               <div>
                 <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Notes</label>
                 <textarea placeholder="Special instructions..." value={vehicle.notes} onChange={e => setVehicle({...vehicle, notes: e.target.value})} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.5rem', color: '#fff', minHeight: '80px', resize: 'vertical' }} />
               </div>

               <button 
                 onClick={handleContinueToReview}
                 style={{ width: '100%', padding: '1rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' }}
               >
                 Continue to Review →
               </button>
             </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>Review Your Booking</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>Please review your selections before proceeding to payment.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Services Block */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Services</h3>
                  <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', padding: '0.25rem 1rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1rem 1.5rem', borderRadius: '0.5rem' }}>
                   {selectedServices.map(s => (
                     <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                       <span>{s.name}</span>
                       <span>₱{s.price}</span>
                     </div>
                   ))}
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontWeight: '700', fontSize: '1.1rem' }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--primary-color)' }}>₱{totalAmount}</span>
                   </div>
                </div>
              </div>

              {/* Schedule Block */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Schedule</h3>
                  <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', padding: '0.25rem 1rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '0.5rem', fontSize: '0.95rem' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
                   <span>{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                   <span style={{ color: 'var(--text-secondary)' }}>Time:</span>
                   <span>{time}</span>
                </div>
              </div>

              {/* Vehicle Block */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Vehicle Information</h3>
                  <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', padding: '0.25rem 1rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.75rem', background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '0.5rem', fontSize: '0.95rem' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                   <span>{vehicle.type}</span>
                   <span style={{ color: 'var(--text-secondary)' }}>Brand/Model:</span>
                   <span>{vehicle.brand} {vehicle.model}</span>
                   <span style={{ color: 'var(--text-secondary)' }}>Plate Number:</span>
                   <span>{vehicle.plateNumber}</span>
                   <span style={{ color: 'var(--text-secondary)' }}>Contact:</span>
                   <span>{vehicle.contactNumber}</span>
                </div>
              </div>

              {/* Payment Method Block */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Payment Method</h3>
                  <button onClick={() => setStep(1)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', padding: '0.25rem 1rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: '500' }}>
                   {paymentMethod === 'CASH' ? 'Cash (Pay at Shop)' : 'GCash (Upload Receipt)'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>
                ← Back
              </button>
              <button onClick={handleProceedToPayment} style={{ flex: 2, padding: '1rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer' }}>
                Proceed to Payment →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: '0 0 2rem 0' }}>Payment</h2>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Cancellation Policy</h3>
              <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Cancellations made less than 24 hours before the appointment may incur a fee. Please review our cancellation policy before proceeding.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={agreedToPolicy}
                  onChange={(e) => setAgreedToPolicy(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>I have read and agree to the cancellation policy</span>
              </label>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Payment Method</h3>
              
              {paymentMethod === 'CASH' ? (
                <div style={{ background: 'var(--bg-input)', padding: '3rem 2rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ background: 'rgba(52, 211, 153, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Banknote size={32} color="var(--accent-green)" />
                  </div>
                  <h4 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>Cash Payment</h4>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Pay ₱{totalAmount} at the shop when you arrive for your appointment.</p>
                </div>
              ) : (
                <div style={{ background: 'transparent', border: '1px solid var(--primary-color)', borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '0.35rem', borderRadius: '0.75rem', marginBottom: '0.5rem' }}>
                    <button 
                      onClick={() => setPaymentOption('FULL')} 
                      disabled={totalAmount >= 1000}
                      style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', background: paymentOption === 'FULL' ? 'var(--bg-secondary)' : 'transparent', border: paymentOption === 'FULL' ? '1px solid var(--border-color)' : 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '600', cursor: totalAmount >= 1000 ? 'not-allowed' : 'pointer', opacity: totalAmount >= 1000 ? 0.3 : 1 }}
                    >
                      Full Payment (₱{totalAmount})
                    </button>
                    <button 
                      onClick={() => setPaymentOption('DOWNPAYMENT')} 
                      style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', background: paymentOption === 'DOWNPAYMENT' ? 'var(--bg-secondary)' : 'transparent', border: paymentOption === 'DOWNPAYMENT' ? '1px solid var(--border-color)' : 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      50% Downpayment (₱{totalAmount / 2})
                    </button>
                  </div>
                  
                  {totalAmount >= 1000 && (
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '0.5rem', borderLeft: '4px solid var(--primary-color)', fontSize: '0.85rem' }}>
                       <strong>Note:</strong> Orders ₱1,000 and above require a mandatory 50% downpayment via GCash.
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                      Amount Due: ₱{paymentOption === 'FULL' ? totalAmount : totalAmount / 2}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {paymentOption === 'DOWNPAYMENT' ? '(50% Downpayment)' : '(Full Payment)'}
                    </span>
                  </div>

                  {/* Maximized Scan to Pay Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', background: 'var(--bg-input)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: '320px', height: '320px', background: '#fff', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', border: '4px solid #fff' }}>
                      <img src="/qr_code.png" alt="Scan to Pay" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>SCAN TO PAY (GoTyme)</p>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2.25rem', color: '#fff', fontWeight: '900', letterSpacing: '-0.5px' }}>ATHEA JAYNE AHORRO</h3>
                      <p style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary-color)', fontWeight: '900' }}>0738</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-input)', borderRadius: '0.5rem' }}>
                    <span style={{ fontWeight: '600' }}>Amount to Pay:</span>
                    <span style={{ fontWeight: '800', color: 'var(--accent-green)', fontSize: '1.25rem' }}>₱{totalAmount}</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Upload Payment Receipt *</label>
                    <div 
                      onClick={() => document.getElementById('receipt-upload').click()}
                      style={{ 
                        border: '2px dashed var(--border-color)', 
                        borderRadius: '0.75rem', 
                        padding: '2.5rem', 
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: receipt ? 'rgba(52, 211, 153, 0.05)' : 'transparent',
                        borderColor: receipt ? 'var(--accent-green)' : 'var(--border-color)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = receipt ? 'var(--accent-green)' : (ocrError ? 'var(--danger-color)' : 'var(--border-color)')}
                    >
                      <input 
                        type="file" 
                        id="receipt-upload" 
                        hidden 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setReceipt(file);
                            setOcrError(null);
                            setIsOCRProcessing(true);
                            setOcrProgress(0);
                            
                            try {
                              const result = await Tesseract.recognize(
                                file,
                                'eng',
                                { logger: m => {
                                  if (m.status === 'recognizing text') {
                                    setOcrProgress(Math.floor(m.progress * 100));
                                  }
                                }}
                              );

                              const text = result.data.text.toLowerCase();
                              // Check for keywords and CORRECT RECEIVER (Athea / Ahorro / 0738)
                              const hasIndicator = text.includes('ref') || text.includes('trans') || text.includes('bank') || text.includes('gotyme') || text.includes('gcash');
                              const hasReceiver = text.includes('athea') || text.includes('jayne') || text.includes('ahorro') || text.includes('0738');
                              
                              if (!hasIndicator) {
                                throw new Error("Verification Failed: Could not detect transaction markers.");
                              }
                              
                              if (!hasReceiver) {
                                throw new Error("Incorrect Receiver: This receipt was not sent to ATHEA JAYNE AHORRO. Please upload the correct receipt.");
                              }

                              toast.success('Receipt validated for Athea Jayne!');
                              setIsOCRProcessing(false);
                            } catch (err) {
                              console.error('OCR Error:', err);
                              setOcrError(err.message || "Failed to read receipt. Please ensure the image is clear.");
                              setReceipt(null);
                              setIsOCRProcessing(false);
                              toast.error("Invalid Receipt");
                            }
                          }
                        }}
                      />
                      {isOCRProcessing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: '600' }}>AI Scanning... {ocrProgress}%</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Extracting transaction data</span>
                        </div>
                      ) : ocrError ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                          <AlertCircle size={32} color="var(--danger-color)" />
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: 'var(--danger-color)' }}>Validation Failed</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ocrError}</p>
                          </div>
                        </div>
                      ) : receipt ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Check size={32} color="var(--accent-green)" />
                          <span style={{ fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: '600' }}>{receipt.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click to replace</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '48px', height: '48px', background: 'var(--bg-secondary)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Save size={24} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', fontSize: '1rem' }}>Click to upload receipt</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>JPG, PNG, or PDF (max 5MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 1rem 0' }}>Order Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <span>Services ({selectedServices.length})</span>
                <span>₱{totalAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700' }}>
                <span>Total</span>
                <span>₱{totalAmount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setStep(2)} disabled={submitting} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>
                ← Back to Review
              </button>
              <button 
                onClick={handleSubmitBooking} 
                disabled={submitting}
                style={{ flex: 2, padding: '1rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.5rem', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Submitting...' : 'Submit Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', maxWidth: '450px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <Check size={36} color="var(--primary-color)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>Confirm Booking?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              You are about to book services totaling <span style={{ color: '#fff', fontWeight: '700' }}>₱{totalAmount}</span> for <span style={{ color: '#fff', fontWeight: '700' }}>{new Date(date).toLocaleDateString()}</span>. Do you wish to proceed?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1, padding: '1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
              >
                Back
              </button>
              <button 
                onClick={processBooking}
                style={{ flex: 1, padding: '1rem', background: 'var(--primary-color)', border: 'none', color: '#000', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '700' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AI Service Assistant Modal */}
      {showAiAssistant && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '2rem', border: '1px solid rgba(56, 189, 248, 0.3)', maxWidth: '500px', width: '90%', position: 'relative', boxShadow: '0 0 50px rgba(56, 189, 248, 0.15)' }}>
            <button onClick={() => setShowAiAssistant(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
            
            {aiThinking ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div className="ai-thinking-spinner" style={{ width: '64px', height: '64px', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 2rem auto', animation: 'spin 1s linear infinite' }}></div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>Analyzing Vehicle Needs...</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Our AI is processing your car's condition.</p>
              </div>
            ) : aiRecommendation ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
                  <Sparkles size={40} color="var(--primary-color)" />
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>AI Recommended Package</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>Based on your answers, we suggest the following for maximum protection and shine:</p>
                
                <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--primary-color)', marginBottom: '2rem', textAlign: 'left' }}>
                   {aiRecommendation.map(rec => (
                     <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '700', color: '#fff' }}>{rec.name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rec.category}</p>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>₱{rec.price}</span>
                     </div>
                   ))}
                </div>

                <button 
                  onClick={() => {
                    setSelectedServiceIds(aiRecommendation.map(r => r.id));
                    setShowAiAssistant(false);
                    toast.success('AI recommendations applied to your bag!');
                  }}
                  style={{ width: '100%', padding: '1rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', fontSize: '1rem' }}
                >
                  Apply Recommendations
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <Sparkles size={24} color="var(--primary-color)" />
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>AI Consultant</h2>
                </div>

                {aiStep === 1 && (
                  <div>
                    <p style={{ marginBottom: '1.5rem', fontWeight: '600' }}>What is the primary condition of your car's paint?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {['Swirl marks / Scratches', 'Faded / Dull', 'New / Good Condition', 'Muddy / Very Dirty'].map(opt => (
                        <button key={opt} onClick={() => { setAiAnswers({...aiAnswers, paint: opt}); setAiStep(2); }} style={{ padding: '1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                )}

                {aiStep === 2 && (
                  <div>
                    <p style={{ marginBottom: '1.5rem', fontWeight: '600' }}>How often do you drive your vehicle?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {['Daily Commuter', 'Weekend / Occasional', 'Off-road / Work Truck', 'Show Car / Garage Queen'].map(opt => (
                        <button key={opt} onClick={() => { 
                          setAiAnswers({...aiAnswers, usage: opt}); 
                          setAiThinking(true);
                          setTimeout(() => {
                            // Rule-based Recommendation Engine
                            let recs = [];
                            const all = services;
                            
                            if (aiAnswers.paint === 'Swirl marks / Scratches' || opt === 'Off-road / Work Truck') {
                              recs.push(all.find(s => s.name.includes('Ceramic')) || all[0]);
                              recs.push(all.find(s => s.name.includes('Engine')) || all[1]);
                            } else if (aiAnswers.paint === 'New / Good Condition') {
                              recs.push(all.find(s => s.name.includes('Wash')) || all[0]);
                              recs.push(all.find(s => s.name.includes('Interior')) || all[1]);
                            } else {
                              recs.push(all.find(s => s.name.includes('Interior')) || all[1]);
                              recs.push(all.find(s => s.name.includes('Wash')) || all[0]);
                            }
                            
                            setAiRecommendation(recs.filter(Boolean));
                            setAiThinking(false);
                          }, 1500);
                        }} style={{ padding: '1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>{opt}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
