import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import PageHeader from '../../components/PageHeader';
import { 
  UserPlus, 
  Users, 
  Mail, 
  Lock, 
  User, 
  Search, 
  Trash2, 
  ShieldAlert,
  ShieldCheck,
  RefreshCcw,
  Loader2,
  AlertCircle,
  MoreVertical,
  Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminStaffManagement = () => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || (await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'list-staff'
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      setStaff(result.data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call our secure Edge Function to create staff without confirmation
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || (await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'create-staff',
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          secondaryEmail: '' // Initially empty, staff will set it in their settings
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast.success('Staff member registered successfully (No confirmation needed)');
      setFormData({ fullName: '', email: '', password: '' });
      fetchStaff();
    } catch (err) {
      console.error('Error adding staff:', err);
      toast.error(err.message || 'Failed to register staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateClick = (member) => {
    setSelectedStaff(member);
    setShowConfirmModal(true);
  };

  const confirmDeactivate = async () => {
    if (!selectedStaff) return;
    
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || (await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'deactivate-staff',
          staffId: selectedStaff.id
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast.success(`${selectedStaff.full_name} has been deactivated`);
      
      setShowConfirmModal(false);
      setSelectedStaff(null);
      fetchStaff(); 
    } catch (err) {
      console.error('Deactivation error:', err);
      toast.error(err.message || 'Failed to deactivate staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (member) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || (await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'reactivate-staff',
          staffId: member.id
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      toast.success(`${member.full_name} has been reactivated`);
      fetchStaff();
    } catch (err) {
      console.error('Reactivation error:', err);
      toast.error(err.message || 'Failed to reactivate staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStaff = staff.filter(s => s.role === 'STAFF' && (
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  // Improved Safe Filter for inactive staff
  const inactiveStaff = staff.filter(s => {
    const isInactive = s.role === 'CUSTOMER';
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Logic: Show customers who are either marked was_staff OR use the speedway domains
    const emailLower = s.email?.toLowerCase() || '';
    const isFormerStaff = s.was_staff === true || 
                         emailLower.endsWith('@speed.way') || 
                         emailLower.endsWith('@speedway.com');
    
    return isInactive && isFormerStaff && matchesSearch;
  });


  const adminCardStyle = {
    background: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: '1.25rem',
    padding: isMobile ? '1.5rem' : '1.5rem',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)',
    position: 'sticky',
    top: '100px',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader 
        badge="TEAM COORDINATION"
        title="Staff Management"
        subtitle="Onboard new employees and manage access permissions"
        onRefresh={fetchStaff}
      />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(350px, 400px) 1fr', 
        gap: isMobile ? '1rem' : '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* Left: Registration Form */}
        <div style={{ ...adminCardStyle, position: isMobile ? 'static' : 'sticky', top: '100px', padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', color: 'var(--admin-brand)' }}>
              <UserPlus size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Register New Employee</h2>
          </div>

          <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
                <input 
                  type="text" 
                  name="fullName"
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 3rem', 
                    background: 'var(--admin-bg)', 
                    border: '1px solid var(--admin-input-border)', 
                    borderRadius: '0.75rem', 
                    color: 'var(--admin-text-primary)', 
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
                <input 
                  type="email" 
                  name="email"
                  autoComplete="username"
                  placeholder="juan@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 3rem', 
                    background: 'var(--admin-bg)', 
                    border: '1px solid var(--admin-input-border)', 
                    borderRadius: '0.75rem', 
                    color: 'var(--admin-text-primary)', 
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>Temporary Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 3rem', 
                    background: 'var(--admin-bg)', 
                    border: '1px solid var(--admin-input-border)', 
                    borderRadius: '0.75rem', 
                    color: 'var(--admin-text-primary)', 
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              style={{ 
                marginTop: '1rem',
                width: '100%', 
                padding: '1rem', 
                borderRadius: '0.75rem', 
                background: 'var(--admin-brand)', 
                color: '#FFFFFF', 
                fontWeight: '800', 
                border: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
              Add to Team
            </button>
          </form>
        </div>

        {/* Right: Team List */}
        <div style={{ ...adminCardStyle, position: 'relative', top: '0', padding: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', color: 'var(--admin-brand)' }}>
                <Users size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--admin-text-primary)' }}>Active Team ({activeStaff.length})</h2>
            </div>

            <div style={{ position: 'relative', width: isMobile ? '100%' : '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.65rem 1rem 0.65rem 2.5rem', 
                  background: 'var(--admin-input-bg)', 
                  border: '1px solid var(--admin-input-border)', 
                  borderRadius: '0.5rem', 
                  color: 'var(--admin-text-primary)', 
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              [1,2].map(i => (
                <div key={i} style={{ height: '80px', background: 'var(--admin-bg)', borderRadius: '1rem', border: '1px solid var(--admin-border)' }} className="animate-pulse"></div>
              ))
            ) : activeStaff.length > 0 ? (
              activeStaff.map((member) => (
                <div 
                  key={member.id}
                  className="staff-card"
                  style={{ 
                    padding: '1.25rem', 
                    background: 'var(--admin-bg)', 
                    borderRadius: '1.25rem', 
                    border: '1px solid var(--admin-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    color: 'var(--admin-text-primary)'
                  }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '1rem', 
                    background: 'var(--admin-card)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--admin-brand)',
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    border: '1px solid var(--admin-border)'
                  }}>
                    {member.full_name?.charAt(0) || <User size={24} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: '950', color: 'var(--admin-text-primary)', marginBottom: '0.2rem', letterSpacing: '-0.3px' }}>{member.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                      <Mail size={12} /> {member.email}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => handleDeactivateClick(member)}
                      className="action-btn"
                      style={{ 
                        padding: '0.55rem 1.15rem', 
                        borderRadius: '0.65rem', 
                        background: 'var(--admin-bg)', 
                        color: '#ef4444', 
                        fontSize: '0.75rem', 
                        fontWeight: '800', 
                        border: '1px solid var(--admin-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--admin-border)';
                        e.currentTarget.style.background = 'var(--admin-bg)';
                      }}
                    >
                      <Ban size={14} /> DEACTIVATE
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-secondary)' }}>
                <Users size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p style={{ fontWeight: '700' }}>No active staff found</p>
              </div>
            )}
          </div>

          {/* Inactive Section */}
          {inactiveStaff.length > 0 && (
            <div style={{ marginTop: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', opacity: 0.8 }}>
                <ShieldAlert size={18} style={{ color: 'var(--admin-brand)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '950', color: 'var(--admin-text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Inactive Employees</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {inactiveStaff.map((member) => (
                  <div 
                    key={member.id}
                    style={{ 
                      padding: '1rem 1.25rem', 
                      background: 'rgba(255,255,255,0.01)', 
                      borderRadius: '1.25rem', 
                      border: '1px dashed var(--admin-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      opacity: 0.7
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--admin-text-primary)', letterSpacing: '-0.2px' }}>{member.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-secondary)', fontWeight: '600', opacity: 0.8 }}>{member.email}</div>
                    </div>
                    <button 
                      onClick={() => handleReactivate(member)}
                      disabled={isSubmitting}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        borderRadius: '0.5rem', 
                        background: 'rgba(169, 27, 24, 0.05)', 
                        color: 'var(--admin-brand)', 
                        fontSize: '0.75rem', 
                        fontWeight: '900', 
                        border: '1px solid var(--admin-brand)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--admin-brand)';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--admin-brand)';
                      }}
                    >
                      <RefreshCcw size={14} className={isSubmitting ? 'animate-spin' : ''} /> REACTIVATE
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Premium Confirm Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: 'var(--admin-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--admin-border)', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: 'var(--admin-card-shadow)', animation: 'modalSlide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <ShieldAlert size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', fontWeight: '950', color: 'var(--admin-text-primary)', letterSpacing: '-0.5px' }}>DEACTIVATE STAFF?</h2>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: '1.6', fontWeight: '500', opacity: 0.7 }}>
              Are you sure you want to deactivate <strong style={{ color: 'var(--admin-text-primary)' }}>{selectedStaff?.full_name}</strong>? This will immediately revoke their staff access.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => { setShowConfirmModal(false); setSelectedStaff(null); }}
                style={{ flex: 1, padding: '1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)', borderRadius: '0.85rem', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.2s' }}
              >
                CANCEL
              </button>
              <button 
                onClick={confirmDeactivate}
                disabled={isSubmitting}
                style={{ flex: 1, padding: '1rem', background: '#ef4444', border: 'none', color: '#FFFFFF', borderRadius: '0.85rem', cursor: 'pointer', fontWeight: '900', fontSize: '0.85rem', transition: 'all 0.2s', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.25)' }}
              >
                {isSubmitting ? 'DEACTIVATING...' : 'DEACTIVATE'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes modalSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .staff-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .staff-card:hover {
          transform: translateY(-4px);
          border-color: var(--admin-brand) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .action-btn {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-btn:hover {
          transform: scale(1.02);
        }
        input, button {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default AdminStaffManagement;
