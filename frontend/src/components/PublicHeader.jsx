import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const PublicHeader = ({ setShowLoginModal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e, item) => {
    e.preventDefault();
    const isLanding = location.pathname === '/' || location.pathname === '/landing';

    if (item === 'HOME' || item === 'FAQ') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (item === 'FAQ') navigate('/faq');
      else navigate('/');
    } else if (item === 'SERVICES') {
      if (isLanding) document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
      else navigate('/landing#services-section');
    } else if (item === 'ABOUT') {
      if (isLanding) document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
      else navigate('/landing#about-section');
    } else if (item === 'CONTACT') {
      const footer = document.getElementById('footer');
      if (footer) footer.scrollIntoView({ behavior: 'smooth' });
      else navigate('/landing#footer');
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header style={{ 
        position: 'fixed', 
        top: 0, left: 0, right: 0, 
        zIndex: 1000, 
        padding: '1rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'rgba(5, 10, 21, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/'); }}>
            <BrandLogo height="45px" />
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center', flex: 2, justifyContent: 'center' }} className="desktop-nav">
          {['HOME', 'ABOUT', 'SERVICES', 'FAQ', 'CONTACT'].map((item) => (
            <a 
              key={item} 
              href="#" 
              onClick={(e) => handleNavClick(e, item)}
              style={{ 
                textDecoration: 'none', 
                color: '#fff', 
                fontSize: '0.85rem', 
                fontWeight: '700', 
                opacity: (location.pathname === '/faq' && item === 'FAQ') ? 1 : 0.7,
                letterSpacing: '1.25px',
                transition: 'opacity 0.2s'
              }}
            >
              {item}
            </a>
          ))}
        </nav>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          {user ? (
            <button 
              className="desktop-nav"
              onClick={() => {
                const routes = {
                  ADMIN: '/admin',
                  SUPER_ADMIN: '/admin',
                  STAFF: '/staff',
                  CUSTOMER: '/dashboard'
                };
                navigate(profile?.role ? routes[profile.role] : '/dashboard');
              }}
              style={{ 
                background: 'var(--primary-color)', 
                color: '#fff', 
                border: 'none',
                padding: '0.65rem 1.75rem',
                borderRadius: '5rem',
                fontSize: '0.85rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 0 25px rgba(169, 27, 24, 0.25)'
              }}
            >
              DASHBOARD
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }} className="desktop-nav">
              {/* REGISTER BUTTON */}
              <button 
                onClick={() => setShowLoginModal ? setShowLoginModal(true) : navigate('/login')}
                style={{ 
                  background: 'transparent', 
                  color: '#fff', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '5rem',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              >
                <UserPlus size={16} /> REGISTER
              </button>

              {/* LOGIN BUTTON */}
              <button 
                onClick={() => setShowLoginModal ? setShowLoginModal(true) : navigate('/login')}
                style={{ 
                  background: 'var(--primary-color)', 
                  color: '#fff', 
                  border: 'none',
                  padding: '0.65rem 1.75rem',
                  borderRadius: '5rem',
                  fontSize: '0.85rem',
                  fontWeight: '900',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 0 25px rgba(169, 27, 24, 0.25)'
                }}
              >
                <LogIn size={16} /> LOGIN
              </button>
            </div>
          )}
          
          <button 
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'none', padding: '0.5rem' }}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-primary)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2.5rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          {['HOME', 'ABOUT', 'SERVICES', 'FAQ', 'CONTACT'].map((item) => (
            <a 
              key={item} 
              href="#" 
              onClick={(e) => handleNavClick(e, item)}
              style={{ 
                textDecoration: 'none', 
                color: '#fff', 
                fontSize: '1.5rem', 
                fontWeight: '900', 
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              {item}
            </a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '80%', maxWidth: '300px' }}>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                setShowLoginModal ? setShowLoginModal(true) : navigate('/login');
              }}
              style={{ 
                background: 'var(--primary-color)', 
                color: '#fff', 
                border: 'none',
                padding: '1rem',
                borderRadius: '5rem',
                fontSize: '1.1rem',
                fontWeight: '900',
                cursor: 'pointer'
              }}
            >
              LOGIN
            </button>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                setShowLoginModal ? setShowLoginModal(true) : navigate('/login');
              }}
              style={{ 
                background: 'transparent', 
                color: '#fff', 
                border: '1px solid var(--primary-color)',
                padding: '1rem',
                borderRadius: '5rem',
                fontSize: '1.1rem',
                fontWeight: '900',
                cursor: 'pointer'
              }}
            >
              REGISTER
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default PublicHeader;