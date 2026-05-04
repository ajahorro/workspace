import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, ShieldCheck, Phone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { sendBookingConfirmation } from '../services/EmailService';

const Login = ({ isModal = false, onClose }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('LOGIN'); // LOGIN, REGISTER
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isMobile = useMediaQuery('(max-width: 640px)');
  const { user, profile, signInWithPassword } = useAuth();
  const sampleBookingData = {
    serviceName: 'Premium Wash & Detail',
    date: '2026-05-10',
    time: '10:30 AM',
    totalPrice: '1,499.00'
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
      setMode('RESET');
    }
  }, []);

  useEffect(() => {
    if (user && profile && mode !== 'RESET') {
      const routes = {
        ADMIN: '/admin',
        SUPER_ADMIN: '/admin',
        CUSTOMER: '/dashboard'
      };
      navigate(routes[profile.role] || '/dashboard');
      if (isModal && onClose) {
        onClose();
      }
    }
  }, [user, profile, navigate, isModal, onClose, mode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      toast.error(error.message, {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } else {
      toast.success('Welcome back!', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully! Please login.', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      setMode('LOGIN');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to update password', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Safety timer to warn about slow Supabase email provider
    const timer = setTimeout(() => {
      toast('Still working on it. This may take a moment...', { 
        icon: '⏳',
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
    }, 8000);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            phone_number: phone
          }
        }
      });

      clearTimeout(timer);
      console.log('SignUp response - Data:', data);
      console.log('SignUp response - Error:', error);

      if (error) {
        console.error('Signup error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        throw error;
      }

      // Supabase returns a user with no identities if the email already exists
      if (data?.user && data.user.identities?.length === 0) {
        console.warn('User created but no identities found - email may already exist');
        toast.error('Email already exists!', { 
          id: 'auth-toast',
          style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
        });
        setIsLoading(false);
        return;
      }

      console.log('Signup successful for user:', data?.user?.id);
      toast.success('Confirmation email sent! Check your inbox to verify your account.', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      setMode('LOGIN');
      setEmail('');
      setPassword('');
    } catch (error) {
      clearTimeout(timer);
      console.error('Registration error full details:', error);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      toast.error(error.message || 'Failed to send confirmation email. Please try again.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Check if it's a staff personal email first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('secondary_email', email)
        .maybeSingle();

      if (profileData) {
        // It's a staff member using their recovery email
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'recover-staff', email })
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        toast.success('Recovery link sent to your personal email!', {
          style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
        });
      } else {
        // Try standard Supabase reset (primary email)
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?reset=true`,
        });
        if (resetError) throw resetError;
        toast.success('Password reset link sent to your email!', {
          style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
        });
      }
      setMode('LOGIN');
    } catch (err) {
      toast.error(err.message || 'Failed to send recovery link.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--admin-bg)',
    border: '1px solid var(--admin-border)',
    padding: '1rem 1rem 1rem 3rem',
    borderRadius: '0.85rem',
    color: 'var(--admin-text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxSizing: 'border-box'
  };

  const buttonStyle = {
    width: '100%',
    background: 'var(--admin-brand)',
    color: '#FFFFFF',
    padding: '1.1rem',
    borderRadius: '0.85rem',
    border: 'none',
    fontWeight: '900',
    fontSize: '0.95rem',
    cursor: 'pointer',
    marginTop: '1.5rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 8px 25px rgba(169, 27, 24, 0.25)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const overlayStyle = isModal ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '1rem'
  } : {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    padding: '1rem'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '440px',
    background: 'var(--admin-card)',
    padding: isMobile ? '2rem' : '3rem',
    borderRadius: '2rem',
    position: 'relative',
    boxShadow: 'var(--admin-card-shadow)',
    border: '1px solid var(--admin-border)',
    color: 'var(--admin-text-primary)',
    animation: 'modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
  };

  const BlurGlow = ({ top, left, right, bottom, size, color }) => (
    <div style={{
      position: 'absolute',
      top, left, right, bottom,
      width: size,
      height: size,
      background: color || 'rgba(169, 27, 24, 0.2)',
      filter: 'blur(150px)',
      borderRadius: '50%',
      zIndex: 0,
      pointerEvents: 'none',
      opacity: 0.5
    }} />
  );

  return (
    <div style={{ ...overlayStyle, overflow: 'hidden', background: isModal ? 'rgba(0,0,0,0.85)' : 'var(--bg-primary)' }} onClick={isModal ? onClose : undefined}>
      {/* Universal Glows */}
      <BlurGlow top="-5%" left="-5%" size="800px" color="rgba(169, 27, 24, 0.3)" />
      <BlurGlow top="20%" right="-5%" size="700px" color="rgba(169, 27, 24, 0.2)" />
      <BlurGlow bottom="5%" right="0%" size="800px" color="rgba(169, 27, 24, 0.2)" />

      <div style={{ ...cardStyle, zIndex: 10 }} onClick={e => e.stopPropagation()}>
        {isModal && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '950', color: 'var(--admin-text-primary)', letterSpacing: '1.5px', textTransform: 'uppercase', lineHeight: '1.2' }}>SpeedWay Detail Studio</h1>
          <p style={{ color: 'var(--admin-text-secondary)', opacity: 0.6, marginTop: '0.6rem', fontSize: '0.85rem', fontWeight: '600' }}>
            {mode === 'LOGIN' ? 'WELCOME BACK' : mode === 'REGISTER' ? 'CREATE YOUR ACCOUNT' : mode === 'RECOVER' ? 'RESET YOUR PASSWORD' : 'VERIFY YOUR ACCOUNT'}
          </p>
        </div>

        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin}>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Mail size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
            </div>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Lock size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} autoComplete="current-password" />
            </div>
            <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Processing...' : 'Login'}</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
              <p style={{ margin: 0, color: 'var(--admin-text-secondary)', fontWeight: '600' }}>
                Don't have an account? <span onClick={() => setMode('REGISTER')} style={{ color: 'var(--admin-brand)', cursor: 'pointer', fontWeight: '900', textDecoration: 'none' }}>Register</span>
              </p>
              <span onClick={() => setMode('RECOVER')} style={{ color: 'var(--admin-text-secondary)', cursor: 'pointer', fontWeight: '700', opacity: 0.6 }}>Forgot Password?</span>
            </div>
          </form>
        )}

        {mode === 'REGISTER' && (
          <form onSubmit={handleStartRegister}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <User size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input type="text" placeholder="Full Name" required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} autoComplete="name" />
            </div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Mail size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
            </div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Phone size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input type="tel" placeholder="Phone Number" required value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} autoComplete="tel" />
            </div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Lock size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input type="password" placeholder="Create Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} autoComplete="new-password" />
            </div>
            <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Sending...' : 'Register'}</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
              Already have an account? <span onClick={() => setMode('LOGIN')} style={{ color: 'var(--admin-brand)', cursor: 'pointer', fontWeight: '900' }}>Login</span>
            </p>
          </form>
        )}



        {mode === 'RECOVER' && (
          <form onSubmit={handleRecover}>
            <p style={{ textAlign: 'center', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.6', fontWeight: '500', opacity: 0.8 }}>
              Enter your email address to receive a <br />password reset link.
            </p>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Mail size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
            </div>
            <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Sending...' : 'Send Recovery Link'}</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
              Remember your password? <span onClick={() => setMode('LOGIN')} style={{ color: 'var(--admin-brand)', cursor: 'pointer', fontWeight: '900' }}>Login</span>
            </p>
          </form>
        )}

        {mode === 'RESET' && (
          <form onSubmit={handleResetPassword}>
            <p style={{ textAlign: 'center', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.6', fontWeight: '500', opacity: 0.8 }}>
              Create a new secure password for <br />your account.
            </p>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Lock size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input 
                type="password" 
                placeholder="New Password" 
                required 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                style={inputStyle} 
                autoComplete="new-password"
              />
            </div>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Lock size={18} color="var(--admin-brand)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                style={inputStyle} 
                autoComplete="new-password"
              />
            </div>
            <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Updating...' : 'Update Password'}</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: '600' }}>
              Back to <span onClick={() => setMode('LOGIN')} style={{ color: 'var(--admin-brand)', cursor: 'pointer', fontWeight: '900' }}>Login</span>
            </p>
          </form>
        )}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
