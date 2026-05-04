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
          background: 'var(--bg-panel)',
          width: '90%',
          maxWidth: '400px',
          padding: '2rem',
          borderRadius: '1.5rem',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          color: 'var(--panel-text)',
          backdropFilter: 'blur(10px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => toast.dismiss(t.id)}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--panel-text)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 0.4
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.opacity = 1; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = 0.4; }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(var(--primary-rgb), 0.1)',
          borderRadius: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary-color)',
          margin: '0 auto 1.5rem auto',
          border: '1px solid var(--glass-border)'
        }}>
          <LogOut size={28} />
        </div>

        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '800', 
          margin: '0 0 0.75rem 0', 
          color: 'var(--panel-text)',
          textAlign: 'center',
          letterSpacing: '-0.5px'
        }}>
          Confirm Logout
        </h2>
        
        <p style={{ 
          fontSize: '0.9rem', 
          color: 'var(--panel-text)', 
          margin: '0 0 2rem 0',
          textAlign: 'center',
          lineHeight: '1.6',
          opacity: 0.6,
          fontWeight: '500'
        }}>
          Are you sure you want to end your session? You will need to log in again to access your account.
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ 
              flex: 1,
              padding: '0.875rem', 
              background: 'transparent', 
              border: '1px solid var(--glass-border)', 
              color: 'var(--panel-text)', 
              borderRadius: '0.875rem', 
              cursor: 'pointer', 
              fontWeight: '700',
              fontSize: '0.85rem',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
              padding: '0.875rem', 
              background: 'var(--primary-color)', 
              border: 'none', 
              color: '#FFFFFF', 
              borderRadius: '0.875rem', 
              cursor: 'pointer', 
              fontWeight: '800',
              fontSize: '0.85rem',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
