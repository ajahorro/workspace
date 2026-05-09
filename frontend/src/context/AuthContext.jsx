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
        console.error("Init Auth Error:", err);
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
        setProfile(null);
        localStorage.removeItem('speedway_profile');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAndSyncProfile = async (currentUser) => {
    console.log("[AUTH] Syncing profile for:", currentUser.email);
    try {
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (pError) {
        console.error("[AUTH] Profile Table Error:", pError);
        throw pError;
      }

      console.log("[AUTH] Profile Table Role:", pData.role);

      if (['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(pData.role)) {
        const { data: internalData } = await supabase
          .from('internal_personnel')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        const merged = { ...pData, ...(internalData || {}) };
        console.log("[AUTH] Final Admin Profile:", merged);
        setProfile(merged);
        localStorage.setItem('speedway_profile', JSON.stringify(merged));
      } else {
        setProfile(pData);
        localStorage.setItem('speedway_profile', JSON.stringify(pData));
      }
    } catch (err) {
      console.warn("[AUTH] Using Metadata Fallback for role...");
      const metadataRole = currentUser.user_metadata?.role || 'CUSTOMER';
      console.log("[AUTH] Metadata Role found:", metadataRole);
      
      const fallbackProfile = {
        id: currentUser.id,
        email: currentUser.email,
        role: metadataRole,
        full_name: currentUser.user_metadata?.full_name || 'User'
      };
      setProfile(fallbackProfile);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Signout error:', err.message);
    } finally {
      setUser(null);
      setProfile(null);
      localStorage.removeItem('speedway_profile');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, 
      signInWithPassword: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);