import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { User, Phone, Mail, Lock, Check, Save, ShieldCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Settings = () => {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [notifPref, setNotifPref] = useState(profile?.notification_preference || 'BOTH');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Full Name is mandatory');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phone,
          notification_preference: notifPref
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
      // Refresh page to sync context (or we could use a context update method)
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="ACCOUNT SETTINGS"
        title="SETTINGS"
        subtitle="Manage your personal information and preferences."
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Profile Info Column */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', padding: isMobile ? '1.5rem' : '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personal Information</h2>
          
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-color)' }} />
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: '#fff', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                <input 
                  type="email" 
                  value={user?.email}
                  disabled
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '1rem', cursor: 'not-allowed' }}
                />
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Email cannot be changed manually.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-color)' }} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: '#fff', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Notification Preference</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {['EMAIL', 'PHONE', 'BOTH'].map(pref => (
                  <div 
                    key={pref}
                    onClick={() => setNotifPref(pref)}
                    style={{ 
                      padding: '1rem', 
                      background: 'var(--bg-input)', 
                      borderRadius: '0.75rem', 
                      border: notifPref === pref ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: notifPref === pref ? 'var(--primary-color)' : '#fff' }}>{pref}</span>
                    {notifPref === pref && <Check size={16} color="var(--primary-color)" />}
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%', padding: '1.1rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase' }}
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Right Column: Theme & Legal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Appearance */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', fontWeight: '800', textTransform: 'uppercase' }}>Appearance</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['system', 'light', 'dark'].map(t => (
                <div 
                  key={t}
                  onClick={() => toggleTheme(t)}
                  style={{ 
                    padding: '1rem', borderRadius: '0.75rem', border: theme === t ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', 
                    background: 'var(--bg-input)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' 
                  }}
                >
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '4px', 
                    background: t === 'light' ? '#fff' : t === 'dark' ? '#0f172a' : 'linear-gradient(135deg, #fff 50%, #0f172a 50%)',
                    border: '1px solid var(--border-color)'
                  }}></div>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'capitalize' }}>{t} Mode</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', fontWeight: '800', textTransform: 'uppercase' }}>Terms & Privacy</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: '900', margin: '0 0 0.4rem 0' }}>SERVICE USAGE</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Premium vehicle care provided by SpeedWay. All bookings are subject to availability and pricing confirmation.</p>
              </div>
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: '900', margin: '0 0 0.4rem 0' }}>CANCELLATIONS</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Must be requested 24h prior. Late cancellations may be subject to a non-refundable deposit policy.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Settings;
