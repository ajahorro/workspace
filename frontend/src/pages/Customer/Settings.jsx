import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { User, Phone, Mail, Lock, Check, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('Account');
  const [loading, setLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.user_metadata?.phone_number || '');
  const [notifPref, setNotifPref] = useState(user?.user_metadata?.notification_preference || 'BOTH'); // EMAIL, PHONE, BOTH
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, fontWeight: '500' }}>Are you sure you want to save these profile changes?</p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => toast.dismiss(t.id)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancel</button>
            <button 
              onClick={async () => {
                toast.dismiss(t.id);
                setLoading(true);
                const { error } = await supabase.auth.updateUser({
                  data: { 
                    full_name: fullName, 
                    phone_number: phoneNumber,
                    notification_preference: notifPref
                  }
                });
                if (error) {
                  toast.error(error.message);
                } else {
                  toast.success('Profile updated successfully!');
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

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    }
    setLoading(false);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail) {
      toast.error('Please enter a new email address');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check both your old and new emails for confirmation links!');
      setNewEmail('');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 2rem 0', textTransform: 'uppercase' }}>Account Settings</h1>

      {/* Tabs */}
      <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: '0.75rem', marginBottom: '2.5rem', border: '1px solid var(--border-color)' }}>
        {['Account', 'Notifications', 'Theme', 'Terms'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '0.6rem 2rem', 
              background: activeTab === tab ? 'var(--bg-input)' : 'transparent', 
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === tab ? '1px solid var(--border-color)' : '1px solid transparent',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '1.25rem', border: '1px solid var(--border-color)', padding: '3rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        {activeTab === 'Account' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 2rem 0', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={24} color="var(--primary-color)" /> Edit Profile
            </h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ width: '100%', padding: '1rem 1.25rem 1rem 3.25rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem', transition: 'border-color 0.2s ease' }} 
                      placeholder="Your full name"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="tel" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      style={{ width: '100%', padding: '1rem 1.25rem 1rem 3.25rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }} 
                      placeholder="+63 900 000 0000"
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Change Email Address</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="email" 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="New email address"
                      style={{ width: '100%', padding: '1rem 1.25rem 1rem 3.25rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }} 
                    />
                  </div>
                  <button type="button" onClick={handleUpdateEmail} disabled={loading} style={{ padding: '0 2rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem' }}>Update</button>
                </div>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current: {user?.email}</p>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', padding: '0.9rem', background: 'var(--primary-color)', color: '#0f172a', border: 'none', borderRadius: '0.75rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', transition: 'all 0.2s ease' }}
              >
                <Save size={16} /> {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '3.5rem 0' }} />

            <h2 style={{ fontSize: '1.5rem', margin: '0 0 2rem 0', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={24} color="var(--primary-color)" /> Security
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
               <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••" 
                      style={{ width: '100%', padding: '1rem 1.25rem 1rem 3.25rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }} 
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password" 
                      style={{ width: '100%', padding: '1rem 1.25rem 1rem 3.25rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }} 
                    />
                  </div>
                </div>
            </div>
            <button 
              type="button" 
              onClick={handleUpdatePassword}
              disabled={loading}
              style={{ width: '100%', padding: '1.25rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
            >
              Update Password
            </button>
          </div>
        )}

        {activeTab === 'Notifications' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0', fontWeight: '700' }}>Notification Preferences</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>Choose how you want to receive updates about your bookings.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { id: 'EMAIL', label: 'Email Only', desc: 'Receive updates via your registered email address.' },
                { id: 'PHONE', label: 'Phone/SMS Only', desc: 'Receive updates via your mobile phone number.' },
                { id: 'BOTH', label: 'Email and Phone', desc: 'Stay updated everywhere! Recommended for the best experience.' }
              ].map(pref => (
                <div 
                  key={pref.id}
                  onClick={() => setNotifPref(pref.id)}
                  style={{ 
                    padding: '1.5rem', 
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
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: '700', color: notifPref === pref.id ? 'var(--primary-color)' : '#fff' }}>{pref.label}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{pref.desc}</p>
                  </div>
                  {notifPref === pref.id && <Check size={20} color="var(--primary-color)" />}
                </div>
              ))}
            </div>

            <button 
              onClick={handleSaveProfile}
              disabled={loading}
              style={{ marginTop: '2.5rem', width: '100%', padding: '1.25rem', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
            >
              Save Preferences
            </button>
          </div>
        )}
        {activeTab === 'Theme' && (
          <div>
             <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.75rem 0', fontWeight: '700' }}>Theme Settings</h2>
             <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1rem' }}>Personalize your dashboard experience with your preferred visual style.</p>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                <div 
                  onClick={() => toggleTheme('system')}
                  style={{ border: theme === 'system' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-input)', transition: 'all 0.2s ease' }}
                >
                   <div style={{ background: 'linear-gradient(135deg, #fff 50%, #0f172a 50%)', height: '60px', borderRadius: '0.5rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}></div>
                   <span style={{ fontSize: '1rem', fontWeight: '700' }}>System Default</span>
                </div>
                <div 
                  onClick={() => toggleTheme('light')}
                  style={{ border: theme === 'light' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-input)', transition: 'all 0.2s ease' }}
                >
                   <div style={{ background: '#fff', height: '60px', borderRadius: '0.5rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}></div>
                   <span style={{ fontSize: '1rem', fontWeight: '700' }}>Light Mode</span>
                </div>
                <div 
                  onClick={() => toggleTheme('dark')}
                  style={{ border: theme === 'dark' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-input)', transition: 'all 0.2s ease' }}
                >
                   <div style={{ background: '#0f172a', height: '60px', borderRadius: '0.5rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}></div>
                   <span style={{ fontSize: '1rem', fontWeight: '700' }}>Dark Mode</span>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'Terms' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 2.5rem 0', fontWeight: '700' }}>Terms & Conditions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
               <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem 0', fontWeight: '700', color: 'var(--primary-color)' }}>1. Service Usage</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem', lineHeight: '1.6' }}>RENEW Auto Detailing provides premium vehicle care services. By booking, you agree to our service standards and pricing. We reserve the right to refuse service for vehicles in extreme conditions without prior notice.</p>
               </div>
               <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem 0', fontWeight: '700', color: 'var(--primary-color)' }}>2. Cancellations</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem', lineHeight: '1.6' }}>Cancellations must be requested at least 24 hours before the appointment. Late cancellations or no-shows may be subject to a fee of up to 50% of the service total.</p>
               </div>
               <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem 0', fontWeight: '700', color: 'var(--primary-color)' }}>3. Privacy</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem', lineHeight: '1.6' }}>We value your privacy. Your data is used strictly for booking, internal analytics, and notification purposes. We do not sell your personal information to third parties.</p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
