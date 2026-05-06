import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { User, Phone, Mail, Lock, Check, Save, Sparkles, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Settings = () => {
  const { user, profile, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  // Form states
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone_number || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone
      });
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1.25rem',
    border: '1px solid var(--admin-border)',
    padding: isMobile ? '1.25rem' : '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--admin-text-secondary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    background: 'var(--admin-bg)',
    border: '1px solid var(--admin-border)',
    borderRadius: '0.75rem',
    color: 'var(--admin-text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="ACCOUNT SETTINGS"
        title="Settings"
        subtitle="Manage your personal identity and application preferences."
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Personal Identity */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Personal Identity</h2>
          </div>
          
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input 
                  style={inputStyle} 
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input 
                  style={inputStyle} 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input 
                style={inputStyle} 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{ 
                marginTop: '0.5rem', 
                padding: '1rem', 
                background: 'var(--admin-brand)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.75rem', 
                fontWeight: '900', 
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(169, 27, 24, 0.2)'
              }}
            >
              {loading ? 'Saving...' : 'UPDATE PROFILE'}
            </button>
          </form>
        </div>

        {/* Appearance */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Appearance</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {['system', 'light', 'dark'].map(t => (
              <button
                key={t}
                onClick={() => toggleTheme(t)}
                style={{
                  padding: '1rem 0.5rem',
                  background: theme === t ? 'var(--admin-brand)' : 'var(--admin-bg)',
                  color: theme === t ? 'white' : 'var(--admin-text-secondary)',
                  border: theme === t ? 'none' : '1px solid var(--admin-border)',
                  borderRadius: '0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Password Security */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Lock size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Security</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input 
                type="password"
                style={inputStyle} 
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <button 
              onClick={async () => {
                if (!newPassword) return;
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) toast.error(error.message);
                else {
                  toast.success('Password updated!');
                  setNewPassword('');
                }
              }}
              style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.05)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
            >
              CHANGE PASSWORD
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        button, input { transition: all 0.3s ease; }
      `}</style>
    </div>
  );
};

export default Settings;
