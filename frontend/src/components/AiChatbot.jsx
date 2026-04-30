import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, Minimize2, LifeBuoy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AiChatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isHumanRequested, setIsHumanRequested] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: "Hello! I'm RENEW's AI Assistant. How can I help you with your vehicle detailing today?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const knowledgeBase = {
    'ceramic': {
      answer: "Ooh, Ceramic Coating! That's the ultimate protection for your pride and joy! 🌟 It's a premium liquid polymer that bonds to your paint, creating a sacrificial layer that lasts 2-5 years. It makes your car incredibly shiny and easy to clean!",
      followUp: "Are you looking for long-term paint protection, or just a seasonal shine?"
    },
    'wash': {
      answer: "We LOVE making cars sparkle! ✨ Our Premium Wash (₱500) is a top-to-bottom hand wash including wax and tire dressing. It's perfect for a weekly refresh!",
      followUp: "When was the last time your car had a professional hand wash?"
    },
    'interior': {
      answer: "A clean interior makes every drive feel like you're in a brand new car! 🚗💨 We have our Express Interior (₱300) for a quick tidy-up, or the Full Interior Deep Clean (₱1,200) which includes steam cleaning and stain removal!",
      followUp: "Are we dealing with any tough stains or just some regular dust and crumbs?"
    },
    'engine': {
      answer: "A clean engine is a happy engine! 🔧 Our Engine Detail (₱800) removes all that grease and grime, making it look showroom-ready and helping you spot any leaks early.",
      followUp: "Is the engine bay currently very greasy, or just a bit dusty?"
    },
    'price': {
      answer: "We offer great value for premium service! 💰 Our prices start at just ₱500 for a Premium Wash, ₱1,200 for Interior Deep Cleaning, and up to ₱5,000+ for our professional Ceramic Coating.",
      followUp: "Do you have a specific budget in mind for your car's makeover today?"
    },
    'cancel': {
      answer: "We're super flexible! 🔄 You can cancel any time through your dashboard. If you cancel at least 24 hours in advance, we'll process your refund right away!",
      followUp: "Are you looking to reschedule an existing appointment instead?"
    },
    'refund': {
      answer: "No worries at all! 💸 For GCash payments, refunds are processed back to your account once our admin verifies the cancellation. It usually takes 1-2 business days.",
      followUp: "Did you already request a cancellation for your booking?"
    },
    'downpayment': {
      answer: "To secure your slot for premium services, we require a 50% downpayment via GCash for all orders ₱1,000 and above! 💳 This helps us prepare the best tools and staff for you.",
      followUp: "Would you like me to guide you through the GCash payment process?"
    },
    'how to book': {
      answer: "Booking with us is super easy! 🗓️ Just follow these steps: \n1️⃣ Go to your Dashboard and click 'Book Now'.\n2️⃣ Choose the services you want.\n3️⃣ Select your preferred date and time.\n4️⃣ Tell us about your vehicle.\n5️⃣ Review and pay (remember the 50% downpayment for orders over ₱1k!).",
      followUp: "Ready to start your booking, or should I explain one of the steps in more detail?"
    },
    'step': {
      answer: "Of course! 📝 The most important parts are selecting your services and picking an available slot. Once you're done with that, just fill in your plate number and vehicle brand so our team knows exactly what to look for!",
      followUp: "Which part of the booking process seems a bit confusing?"
    },
  };

  const connectToHuman = async () => {
    if (!user) {
      toast.error('Please log in to request live support.');
      return;
    }
    
    setIsTyping(true);
    try {
      // 1. Find all Admins/Super Admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['ADMIN', 'SUPER_ADMIN']);
      
      if (admins && admins.length > 0) {
        // 2. Insert notifications for all admins
        const notifs = admins.map(admin => ({
          user_id: admin.id,
          title: '🚨 LIVE SUPPORT REQUESTED',
          message: `${user.full_name || 'A customer'} (ID: ${user.id.slice(0,8)}) needs human assistance in the AI Chat.`,
          type: 'urgent'
        }));
        
        const { error } = await supabase.from('notifications').insert(notifs);
        if (error) throw error;
        
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'bot',
          text: "I've alerted our human experts! 🚨 One of our detailing specialists will review this chat and reach out to you shortly. Is there anything specific I should tell them?",
          timestamp: new Date()
        }]);
        setIsHumanRequested(true);
      }
    } catch (err) {
      console.error('Support Request Error:', err);
      toast.error('Failed to alert support team. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI thinking
    setTimeout(() => {
      const lowerInput = input.toLowerCase();
      let match = null;

      for (const [key, val] of Object.entries(knowledgeBase)) {
        if (lowerInput.includes(key) || 
           (key === 'how to book' && (lowerInput.includes('schedule') || lowerInput.includes('reserve') || lowerInput.includes('appointment')))) {
          match = val;
          break;
        }
      }

      if (match) {
        // Send first message: The Answer
        const botMsg = { 
          id: Date.now() + 1, 
          role: 'bot', 
          text: match.answer, 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, botMsg]);

        // Send second message: The Follow-up Question
        setTimeout(() => {
          const followUpMsg = {
            id: Date.now() + 2,
            role: 'bot',
            text: match.followUp,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, followUpMsg]);
          setIsTyping(false);
        }, 1200);

      } else {
        const botMsg = { 
          id: Date.now() + 1, 
          role: 'bot', 
          text: "That sounds interesting! I'd love to help you with that. Can you tell me a bit more about what you're looking for so I can give you the best advice? 😊", 
          timestamp: new Date(),
          showSupportButton: !isHumanRequested
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }
    }, 1500);
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 10000, fontFamily: 'system-ui, sans-serif' }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{ 
          width: '380px', 
          height: '550px', 
          background: 'var(--bg-secondary)', 
          borderRadius: '1.5rem', 
          border: '1px solid var(--border-color)', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          marginBottom: '1rem',
          animation: 'slideUp 0.3s ease-out',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Header */}
          <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--primary-color)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Bot size={24} color="#000" />
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', border: '2px solid #0f172a' }}></div>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem', color: '#fff' }}>RENEW AI</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Always Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><Minimize2 size={20} /></button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  borderRadius: msg.role === 'user' ? '1.25rem 1.25rem 0 1.25rem' : '1.25rem 1.25rem 1.25rem 0',
                  background: msg.role === 'user' ? 'var(--primary-color)' : 'var(--bg-input)',
                  color: msg.role === 'user' ? '#000' : '#fff',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  {msg.text}
                </div>
                {msg.showSupportButton && (
                  <button 
                    onClick={connectToHuman}
                    style={{ 
                      marginTop: '0.75rem', 
                      background: 'rgba(56, 189, 248, 0.1)', 
                      border: '1px solid var(--primary-color)', 
                      color: 'var(--primary-color)', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.5rem', 
                      fontSize: '0.8rem', 
                      fontWeight: '700', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      width: 'fit-content'
                    }}
                  >
                    <LifeBuoy size={14} /> Connect to Human Expert
                  </button>
                )}
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-input)', padding: '0.75rem 1rem', borderRadius: '1.25rem 1.25rem 1.25rem 0', display: 'flex', gap: '4px' }}>
                <div className="dot" style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'bounce 1s infinite 0s' }}></div>
                <div className="dot" style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></div>
                <div className="dot" style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ position: 'relative' }}>
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..." 
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '2rem', padding: '0.75rem 3rem 0.75rem 1.25rem', color: '#fff', fontSize: '0.9rem' }}
              />
              <button type="submit" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--primary-color)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                <Send size={16} color="#000" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '64px', 
          height: '64px', 
          background: isOpen ? '#ef4444' : 'var(--primary-color)', 
          borderRadius: '50%', 
          border: 'none', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          cursor: 'pointer', 
          boxShadow: '0 10px 30px rgba(56, 189, 248, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
      >
        {isOpen ? <X size={28} color="#fff" /> : <MessageSquare size={28} color="#000" />}
        {!isOpen && (
          <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: '2px solid var(--bg-secondary)' }}>AI</div>
        )}
      </button>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .dot { animation: bounce 1s infinite; }
      `}</style>
    </div>
  );
};

export default AiChatbot;
