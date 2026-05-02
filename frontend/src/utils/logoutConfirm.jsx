import React from 'react';
import toast from 'react-hot-toast';
import { LogOut, X } from 'lucide-react';

export const confirmLogout = (onConfirm) => {
  toast.custom((t) => (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={() => toast.dismiss(t.id)}
    >
      <div 
        style={{
          background: 'var(--bg-secondary)',
          width: '90%',
          maxWidth: '400px',
          padding: 'min(2.5rem, 6vw)',
          borderRadius: '1.5rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => toast.dismiss(t.id)}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <X size={20} />
        </button>

        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          margin: '0 auto 1.5rem auto',
          border: '1px solid var(--border-color)'
        }}>
          <LogOut size={30} />
        </div>

        <h2 style={{ 
          fontSize: 'min(1.75rem, 8vw)', 
          fontWeight: '900', 
          margin: '0 0 0.75rem 0', 
          color: 'var(--text-primary)',
          textAlign: 'center',
          letterSpacing: '-0.5px'
        }}>
          Confirm Logout
        </h2>
        
        <p style={{ 
          fontSize: '0.95rem', 
          color: 'var(--text-secondary)', 
          margin: '0 0 2.5rem 0',
          textAlign: 'center',
          lineHeight: '1.6'
        }}>
          Are you sure you want to end your session? You will need to log in again to access your account.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ 
              flex: 1,
              padding: '1rem', 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              borderRadius: '0.75rem', 
              cursor: 'pointer', 
              fontWeight: '700',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
            }}
            style={{ 
              flex: 1,
              padding: '1rem', 
              background: '#ef4444', 
              border: 'none', 
              color: '#fff', 
              borderRadius: '0.75rem', 
              cursor: 'pointer', 
              fontWeight: '800',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            Log Out
          </button>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { 
            from { opacity: 0; transform: translateY(20px) scale(0.95); } 
            to { opacity: 1; transform: translateY(0) scale(1); } 
          }
        `}</style>
      </div>
    </div>
  ), { duration: Infinity });
};
