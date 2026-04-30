import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Upload, Clock, Phone, Mail, MapPin, CreditCard, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    business_name: 'RENEW Auto Detailing',
    contact_number: '+63 912 345 6789',
    email_address: 'info@renewautodetailing.com',
    business_address: '123 Main Street, Metro Manila, Philippines',
    opening_time: '08:00 am',
    closing_time: '06:00 pm',
    slot_duration: '60 minutes',
    gcash_number: '09123456789',
    gcash_name: 'RENEW Auto Detailing',
    gcash_qr_url: ''
  });

  const handleSave = async () => {
    setLoading(true);
    // In a real app, we would save this to a 'business_settings' table
    // For now, we simulate success
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Settings saved successfully!');
    setLoading(false);
  };

  const sectionStyle = {
    background: 'var(--bg-secondary)',
    borderRadius: '1rem',
    border: '1px solid var(--border-color)',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '0.5rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '0.5rem',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 0.5rem 0', letterSpacing: '1px' }}>SETTINGS</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage your business settings and preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Business Information */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             BUSINESS INFORMATION
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
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} 
              value={settings.business_address} 
              onChange={e => setSettings({...settings, business_address: e.target.value})} 
            />
          </div>
        </div>

        {/* Operating Hours */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>OPERATING HOURS</h2>
          <div>
            <label style={labelStyle}>Opening Time</label>
            <input 
              style={inputStyle} 
              value={settings.opening_time} 
              onChange={e => setSettings({...settings, opening_time: e.target.value})} 
            />
          </div>
          <div>
            <label style={labelStyle}>Closing Time</label>
            <input 
              style={inputStyle} 
              value={settings.closing_time} 
              onChange={e => setSettings({...settings, closing_time: e.target.value})} 
            />
          </div>
          <div>
            <label style={labelStyle}>Appointment Slot Duration (Minutes)</label>
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
          <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
             <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Hours: {settings.opening_time} - {settings.closing_time}</p>
             <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Slot Duration: {settings.slot_duration}</p>
          </div>
        </div>

        {/* Payment Settings */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>PAYMENT SETTINGS</h2>
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
              border: '2px dashed var(--border-color)', 
              borderRadius: '1rem', 
              padding: '2rem', 
              textAlign: 'center',
              background: 'var(--bg-input)'
            }}>
              <div style={{ width: '120px', height: '120px', background: '#333', borderRadius: '0.75rem', margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                [QR Code Preview]
              </div>
              <button style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)', 
                color: '#fff', 
                padding: '0.6rem 1.25rem', 
                borderRadius: '0.5rem', 
                fontSize: '0.85rem', 
                fontWeight: '600', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 auto'
              }}>
                <Upload size={16} /> Upload QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{ 
            background: 'var(--primary-color)', 
            color: '#000', 
            border: 'none', 
            padding: '1rem 2.5rem', 
            borderRadius: '0.75rem', 
            fontWeight: '800', 
            fontSize: '1rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 10px 20px rgba(56, 189, 248, 0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {loading ? 'Saving...' : <><Save size={20} /> Save Settings</>}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
