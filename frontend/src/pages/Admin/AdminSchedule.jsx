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
  }, [selectedDate]);

  const fetchDailyBookings = async () => {
    setLoading(true);
    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        scheduled_start,
        scheduled_end,
        booking_status,
        service_status,
        customer:profiles!bookings_customer_id_fkey(full_name),
        booking_services(service_name),
        payments:payment_intents(total_amount)
      `)
      .gte('scheduled_start', startOfDay)
      .lte('scheduled_start', endOfDay)
      .order('scheduled_start', { ascending: true });

    if (data) setBookings(data);
    if (error) console.error('Error fetching schedule:', error);
    setLoading(false);
  };

  const getBookingForHour = (hour) => {
    return bookings.find(b => {
      const startHour = new Date(b.scheduled_start).getHours();
      return startHour === hour;
    });
  };

  const isHourOccupied = (hour) => {
    return bookings.some(b => {
      const startHour = new Date(b.scheduled_start).getHours();
      const endHour = new Date(b.scheduled_end || b.scheduled_start).getHours();
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
    background: 'var(--bg-secondary)',
    borderRadius: '1.25rem',
    border: '1px solid rgba(255,255,255,0.03)',
    padding: isMobile ? '1rem' : '1.75rem',
    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      <PageHeader 
        badge="TIMELINE OVERVIEW"
        title="SCHEDULE"
        subtitle={`${bookings.length} ${bookings.length === 1 ? 'booking' : 'bookings'} today.`}
        onRefresh={() => { fetchDailyBookings(); toast.success('Refreshing schedule...'); }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#fff', 
              fontWeight: '800', 
              fontSize: '0.8rem', 
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '120px'
            }}
          />

          <button 
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </PageHeader>

      <div style={{ ...panelStyle, minHeight: '600px', position: 'relative' }}>
        {loading ? (
          <LoadingState message="Generating timeline..." />
        ) : (
          hours.map((hour) => {
            const booking = getBookingForHour(hour);
            const isOccupied = isHourOccupied(hour);
            const displayHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;

            return (
              <div key={hour} style={{ 
                display: 'flex', 
                borderBottom: hour === 18 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                minHeight: isMobile ? '80px' : '100px',
                position: 'relative'
              }}>
                <div style={{ 
                  width: isMobile ? '60px' : '90px', 
                  padding: '1.5rem 0', 
                  fontSize: '0.7rem', 
                  fontWeight: '900', 
                  color: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  letterSpacing: '0.5px'
                }}>
                  {displayHour}
                </div>

                <div style={{ flex: 1, padding: isMobile ? '1rem' : '1.5rem', position: 'relative' }}>
                  {!isOccupied && (
                    <span style={{ color: 'rgba(255,255,255,0.02)', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Available</span>
                  )}

                  {booking && (
                    <div 
                      onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                      style={{ 
                        position: 'absolute',
                        top: '0.25rem',
                        left: '0.25rem',
                        right: '0.25rem',
                        height: `calc(${getDuration(booking.scheduled_start, booking.scheduled_end) * (isMobile ? 80 : 100)}px - 0.5rem)`,
                        background: 'rgba(169, 27, 24, 0.1)',
                        border: '1px solid rgba(169, 27, 24, 0.2)',
                        borderRadius: '0.75rem',
                        padding: isMobile ? '0.75rem' : '1.25rem',
                        zIndex: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: 'var(--primary-color)', fontSize: '0.6rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'uppercase' }}>
                          <Clock size={12} /> {getDuration(booking.scheduled_start, booking.scheduled_end)}H
                        </div>
                      </div>
                      
                      <h3 style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '1.2rem', fontWeight: '900', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.customer?.full_name}</h3>
                      
                      {!isMobile && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                          {booking.booking_services?.slice(0, 2).map((item, i) => (
                            <span key={i} style={{ background: 'rgba(169, 27, 24, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.65rem', color: '#fff', fontWeight: '800' }}>
                              {item.service_name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '900' }}>₱{booking.payments?.[0]?.total_amount?.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
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
