import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Phone, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = ({ isModal = false, onClose }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('LOGIN'); // LOGIN, REGISTER
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user, profile, signInWithPassword } = useAuth();

  useEffect(() => {
    if (user && profile) {
      const routes = {
        ADMIN: '/admin',
        SUPER_ADMIN: '/admin',
        STAFF: '/staff/tasks',
        CUSTOMER: '/dashboard'
      };
      navigate(routes[profile.role] || '/dashboard');
      if (isModal && onClose) onClose();
    }
  }, [user, profile, navigate, isModal, onClose]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: fullName, 
            phone_number: phone, 
            role: 'CUSTOMER' 
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      // Handle cases where email is already in Auth but unconfirmed
      if (data?.user?.identities?.length === 0) {
        toast.error("This email is already in our system. Please check your inbox for the confirmation link or try logging in.");
      } else {
        toast.success('Confirmation link sent! Please check your email.', { duration: 6000 });
        setMode('LOGIN');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 9999, padding: '1rem'
  };

  const cardStyle = {
    width: '100%', maxWidth: '400px', background: 'rgba(23, 23, 23, 0.85)',
    padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative', color: 'white'
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '1rem', borderRadius: '0.75rem', color: 'white', marginBottom: '1rem', outline: 'none'
  };

  return (
    <div style={isModal ? overlayStyle : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050A15' }} onClick={isModal ? onClose : undefined}>
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        {isModal && (
          <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        )}
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>SPEEDWAY STUDIO</h2>
        
        <form onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister}>
          {mode === 'REGISTER' && (
            <input placeholder="Full Name" required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
          )}
          <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          {mode === 'REGISTER' && (
            <input placeholder="Phone Number" required value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          )}
          <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
            {isLoading ? <Loader2 className="animate-spin" style={{margin: '0 auto'}} size={18} /> : mode}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          {mode === 'LOGIN' ? "Need an account?" : "Already have an account?"}{' '}
          <span onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} style={{ color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>
            {mode === 'LOGIN' ? 'Register' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;