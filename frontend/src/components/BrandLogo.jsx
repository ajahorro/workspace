import React, { useState } from 'react';

const BrandLogo = ({ width = 'auto', height = '32px', style = {} }) => {
  const [error, setError] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', ...style }}>
      {!error ? (
        <img 
          src="/speedway-removebg-preview.png" 
          alt="SpeedWay Studio" 
          style={{ 
            width: width,
            height: height, 
            display: 'block',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.1))'
          }} 
          onError={() => setError(true)}
        />
      ) : (
        <div style={{
          height: height,
          display: 'flex',
          alignItems: 'center',
          fontWeight: '900',
          color: 'var(--admin-brand)',
          fontSize: `calc(${height} * 0.4)`,
          letterSpacing: '1px'
        }}>
          SPEEDWAY
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
