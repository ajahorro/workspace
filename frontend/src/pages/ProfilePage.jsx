import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Calendar, Edit3, ClipboardList, Clock, CheckCircle, ShieldCheck, Lock, Users, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import { useMediaQuery } from '../hooks/useMediaQuery';

const ProfilePage = () => {
  const { user, profile, updateProfile } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Split identity state
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchStats();
    if (profile) {
      setFirstName(profile.first_name || profile.full_name?.split(' ')[0] || '');
      setLastName(profile.last_name || profile.full_name?.split(' ').slice(1).join(' ') || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [user, profile]);

  const fetchStats = async () => {
    if (!user) return;
    const role = profile?.role || 'CUSTOMER';
    try {
      if (role === 'CUSTOMER') {
        const [totalRes, pendingRes, completedRes] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id),
          supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).eq('status', 'scheduled'),
          supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).eq('status', 'completed')
        ]);
        setStats([
          { label: 'Total Bookings', value: totalRes.count || 0, color: 'var(--admin-brand)' },
          { label: 'Upcoming', value: pendingRes.count || 0, color: '#f59e0b' },
          { label: 'Completed', value: completedRes.count || 0, color: '#10b981' },
        ]);
      } else {
        const [totalRes, activeStaffRes] = await Promise.all([
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STAFF')
        ]);
        setStats([
          { label: 'Total volume', value: totalRes.count || 0, color: 'var(--admin-brand)' },
          { label: 'Active Staff', value: activeStaffRes.count || 0, color: '#10b981' },
        ]);
      }
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({ 
        first_name: firstName, 
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        phone_number: phoneNumber 
      });
      if (error) throw error;
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) return toast.error('Please enter your current password');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    
    setUpdatingPassword(true);
    try {
      // Re-authenticate to verify current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (authError) throw new Error('Incorrect current password');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success('Password updated successfully!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) { 
      toast.error(err.message || 'Failed to update password'); 
    } finally { 
      setUpdatingPassword(false); 
    }
  };

  const handleForgotPassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email!');
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
    }
  };

  const cardStyle = { background: 'var(--admin-card)', borderRadius: '1rem', border: '1px solid var(--admin-border)', padding: '1.5rem', boxShadow: 'var(--admin-card-shadow)' };
  const inputStyle = { width: '100%', padding: '0.85rem 1.25rem', background: 'var(--admin-input-bg)', border: '1px solid var(--admin-input-border)', borderRadius: '0.75rem', color: 'var(--admin-text-primary)', fontWeight: '600', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' };

  if (!user) return <LoadingState message="Syncing profile..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      <PageHeader badge="USER ACCOUNT" title="MY PROFILE" subtitle="Manage your professional identity and security." />

      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', alignItems: isMobile ? 'center' : 'flex-start' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '1.5rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={40} color="var(--admin-brand)" />
          </div>
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '950', letterSpacing: '-1px' }}>{profile?.full_name}</h2>
              <span style={{ fontSize: '0.6rem', fontWeight: '900', padding: '0.3rem 0.8rem', borderRadius: '1rem', background: 'var(--admin-brand-light)', color: 'var(--admin-brand)' }}>{profile?.role}</span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.85rem', fontWeight: '700' }}>
               <span>{user.email}</span>
               <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
               {stats.map((s, i) => (
                 <div key={i} style={{ padding: '0.75rem 1.25rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-border)', textAlign: 'center' }}>
                   <div style={{ fontSize: '1.25rem', fontWeight: '950', color: s.color }}>{s.value}</div>
                   <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--admin-text-secondary)' }}>{s.label}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Personal Information</h3>
            <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} style={{ padding: '0.5rem 1.25rem', background: isEditing ? 'var(--admin-brand)' : 'transparent', color: isEditing ? 'white' : 'var(--admin-text-primary)', border: isEditing ? 'none' : '1px solid var(--admin-border)', borderRadius: '0.5rem', fontWeight: '800', cursor: 'pointer' }}>
              {saving ? '...' : isEditing ? 'SAVE CHANGES' : 'EDIT'}
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input style={{ ...inputStyle, opacity: isEditing ? 1 : 0.6 }} disabled={!isEditing} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input style={{ ...inputStyle, opacity: isEditing ? 1 : 0.6 }} disabled={!isEditing} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
              <label style={labelStyle}>Phone Number</label>
              <input style={{ ...inputStyle, opacity: isEditing ? 1 : 0.6 }} disabled={!isEditing} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div style={cardStyle}>
             <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '0.75rem', fontWeight: '900', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Security</h3>
             <button onClick={() => setShowPasswordModal(true)} style={{ width: '100%', padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '800', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               Change Password <Lock size={18} color="var(--admin-brand)" />
             </button>
           </div>
           

        </div>
      </div>

      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ ...cardStyle, width: '400px' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: '950' }}>Update Password</h3>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                handleUpdatePassword();
              }} 
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {/* Hidden username for accessibility/password managers */}
              <input type="text" name="username" value={user?.email || ''} readOnly style={{ display: 'none' }} autoComplete="username" />
              
              <div>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Current Password</label>
                <input type="password" style={inputStyle} placeholder="Verify current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>New Password</label>
                <input type="password" style={inputStyle} placeholder="Minimum 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Confirm New Password</label>
                <input type="password" style={inputStyle} placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>

              <div style={{ textAlign: 'right' }}>
                <span onClick={handleForgotPassword} style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-brand)', cursor: 'pointer', opacity: 0.8 }}>Forgot Password?</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.5rem', fontWeight: '800' }}>CANCEL</button>
                <button type="submit" disabled={updatingPassword} style={{ flex: 1, padding: '0.75rem', background: 'var(--admin-brand)', border: 'none', color: 'white', borderRadius: '0.5rem', fontWeight: '900' }}>{updatingPassword ? '...' : 'UPDATE'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
