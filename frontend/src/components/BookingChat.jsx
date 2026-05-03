import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Send, User, MessageCircle, Paperclip, Image as ImageIcon, 
  X, Download, FileText, Play, Camera, Maximize2, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const BookingChat = ({ bookingId }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!bookingId) return;
    
    fetchMessages();

    // 📡 Realtime Subscription
    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'booking_messages', 
        filter: `booking_id=eq.${bookingId}` 
      }, async (payload) => {
        // Fetch full message to ensure metadata/sender info is clean
        const { data } = await supabase
          .from('booking_messages')
          .select('*')
          .eq('id', payload.new.id)
          .single();
        
        if (data) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
        }
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${bookingId}/${Date.now()}.${fileExt}`;
      const filePath = `chat_media/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bookings')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bookings')
        .getPublicUrl(filePath);

      // Determine media type
      let mediaType = 'file';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';

      await supabase.from('booking_messages').insert({
        booking_id: bookingId,
        sender_id: user.id,
        message: file.name,
        media_url: publicUrl,
        media_type: mediaType
      });

      toast.success('Media sent');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
    }
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
      toast.error('Failed to send message');
      setNewMessage(messageToSend);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>Loading chat...</div>;

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '600px', 
      background: 'var(--bg-secondary)', borderRadius: '1.5rem', 
      border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.01)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b98144' }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', color: 'rgba(255,255,255,0.7)' }}>SUPPORT & EVIDENCE CHAT</span>
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'rgba(255,255,255,0.2)' }}>#{bookingId.slice(0,8)}</div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} style={{ 
        flex: 1, overflowY: 'auto', padding: '1.5rem', 
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        scrollBehavior: 'smooth'
      }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.2 }}>
            <MessageCircle size={48} />
            <p style={{ fontSize: '0.9rem', fontWeight: '700' }}>No messages yet. Send a photo or message to start.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            const isSystem = msg.is_system;

            if (isSystem) {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0', width: '100%' }}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '0.5rem 1.25rem', 
                    borderRadius: '5rem', 
                    fontSize: '0.75rem', 
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: '800',
                    border: '1px solid rgba(255,255,255,0.05)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textAlign: 'center'
                  }}>
                    {msg.message || msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={msg.id} 
                style={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Bubble */}
                <div style={{ 
                  padding: msg.media_url && msg.media_type !== 'file' ? '0.25rem' : '0.85rem 1.25rem', 
                  borderRadius: isMe ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
                  background: isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: isMe ? '#000' : '#fff',
                  fontSize: '0.95rem',
                  fontWeight: isMe ? '700' : '500',
                  lineHeight: '1.5',
                  boxShadow: isMe ? '0 10px 20px rgba(169, 27, 24, 0.1)' : 'none',
                  overflow: 'hidden'
                }}>
                  {msg.media_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {msg.media_type === 'image' && (
                        <img 
                          src={msg.media_url} 
                          alt="media" 
                          style={{ maxWidth: '100%', borderRadius: '1rem', cursor: 'pointer' }} 
                          onClick={() => setPreviewMedia({ type: 'image', url: msg.media_url })}
                        />
                      )}
                      {msg.media_type === 'video' && (
                        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setPreviewMedia({ type: 'video', url: msg.media_url })}>
                          <video src={msg.media_url} style={{ maxWidth: '100%', borderRadius: '1rem' }} />
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '50%' }}>
                            <Play size={20} color="#fff" />
                          </div>
                        </div>
                      )}
                      {msg.media_type === 'file' && (
                        <a href={msg.media_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', padding: '0.5rem' }}>
                          <FileText size={20} />
                          <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>{msg.message}</span>
                          <Download size={16} />
                        </a>
                      )}
                      {msg.media_type !== 'file' && <div style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: '800' }}>{msg.message}</div>}
                    </div>
                  ) : (
                    msg.message
                  )}
                </div>
                
                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: '900' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isMe && <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: '900', textTransform: 'uppercase' }}>Support</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.01)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', 
              padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {uploading ? <Clock size={20} className="animate-spin" /> : <Paperclip size={20} />}
          </button>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Write a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              style={{ 
                width: '100%', padding: '0.85rem 1.25rem', borderRadius: '1rem', 
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', 
                color: '#fff', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s' 
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(169, 27, 24, 0.3)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim()}
            style={{ 
              padding: '0.85rem 1.5rem', borderRadius: '1rem', background: 'var(--primary-color)', 
              border: 'none', color: '#000', cursor: 'pointer', fontWeight: '900',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              opacity: !newMessage.trim() ? 0.3 : 1, transition: 'all 0.3s'
            }}
          >
            <Send size={18} /> SEND
          </button>
        </form>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {/* Media Preview Modal */}
      {previewMedia && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <button onClick={() => setPreviewMedia(null)} style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={32}/></button>
          {previewMedia.type === 'image' ? (
            <img src={previewMedia.url} alt="preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
          ) : (
            <video src={previewMedia.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '90vh' }} />
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default BookingChat;
