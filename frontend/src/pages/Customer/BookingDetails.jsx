import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Box, Car, FileText, Calendar, Clock, Banknote, AlertTriangle, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reuploading, setReuploading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_services (
            service_name,
            service_price
          ),
          payment_intents (
            status,
            total_amount,
            amount_paid,
            method
          )
        `)
        .eq('id', id)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setBooking(data);
    } catch (err) {
      console.error('Error fetching booking:', err);
      toast.error('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading details...</div>;
  if (!booking) return <div style={{ padding: '2rem' }}>Booking not found.</div>;

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT': return { label: 'Pending', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
      case 'CONFIRMED': return { label: 'Confirmed', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
      case 'COMPLETED': return { label: 'COMPLETED', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      case 'CLOSED': return { label: 'CLOSED', color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
      case 'CANCELLED': return { label: 'CANCELLED', color: 'var(--danger-color)', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { label: status, color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  const getServiceStatusDisplay = (status) => {
    switch (status) {
      case 'NOT_STARTED': return { label: 'NOT STARTED', color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
      case 'IN_PROGRESS': return { label: 'IN PROGRESS', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.1)' };
      case 'FINISHED': return { label: 'FINISHED', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      default: return { label: status, color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  const getPaymentStatusDisplay = (status) => {
    switch (status) {
      case 'INITIATED': return { label: 'UNPAID', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
      case 'FOR_VERIFICATION': return { label: 'FOR VERIFICATION', color: '#ffb300', bg: 'rgba(255, 179, 0, 0.1)' };
      case 'PARTIALLY_PAID': return { label: 'PARTIAL', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.1)' };
      case 'PAID': return { label: 'PAID', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      case 'VERIFIED': return { label: 'VERIFIED', color: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.1)' };
      default: return { label: status || 'UNKNOWN', color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  const status = getStatusDisplay(booking.booking_status);
  const serviceStatus = getServiceStatusDisplay(booking.service_status);
  
  const intent = booking.payment_intents?.[0] || {};
  const paymentStatus = getPaymentStatusDisplay(intent.status);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <button 
        onClick={() => navigate('/my-bookings')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to Bookings
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Booking #{booking.id.substring(0, 4)}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ padding: '0.4rem 1rem', background: status.bg, color: status.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem', border: `1px solid ${status.color}33` }}>
            <Clock size={12} /> {status.label.toUpperCase()}
          </span>
          <span style={{ padding: '0.4rem 1rem', background: serviceStatus.bg, color: serviceStatus.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '700', border: `1px solid ${serviceStatus.color}33` }}>
            {serviceStatus.label.toUpperCase()}
          </span>
          <span style={{ padding: '0.4rem 1rem', background: paymentStatus.bg, color: paymentStatus.color, borderRadius: '5rem', fontSize: '0.7rem', fontWeight: '700', border: `1px solid ${paymentStatus.color}33` }}>
            {paymentStatus.label.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Service Details */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Box size={18} color="var(--primary-color)" /> Service Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {booking.booking_services.map(bs => (
                <div key={bs.service_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '500' }}>{bs.service_name}</h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{bs.service_category || 'SERVICE'}</span>
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>₱{bs.service_price}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1.25rem' }}>Total Amount</span>
              <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#fff' }}>₱{intent.total_amount || 0}</span>
            </div>
          </div>

          {/* Vehicle Information */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
             <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Car size={18} color="var(--primary-color)" /> Vehicle Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>VEHICLE TYPE</span>
                <span style={{ fontWeight: '500' }}>{booking.vehicle_type || 'Sedan'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>PLATE NUMBER</span>
                <span style={{ fontWeight: '500' }}>{booking.plate_number}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>BRAND</span>
                <span style={{ fontWeight: '500' }}>{booking.vehicle_brand || '---'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>MODEL</span>
                <span style={{ fontWeight: '500' }}>{booking.vehicle_model || '---'}</span>
              </div>
            </div>
          </div>

          {/* Booking Notes */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
             <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--primary-color)" /> Booking Notes
            </h2>
            <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.5rem', color: booking.customer_notes ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {booking.customer_notes || 'No special instructions provided for this booking.'}
            </div>
          </div>

          {/* Payment Receipt Display */}
          {intent.method === 'GCASH' && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Banknote size={18} color="var(--primary-color)" /> Payment Receipt
              </h2>
              <div style={{ 
                aspectRatio: '4/3', 
                background: 'var(--bg-input)', 
                borderRadius: '0.5rem', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                border: '2px dashed var(--border-color)',
                overflow: 'hidden'
              }}>
                {intent.receipt_url ? (
                  <img src={intent.receipt_url} alt="GCash Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    {reuploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                         <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                         <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>AI Scanning... {ocrProgress}%</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ background: 'rgba(56, 189, 248, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                          <Check size={32} color="var(--primary-color)" />
                        </div>
                        <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#fff' }}>Receipt Received</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reference Number: 1029 384 576</p>
                        <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#ffb300', fontWeight: '700', letterSpacing: '1px' }}>AWAITING ADMIN VERIFICATION</p>
                        
                        <button 
                          onClick={() => document.getElementById('details-receipt-upload').click()}
                          style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <FileText size={14} /> Re-upload Correct Photo
                        </button>
                        <input 
                          type="file" 
                          id="details-receipt-upload" 
                          hidden 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setReuploading(true);
                              setOcrError(null);
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
                                const hasIndicator = text.includes('ref') || text.includes('trans') || text.includes('bank') || text.includes('gotyme') || text.includes('gcash');
                                const hasReceiver = text.includes('athea') || text.includes('jayne') || text.includes('ahorro') || text.includes('0738');
                                 
                                if (!hasIndicator) {
                                  throw new Error("Invalid Receipt: No transaction markers found.");
                                }

                                if (!hasReceiver) {
                                  throw new Error("Incorrect Receiver: Not sent to ATHEA JAYNE AHORRO.");
                                }

                                toast.success('New receipt validated for Athea Jayne!');
                                setReuploading(false);
                              } catch (err) {
                                console.error(err);
                                setOcrError(err.message);
                                setReuploading(false);
                                toast.error("Re-upload Failed");
                              }
                            }
                          }}
                        />

                        {ocrError && (
                          <div style={{ marginTop: '1rem', color: 'var(--danger-color)', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                            <AlertCircle size={12} /> {ocrError}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Appointment */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
             <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--primary-color)" /> Appointment
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-color)', lineHeight: '1' }}>
                 {new Date(booking.scheduled_start).getDate()}
               </span>
               <div>
                 <span style={{ display: 'block', fontWeight: '600' }}>
                   {new Date(booking.scheduled_start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                 </span>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                   <Clock size={12} /> {new Date(booking.scheduled_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                 </span>
               </div>
            </div>
          </div>

          {/* Payment Status */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
             <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Banknote size={18} color="var(--primary-color)" /> Payment Status
            </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Method</span>
                  <span style={{ fontWeight: '600' }}>{intent.method || '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Paid Amount</span>
                  <span style={{ fontWeight: '600', color: 'var(--accent-green)' }}>₱{intent.amount_paid || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Remaining</span>
                  <span style={{ fontWeight: '600', color: 'var(--danger-color)' }}>₱{(intent.total_amount || 0) - (intent.amount_paid || 0)}</span>
                </div>
                {intent.amount_paid === 0 && intent.method === 'GCASH' && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                    * Balance will update once an admin verifies your GCash receipt.
                  </p>
                )}
              </div>
          </div>

          {/* Cancel Button */}
          {(booking.booking_status === 'PENDING_ASSIGNMENT' || booking.booking_status === 'CONFIRMED') && (
            <button 
              onClick={() => setShowCancelModal(true)}
              style={{ 
                width: '100%', 
                padding: '1.25rem', 
                background: 'rgba(239, 68, 68, 0.05)', 
                border: '2px solid var(--danger-color)', 
                color: 'var(--danger-color)', 
                borderRadius: '0.75rem', 
                cursor: 'pointer', 
                fontWeight: '700', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
            >
              <AlertTriangle size={18} /> {intent.method === 'GCASH' ? 'Cancel and Get Refund' : 'Cancel Booking'}
            </button>
          )}

          {booking.booking_status === 'CANCELLED' && (
             <div style={{ 
                width: '100%', 
                padding: '1.25rem', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border-color)', 
                color: 'var(--text-secondary)', 
                borderRadius: '0.75rem', 
                fontWeight: '700', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontSize: '0.9rem'
              }}>
               <Clock size={18} /> {intent.method === 'GCASH' ? 'Cancelled and Awaiting Refund' : 'Cancelled'}
             </div>
          )}

        </div>
      </div>
      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '450px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto' }}>
              <AlertTriangle size={36} color="var(--danger-color)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', fontWeight: '800' }}>Confirm Cancellation?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              {intent.method === 'GCASH' 
                ? 'Are you sure you want to cancel and get a refund? You will be eligible for a refund according to our policy. This action cannot be undone.'
                : 'Are you sure you want to cancel this booking? This action cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowCancelModal(false)}
                style={{ flex: 1, padding: '1rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
              >
                No, Keep it
              </button>
              <button 
                onClick={async () => {
                  setIsCancelling(true);
                  try {
                    const { data, error } = await supabase
                      .from('bookings')
                      .update({ booking_status: 'CANCELLED' })
                      .eq('id', id)
                      .eq('customer_id', user.id)
                      .select();
                    
                    if (error) throw error;

                    if (!data || data.length === 0) {
                      throw new Error('Update failed. Permission denied or booking not found.');
                    }
                    
                    // Notify customer about cancellation
                    const { error: notifError } = await supabase.from('notifications').insert({
                      user_id: user.id,
                      title: 'Booking Cancelled',
                      message: `Your booking #${booking.id.substring(0, 4)} for ${new Date(booking.scheduled_start).toLocaleDateString()} has been cancelled.${intent.method === 'GCASH' ? ' A refund will be processed according to our policy.' : ''}`,
                      type: 'warning'
                    });
                    if (notifError) console.error('Notification insert failed:', notifError);

                    // Send Cancellation Email via Edge Function
                    supabase.functions.invoke('send-email', {
                      body: {
                        type: 'booking_cancelled',
                        to: user.email,
                        data: {
                          date: new Date(booking.scheduled_start).toLocaleDateString()
                        }
                      }
                    }).catch(err => console.error('Email trigger failed:', err));

                    setBooking({ ...booking, booking_status: 'CANCELLED' });
                    toast.success('Booking cancelled successfully.');
                    setShowCancelModal(false);
                  } catch (err) {
                    console.error('Cancellation Error:', err);
                    toast.error(err.message || 'Failed to cancel booking.');
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                disabled={isCancelling}
                style={{ flex: 1, padding: '1rem', background: 'var(--danger-color)', border: 'none', color: '#fff', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetails;
