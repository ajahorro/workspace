import React, { useState } from 'react';
import { ShoppingBag, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';

const BookingCartSidebar = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, totalAmount, totalDuration } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Cart, 2 = Vehicle/Date, 3 = Review/Commit

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}
      
      {/* Sidebar Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-400px',
        width: '400px',
        maxWidth: '100%',
        height: '100vh',
        background: 'var(--bg-primary)',
        borderLeft: '1px solid var(--border-color)',
        zIndex: 1001,
        transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingBag size={24} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Your Booking</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {!user ? (
            <div style={{ textAlign: 'center', marginTop: '4rem', padding: '0 1rem' }}>
              <div style={{ background: 'var(--bg-input)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <ShoppingBag size={48} style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Ready to proceed?</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                  Please login or register an account to book your detailing service.
                </p>
                <button 
                  onClick={() => {
                    onClose();
                    navigate('/login?mode=register');
                  }}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--primary-color)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Login or Register an Account to Proceed
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem' }}>
              <ShoppingBag size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
              <p>Your bag is empty.</p>
              <button onClick={onClose} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem', cursor: 'pointer' }}>
                Browse Services
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Selected Services</h3>
              </div>
              {cart.map(service => (
                <div key={service.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '600' }}>{service.name}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{service.duration_minutes} mins</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>₱{service.price}</span>
                    <button onClick={() => removeFromCart(service.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.25rem' }}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {user && cart.length > 0 && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span>Total Duration</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{totalDuration} mins</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '800' }}>
              <span>Total Price</span>
              <span style={{ color: 'var(--primary-color)' }}>₱{totalAmount}</span>
            </div>
            <button 
              onClick={() => {
                onClose();
                navigate('/book'); // Navigate to the actual booking page instead of a generic checkout
              }}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'var(--primary-color)',
                color: '#000',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              Continue to Details <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default BookingCartSidebar;
