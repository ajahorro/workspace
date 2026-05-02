import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Phone, Mail, Lock, Check, Save, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const StaffSettings = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    secondaryEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || '',
        phone: profile.phone_number || '',
        secondaryEmail: profile.secondary_email || ''
      }));
      setFetching(false);
    }
  }, [profile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!formData.secondaryEmail) {
      toast.error('Secondary email is required for account recovery');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone_number: formData.phone,
          secondary_email: formData.secondaryEmail
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;
      toast.success('Password changed successfully');
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading settings...</div>;

  const cardStyle = {
    background: 'var(--bg-secondary)',
    borderRadius: '1.25rem',
    border: '1px solid var(--border-color)',
    padding: isMobile ? '1.5rem' : '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  };

  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '0.75rem',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="STAFF PORTAL"
        title="Account Settings"
        subtitle="Manage your personal information and security"
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem' }}>
        
        {/* Profile Section */}
        <form onSubmit={handleUpdateProfile} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '0.5rem', color: 'var(--primary-color)' }}>
              <User size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Personal Information</h2>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Primary Email (Read-only)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input 
                type="email" 
                value={user?.email} 
                disabled 
                style={{ ...inputStyle, paddingLeft: '2.75rem', opacity: 0.5, cursor: 'not-allowed' }} 
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Full Name</label>
            <input 
              type="text" 
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              style={inputStyle}
              placeholder="Your full name"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Phone Number</label>
            <input 
              type="tel" 
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              style={inputStyle}
              placeholder="+63 9XX XXX XXXX"
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Secondary Email (Recovery)</label>
            <div style={{ padding: '0.75rem', background: 'rgba(169, 27, 24, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(169, 27, 24, 0.1)', marginBottom: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertCircle size={16} color="var(--primary-color)" style={{ marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong>Required:</strong> Use your personal email for account recovery. This is where "Forgot Password" links will be sent.
              </p>
            </div>
            <input 
              type="email" 
              required
              value={formData.secondaryEmail}
              onChange={e => setFormData({ ...formData, secondaryEmail: e.target.value })}
              style={inputStyle}
              placeholder="personal@email.com"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', padding: '1rem', background: 'var(--primary-color)', 
              color: '#000', border: 'none', borderRadius: '0.75rem', fontWeight: '800', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' 
            }}
          >
            <Save size={18} /> Update Profile
          </button>
        </form>

        {/* Security Section */}
        <form onSubmit={handleChangePassword} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', color: '#10b981' }}>
              <ShieldCheck size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Security</h2>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Update your password periodically to keep your account secure.
          </p>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input 
                type="password" 
                value={formData.newPassword}
                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                style={{ ...inputStyle, paddingLeft: '2.75rem' }} 
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input 
                type="password" 
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={{ ...inputStyle, paddingLeft: '2.75rem' }} 
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !formData.newPassword}
            style={{ 
              marginTop: 'auto', padding: '1rem', background: '#10b981', 
              color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: '800', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: !formData.newPassword ? 0.5 : 1
            }}
          >
            Change Password
          </button>
        </form>

      </div>
    </div>
  );
};

export default StaffSettings;
