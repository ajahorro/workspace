import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import PageHeader from '../../components/PageHeader';
import { 
  Search, 
  Filter, 
  Calendar, 
  Database, 
  ArrowRight, 
  RefreshCcw, 
  X,
  ChevronRight,
  User,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminAuditLogs = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch booking_events and join with profiles for actor name
      const { data, error } = await supabase
        .from('booking_events')
        .select(`
          *,
          profiles:actor_id (full_name, role),
          bookings:booking_id (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getEventIcon = (type) => {
    if (type.includes('CREATE')) return <Calendar size={18} />;
    if (type.includes('DELETE') || type.includes('CANCEL')) return <AlertCircle size={18} />;
    return <Database size={18} />;
  };

  const getBadgeColor = (type) => {
    const t = type.toUpperCase();
    if (t.includes('CREATE')) return { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' };
    if (t.includes('STAFF_ASSIGNED')) return { bg: 'rgba(169, 27, 24, 0.1)', text: 'var(--primary-color)' };
    if (t.includes('CANCEL') || t.includes('DELETE')) return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' };
    if (t.includes('UPDATE')) return { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24' };
    return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' };
  };

  const formatDescription = (log) => {
    // In a real app, you'd parse metadata or event_type to build a friendly string
    // For now, we'll use a fallback or specific mapping
    if (log.event_type === 'ASSIGN_STAFF') {
        const bookingNum = log.booking_id ? `#${log.booking_id.slice(0, 4)}` : 'N/A';
        return `Staff assignment updated for booking ${bookingNum}`;
    }
    if (log.event_type === 'CREATE_BOOKING') {
        const bookingNum = log.booking_id ? `#${log.booking_id.slice(0, 4)}` : 'N/A';
        return `New booking ${bookingNum} created by customer`;
    }
    
    // Fallback to metadata if available
    return log.metadata?.description || `${log.event_type} event triggered`;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'All' || log.event_type.includes(filterType);
    
    return matchesSearch && matchesFilter;
  });

  const handleOpenDetail = (log) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <PageHeader 
        badge="SYSTEM SECURITY"
        title="System Audit Trail"
        subtitle="Track all administrative actions and system changes"
        onRefresh={fetchLogs}
      />

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search by action, performer, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.875rem 1rem 0.875rem 3rem', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '0.75rem', 
              color: 'var(--text-primary)', 
              fontSize: '0.9rem',
              outline: 'none',
              fontWeight: '600'
            }}
          />
        </div>
        <div style={{ position: 'relative', minWidth: '180px' }}>
          <Filter size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.875rem 1rem 0.875rem 3rem', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '0.75rem', 
              color: 'var(--text-primary)', 
              fontSize: '0.9rem',
              outline: 'none',
              appearance: 'none',
              fontWeight: '600'
            }}
          >
            <option value="All">All Entities</option>
            <option value="CREATE">Creation</option>
            <option value="ASSIGN">Assignments</option>
            <option value="CANCEL">Cancellations</option>
            <option value="UPDATE">Updates</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          [1,2,3,4,5].map(i => (
            <div key={i} style={{ height: '80px', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.02)' }} className="animate-pulse"></div>
          ))
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const badge = getBadgeColor(log.event_type);
            return (
              <div 
                key={log.id}
                onClick={() => handleOpenDetail(log)}
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '1.25rem', 
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--card-shadow)',
                  color: 'var(--card-text)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  background: 'rgba(255,255,255,0.15)', 
                  borderRadius: '0.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--card-text)'
                }}>
                  {getEventIcon(log.event_type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      background: badge.bg, 
                      color: badge.text, 
                      borderRadius: '0.4rem', 
                      fontSize: '0.65rem', 
                      fontWeight: '900',
                      letterSpacing: '0.5px'
                    }}>
                      {log.event_type}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--card-text)', opacity: 0.7, fontWeight: '500' }}>
                      Performed by <span style={{ fontWeight: '800' }}>{log.profiles?.full_name || 'System'}</span>
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500', color: 'var(--card-text)' }}>
                    {formatDescription(log)}
                  </p>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--card-text)' }}>
                      {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--card-text)', opacity: 0.6 }}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <ChevronRight size={18} color="var(--card-text)" style={{ opacity: 0.3 }} />
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', color: 'rgba(255,255,255,0.2)' }}>
            <Database size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
            <p>No audit logs found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Activity Detail Modal */}
      {isModalOpen && selectedLog && (
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
            maxWidth: '600px', 
            background: 'var(--bg-primary)', 
            borderRadius: '1.5rem', 
            border: 'var(--border-color)', 
            overflow: 'hidden',
            boxShadow: 'var(--card-shadow)',
            animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: 'var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>Activity Detail</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ padding: '2rem' }}>
              <div style={{ 
                background: 'var(--bg-input)', 
                borderRadius: '1rem', 
                padding: '1.5rem',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '2rem',
                marginBottom: '2rem',
                border: 'var(--border-color)'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Action</label>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary-color)' }}>{selectedLog.event_type}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Entity</label>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Booking (#{selectedLog.booking_id?.slice(0, 8)})</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Performer</label>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedLog.profiles?.full_name} ({selectedLog.profiles?.role})</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '1px' }}>Time</label>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ marginBottom: '2.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>Full Description</label>
                <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {formatDescription(selectedLog)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '1rem', borderRadius: '0.75rem', border: 'var(--border-color)', color: 'var(--text-primary)', background: 'var(--bg-input)', fontWeight: '700', cursor: 'pointer' }}
                >
                  Close
                </button>
                {selectedLog.booking_id && (
                  <button 
                    onClick={() => {
                        setIsModalOpen(false);
                        navigate(`/admin/bookings/${selectedLog.booking_id}`);
                    }}
                    style={{ 
                        flex: 2, 
                        padding: '1rem', 
                        borderRadius: '0.75rem', 
                        background: 'var(--primary-color)', 
                        color: 'var(--card-text)', 
                        border: 'none', 
                        fontWeight: '800', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                  >
                    See Booking <ExternalLink size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminAuditLogs;
