import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Calendar, Camera, Edit3, ClipboardList, CalendarPlus, Settings, TrendingUp, Users, Wrench, CreditCard, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.user_metadata?.phone_number || profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const role = profile?.role || 'CUSTOMER';

  useEffect(() => {
    fetchStats();
  }, [user, role]);

  const fetchStats = async () => {
    if (!user) return;

    if (role === 'CUSTOMER') {
      const [totalRes, pendingRes, completedRes] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).in('booking_status', ['PENDING_ASSIGNMENT', 'CONFIRMED']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('customer_id', user.id).in('booking_status', ['COMPLETED', 'CLOSED'])
      ]);
      setStats([
        { label: 'Total Bookings', value: totalRes.count || 0, icon: ClipboardList, gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.25)' },
        { label: 'Pending', value: pendingRes.count || 0, icon: Calendar, gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.12))', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.25)' },
        { label: 'Completed', value: completedRes.count || 0, icon: TrendingUp, gradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(16, 185, 129, 0.12))', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.25)' },
      ]);
    } else if (role === 'STAFF') {
      const [assignedRes, completedRes] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('assigned_staff', user.id).in('booking_status', ['CONFIRMED', 'PENDING_ASSIGNMENT']),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('assigned_staff', user.id).in('booking_status', ['COMPLETED', 'CLOSED'])
      ]);
      setStats([
        { label: 'Assigned Jobs', value: assignedRes.count || 0, icon: ClipboardList, gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.25)' },
        { label: 'Completed Jobs', value: completedRes.count || 0, icon: TrendingUp, gradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(16, 185, 129, 0.12))', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.25)' },
      ]);
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const [totalRes, activeStaffRes, activeServicesRes] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STAFF'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);
      setStats([
        { label: 'Total Bookings', value: totalRes.count || 0, icon: ClipboardList, gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.25)' },
        { label: 'Active Staff', value: activeStaffRes.count || 0, icon: Users, gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.12))', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.25)' },
        { label: 'Active Services', value: activeServicesRes.count || 0, icon: Wrench, gradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(16, 185, 129, 0.12))', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.25)' },
      ]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, phone_number: phoneNumber }
      });
      if (error) throw error;
      
      // Also update profiles table
      await supabase.from('profiles').update({ 
        full_name: fullName, 
        phone: phoneNumber 
      }).eq('id', user.id);

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  const initial = fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';
  const displayName = fullName || user?.email?.split('@')[0] || 'User';

  // Role-adaptive quick actions
  const getQuickActions = () => {
    if (role === 'STAFF') {
      return [
        { label: 'View Assigned Jobs', path: '/staff', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.2)', hoverBg: 'rgba(56, 189, 248, 0.14)' },
        { label: 'Account Settings', path: '/staff/settings', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.03)', border: 'var(--border-color)', hoverBg: 'rgba(255,255,255,0.06)' },
      ];
    }
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return [
        { label: 'Manage Bookings', path: '/admin/bookings', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.2)', hoverBg: 'rgba(56, 189, 248, 0.14)' },
        { label: 'Manage Payments', path: '/admin/payments', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.2)', hoverBg: 'rgba(251, 191, 36, 0.14)' },
        { label: 'System Settings', path: '/admin/settings', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.03)', border: 'var(--border-color)', hoverBg: 'rgba(255,255,255,0.06)' },
      ];
    }
    // Customer (default)
    return [
      { label: 'View My Bookings', path: '/my-bookings', color: 'var(--primary-color)', bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.2)', hoverBg: 'rgba(56, 189, 248, 0.14)' },
      { label: 'Book New Service', path: '/book', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.2)', hoverBg: 'rgba(251, 191, 36, 0.14)' },
      { label: 'Account Settings', path: '/settings', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.03)', border: 'var(--border-color)', hoverBg: 'rgba(255,255,255,0.06)' },
    ];
  };

  const quickActions = getQuickActions();

  const getRoleBadge = () => {
    const labels = { CUSTOMER: 'Customer', STAFF: 'Staff', ADMIN: 'Administrator', SUPER_ADMIN: 'Super Admin' };
    return labels[role] || 'User';
  };

  const inputStyle = {
    width: '100%',
    padding: '0.9rem 1rem 0.9rem 2.75rem',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '0.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Profile Hero Card */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        borderRadius: '1.25rem', 
        border: '1px solid var(--border-color)', 
        padding: '2.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '1rem', 
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15))', 
              border: '2px solid var(--border-color)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <User size={44} color="var(--text-secondary)" strokeWidth={1.5} />
            </div>
            <button 
              style={{ 
                position: 'absolute', 
                bottom: '-4px', 
                right: '-4px', 
                width: '30px', 
                height: '30px', 
                borderRadius: '0.5rem', 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
            >
              <Camera size={14} color="var(--text-secondary)" />
            </button>
          </div>

          {/* Name & Meta */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>{displayName}</h1>
              <span style={{ 
                fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '1rem', 
                background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary-color)', 
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                {getRoleBadge()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Mail size={14} /> {user?.email}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <Calendar size={14} /> Member since {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Stat Cards — role-aware */}
        {stats.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: '1rem' }}>
            {stats.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} style={{ 
                  background: card.gradient, 
                  borderRadius: '0.75rem', 
                  padding: '1.25rem 1.5rem',
                  border: `1px solid ${card.borderColor}`,
                  textAlign: 'center'
                }}>
                  <Icon size={20} color={card.color} style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: card.color }}>{card.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

        {/* Personal Information Card */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          borderRadius: '1.25rem', 
          border: '1px solid var(--border-color)', 
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={20} color="var(--primary-color)" /> Personal Information
            </h2>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1.25rem', 
                  background: 'rgba(255,255,255,0.04)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)', 
                  borderRadius: '0.5rem', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '0.8rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <Edit3 size={14} /> Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setIsEditing(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--primary-color)', border: 'none', color: '#0f172a', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            )}
          </div>

          {/* Full Name */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                disabled={!isEditing}
                style={{ ...inputStyle, opacity: isEditing ? 1 : 0.7, cursor: isEditing ? 'text' : 'default' }} 
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                value={user?.email || ''} 
                disabled 
                style={{ ...inputStyle, opacity: 0.7, cursor: 'default' }} 
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="tel" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value)} 
                disabled={!isEditing}
                placeholder="Add phone number"
                style={{ ...inputStyle, opacity: isEditing ? 1 : 0.7, cursor: isEditing ? 'text' : 'default' }} 
              />
            </div>
          </div>
        </div>

        {/* Quick Actions Card — role-adaptive */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          borderRadius: '1.25rem', 
          border: '1px solid var(--border-color)', 
          padding: '2rem'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700' }}>Quick Actions</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {quickActions.map((action) => (
              <button 
                key={action.label}
                onClick={() => navigate(action.path)}
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  background: action.bg, 
                  border: `1px solid ${action.border}`, 
                  color: action.color, 
                  borderRadius: '0.75rem', 
                  cursor: 'pointer', 
                  fontWeight: '700', 
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = action.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = action.bg}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
