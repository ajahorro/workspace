import React from 'react';

const LoadingState = ({ message = 'Synchronizing data...' }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '6rem 2rem',
      gap: '1.5rem',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{ position: 'relative', width: '50px', height: '50px' }}>
        {/* Outer Ring */}
        <div style={{ 
          position: 'absolute',
          width: '100%', 
          height: '100%', 
          border: '3px solid rgba(169, 27, 24, 0.1)', 
          borderRadius: '50%' 
        }}></div>
        {/* Animated Ring */}
        <div style={{ 
          position: 'absolute',
          width: '100%', 
          height: '100%', 
          border: '3px solid transparent', 
          borderTop: '3px solid var(--primary-color)', 
          borderRadius: '50%',
          animation: 'spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite'
        }}></div>
        {/* Inner Pulse */}
        <div style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          background: 'var(--primary-color)',
          borderRadius: '50%',
          boxShadow: '0 0 15px var(--primary-color)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}></div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ 
          margin: 0, 
          fontSize: '0.85rem', 
          fontWeight: '900', 
          color: 'var(--primary-color)', 
          letterSpacing: '2px', 
          textTransform: 'uppercase' 
        }}>
          {message}
        </p>
        <p style={{ 
          margin: '0.4rem 0 0 0', 
          fontSize: '0.75rem', 
          color: 'rgba(255,255,255,0.2)', 
          fontWeight: '600' 
        }}>
          Please wait while we fetch the latest information.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); } 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default LoadingState;
