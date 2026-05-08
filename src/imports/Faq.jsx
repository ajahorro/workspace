import React, { useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import Login from './Login';

const Faq = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div style={{ 
      background: 'var(--bg-primary)', 
      color: '#fff', 
      minHeight: '100vh', 
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Universal Glows */}
      <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '800px', height: '800px', background: 'rgba(169, 27, 24, 0.3)', filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none', opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: '20%', right: '-5%', width: '700px', height: '700px', background: 'rgba(169, 27, 24, 0.2)', filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none', opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: '5%', right: '0%', width: '800px', height: '800px', background: 'rgba(169, 27, 24, 0.2)', filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none', opacity: 0.5 }} />

      <PublicHeader setShowLoginModal={setShowLoginModal} />

      {/* Animated Content */}
      <div style={{ 
        animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <div style={{ maxWidth: '1700px', margin: '0 auto', padding: '120px 1.5rem 60px 1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(169, 27, 24, 0.08)', color: 'var(--primary-color)', padding: '0.4rem 1rem', borderRadius: '5rem', marginBottom: '1.25rem', border: '1px solid rgba(169, 27, 24, 0.12)', fontSize: '0.75rem', fontWeight: '800' }}>
               SUPPORT CENTER
            </div>
            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 8vw, 4rem)', 
              fontWeight: '900', 
              textTransform: 'uppercase', 
              letterSpacing: '-2px',
              lineHeight: 0.95,
              margin: 0
            }}>
              Frequently <br/> Asked Questions
            </h1>
          </div>

          <div style={{ 
            background: 'rgba(13, 22, 36, 0.4)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.02)', 
            padding: 'clamp(2rem, 10vw, 8rem) 2rem', 
            borderRadius: '1rem',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            marginBottom: '4rem'
          }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', opacity: 0.1, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', margin: 0 }}>
              UNDER CONSTRUCTION
            </h2>
            <p style={{ marginTop: '1.5rem', opacity: 0.4, fontSize: '1.1rem', maxWidth: '600px', margin: '1.5rem auto 0 auto', lineHeight: 1.6 }}>
              Our team is currently documenting common inquiries to better serve you. Please check back shortly for a comprehensive guide to our services.
            </p>
          </div>
        </div>

        <PublicFooter />
      </div>

      {showLoginModal && <Login isModal={true} onClose={() => setShowLoginModal(false)} />}

      <style>{`
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Faq;
