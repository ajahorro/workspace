import React from 'react';
import { Link } from 'react-router-dom';

const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'rgba(13, 22, 36, 0.8)',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      padding: '3rem 1.5rem 2rem',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1700px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '900',
            color: '#fff',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '-1px'
          }}>
            SpeedWay
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.9rem',
            lineHeight: 1.6
          }}>
            Premium auto detailing services for your vehicle. Quality care, exceptional results.
          </p>
        </div>

        <div>
          <h4 style={{
            fontSize: '0.95rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '1rem',
            textTransform: 'uppercase'
          }}>
            Quick Links
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <li>
              <Link
                to="/"
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/faq"
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{
            fontSize: '0.95rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '1rem',
            textTransform: 'uppercase'
          }}>
            Contact
          </h4>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Email: info@speedway.com<br/>
            Phone: (123) 456-7890
          </p>
        </div>
      </div>

      <div style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '1.5rem',
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.85rem'
      }}>
        &copy; {currentYear} SpeedWay AutoxMoto Detail Studio. All rights reserved.
      </div>
    </footer>
  );
};

export default PublicFooter;
