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
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'STAFF')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
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

  const handleDeactivate = async (staffId) => {
    if (!window.confirm('Are you sure you want to deactivate this staff member?')) return;
    
    try {
      // For now, we'll just change their role or add a 'deactivated' flag if we had one.
      // Since our schema uses 'role', maybe we change it back to 'CUSTOMER' or a new role?
      // Let's just remove them for now or change role.
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'CUSTOMER' }) // Downgrade to customer as "deactivation" from staff
        .eq('id', staffId);

      if (error) throw error;
      toast.success('Staff member deactivated');
      fetchStaff();
    } catch (err) {
      toast.error('Failed to deactivate staff');
    }
  };

  const filteredStaff = staff.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const glassPanelStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: '1.25rem',
    padding: isMobile ? '1.5rem' : '2.5rem',
    boxShadow: 'var(--card-shadow)',
    color: 'var(--card-text)',
    position: 'sticky',
    top: '100px',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="TEAM COORDINATION"
        title="Staff Management"
        subtitle="Onboard new employees and manage access permissions"
        onRefresh={fetchStaff}
      />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '400px 1fr', 
        gap: '2rem',
        alignItems: 'start'
      }}>
        
        {/* Left: Registration Form */}
        <div style={glassPanelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '0.75rem', color: 'var(--card-text)' }}>
              <UserPlus size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--card-text)' }}>Register New Employee</h2>
          </div>

          <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--card-text)', opacity: 0.5 }} />
                <input 
                  type="text" 
                  name="fullName"
                  placeholder="Juan Dela Cruz"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 3rem', 
                    background: 'var(--bg-input)', 
                    border: 'var(--border-color)', 
                    borderRadius: '0.75rem', 
                    color: 'var(--card-text)', 
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--card-text)', opacity: 0.5 }} />
                <input 
                  type="email" 
                  name="email"
                  placeholder="juan@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ 
                    width: '100%', 
                    padding: '0.875rem 1rem 0.875rem 3rem', 
                    background: 'var(--bg-input)', 
                    border: 'var(--border-color)', 
                    borderRadius: '0.75rem', 
                    color: 'var(--card-text)', 
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--card-text)', opacity: 0.7, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>Temporary Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--card-text)', opacity: 0.5 }} />
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
                    background: 'var(--bg-input)', 
                    border: 'var(--border-color)', 
                    borderRadius: '0.75rem', 
                    color: 'var(--card-text)', 
                    fontSize: '0.9rem',
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
                background: 'var(--card-text)', 
                color: 'var(--bg-card)', 
                fontWeight: '800', 
                border: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
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
        <div style={glassPanelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '0.75rem', color: 'var(--card-text)' }}>
                <Users size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--card-text)' }}>Active Team ({staff.length})</h2>
            </div>

            <div style={{ position: 'relative', width: isMobile ? '100%' : '250px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.65rem 1rem 0.65rem 2.5rem', 
                  background: 'var(--bg-input)', 
                  border: 'var(--border-color)', 
                  borderRadius: '0.5rem', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }} className="animate-pulse"></div>
              ))
            ) : filteredStaff.length > 0 ? (
              filteredStaff.map((member) => (
                <div 
                  key={member.id}
                  style={{ 
                    padding: '1.25rem', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderRadius: '1.25rem', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    transition: 'all 0.2s ease',
                    color: 'var(--card-text)'
                  }}
                >
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '1rem', 
                    background: 'rgba(255, 255, 255, 0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--card-text)',
                    fontSize: '1.25rem',
                    fontWeight: '900'
                  }}>
                    {member.full_name?.charAt(0) || <User size={24} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--card-text)', marginBottom: '0.2rem' }}>{member.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--card-text)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={12} /> {member.email}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => handleDeactivate(member.id)}
                      style={{ 
                        padding: '0.5rem 1rem', 
                        borderRadius: '0.5rem', 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        color: 'var(--card-text)', 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      <Ban size={14} /> Deactivate
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.2)' }}>
                <Users size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                <p>No staff members found</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminStaffManagement;
