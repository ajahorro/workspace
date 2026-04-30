import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, ShieldCheck, Phone, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = ({ isModal = false, onClose }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('LOGIN'); // LOGIN, REGISTER, OTP_VERIFY
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, profile, signInWithPassword, verifyOTP } = useAuth();

  useEffect(() => {
    if (user && profile && !isModal) {
      const routes = {
        ADMIN: '/admin',
        SUPER_ADMIN: '/admin',
        STAFF: '/staff',
        CUSTOMER: '/dashboard'
      };
      navigate(routes[profile.role] || '/dashboard');
    }
  }, [user, profile, navigate, isModal]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signInWithPassword(email, password);
    if (error) toast.error(error.message);
    else {
      toast.success('Welcome back!');
      if (onClose) onClose();
    }
    setIsLoading(false);
  };

  const handleStartRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Safety timer to warn about slow Supabase email provider
    const timer = setTimeout(() => {
      toast('Still working on it. This may take a moment...', { icon: '⏳' });
    }, 8000);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      clearTimeout(timer);
      if (error) throw error;

      // Supabase returns a user with no identities if the email already exists
      if (data?.user && data.user.identities?.length === 0) {
        toast.error('Email already exists!', { id: 'auth-toast' });
        setIsLoading(false);
        return;
      }
      
      toast.success('Code sent to your email!');
      setMode('OTP_VERIFY');
    } catch (error) {
      clearTimeout(timer);
      toast.error(error.message || 'Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // If we just registered, the verification type is 'signup'
    const type = mode === 'OTP_VERIFY' ? 'signup' : 'email';
    const { error } = await verifyOTP(email, otp, type);
    if (error) toast.error(error.message);
    else {
      toast.success('Account verified!');
      if (fullName || phone) {
        // Save profile details
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ 
            full_name: fullName,
            phone: phone 
          }).eq('id', user.id);
        }
      }
      if (onClose) onClose();
      else navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const inputStyle = {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    borderRadius: '0.75rem',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const buttonStyle = {
    width: '100%',
    background: '#38bdf8',
    color: '#000',
    padding: '0.875rem',
    borderRadius: '0.75rem',
    border: 'none',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem'
  };

  const overlayStyle = isModal ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
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
    background: '#0f172a'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '420px',
    background: '#1e293b',
    padding: '2.5rem',
    borderRadius: '1.5rem',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #334155',
    animation: 'modalIn 0.3s ease-out'
  };

  return (
    <div style={overlayStyle} onClick={isModal ? onClose : undefined}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
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
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: '#38bdf8', letterSpacing: '2px' }}>RENEW</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {mode === 'LOGIN' ? 'Welcome back' : mode === 'REGISTER' ? 'Create your account' : 'Verify your account'}
          </p>
        </div>

        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin}>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
            </div>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} autoComplete="current-password" />
            </div>
            <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Processing...' : 'Login'}</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              Don't have an account? <span onClick={() => setMode('REGISTER')} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: '600' }}>Register</span>
            </p>
          </form>
        )}

        {mode === 'REGISTER' && (
          <form onSubmit={handleStartRegister}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <User size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Full Name" required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Phone size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="tel" placeholder="Phone Number" required value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="password" placeholder="Create Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} autoComplete="new-password" />
            </div>
            <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Sending Code...' : 'Register'}</button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
              Already have an account? <span onClick={() => setMode('LOGIN')} style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: '600' }}>Login</span>
            </p>
          </form>
        )}

        {mode === 'OTP_VERIFY' && (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter the 6-digit code sent to <br/><span style={{ color: '#fff', fontWeight: '600' }}>{email}</span>
            </p>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <ShieldCheck size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="000000" required value={otp} onChange={e => setOtp(e.target.value)} style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }} />
            </div>
            <button type="submit" disabled={isLoading} style={buttonStyle}>{isLoading ? 'Verifying...' : 'Complete Registration'}</button>
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
