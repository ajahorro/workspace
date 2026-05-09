import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
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
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
    // Success is handled by the useEffect above
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
          // This will redirect user back to your app after they click the email link
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      if (data?.user?.identities?.length === 0) {
        toast.error("This email is already registered.");
      } else {
        toast.success('Verification link sent to your email!', { duration: 6000 });
        setMode('LOGIN');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = { width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '0.85rem', color: 'white', marginBottom: '1rem' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: '#1e293b', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid #334155' }}>
        <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '2rem' }}>SPEEDWAY STUDIO</h2>
        
        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <button disabled={isLoading} style={{ width: '100%', padding: '1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
              {isLoading ? <Loader2 className="animate-spin" style={{margin: '0 auto'}} /> : 'LOGIN'}
            </button>
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
              Need an account? <span onClick={() => setMode('REGISTER')} style={{ color: '#ef4444', cursor: 'pointer' }}>Register</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <input placeholder="Full Name" required value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            <input placeholder="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Phone" required value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            <input placeholder="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <button disabled={isLoading} style={{ width: '100%', padding: '1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
              {isLoading ? 'SENDING LINK...' : 'CREATE ACCOUNT'}
            </button>
            <p onClick={() => setMode('LOGIN')} style={{ color: '#94a3b8', textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', cursor: 'pointer' }}>Back to Login</p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;