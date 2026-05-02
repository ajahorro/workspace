import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Calendar, Camera, Edit3, ClipboardList, CalendarPlus, Settings, TrendingUp, Users, Wrench, CreditCard, BarChart3, ShieldCheck, Lock, Save, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import { useMediaQuery } from '../hooks/useMediaQuery';

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const role = profile?.role || 'CUSTOMER';

  const fetchStats = async () => {
    if (!user) return;
    if (role === 'CUSTOMER') {
      const [totalRes, pendingRes, completedRes] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).in('booking_status', ['PENDING_ASSIGNMENT', 'CONFIRMED']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).eq('booking_status', 'COMPLETED')
      ]);
      setStats([
        { label: 'Total Bookings', value: totalRes.count || 0, icon: ClipboardList, color: 'var(--primary-color)' },
        { label: 'Pending', value: pendingRes.count || 0, icon: Clock, color: '#f59e0b' },
        { label: 'Completed', value: completedRes.count || 0, icon: CheckCircle, color: '#10b981' },
      ]);
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const [totalRes, activeStaffRes, activeServicesRes] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STAFF'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);
      setStats([
        { label: 'Total Bookings', value: totalRes.count || 0, icon: ClipboardList, color: 'var(--primary-color)' },
        { label: 'Active Staff', value: activeStaffRes.count || 0, icon: Users, color: '#f59e0b' },
        { label: 'Active Services', value: activeServicesRes.count || 0, icon: Wrench, color: '#10b981' },
      ]);
    }
  };

  useEffect(() => {
    fetchStats();
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [user, role, profile]);

  if (!user || !profile) {
    return <LoadingState message="Synchronizing user profile..." />;
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ 
        full_name: fullName, 
        phone_number: phoneNumber 
      }).eq('id', user.id);
      if (error) throw error;
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const isMobile = useMediaQuery('(max-width: 1024px)');

  const panelStyle = {
    background: 'rgba(24, 23, 23, 0.4)',
    backdropFilter: 'blur(20px)',
    borderRadius: '1.25rem',
    border: '1px solid rgba(255,255,255,0.03)',
    padding: isMobile ? '1.5rem' : '1.75rem',
    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1.25rem',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '0.75rem',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontWeight: '600'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '0.6rem'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      {/* Header Area */}
      <PageHeader 
        badge="USER ACCOUNT"
        title="MY PROFILE"
        subtitle="Manage your personal information and security settings."
      />

      {/* Profile Hero Card */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? '1.5rem' : '2.5rem', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: isMobile ? '100px' : '120px', height: isMobile ? '100px' : '120px', borderRadius: '1.5rem', background: 'linear-gradient(135deg, rgba(169, 27, 24, 0.1), rgba(139, 0, 0, 0.1))', border: '2px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={isMobile ? 40 : 48} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '36px', height: '36px', borderRadius: '0.75rem', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '4px solid #050a15' }}>
              <Camera size={16} color="#fff" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: '900', letterSpacing: '-1px' }}>{profile?.full_name || 'User Name'}</h2>
              <span style={{ fontSize: '0.6rem', fontWeight: '900', padding: '0.3rem 0.8rem', borderRadius: '2rem', background: 'rgba(169, 27, 24, 0.1)', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px' }}>{role}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.5rem' : '1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: '600', alignItems: isMobile ? 'center' : 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} /> {user?.email}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> Joined {new Date(user?.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {/* Quick Stats inside Hero */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center', minWidth: '80px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: '800', opacity: 0.4, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Account Details Card */}
        <div style={{ ...sectionStyle, padding: isMobile ? '1.5rem' : '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)' }}>
              <Edit3 size={18} color="var(--primary-color)" /> ACCOUNT DETAILS
            </h3>
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              style={{ background: isEditing ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer' }}
            >
              {saving ? '...' : isEditing ? 'SAVE' : 'EDIT'}
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input 
                  style={{ ...inputStyle, opacity: isEditing ? 1 : 0.5 }} 
                  disabled={!isEditing}
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input 
                  style={{ ...inputStyle, opacity: isEditing ? 1 : 0.5 }} 
                  disabled={!isEditing}
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
            {isEditing && (
              <button 
                type="submit"
                disabled={saving}
                style={{ width: '100%', padding: '0.85rem', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: '900', cursor: 'pointer' }}
              >
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            )}
          </form>
        </div>

        {/* Quick Actions / Security Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>Security & Access</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => navigate(role === 'ADMIN' ? '/admin/settings' : '/settings')}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}
              >
                <span>Account Settings</span>
                <ArrowRight size={16} opacity={0.3} />
              </button>
              <button 
                onClick={() => setShowPasswordModal(true)}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}
              >
                <span>Change Password</span>
                <ShieldCheck size={16} opacity={0.3} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div style={{ ...panelStyle, width: '400px', border: '1px solid rgba(169, 27, 24, 0.2)' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Lock size={20} color="var(--primary-color)" /> UPDATE PASSWORD
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <input 
                  type="password"
                  style={inputStyle}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input 
                  type="password"
                  style={inputStyle}
                  placeholder="Match new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  disabled={updatingPassword}
                  style={{ flex: 1, padding: '1rem', background: 'var(--primary-color)', border: 'none', color: '#fff', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', opacity: updatingPassword ? 0.5 : 1 }}
                >
                  {updatingPassword ? 'UPDATING...' : 'UPDATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const sectionStyle = {
  background: 'rgba(24, 23, 23, 0.4)',
  backdropFilter: 'blur(20px)',
  borderRadius: '1.25rem',
  border: '1px solid rgba(255,255,255,0.03)',
  padding: '1.75rem',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
};

export default ProfilePage;
