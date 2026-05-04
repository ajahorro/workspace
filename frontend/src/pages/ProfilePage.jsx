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
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const panelStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1rem',
    border: '1px solid var(--admin-border)',
    padding: '1.5rem',
    boxShadow: 'var(--admin-card-shadow)',
    transition: 'all 0.3s ease'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1.25rem',
    background: 'var(--admin-input-bg)',
    border: '1px solid var(--admin-input-border)',
    borderRadius: '0.75rem',
    color: 'var(--admin-text-primary)',
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
    color: 'var(--admin-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '0.6rem'
  };

  const role = profile?.role || 'CUSTOMER';

  const fetchStats = async () => {
    if (!user) return;
    try {
      if (role === 'CUSTOMER') {
        const [totalRes, pendingRes, completedRes] = await Promise.all([
          supabase.from('bookings_v2').select('*', { count: 'exact', head: true }).eq('customer_id', user.id),
          supabase.from('bookings_v2').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).eq('status', 'scheduled'),
          supabase.from('bookings_v2').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).eq('status', 'completed')
        ]);
        setStats([
          { label: 'Total Bookings', value: totalRes.count || 0, icon: ClipboardList, color: 'var(--admin-brand)' },
          { label: 'Upcoming', value: pendingRes.count || 0, icon: Clock, color: '#f59e0b' },
          { label: 'Completed', value: completedRes.count || 0, icon: CheckCircle, color: '#10b981' },
        ]);
      } else {
        const [totalRes, activeStaffRes, activeServicesRes] = await Promise.all([
          supabase.from('bookings_v2').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STAFF'),
          supabase.from('services_v2').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);
        setStats([
          { label: 'Total Volume', value: totalRes.count || 0, icon: ClipboardList, color: 'var(--admin-brand)' },
          { label: 'Active Staff', value: activeStaffRes.count || 0, icon: Users, color: '#f59e0b' },
          { label: 'Active Services', value: activeServicesRes.count || 0, icon: Wrench, color: '#10b981' },
        ]);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    if (profile) {
      setFullName(profile.full_name || user?.user_metadata?.full_name || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [user, role, profile]);

  if (!user) {
    return <LoadingState message="Syncing session..." />;
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to update password.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
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
      toast.success('Profile updated successfully!', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <LoadingState message="Syncing session..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
      
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
            <div style={{ width: isMobile ? '100px' : '120px', height: isMobile ? '100px' : '120px', borderRadius: '1.5rem', background: 'var(--admin-bg)', border: '2px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={isMobile ? 40 : 48} color="var(--admin-text-secondary)" strokeWidth={1.5} />
            </div>
            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '36px', height: '36px', borderRadius: '0.75rem', background: 'var(--admin-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '4px solid var(--admin-card)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <Camera size={16} color="#FFFFFF" />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: '800', letterSpacing: '-1.5px', color: 'var(--admin-text-primary)' }}>{profile?.full_name || 'User Name'}</h2>
              <span className="badge" style={{ fontSize: '0.65rem', fontWeight: '800', padding: '0.35rem 1rem', borderRadius: '5rem', background: 'var(--admin-brand-light)', color: 'var(--admin-brand)', textTransform: 'uppercase', letterSpacing: '1px' }}>{role}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.5rem' : '1.5rem', color: 'var(--admin-text-secondary)', fontSize: '0.9rem', fontWeight: '600', alignItems: isMobile ? 'center' : 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Mail size={16} color="var(--admin-brand)" /> {user?.email}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Calendar size={16} color="var(--admin-brand)" /> Joined {new Date(user?.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {/* Quick Stats inside Hero */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: '1rem 1.25rem', background: 'var(--admin-bg)', borderRadius: '1rem', border: '1px solid var(--admin-border)', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Account Details Card */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.5px', color: 'var(--admin-text-primary)' }}>
              <Edit3 size={18} color="var(--admin-brand)" /> Account Details
            </h3>
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              style={{ background: isEditing ? 'var(--admin-brand)' : 'var(--admin-bg)', color: isEditing ? '#FFFFFF' : 'var(--admin-text-primary)', border: isEditing ? 'none' : '1px solid var(--admin-border)', padding: '0.6rem 1.2rem', borderRadius: '0.6rem', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {saving ? '...' : isEditing ? 'SAVE' : 'EDIT'}
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input 
                  style={{ ...inputStyle, opacity: isEditing ? 1 : 0.7 }} 
                  disabled={!isEditing}
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input 
                  style={{ ...inputStyle, opacity: isEditing ? 1 : 0.7 }} 
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
                style={{ width: '100%', padding: '1rem', background: 'var(--admin-brand)', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontSize: '0.95rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              >
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            )}
          </form>
        </div>

        {/* Quick Actions / Security Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', fontWeight: '800', color: 'var(--admin-text-secondary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Security & Access</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => navigate(role === 'ADMIN' || role === 'SUPER_ADMIN' ? '/admin/settings' : '/settings')}
                style={{ width: '100%', padding: '1.1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--admin-brand)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--admin-border)'}
              >
                <span>Account Settings</span>
                <Settings size={18} color="var(--admin-brand)" opacity={0.7} />
              </button>
              <button 
                onClick={() => setShowPasswordModal(true)}
                style={{ width: '100%', padding: '1.1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--admin-brand)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--admin-border)'}
              >
                <span>Change Password</span>
                <ShieldCheck size={18} color="var(--admin-brand)" opacity={0.7} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(8px)' }}>
          <div style={{ ...panelStyle, width: '400px', border: '1px solid var(--admin-border)', animation: 'popIn 0.3s ease' }}>
            <h3 style={{ margin: '0 0 2rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>
              <Lock size={22} color="var(--admin-brand)" /> Update Password
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
                  style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  disabled={updatingPassword}
                  style={{ flex: 1, padding: '1rem', background: 'var(--admin-brand)', border: 'none', color: '#FFFFFF', borderRadius: '0.75rem', fontWeight: '800', cursor: 'pointer', opacity: updatingPassword ? 0.5 : 1 }}
                >
                  {updatingPassword ? '...' : 'UPDATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        button, input {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .profile-stat-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .profile-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          border-color: var(--admin-brand) !important;
        }
        button:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
};


export default ProfilePage;
