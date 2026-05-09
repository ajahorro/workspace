import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Paperclip, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const BookingChat = ({ bookingId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!bookingId) return;
    fetchMessages();
    const channel = supabase.channel(`chat-${bookingId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booking_messages', filter: `booking_id=eq.${bookingId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [bookingId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase.from('booking_messages').select('*').eq('booking_id', bookingId).order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage('');
    const { error } = await supabase.from('booking_messages').insert({
      booking_id: bookingId,
      sender_id: user.id,
      message: msg
    });
    if (error) toast.error('Failed to send');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111', borderRadius: '1rem', overflow: 'hidden' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start', background: m.sender_id === user.id ? 'var(--admin-brand)' : '#333', padding: '0.6rem 1rem', borderRadius: '1rem', maxWidth: '80%', color: 'white' }}>
            <div style={{ fontSize: '0.9rem' }}>{m.message}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '0.2rem' }}>{new Date(m.created_at).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} style={{ padding: '1rem', borderTop: '1px solid #222', display: 'flex', gap: '0.5rem' }}>
        <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." style={{ flex: 1, background: '#222', border: 'none', padding: '0.7rem', borderRadius: '0.5rem', color: 'white' }} />
        <button type="submit" style={{ background: 'var(--admin-brand)', color: 'white', border: 'none', padding: '0.7rem', borderRadius: '0.5rem' }}><Send size={18} /></button>
      </form>
    </div>
  );
};

export default BookingChat;