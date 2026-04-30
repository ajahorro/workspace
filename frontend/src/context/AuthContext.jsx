import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Failsafe: if Supabase is slow, render the app after 5 seconds anyway
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user || null;
        setUser(sessionUser);
        if (sessionUser) {
          await fetchProfile(sessionUser.id, sessionUser.email);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
      clearTimeout(timeout);
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      if (sessionUser) {
        await fetchProfile(sessionUser.id, sessionUser.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, userEmail) => {
    const fallbackProfile = { id: userId, role: 'CUSTOMER', email: userEmail };
    
    // Race: profile fetch vs 3-second timeout
    const profilePromise = (async () => {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        
        if (!data) {
          const { data: newProfile } = await supabase.from('profiles').insert([{ 
            id: userId, 
            role: 'CUSTOMER',
            email: userEmail 
          }]).select().maybeSingle();
          return newProfile || fallbackProfile;
        }
        return data;
      } catch (err) {
        return fallbackProfile;
      }
    })();

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(fallbackProfile), 3000);
    });

    const result = await Promise.race([profilePromise, timeoutPromise]);
    setProfile(result);
    setLoading(false);
  };

  const signInWithOTP = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin
      }
    });
    return { error };
  };

  const signInWithPassword = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const verifyOTP = async (email, token, type = 'email') => {
    return await supabase.auth.verifyOtp({
      email,
      token,
      type
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithOTP, signInWithPassword, verifyOTP, signOut }}>
      {loading ? (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: '#38bdf8' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #1e293b', borderTop: '3px solid #38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
            <p style={{ margin: 0, fontWeight: '600' }}>RENEW</p>
          </div>
        </div>
      ) : children}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
