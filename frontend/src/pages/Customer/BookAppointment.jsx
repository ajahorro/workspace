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

const BookAppointment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [services, setServices] = useState([]);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  
  const [currentView, setCurrentView] = useState('FLEET_OVERVIEW');
  const [vehicles, setVehicles] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [builderStep, setBuilderStep] = useState(0);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCASH');
  const [paymentOption, setPaymentOption] = useState('FULL'); 
  const [contactNumber, setContactNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);
  const [ocrVerified, setOcrVerified] = useState(false);
  const [ocrText, setOcrText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: srv } = await supabase.from('services').select('*').eq('is_active', true);
      const { data: set } = await supabase.from('business_settings').select('*').maybeSingle();
      if (srv) setServices(srv);
      if (set) setBusinessSettings(set);
      setLoading(false);
    };
    fetchData();
  }, []);

  const calculateVehicleTotal = (v) => {
    return v.serviceIds.reduce((sum, sId) => {
      const svc = services.find(s => s.id === sId);
      return sum + parseFloat(svc?.price || 0);
    }, 0);
  };

  const calculateGrandTotal = () => vehicles.reduce((sum, v) => sum + calculateVehicleTotal(v), 0);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReceipt(file);
    setIsOCRProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      setOcrText(text);
      setOcrVerified(true);
      toast.success('Receipt scanned');
    } catch (err) {
      setOcrError('OCR failed, manual review required.');
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const processBooking = async () => {
    setSubmitting(true);
    try {
      const grandTotal = calculateGrandTotal();
      let [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      const scheduledStart = new Date(`${date}T${hours}:${minutes}:00Z`);

      // 1. Create Booking using RPC to ensure snapshot integrity
      const { error, data: bookingId } = await supabase.rpc('create_booking_v3', {
        p_customer_id: user.id,
        p_start_datetime: scheduledStart.toISOString(),
        p_vehicles: vehicles.map(v => ({
          type: v.type,
          make: v.brand,
          model: v.model,
          plate: v.plateNumber,
          services: v.serviceIds
        })),
        p_customer_phone: contactNumber,
        p_customer_notes: notes
      });

      if (error) throw error;

      // 2. Handle Receipt if GCash
      if (paymentMethod === 'GCASH' && receipt) {
        const fileName = `${user.id}/${bookingId}/${Date.now()}.png`;
        await supabase.storage.from('receipts').upload(fileName, receipt);
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
        
        await supabase.from('payments').insert({
          booking_id: bookingId,
          amount: paymentOption === 'DOWNPAYMENT' ? (grandTotal * 0.3) : grandTotal,
          method: 'GCASH',
          status: 'pending',
          receipt_url: publicUrl,
          ocr_text: ocrText
        });
      }

      toast.success('Booking Successful!');
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--admin-text-primary)' }}>
        <PageHeader title="FLEET SCHEDULER" subtitle="Build your fleet booking" />
        
        {currentView === 'FLEET_OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {vehicles.map(v => (
                    <div key={v.id} style={{ background: 'var(--admin-card)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--admin-border)' }}>
                        <h4 style={{ margin: 0 }}>{v.brand} {v.model}</h4>
                        <p style={{ opacity: 0.7 }}>₱{calculateVehicleTotal(v)}</p>
                    </div>
                ))}
                <button onClick={() => { setEditingVehicle({ id: Date.now(), serviceIds: [] }); setCurrentView('BUILDER'); }} style={{ padding: '1rem', borderRadius: '1rem', background: 'var(--admin-brand)', color: 'white', border: 'none', fontWeight: 'bold' }}>+ ADD VEHICLE</button>
                {vehicles.length > 0 && <button onClick={() => setCurrentView('CHECKOUT')} style={{ padding: '1rem', borderRadius: '1rem', background: 'white', color: 'black', border: 'none', fontWeight: 'bold' }}>CHECKOUT (₱{calculateGrandTotal()})</button>}
            </div>
        )}

        {currentView === 'BUILDER' && (
            <div style={{ background: 'var(--admin-card)', padding: '2rem', borderRadius: '1.5rem' }}>
                <input placeholder="Brand" onChange={e => setEditingVehicle({...editingVehicle, brand: e.target.value})} style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', borderRadius: '0.5rem', background: 'var(--admin-bg)', color: 'white', border: '1px solid var(--admin-border)' }} />
                <input placeholder="Model" onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})} style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', borderRadius: '0.5rem', background: 'var(--admin-bg)', color: 'white', border: '1px solid var(--admin-border)' }} />
                <input placeholder="Plate Number" onChange={e => setEditingVehicle({...editingVehicle, plateNumber: e.target.value})} style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', borderRadius: '0.5rem', background: 'var(--admin-bg)', color: 'white', border: '1px solid var(--admin-border)' }} />
                <select onChange={e => setEditingVehicle({...editingVehicle, type: e.target.value})} style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', background: 'var(--admin-bg)', color: 'white', borderRadius: '0.5rem' }}>
                    <option value="">Select Type</option>
                    <option value="SEDAN">Sedan</option>
                    <option value="SUV">SUV</option>
                </select>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {services.map(s => (
                        <label key={s.id} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                            <input type="checkbox" onChange={(e) => {
                                const ids = e.target.checked ? [...editingVehicle.serviceIds, s.id] : editingVehicle.serviceIds.filter(id => id !== s.id);
                                setEditingVehicle({...editingVehicle, serviceIds: ids});
                            }} />
                            {s.name} (₱{s.price})
                        </label>
                    ))}
                </div>
                <button onClick={() => { setVehicles([...vehicles, editingVehicle]); setCurrentView('FLEET_OVERVIEW'); }} style={{ marginTop: '1rem', padding: '1rem', width: '100%', borderRadius: '1rem', background: 'var(--admin-brand)', color: 'white', border: 'none' }}>SAVE TO FLEET</button>
            </div>
        )}

        {currentView === 'CHECKOUT' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem' }}>
                <div style={{ background: 'var(--admin-card)', padding: '2rem', borderRadius: '1.5rem' }}>
                    <input type="date" onChange={e => setDate(e.target.value)} style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', background: 'var(--admin-bg)', color: 'white', border: '1px solid var(--admin-border)' }} />
                    <input type="time" onChange={e => setTime(e.target.value + ' AM')} style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', background: 'var(--admin-bg)', color: 'white', border: '1px solid var(--admin-border)' }} />
                    <input placeholder="Phone" onChange={e => setContactNumber(e.target.value)} style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', background: 'var(--admin-bg)', color: 'white', border: '1px solid var(--admin-border)' }} />
                </div>
                <div style={{ background: 'var(--admin-card)', padding: '2rem', borderRadius: '1.5rem' }}>
                    <h3>Total: ₱{calculateGrandTotal()}</h3>
                    <input type="file" onChange={handleReceiptUpload} style={{ marginBottom: '1rem' }} />
                    <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input type="checkbox" onChange={e => setAgreedToPolicy(e.target.checked)} /> Agree to Policies
                    </label>
                    <button onClick={processBooking} disabled={submitting} style={{ width: '100%', padding: '1rem', background: 'var(--admin-brand)', color: 'white', borderRadius: '1rem', border: 'none' }}>
                        {submitting ? 'PROCESSING...' : 'BOOK NOW'}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default BookAppointment;