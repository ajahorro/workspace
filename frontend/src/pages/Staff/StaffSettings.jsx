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
      toast.error('Secondary email is required for account recovery', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
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
      toast.success('Profile updated successfully', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
    } catch (err) {
      toast.error(err.message || 'Failed to update profile', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;
      toast.success('Password changed successfully', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.message || 'Failed to change password', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading settings...</div>;

  const cardStyle = {
    background: 'var(--admin-card)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid var(--admin-border)',
    borderRadius: '1.25rem',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)'
  };

  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  };

  const labelStyle = {
    fontSize: '0.7rem',
    fontWeight: '900',
    color: 'var(--admin-text-secondary)',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: 'var(--admin-bg)',
    border: '1px solid var(--admin-border)',
    borderRadius: '0.75rem',
    color: 'var(--admin-text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="STAFF PORTAL"
        title="Account Settings"
        subtitle="Manage your personal information, work profile, and security."
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Profile Section */}
        <form onSubmit={handleUpdateProfile} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.65rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', color: 'var(--admin-brand)', border: '1px solid var(--admin-border)' }}>
              <User size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Personal Information</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-secondary)', opacity: 0.7 }}>Update your public staff profile</p>
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Work Email (Read-only)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input 
                type="email" 
                value={user?.email} 
                disabled 
                style={{ ...inputStyle, paddingLeft: '3rem', opacity: 0.5, cursor: 'not-allowed', background: 'transparent' }} 
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
            <label style={labelStyle}>Recovery Email</label>
            <div style={{ padding: '0.85rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', marginBottom: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <AlertCircle size={20} color="var(--admin-brand)" style={{ opacity: 0.6, marginTop: '2px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-secondary)', opacity: 0.8, lineHeight: '1.5' }}>
                <strong style={{ opacity: 1, color: 'var(--admin-text-primary)' }}>Important:</strong> Use your personal email for account recovery. Forgot Password links will be sent here.
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
              marginTop: '1rem', padding: '1.1rem', background: 'var(--admin-brand)', 
              color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '900', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Save size={20} /> UPDATE PROFILE
          </button>
        </form>

        {/* Security Section */}
        <form onSubmit={handleChangePassword} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.75rem', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--admin-text-primary)' }}>Security & Auth</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--admin-text-secondary)', opacity: 0.7 }}>Secure your staff access</p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--admin-text-secondary)', fontWeight: '600', lineHeight: '1.6' }}>
            We recommend changing your temporary password immediately upon onboarding.
          </p>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input 
                type="password" 
                value={formData.newPassword}
                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                style={{ ...inputStyle, paddingLeft: '3rem' }} 
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
              <input 
                type="password" 
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={{ ...inputStyle, paddingLeft: '3rem' }} 
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !formData.newPassword}
            style={{ 
              marginTop: 'auto', padding: '1.1rem', background: '#10b981', 
              color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: '900', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              opacity: !formData.newPassword ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => !(!formData.newPassword) && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            CHANGE PASSWORD
          </button>
        </form>

      </div>
    </div>
  );
};

export default StaffSettings;
