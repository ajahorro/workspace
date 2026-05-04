import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Upload, Clock, Phone, Mail, MapPin, CreditCard, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useTheme } from '../../context/ThemeContext';

const AdminSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    business_name: 'SpeedWay AutoxMoto Detail Studio',
    contact_number: '+63 912 345 6789',
    email_address: 'info@speedwayautoxmoto.com',
    business_address: '123 Main Street, Metro Manila, Philippines',
    opening_hour: '08:00:00',
    closing_hour: '18:00:00',
    slot_duration_minutes: 60,
    gcash_number: '09123456789',
    gcash_name: 'SpeedWay AutoxMoto Detail Studio',
    gcash_qr_url: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('business_settings').select('*').maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings({
          ...settings,
          ...data,
          // Handle potential nulls or different field names
          slot_duration: `${data.slot_duration_minutes} minutes`
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData = {
        opening_hour: settings.opening_hour,
        closing_hour: settings.closing_hour,
        slot_duration_minutes: parseInt(settings.slot_duration),
        gcash_number: settings.gcash_number,
        gcash_name: settings.gcash_name,
        gcash_qr_url: settings.gcash_qr_url,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('business_settings').update(updateData).eq('id', true);
      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = {
    background: 'var(--bg-card)',
    borderRadius: '1.25rem',
    border: '1px solid var(--glass-border)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: 'var(--card-shadow)',
    color: 'var(--card-text)',
    transition: 'all 0.3s ease'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--card-text)',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '0.75rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1.25rem',
    background: 'var(--bg-input)',
    border: '1px solid var(--glass-border)',
    borderRadius: '0.75rem',
    color: 'var(--card-text)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontWeight: '600'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      {/* Header Area */}
      <PageHeader 
        badge="STUDIO MANAGEMENT"
        title="Settings & Configuration"
        subtitle="Manage your studio's operational parameters and personal appearance preferences."
      />

      {/* SYSTEM SETTINGS GROUP */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)', opacity: 0.5 }}></div>
          <h2 style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>System Configuration</h2>
          <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)', opacity: 0.5 }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {/* Appearance Settings */}
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1.5px', color: 'var(--card-text)' }}>
              <Sparkles size={18} /> APPEARANCE & THEME
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--card-text)', opacity: 0.7, marginBottom: '1.5rem' }}>
              Personalize your workspace aesthetic. Choose between light, dark, or follow your system preferences.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { id: 'light', label: 'LIGHT' },
                { id: 'dark', label: 'DARK' },
                { id: 'system', label: 'SYSTEM' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTheme(t.id)}
                  style={{
                    padding: '1.25rem 0.5rem',
                    background: theme === t.id ? 'var(--card-text)' : 'rgba(255, 255, 255, 0.1)',
                    color: theme === t.id ? 'var(--bg-card)' : 'var(--card-text)',
                    border: theme === t.id ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    opacity: theme === t.id ? 1 : 0.7,
                    boxShadow: theme === t.id ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS SETTINGS GROUP */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)', opacity: 0.5 }}></div>
          <h2 style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>Business Operations</h2>
          <div style={{ height: '1px', flex: 1, background: 'var(--glass-border)', opacity: 0.5 }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {/* Business Information */}
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1.5px', color: 'var(--card-text)' }}>
              <MapPin size={18} /> STUDIO INFORMATION
            </h2>
            <div>
              <label style={labelStyle}>Business Name</label>
              <input 
                style={inputStyle} 
                value={settings.business_name} 
                onChange={e => setSettings({...settings, business_name: e.target.value})} 
              />
            </div>
            <div>
              <label style={labelStyle}>Contact Number</label>
              <input 
                style={inputStyle} 
                value={settings.contact_number} 
                onChange={e => setSettings({...settings, contact_number: e.target.value})} 
              />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input 
                style={inputStyle} 
                value={settings.email_address} 
                onChange={e => setSettings({...settings, email_address: e.target.value})} 
              />
            </div>
            <div>
              <label style={labelStyle}>Studio Address</label>
              <textarea 
                style={{ ...inputStyle, minHeight: '100px', resize: 'none' }} 
                value={settings.business_address} 
                onChange={e => setSettings({...settings, business_address: e.target.value})} 
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1.5px', color: 'var(--card-text)' }}>
              <Clock size={18} /> OPERATING HOURS
            </h2>
            <div>
              <label style={labelStyle}>Opening Time</label>
              <input 
                style={inputStyle} 
                value={settings.opening_hour} 
                onChange={e => setSettings({...settings, opening_hour: e.target.value})} 
              />
            </div>
            <div>
              <label style={labelStyle}>Closing Time</label>
              <input 
                style={inputStyle} 
                value={settings.closing_hour} 
                onChange={e => setSettings({...settings, closing_hour: e.target.value})} 
              />
            </div>
            <div>
              <label style={labelStyle}>Appointment Slot Duration</label>
              <select 
                style={inputStyle} 
                value={settings.slot_duration} 
                onChange={e => setSettings({...settings, slot_duration: e.target.value})}
              >
                <option value="30 minutes">30 minutes</option>
                <option value="60 minutes">60 minutes</option>
                <option value="90 minutes">90 minutes</option>
                <option value="120 minutes">120 minutes</option>
              </select>
            </div>
            <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
               <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: 'var(--card-text)', opacity: 0.8, fontWeight: '700' }}>Active Range:</p>
               <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--card-text)', fontWeight: '900' }}>{settings.opening_hour} - {settings.closing_hour} ({settings.slot_duration} blocks)</p>
            </div>
          </div>

          {/* Payment Settings */}
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1.5px', color: 'var(--card-text)' }}>
              <CreditCard size={18} /> PAYMENT GATEWAYS
            </h2>
            <div>
              <label style={labelStyle}>GCash Number</label>
              <input 
                style={inputStyle} 
                value={settings.gcash_number} 
                onChange={e => setSettings({...settings, gcash_number: e.target.value})} 
              />
            </div>
            <div>
              <label style={labelStyle}>Account Holder Name</label>
              <input 
                style={inputStyle} 
                value={settings.gcash_name} 
                onChange={e => setSettings({...settings, gcash_name: e.target.value})} 
              />
            </div>
            <div>
              <label style={labelStyle}>GCash QR Code</label>
              <div style={{ 
                border: '2px dashed rgba(255,255,255,0.2)', 
                borderRadius: '1.25rem', 
                padding: '1.5rem', 
                textAlign: 'center',
                background: 'rgba(255,255,255,0.05)'
              }}>
                <div style={{ width: '100px', height: '100px', background: 'var(--bg-primary)', borderRadius: '1rem', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', border: '1px solid var(--glass-border)' }}>
                  QR PREVIEW
                </div>
                <button style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  border: '1px solid rgba(255, 255, 255, 0.2)', 
                  color: 'var(--card-text)', 
                  padding: '0.6rem 1.25rem', 
                  borderRadius: '0.75rem', 
                  fontSize: '0.85rem', 
                  fontWeight: '900', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  margin: '0 auto',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  <Upload size={14} /> REPLACE QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{ 
            background: 'var(--card-text)', 
            color: 'var(--bg-card)', 
            border: 'none', 
            padding: '1rem 3rem', 
            borderRadius: '5rem', 
            fontWeight: '950', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            letterSpacing: '1px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {loading ? 'SAVING...' : <><Save size={18} /> SAVE CHANGES</>}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminSettings;
