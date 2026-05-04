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
  const [email, setEmail] = useState(user?.email || '');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Full Name is mandatory', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Update Auth Email if changed
      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
        toast.success('Confirmation email sent to new address!', {
          style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
        });
      }

      // 2. Update Profile Data
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phone,
          notification_preference: 'EMAIL'
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully!', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      // Refresh page to sync context (or we could use a context update method)
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error(err.message, {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setLoading(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="ACCOUNT SETTINGS"
        title="SETTINGS"
        subtitle="Manage your personal information and preferences."
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Profile Info Column */}
        <div style={{ background: 'var(--admin-card)', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.25rem' : '1.5rem', boxShadow: 'var(--admin-card-shadow)' }}>
          <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', margin: '0 0 1.5rem 0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--admin-text-primary)' }}>Personal Information</h2>
          
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', opacity: 0.6 }}>Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-brand)' }} />
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontSize: '1rem', outline: 'none' }}
                />
              </div>
            </div>
 
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', opacity: 0.6 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-brand)' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontSize: '1rem', outline: 'none' }}
                />
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: 'var(--admin-text-secondary)', opacity: 0.5, fontWeight: '600' }}>Note: Changing your email will require verification.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', opacity: 0.6 }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-brand)' }} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontSize: '1rem', outline: 'none' }}
                />
              </div>
            </div>


            <button 
              type="submit"
              disabled={loading}
              style={{ marginTop: '1rem', width: '100%', padding: '1.1rem', background: 'var(--admin-brand)', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 10px 20px rgba(169, 27, 24, 0.2)' }}
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Right Column: Theme & Legal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Appearance */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', padding: isMobile ? '1.25rem' : '2rem', boxShadow: 'var(--admin-card-shadow)' }}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', fontWeight: '800', textTransform: 'uppercase', color: 'var(--admin-text-primary)' }}>Appearance</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['system', 'light', 'dark'].map(t => (
                <div 
                  key={t}
                  onClick={() => toggleTheme(t)}
                  style={{ 
                    padding: '1rem', borderRadius: '0.75rem', border: theme === t ? '2px solid var(--admin-brand)' : '1px solid var(--admin-border)', 
                    background: theme === t ? 'var(--admin-bg)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' 
                  }}
                >
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '4px', 
                    background: t === 'light' ? '#fff' : t === 'dark' ? '#0f172a' : 'linear-gradient(135deg, #fff 50%, #0f172a 50%)',
                    border: '1px solid var(--admin-border)'
                  }}></div>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'capitalize', color: theme === t ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)' }}>{t} Mode</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '1.25rem', border: '1px solid var(--admin-border)', padding: '2rem', boxShadow: 'var(--admin-card-shadow)' }}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', fontWeight: '800', textTransform: 'uppercase', color: 'var(--admin-text-primary)' }}>Terms & Privacy</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--admin-brand)', fontWeight: '900', margin: '0 0 0.4rem 0' }}>SERVICE USAGE</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-secondary)', lineHeight: '1.5', fontWeight: '500', opacity: 0.6 }}>Premium vehicle care provided by SpeedWay. All bookings are subject to availability and pricing confirmation.</p>
              </div>
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--admin-brand)', fontWeight: '900', margin: '0 0 0.4rem 0' }}>CANCELLATIONS</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-secondary)', lineHeight: '1.5', fontWeight: '500', opacity: 0.6 }}>Must be requested 24h prior. Late cancellations may be subject to a non-refundable deposit policy.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        button, input {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .settings-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .settings-card:hover {
          border-color: var(--primary-color) !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default Settings;
