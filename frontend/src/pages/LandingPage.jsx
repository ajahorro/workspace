import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShoppingBag, ArrowRight, Plus, Check, Clock, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import Login from './Login';

// Using public folder paths for assets
const heroImage = '/hero_bg.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, addToCart, removeFromCart, totalAmount, totalDuration } = useBooking();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [services, setServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  useEffect(() => {
    // If user logs in while modal is open, and they wanted to checkout, send them to /book
    if (user && showLoginModal && cart.length > 0) {
      setShowLoginModal(false);
      navigate('/book');
    }
  }, [user, showLoginModal, cart.length, navigate]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true);
        if (!error && data) setServices(data);
      } catch (err) {
        console.log('Services fetch silenced');
      } finally {
        setIsLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const teamRoles = [
    {
      title: 'Owner',
      description: 'Manages bookings, explains packages, handles payments, provides aftercare advice, manages Facebook page and promotions.',
    },
    {
      title: 'Auto Paint Technician',
      description: 'Expert in vehicle painting, paint correction, custom designs, collision paint repair.',
    },
    {
      title: 'Shop Assistant / Cleaner',
      description: 'Maintains shop cleanliness, assists with prep work, washing, vacuuming, supply management.',
    },
  ];

  const handleCheckout = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      navigate('/book');
    }
  };

  return (
    <div style={{ background: '#121212', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Premium Glassmorphism Header */}
      <header style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000, 
        padding: '1rem 4rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'rgba(18,18,18,0.7)',
        backdropFilter: 'blur(15px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '1px' }}>RENEW</h1>
          <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: '600', textTransform: 'uppercase' }}>Auto Detailing</span>
        </div>

        <nav style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
          {['HOME', 'OUR SERVICES', 'CONTACT', 'BOOK NOW'].map((item) => (
            <a 
              key={item} 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (item === 'OUR SERVICES') document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                if (item === 'BOOK NOW') handleCheckout();
                if (item === 'HOME') window.scrollTo({ top: 0, behavior: 'smooth' });
                if (item === 'CONTACT') document.getElementById('location-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ 
                textDecoration: 'none', 
                color: '#fff', 
                fontSize: '0.85rem', 
                fontWeight: '700', 
                letterSpacing: '0.5px',
                opacity: 0.9,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
            >
              {item}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div 
            onClick={() => user ? navigate('/dashboard') : setShowLoginModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '5rem', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <User size={18} />
            <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{user ? 'DASHBOARD' : 'LOGIN'}</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ 
        height: '95vh', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0, 
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.35)',
          zIndex: 1
        }}></div>

        <div style={{ zIndex: 2, maxWidth: '900px', padding: '0 2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.5rem 1.25rem', borderRadius: '5rem', marginBottom: '1.5rem', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.85rem', fontWeight: '700' }}>
            <Sparkles size={14} /> NEW LOOK, NEW VIBE
          </div>
          <h2 style={{ 
            fontSize: '5rem', 
            fontWeight: '900', 
            margin: '0 0 1.5rem 0', 
            textTransform: 'uppercase', 
            letterSpacing: '-2px',
            lineHeight: 0.95
          }}>
            YOUR CAR DESERVES <br/> <span style={{ color: '#38bdf8' }}>A NEW LOOK.</span>
          </h2>
          <p style={{ 
            fontSize: '1.25rem', 
            opacity: 0.8, 
            marginBottom: '3rem', 
            fontWeight: '500',
            maxWidth: '650px',
            margin: '0 auto 3rem auto',
            lineHeight: 1.6
          }}>
            Experience premium auto detailing that restores and protects your vehicle's soul.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
            <button 
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ 
                padding: '1.25rem 2.75rem', 
                background: '#38bdf8', 
                border: 'none', 
                color: '#000', 
                borderRadius: '5rem', 
                fontWeight: '800', 
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'transform 0.2s',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Explore Services <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Content Section: Who we are */}
      <section style={{ padding: '8rem 4rem', background: '#121212' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '6rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ 
              aspectRatio: '1', 
              background: '#1e293b', 
              borderRadius: '2rem', 
              overflow: 'hidden',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
               <img src={heroImage} alt="Precision Work" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            </div>
            <div style={{ position: 'absolute', bottom: '-2rem', right: '-2rem', background: '#38bdf8', color: '#000', padding: '2rem', borderRadius: '1.5rem', border: '4px solid #121212' }}>
              <h4 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900' }}>5.0</h4>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.8rem' }}>CUSTOMER RATING</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div>
              <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Precision Matters</span>
              <h3 style={{ fontSize: '3rem', fontWeight: '900', margin: '1rem 0 1.5rem 0', lineHeight: 1.1 }}>Crafting Showroom <br/> Perfection.</h3>
              <p style={{ fontSize: '1.15rem', opacity: 0.7, lineHeight: '1.7', margin: 0 }}>
                RENEW Auto Detailing is more than a car wash. We are artists dedicated to the restoration and preservation of your vehicle's beauty.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {teamRoles.map((role) => (
                <div key={role.title} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#38bdf8' }}>{role.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.6, lineHeight: '1.5' }}>{role.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION - INTEGRATED */}
      <section id="services-section" style={{ padding: '8rem 4rem', background: '#0a0a0a', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem', letterSpacing: '2px' }}>THE CATALOG</span>
            <h3 style={{ fontSize: '3.5rem', fontWeight: '900', margin: '1rem 0' }}>Our Premium Services.</h3>
            <p style={{ opacity: 0.6, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Select the perfect care package for your vehicle.</p>
          </div>

          {isLoadingServices ? (
            <div style={{ textAlign: 'center', padding: '5rem' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #1e293b', borderTop: '3px solid #38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {services.map(service => {
                const inCart = cart.some(item => item.id === service.id);
                return (
                  <div 
                    key={service.id}
                    style={{ 
                      background: inCart ? 'rgba(56, 189, 248, 0.05)' : '#1a1a1a', 
                      borderRadius: '1.5rem', 
                      padding: '2rem', 
                      border: `1px solid ${inCart ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>{service.name}</h4>
                        <span style={{ color: '#38bdf8', fontWeight: '900', fontSize: '1.25rem' }}>₱{service.price}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '2rem', lineHeight: 1.6 }}>{service.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', opacity: 0.5, marginBottom: '2rem' }}>
                        <Clock size={14} /> {service.duration_minutes} mins
                      </div>
                    </div>

                    <button 
                      onClick={() => inCart ? removeFromCart(service.id) : addToCart(service)}
                      style={{ 
                        width: '100%', 
                        padding: '1rem', 
                        borderRadius: '0.75rem', 
                        border: inCart ? '1px solid #38bdf8' : 'none', 
                        background: inCart ? 'transparent' : 'rgba(255,255,255,0.05)', 
                        color: inCart ? '#38bdf8' : '#fff',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => !inCart && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                      onMouseLeave={(e) => !inCart && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    >
                      {inCart ? <><Check size={18} /> Added to Bag</> : <><Plus size={18} /> Add to Bag</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Location Section */}
      <section id="location-section" style={{ padding: '8rem 4rem', background: '#121212' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '3rem' }}>Find Us.</h3>
          <div style={{ 
            width: '100%', 
            aspectRatio: '21/9', 
            background: '#0a0a0a', 
            borderRadius: '2rem', 
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative'
          }}>
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15444.475471444155!2d121.05068695!3d14.5934394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c81665a31a9b%3A0xc3b8a3480373468b!2sMandaluyong%2C%20Metro%20Manila!5e0!3m2!1sen!2sph!4v1714380000000!5m2!1sen!2sph" 
              width="100%" 
              height="100%" 
              style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(0.8)' }} 
              allowFullScreen="" 
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="RENEW Location"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Smart Bag Overlay */}
      {cart.length > 0 && (
        <div style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 1500, 
          width: '90%', 
          maxWidth: '500px',
          background: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(20px)',
          padding: '1rem 1.5rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'bagPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#38bdf8', color: '#000', padding: '0.75rem', borderRadius: '1rem' }}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900' }}>₱{totalAmount}</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>{cart.length} Services • {totalDuration} mins</p>
            </div>
          </div>
          <button 
            onClick={handleCheckout}
            style={{ 
              background: '#38bdf8', 
              color: '#000', 
              border: 'none', 
              padding: '0.85rem 2rem', 
              borderRadius: '1rem', 
              fontWeight: '800', 
              fontSize: '0.9rem', 
              cursor: 'pointer'
            }}
          >
            BOOK NOW
          </button>
        </div>
      )}

      {/* Footer */}
      <footer style={{ padding: '6rem 4rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', opacity: 0.3, fontSize: '0.8rem' }}>
        &copy; 2026 RENEW Auto Detailing. All rights reserved.
      </footer>

      {showLoginModal && (
        <Login isModal={true} onClose={() => setShowLoginModal(false)} />
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes bagPop {
          from { transform: translateX(-50%) translateY(100px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
