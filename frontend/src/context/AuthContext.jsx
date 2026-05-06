import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('speedway_profile');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  
  // Start with loading false if we have a cached profile, true otherwise
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('speedway_profile');
  });

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
          
          // Sync OneSignal ID
          /* 
          try {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async function(OneSignal) {
              const pushId = OneSignal.User.PushSubscription.id;
              if (pushId) {
                await supabase
                  .from('profiles')
                  .update({ onesignal_id: pushId })
                  .eq('id', session.user.id);
              }
            });
          } catch (err) {
            console.warn('OneSignal sync failed:', err);
          }
          */
        } else {
          setProfile(null);
          localStorage.removeItem('speedway_profile');
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);
      
      if (sessionUser) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchProfile(sessionUser.id, sessionUser.email);
        }
      } else {
        setProfile(null);
        localStorage.removeItem('speedway_profile');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (data) {
        setProfile(data);
        localStorage.setItem('speedway_profile', JSON.stringify(data));
      } else if (!error) {
        // Handle new user
        const { data: newProfile } = await supabase.from('profiles').insert([{ 
          id: userId, 
          role: 'CUSTOMER',
          email: userEmail 
        }]).select().maybeSingle();
        if (newProfile) {
          setProfile(newProfile);
          localStorage.setItem('speedway_profile', JSON.stringify(newProfile));
        }
      }
    } catch (err) {
      console.error('Background profile sync failed');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    localStorage.removeItem('speedway_profile');
    setLoading(true); // Show loader during exit
    await supabase.auth.signOut();
    setLoading(false);
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (data) {
        setProfile(data);
        localStorage.setItem('speedway_profile', JSON.stringify(data));
        return { data, error: null };
      }
      return { data: null, error };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, 
      signInWithPassword: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      updateProfile,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
