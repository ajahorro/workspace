import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Upload, Clock, Phone, Mail, MapPin, CreditCard, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';

const AdminSettings = () => {
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
    background: 'var(--bg-secondary)',
    borderRadius: '1.25rem',
    border: 'var(--border-color)',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: 'var(--card-shadow)',
    color: 'var(--card-text)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '0.6rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1.25rem',
    background: 'var(--bg-input)',
    border: 'var(--border-color)',
    borderRadius: '0.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontWeight: '600'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
      
      {/* Header Area */}
      <PageHeader 
        badge="SYSTEM CONFIGURATION"
        title="SETTINGS"
        subtitle="Manage your business parameters and preferences."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Business Information */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1.5px', color: '#fff' }}>
            <MapPin size={18} color="#fff" /> BUSINESS INFORMATION
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
            <label style={labelStyle}>Business Address</label>
            <textarea 
              style={{ ...inputStyle, minHeight: '100px', resize: 'none' }} 
              value={settings.business_address} 
              onChange={e => setSettings({...settings, business_address: e.target.value})} 
            />
          </div>
        </div>

        {/* Operating Hours */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1.5px', color: '#fff' }}>
            <Clock size={18} color="#fff" /> OPERATING HOURS
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
          <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '1rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
             <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>Configured Range:</p>
             <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: '900' }}>{settings.opening_hour} - {settings.closing_hour} ({settings.slot_duration} blocks)</p>
          </div>
        </div>

        {/* Payment Settings */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '1.5px', color: '#fff' }}>
            <CreditCard size={18} color="#fff" /> PAYMENT SETTINGS
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
            <label style={labelStyle}>GCash Account Name</label>
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
              background: 'rgba(255,255,255,0.1)'
            }}>
              <div style={{ width: '100px', height: '100px', background: 'var(--bg-primary)', borderRadius: '1rem', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', border: 'var(--border-color)' }}>
                QR PREVIEW
              </div>
              <button style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                border: '1px solid rgba(255, 255, 255, 0.2)', 
                color: '#fff', 
                padding: '0.6rem 1.25rem', 
                borderRadius: '0.75rem', 
                fontSize: '0.8rem', 
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
                <Upload size={14} /> UPDATE QR
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{ 
            background: 'var(--red-shade)', 
            color: '#fff', 
            border: 'none', 
            padding: '0.85rem 2.5rem', 
            borderRadius: '5rem', 
            fontWeight: '900', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--card-shadow)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
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
