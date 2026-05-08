import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PublicHeaderProps {
  setShowLoginModal?: (show: boolean) => void;
}

const PublicHeader: React.FC<PublicHeaderProps> = ({ setShowLoginModal }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handleLoginClick = () => {
    if (setShowLoginModal) {
      setShowLoginModal(true);
    } else {
      navigate('/login');
    }
  };

  const handleDashboardClick = () => {
    if (!profile) return;

    const routes = {
      ADMIN: '/admin',
      SUPER_ADMIN: '/admin',
      STAFF: '/staff',
      CUSTOMER: '/dashboard'
    };
    navigate(routes[profile.role] || '/dashboard');
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'rgba(13, 22, 36, 0.6)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '1rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '1700px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link
          to="/"
          style={{
            fontSize: '1.5rem',
            fontWeight: '900',
            color: '#fff',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '-1px'
          }}
        >
          SpeedWay
        </Link>

        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link
            to="/faq"
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
          >
            FAQ
          </Link>

          {user && profile ? (
            <button
              onClick={handleDashboardClick}
              style={{
                background: 'var(--primary-color, #a91b18)',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={handleLoginClick}
              style={{
                background: 'var(--primary-color, #a91b18)',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Get Started
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
