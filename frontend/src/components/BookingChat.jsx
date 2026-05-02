import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BookingChat = ({ bookingId }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!bookingId) return;
    
    fetchMessages();

    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'booking_messages', 
        filter: `booking_id=eq.${bookingId}` 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('booking_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    setLoading(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageToSend = newMessage;
    setNewMessage('');

    const { error } = await supabase.from('booking_messages').insert({
      booking_id: bookingId,
      sender_id: user.id,
      message: messageToSend
    });

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend);
    }
  };

  if (loading) return <div style={{ padding: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Loading conversation...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '400px', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
        <MessageCircle size={18} color="var(--primary-color)" />
        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>REFUND & SUPPORT CHAT</span>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div 
                key={msg.id} 
                style={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  borderRadius: isMe ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                  background: isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  lineHeight: '1.4'
                }}>
                  {msg.message}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem', fontWeight: '800' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.75rem' }}>
        <input 
          type="text" 
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ 
            flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', 
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', 
            color: '#fff', fontSize: '0.85rem', outline: 'none' 
          }}
        />
        <button 
          type="submit"
          style={{ 
            padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--primary-color)', 
            border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default BookingChat;
