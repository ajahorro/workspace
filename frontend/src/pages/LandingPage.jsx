import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShoppingBag, ArrowRight, Check, Clock, Sparkles, Menu, X, Monitor, CalendarCheck, ShieldCheck, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import Login from './Login';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { cart, addToCart, removeFromCart, totalAmount, totalDuration } = useBooking();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [services, setServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services_v2')
          .select('*')
          .eq('is_active', true);
        if (!error && data) setServices(data);
      } catch (err) {

      } finally {
        setIsLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      const routes = {
        ADMIN: '/admin',
        SUPER_ADMIN: '/admin',
        STAFF: '/staff',
        CUSTOMER: '/dashboard'
      };
      navigate(routes[profile.role] || '/dashboard');
    }
  }, [user, profile, navigate]);

  const handleCheckout = () => {

    if (!user) {
      setShowLoginModal(true);
    } else {
      navigate('/book');
    }
  };

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

  const BlurGlow = ({ top, left, right, bottom, size, color }) => (
    <div style={{
      position: 'absolute',
      top, left, right, bottom,
      width: size,
      height: size,
      background: color || 'rgba(169, 27, 24, 0.2)',
      filter: 'blur(150px)',
      borderRadius: '50%',
      zIndex: 0,
      pointerEvents: 'none',
      opacity: 0.5
    }} />
  );

  const categories = ['EXTERIOR', 'INTERIOR', 'SPECIALIZED'];
  const groupedServices = categories.reduce((acc, cat) => {
    acc[cat] = (services || []).filter(s => (s.category || 'EXTERIOR').toUpperCase() === cat);
    return acc;
  }, {});

  return (
    <div style={{ background: '#050A15', color: '#FBFFFE', minHeight: '100vh', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", overflowX: 'hidden', position: 'relative' }}>
      
      {/* Background Video */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 0, 
        overflow: 'hidden',
        pointerEvents: 'none'
      }}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            opacity: 0.5,
            filter: 'brightness(0.7) contrast(1.2)' // Enhanced contrast for the red tones
          }}
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 50%, rgba(0,0,0,0.8) 100%)',
          zIndex: 1 
        }}></div>
      </div>

      {/* Universal Glows - Switched to New Palette */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <BlurGlow top="-5%" left="-5%" size="500px" color="rgba(169, 27, 24, 0.4)" />
        <BlurGlow top="10%" right="5%" size="450px" color="rgba(206, 231, 243, 0.3)" />
        <BlurGlow top="40%" left="35%" size="600px" color="rgba(169, 27, 24, 0.25)" />
        <BlurGlow bottom="10%" left="5%" size="400px" color="rgba(206, 231, 243, 0.3)" />
        <BlurGlow bottom="-5%" right="-5%" size="550px" color="rgba(169, 27, 24, 0.3)" />
      </div>

      <PublicHeader setShowLoginModal={setShowLoginModal} />

      <div style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        {/* Hero Section */}
        <section style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 1.5rem',
          position: 'relative',
          zIndex: 1,
          background: 'transparent'
        }}>
          <div style={{ maxWidth: '1700px', zIndex: 10 }}>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 10vw, 4.5rem)',
              fontWeight: '900',
              margin: '0 0 1rem 0',
              textTransform: 'uppercase',
              letterSpacing: '-2px',
              lineHeight: 0.95,
              color: '#f8fafc'
            }}>
              TURN THE COLOR <br /> TO THE MAXIMUM
            </h1>
            <p style={{
              fontSize: '1rem',
              opacity: 0.6,
              marginBottom: '2rem',
              maxWidth: '550px',
              margin: '0 auto 2rem auto',
              lineHeight: 1.6
            }}>
              Precision-driven auto detailing and paint restoration. Book your appointment online and experience showroom perfection.
            </p>
            <button
              onClick={handleCheckout}
              style={{
                background: 'var(--primary-color)',
                color: '#fff',
                border: 'none',
                padding: '1.2rem 3.5rem',
                borderRadius: '5rem',
                fontWeight: '900',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 10px 40px rgba(169, 27, 24, 0.3)'
              }}
            >
              BOOK NOW
            </button>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about-section" style={{ padding: '80px 1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '1700px', margin: '0 auto' }}>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: '900', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-1px', margin: 0 }}>
                  WE OFFER PAINTING <br /> SERVICES FOR CARS <br /> OF ALL BRANDS
                </h2>
                <p style={{ fontSize: '1rem', opacity: 0.6, lineHeight: 1.6, marginTop: '1.5rem', marginBottom: '1rem' }}>
                  Our efforts are focused on constantly honing skills and improving car body repair and painting technologies.
                </p>
                <p style={{ fontSize: '1rem', opacity: 0.6, lineHeight: 1.6, margin: 0 }}>
                  High quality standards allowed us to obtain certificates for the entire range of services, including for the repair of cars under manufacturer's warranty.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.65rem' }}>
                {teamRoles.map((role) => (
                  <div key={role.title} style={{ padding: '1.25rem', background: '#131926', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase' }}>{role.title}</h4>
                    <p style={{ margin: 0, fontSize: '1rem', opacity: 0.5, lineHeight: '1.4' }}>{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section style={{ padding: '60px 1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '1700px', margin: '0 auto' }}>
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: '900', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-1.5px', margin: 0 }}>
                  WE CAN DO WHAT <br /> OTHERS CAN'T DO!
                </h2>
                <p style={{ fontSize: '1rem', opacity: 0.5, lineHeight: 1.6, maxWidth: '450px', marginTop: '1.5rem', marginBottom: 0 }}>
                  We bridge the gap between craftsmanship and technology. Our digital-first approach ensures your car gets the attention it deserves.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', paddingTop: '0.75rem' }}>
                <div style={{ padding: '1.5rem', background: '#131926', borderRadius: '0.5rem', border: '1px solid rgba(169, 27, 24, 0.1)' }}>
                  <Monitor size={18} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase' }}>ONLINE PROGRESS TRACKING</h5>
                  <p style={{ margin: 0, fontSize: '1rem', opacity: 0.5, lineHeight: 1.4 }}>
                    Track progress online. Book and everything will be ready.
                  </p>
                </div>
                {[
                  { title: 'LOREM IPSUM DOLOR', icon: CalendarCheck, desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
                  { title: 'CONSECTETUR ADIPIS', icon: ShieldCheck, desc: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
                  { title: 'TEMPOR INCIDIDUNT', icon: Sparkles, desc: 'Duis aute irure dolor in reprehenderit in voluptate.' }
                ].map(stat => (
                  <div key={stat.title} style={{ padding: '1.5rem', background: '#131926', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <stat.icon size={18} color="#fff" style={{ marginBottom: '1rem', opacity: 0.4 }} />
                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase' }}>{stat.title}</h5>
                    <p style={{ margin: 0, fontSize: '1rem', opacity: 0.4, lineHeight: 1.4 }}>{stat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES CATALOG */}
        <section id="services-section" style={{ padding: '40px 1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '1700px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-1.5px' }}>THE SERVICE CATALOG</h3>
              <p style={{ opacity: 0.5, fontSize: '1rem', marginTop: '0.25rem' }}>Select your premium care package.</p>
            </div>

            {isLoadingServices ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--bg-secondary)', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {categories.map(cat => groupedServices[cat] && groupedServices[cat].length > 0 && (
                  <div key={cat}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: '30px', height: '2px', background: 'var(--primary-color)' }}></div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '900', letterSpacing: '2px', color: 'var(--primary-color)' }}>{cat} SERVICES</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {groupedServices[cat].map(service => {
                        const inCart = cart.some(item => item.id === service.id);
                        return (
                          <div key={service.id} style={{
                            background: inCart ? 'rgba(169, 27, 24, 0.05)' : '#131926',
                            borderRadius: '0.5rem', padding: '1.75rem',
                            border: `1px solid ${inCart ? 'var(--primary-color)' : 'rgba(255,255,255,0.02)'}`,
                            transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                          }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>{service.name}</h4>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ color: 'var(--primary-color)', fontWeight: '900', fontSize: '1.2rem' }}>₱{service.price}</span>
                                </div>
                              </div>
                              <p style={{ fontSize: '1rem', opacity: 0.5, marginBottom: '1.5rem', lineHeight: 1.5 }}>{service.description}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', opacity: 0.5, marginBottom: '1.5rem', fontWeight: '700' }}>
                                <Clock size={14} /> {service.duration_minutes} MINS
                              </div>
                            </div>
                            <button
                              onClick={() => inCart ? removeFromCart(service.id) : addToCart(service)}
                              style={{
                                width: '100%', padding: '0.9rem', borderRadius: '0.5rem',
                                border: inCart ? '1px solid var(--primary-color)' : 'none',
                                background: inCart ? 'transparent' : 'var(--primary-color)',
                                color: inCart ? 'var(--primary-color)' : '#fff', fontWeight: '900', cursor: 'pointer',
                                fontSize: '0.8rem', transition: 'all 0.2s', textTransform: 'uppercase'
                              }}
                            >
                              {inCart ? 'REMOVE' : 'ADD TO BAG'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <PublicFooter />
      </div>

      {/* Smart Bag Overlay */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1500, width: '92%', maxWidth: '450px',
          background: '#131926', padding: '0.75rem 1.25rem', borderRadius: '1rem',
          border: '1px solid rgba(169, 27, 24, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', animation: 'bagPop 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--primary-color)', color: '#fff', padding: '0.6rem', borderRadius: '0.75rem' }}><ShoppingBag size={20} /></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '900' }}>₱{totalAmount}</h4>
              <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6, fontWeight: '700' }}>{cart.length} ITEMS</p>
            </div>
          </div>
          <button onClick={handleCheckout} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '0.7rem 1.75rem', borderRadius: '0.75rem', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase' }}>PROCEED</button>
        </div>
      )}

      {showLoginModal && <Login isModal={true} onClose={() => setShowLoginModal(false)} />}

      <style>{`
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes bagPop { from { transform: translateX(-50%) translateY(50px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        @media (max-width: 1024px) {
          .responsive-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
