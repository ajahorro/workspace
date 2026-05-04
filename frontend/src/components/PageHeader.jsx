import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

const PageHeader = ({ title, subtitle, badge, onRefresh, children }) => {
  const [isRotating, setIsRotating] = React.useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleRefresh = () => {
    setIsRotating(true);
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
    setTimeout(() => setIsRotating(false), 600);
  };

  return (
    <div style={{ marginBottom: isMobile ? '0.75rem' : '1.25rem', position: 'relative' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        gap: isMobile ? '1.25rem' : '0'
      }}>
        <div style={{ flex: 1, width: '100%' }}>
          {badge && (
            <div className="badge" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.35rem 1rem', 
              borderRadius: '5rem', 
              marginBottom: '0.75rem', 
              fontSize: '0.65rem', 
              fontWeight: '900', 
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              {badge}
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 style={{ 
              fontSize: isMobile ? '1.75rem' : '2.5rem', 
              fontWeight: '900', 
              margin: 0, 
              letterSpacing: '-1.5px', 
              textTransform: 'uppercase', 
              lineHeight: 1.1,
              color: 'var(--text-primary)'
            }}>
              {title}
            </h1>
            
            <button 
              onClick={handleRefresh}
              title="Refresh Page"
              style={{ 
                background: 'var(--bg-panel)', 
                border: '1px solid var(--glass-border)', 
                color: 'var(--panel-text)', 
                width: '32px', 
                height: '32px', 
                borderRadius: '0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <RefreshCw 
                size={16} 
                style={{ 
                  transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isRotating ? 'rotate(360deg)' : 'rotate(0deg)'
                }} 
              />
            </button>
          </div>
 
          {subtitle && (
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              color: 'var(--text-secondary)', 
              fontSize: isMobile ? '0.85rem' : '1rem', 
              fontWeight: '500',
              maxWidth: '600px',
              lineHeight: 1.5
            }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Right side children */}
        {children && (
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
