import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import PageHeader from '../../components/PageHeader';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  User, 
  ChevronRight, 
  History, 
  ExternalLink,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // History Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch only profiles with CUSTOMER role
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'CUSTOMER')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSeeHistory = async (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:booking_services(service_name)
        `)
        .eq('customer_id', user.id)
        .order('scheduled_start', { ascending: false });

      if (error) throw error;
      setUserBookings(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      toast.error('Failed to load booking history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone_number?.includes(searchQuery)
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' };
      case 'CANCELLED': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' };
      case 'PENDING_ASSIGNMENT': return { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' };
      case 'CONFIRMED': return { bg: 'rgba(169, 27, 24, 0.1)', text: 'var(--primary-color)' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' };
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="ACCESS CONTROL"
        title="User Directory"
        subtitle="Manage customer profiles and review booking histories"
        onRefresh={fetchUsers}
      />

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
        <input 
          type="text" 
          placeholder="Search by name, email, or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '1.25rem 1.25rem 1.25rem 3.5rem', 
            background: 'var(--bg-secondary)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '1rem', 
            color: '#fff', 
            fontSize: '1rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Users List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          [1,2,3,4,5].map(i => (
            <div key={i} style={{ height: '100px', background: 'rgba(255,255,255,0.02)', borderRadius: '1.25rem' }} className="animate-pulse"></div>
          ))
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div 
              key={user.id}
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid rgba(255,255,255,0.03)', 
                borderRadius: '1.25rem', 
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(28, 27, 27, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Profile Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: '200px' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '1.25rem', 
                  background: user.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(169, 27, 24, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: user.role === 'ADMIN' ? '#ef4444' : 'var(--primary-color)',
                  fontSize: '1.5rem',
                  fontWeight: '900',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  {user.full_name?.charAt(0) || <User size={28} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>{user.full_name || 'Anonymous User'}</h3>
                    <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: '900', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '0.5rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        color: 'rgba(255,255,255,0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {user.role}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={14} /> {user.email}</span>
                    {user.phone_number && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={14} /> {user.phone_number}</span>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => handleSeeHistory(user)}
                  style={{ 
                      padding: '0.85rem 1.5rem', 
                      borderRadius: '0.85rem', 
                      background: 'rgba(169, 27, 24, 0.1)', 
                      color: 'var(--primary-color)', 
                      fontSize: '0.9rem', 
                      fontWeight: '700', 
                      border: '1px solid rgba(169, 27, 24, 0.2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary-color)';
                      e.currentTarget.style.color = '#000';
                  }}
                  onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(169, 27, 24, 0.1)';
                      e.currentTarget.style.color = 'var(--primary-color)';
                  }}
                >
                  <History size={18} />
                  See history
                </button>

                <button 
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${user.full_name}?`)) return;
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-staff`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ action: 'delete-user', userId: user.id })
                      });
                      const result = await res.json();
                      if (result.error) throw new Error(result.error);
                      toast.success('User deleted permanently');
                      fetchUsers();
                    } catch (err) {
                      toast.error(`Delete failed: ${err.message}`);
                    }
                  }}
                  style={{ 
                      padding: '0.85rem', 
                      borderRadius: '0.85rem', 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      color: '#ef4444', 
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.color = '#ef4444';
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--bg-secondary)', borderRadius: '1.25rem', color: 'rgba(255,255,255,0.2)' }}>
            <Users size={64} strokeWidth={1} style={{ marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.1rem' }}>No users found matching your search</p>
          </div>
        )}
      </div>

      {/* Booking History Modal */}
      {isModalOpen && selectedUser && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.85)', 
          backdropFilter: 'blur(10px)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 10000,
          padding: '1.5rem'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '800px', 
            maxHeight: '90vh',
            background: '#181717', 
            borderRadius: '2rem', 
            border: '1px solid rgba(255,255,255,0.05)', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>Booking History</h2>
                <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  Reviewing activity for <span style={{ color: '#fff', fontWeight: '700' }}>{selectedUser.full_name}</span>
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}><X size={28} /></button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
                  <Loader2 size={40} className="animate-spin" color="var(--primary-color)" />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Fetching records...</span>
                </div>
              ) : userBookings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {userBookings.map((booking) => {
                    const status = getStatusColor(booking.booking_status);
                    return (
                      <div 
                        key={booking.id}
                        style={{ 
                            padding: '1.25rem', 
                            background: 'rgba(255,255,255,0.02)', 
                            borderRadius: '1rem', 
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                                    {new Date(booking.scheduled_start).toLocaleDateString(undefined, { month: 'short' })}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>
                                    {new Date(booking.scheduled_start).getDate()}
                                </div>
                            </div>
                            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.05)' }}></div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: '800' }}>Booking #{booking.id.slice(0, 8).toUpperCase()}</span>
                                    <span style={{ 
                                        padding: '0.2rem 0.5rem', 
                                        borderRadius: '0.4rem', 
                                        background: status.bg, 
                                        color: status.text, 
                                        fontSize: '0.6rem', 
                                        fontWeight: '900',
                                        textTransform: 'uppercase'
                                    }}>{booking.booking_status.replace('_', ' ')}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '1rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> {new Date(booking.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} /> {booking.services?.[0]?.service_name}{booking.services?.length > 1 ? ` +${booking.services.length - 1}` : ''}</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                setIsModalOpen(false);
                                navigate(`/admin/bookings/${booking.id}`);
                            }}
                            style={{ 
                                padding: '0.6rem 1rem', 
                                borderRadius: '0.65rem', 
                                background: 'rgba(255,255,255,0.05)', 
                                color: '#fff', 
                                fontSize: '0.8rem', 
                                fontWeight: '700', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            Details <ExternalLink size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.2)' }}>
                  <Calendar size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                  <p>No booking history found for this user</p>
                </div>
              )}
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
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const Loader2 = ({ size, className, color }) => (
  <RefreshCcw size={size} className={className} color={color} />
);

export default AdminUserManagement;
