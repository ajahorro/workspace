import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchAndSyncProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      
      if (sessionUser) {
        await fetchAndSyncProfile(sessionUser);
      } else {
        // Clean up state if session is lost/signed out
        setProfile(null);
        localStorage.removeItem('speedway_profile');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAndSyncProfile = async (currentUser) => {
    try {
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (pData) {
        if (['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(pData.role)) {
          const { data: internalData } = await supabase
            .from('internal_personnel')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();
          const merged = { ...pData, ...internalData };
          setProfile(merged);
          localStorage.setItem('speedway_profile', JSON.stringify(merged));
        } else {
          setProfile(pData);
          localStorage.setItem('speedway_profile', JSON.stringify(pData));
        }
      } else {
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || 'Fleet Member',
            email: currentUser.email,
            role: currentUser.user_metadata?.role || 'CUSTOMER'
          })
          .select()
          .single();

        if (newProfile) {
          setProfile(newProfile);
          localStorage.setItem('speedway_profile', JSON.stringify(newProfile));
        }
      }
    } catch (err) {
      console.error('Profile sync failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // FIXED SIGN OUT LOGIC
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Signout error:', err.message);
    } finally {
      // Always clear local state even if the server-side signout fails
      setUser(null);
      setProfile(null);
      localStorage.removeItem('speedway_profile');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signInWithPassword: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut // Passing the new function
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);