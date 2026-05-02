import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { User, Phone, Mail, Lock, Check, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Settings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('Notifications');
  const [loading, setLoading] = useState(false);

  // Form states
  const [notifPref, setNotifPref] = useState(user?.user_metadata?.notification_preference || 'BOTH'); // EMAIL, PHONE, BOTH

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontWeight: '500' }}>Confirm saving notification preferences?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => toast.dismiss(t.id)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancel</button>
            <button 
              onClick={async () => {
                toast.dismiss(t.id);
                setLoading(true);
                const { error } = await supabase.auth.updateUser({
                  data: { 
                    notification_preference: notifPref
                  }
                });
                if (error) {
                  toast.error(error.message);
                } else {
                  toast.success('Preferences updated successfully!');
                }
                setLoading(false);
              }}
              style={{ padding: '0.5rem 1rem', background: 'var(--primary-color)', border: 'none', color: '#000', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '600' }}
            >
              Confirm
            </button>
          </div>
        </div>
      ), { duration: Infinity, style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } });
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <PageHeader 
        badge="ACCOUNT SETTINGS"
        title="SETTINGS"
        subtitle="Manage your preferences, theme, and view terms."
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Notifications Column */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', padding: isMobile ? '1.5rem' : '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notifications</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: '600' }}>Choose how you want to receive updates about your bookings.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {[
              { id: 'EMAIL', label: 'Email Only', desc: 'Updates via your registered email address.' },
              { id: 'PHONE', label: 'Phone/SMS Only', desc: 'Updates via your mobile phone number.' },
              { id: 'BOTH', label: 'Email and Phone', desc: 'Stay updated everywhere! Recommended.' }
            ].map(pref => (
              <div 
                key={pref.id}
                onClick={() => setNotifPref(pref.id)}
                style={{ 
                  padding: '1.25rem', 
                  background: 'var(--bg-input)', 
                  borderRadius: '1rem', 
                  border: notifPref === pref.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <p style={{ margin: '0 0 0.15rem 0', fontWeight: '800', fontSize: '0.95rem', color: notifPref === pref.id ? 'var(--primary-color)' : '#fff' }}>{pref.label}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{pref.desc}</p>
                </div>
                {notifPref === pref.id && <Check size={18} color="var(--primary-color)" />}
              </div>
            ))}
          </div>

          <button 
            onClick={handleSaveProfile}
            disabled={loading}
            style={{ marginTop: '2rem', width: '100%', padding: '1.1rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}
          >
            Save Changes
          </button>
        </div>

        {/* Theme Column */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', padding: isMobile ? '1.5rem' : '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Appearance</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: '600' }}>Personalize your dashboard experience with your preferred style.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div 
              onClick={() => toggleTheme('system')}
              style={{ border: theme === 'system' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem', cursor: 'pointer', background: 'var(--bg-input)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
            >
                <div style={{ background: 'linear-gradient(135deg, #fff 50%, #0f172a 50%)', width: '48px', height: '48px', borderRadius: '0.5rem', border: '1px solid var(--border-color)', flexShrink: 0 }}></div>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: theme === 'system' ? 'var(--primary-color)' : 'var(--text-primary)' }}>System Default</span>
            </div>
            <div 
              onClick={() => toggleTheme('light')}
              style={{ border: theme === 'light' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem', cursor: 'pointer', background: 'var(--bg-input)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
            >
                <div style={{ background: '#fff', width: '48px', height: '48px', borderRadius: '0.5rem', border: '1px solid var(--border-color)', flexShrink: 0 }}></div>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: theme === 'light' ? 'var(--primary-color)' : 'var(--text-primary)' }}>Light Mode</span>
            </div>
            <div 
              onClick={() => toggleTheme('dark')}
              style={{ border: theme === 'dark' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem', cursor: 'pointer', background: 'var(--bg-input)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
            >
                <div style={{ background: '#0f172a', width: '48px', height: '48px', borderRadius: '0.5rem', border: '1px solid var(--border-color)', flexShrink: 0 }}></div>
                <span style={{ fontSize: '1rem', fontWeight: '800', color: theme === 'dark' ? 'var(--primary-color)' : 'var(--text-primary)' }}>Dark Mode</span>
            </div>
          </div>
        </div>

        {/* Terms Column */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', padding: isMobile ? '1.5rem' : '2.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 2rem 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legal</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase' }}>1. Usage</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: '1.6', fontWeight: '600' }}>SpeedWay AutoxMoto Detail Studio provides premium vehicle care. By booking, you agree to our service standards and pricing policies.</p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase' }}>2. Cancel</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: '1.6', fontWeight: '600' }}>Cancellations must be requested at least 24 hours before the appointment. Late requests may incur fees.</p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase' }}>3. Privacy</h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: '1.6', fontWeight: '600' }}>Your data is used strictly for booking and internal analytics. We never sell your personal information.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
