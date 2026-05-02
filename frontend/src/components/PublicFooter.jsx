import React from 'react';
import { useNavigate } from 'react-router-dom';

const PublicFooter = () => {
  const navigate = useNavigate();

  return (
    <footer id="footer" style={{ padding: '40px 1.5rem', borderTop: '1px solid rgba(255,255,255,0.01)', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '1700px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-1px' }}>SpeedWay AutoxMoto Detail Studio</h3>
          <p style={{ fontSize: '1rem', opacity: 0.4, lineHeight: 1.4, maxWidth: '250px' }}>Premium auto detailing. Precision at every step.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h5 style={{ fontSize: '0.75rem', fontWeight: '900', opacity: 0.8 }}>NAVIGATE</h5>
            {['Home', 'About', 'Services', 'FAQ'].map(link => (
              <a 
                key={link} 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (link === 'FAQ') navigate('/faq');
                  else if (link === 'About') {
                    if (window.location.pathname === '/faq') navigate('/landing#about-section');
                    else document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
                  } else if (link === 'Services') {
                    if (window.location.pathname === '/faq') navigate('/landing#services-section');
                    else document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    if (window.location.pathname === '/faq') navigate('/');
                    else window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                style={{ color: '#fff', opacity: 0.35, textDecoration: 'none', fontSize: '1rem' }}
              >
                {link}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h5 style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.7 }}>SOCIAL</h5>
            {['Instagram', 'Facebook'].map(link => (
              <a key={link} href="#" style={{ color: '#fff', opacity: 0.3, textDecoration: 'none', fontSize: '1rem' }}>{link}</a>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h5 style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.7 }}>VISIT</h5>
            <p style={{ margin: 0, fontSize: '1rem', opacity: 0.3 }}>Mandaluyong, MM</p>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '1700px', margin: '3rem auto 0 auto', opacity: 0.1, fontSize: '0.7rem', textAlign: 'center' }}>
        &copy; 2026 SpeedWay AutoxMoto Detail Studio.
      </div>
    </footer>
  );
};

export default PublicFooter;
