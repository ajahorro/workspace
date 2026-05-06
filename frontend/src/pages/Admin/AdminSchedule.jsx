import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Tag, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

const AdminSchedule = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

  useEffect(() => {
    fetchDailyBookings();

    const channel = supabase
      .channel('admin-schedule-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings_v2' }, () => fetchDailyBookings())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchDailyBookings = async () => {
    setLoading(true);
    try {
      // Fix #16: Use +08:00 (Philippines timezone) instead of raw UTC Z to prevent date boundary bugs
      const startOfDay = `${selectedDate}T00:00:00+08:00`;
      const endOfDay = `${selectedDate}T23:59:59+08:00`;

      const { data, error } = await supabase
        .from('bookings_v2')
        .select('*')
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay)
        .order('start_datetime', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(b => b.customer_id).filter(Boolean))];
        
        if (customerIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', customerIds);

          if (!profilesError && profiles) {
            const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
            const combinedData = data.map(b => ({
              ...b,
              customer: profileMap[b.customer_id] || { full_name: 'Unknown' }
            }));
            setBookings(combinedData);
          } else {
            setBookings(data);
          }
        } else {
          setBookings(data);
        }
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  // Fix #17: Use filter() instead of find() to show ALL bookings per hour (not just first)
  const getBookingsForHour = (hour) => {
    return bookings.filter(b => {
      const startHour = new Date(b.start_datetime).getHours();
      return startHour === hour;
    });
  };

  const isHourOccupied = (hour) => {
    return bookings.some(b => {
      const startHour = new Date(b.start_datetime).getHours();
      const endHour = new Date(b.end_datetime || b.start_datetime).getHours();
      return hour >= startHour && hour < (endHour || startHour + 1);
    });
  };

  const getDuration = (start, end) => {
    const s = new Date(start);
    const e = new Date(end || start);
    const diff = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60)));
    return diff;
  };

  const panelStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1rem',
    border: '1px solid var(--admin-border)',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    color: 'var(--admin-text-primary)',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <PageHeader 
        badge="TIMELINE OVERVIEW"
        title="SCHEDULE"
        subtitle={`${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'} today.`}
        onRefresh={() => { fetchDailyBookings(); toast.success('Refreshing schedule...'); }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--admin-bg)', padding: '0.45rem 0.85rem', borderRadius: '0.75rem', border: '1px solid var(--admin-input-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <button 
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={18} color="var(--admin-brand)" />
          </button>
          
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--admin-text-primary)', 
              fontWeight: '800', 
              fontSize: '0.85rem', 
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '125px'
            }}
          />

          <button 
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={18} color="var(--admin-brand)" />
          </button>
        </div>
      </PageHeader>

      <div style={{ ...panelStyle, minHeight: '600px', position: 'relative' }}>
        {loading ? (
          <LoadingState message="Generating timeline..." />
        ) : (
          hours.map((hour) => {
            const hourBookings = getBookingsForHour(hour);
            const isOccupied = isHourOccupied(hour);
            const displayHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;

            return (
              <div key={hour} style={{ 
                display: 'flex', 
                borderBottom: hour === 18 ? 'none' : '1px solid var(--admin-border)',
                minHeight: isMobile ? '80px' : '100px',
                position: 'relative'
              }}>
                <div style={{ 
                  width: isMobile ? '60px' : '90px', 
                  padding: '1.5rem 0', 
                  fontSize: '0.75rem', 
                  fontWeight: '800', 
                  color: 'var(--admin-text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  letterSpacing: '0.5px'
                }}>
                  {displayHour}
                </div>

                <div style={{ flex: 1, padding: isMobile ? '0.5rem' : '0.75rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {!isOccupied && (
                    <span style={{ color: 'var(--admin-text-secondary)', opacity: 0.2, fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', padding: '0.75rem 0' }}>Available</span>
                  )}

                  {hourBookings.map((booking, bIdx) => (
                    <div 
                      key={booking.id}
                      onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                      style={{ 
                        background: 'var(--admin-card)',
                        border: '1px solid var(--admin-border)',
                        borderLeft: `4px solid ${bIdx === 0 ? 'var(--admin-brand)' : '#8b5cf6'}`,
                        borderRadius: '0.75rem',
                        padding: isMobile ? '0.65rem' : '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        color: 'var(--admin-text-primary)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: bIdx === 0 ? 'var(--admin-brand)' : '#8b5cf6', fontSize: '0.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase' }}>
                          <Clock size={12} /> {getDuration(booking.start_datetime, booking.end_datetime)}H SESSION
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--admin-text-secondary)', opacity: 0.6 }}>{booking.vehicle_type}</div>
                      </div>
                      
                      <h3 style={{ margin: '0.1rem 0', fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: '800', color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.customer?.full_name}</h3>
                      
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: '800' }}>₱{(booking.total_price || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminSchedule;
