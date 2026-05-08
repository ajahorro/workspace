import React from 'react';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem',
      minHeight: '300px'
    }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(169, 27, 24, 0.1)',
          borderTopColor: 'var(--primary-color, #a91b18)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p style={{
        marginTop: '1rem',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.95rem',
        fontWeight: '500'
      }}>
        {message}
      </p>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingState;
