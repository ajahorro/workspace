import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Upload, Clock, Phone, Mail, MapPin, CreditCard, Check, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const AdminSettings = () => {
  const { user, profile, updateProfile } = useAuth();
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
        gcash_number: settings.gcash_number,
        gcash_name: settings.gcash_name,
        gcash_qr_url: settings.gcash_qr_url,
        updated_at: new Date().toISOString()
      };

      // Ensure we target the record correctly - either update by ID or use upsert
      const { error } = await supabase
        .from('business_settings')
        .upsert({ 
          id: settings.id || 1, // Fallback to 1 if no ID found
          ...updateData 
        });
      if (error) throw error;
      toast.success('Settings saved successfully!', {
        style: { background: 'var(--bg-panel)', color: 'var(--panel-text)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }
      });
    } catch (err) {
      toast.error(err.message || 'Failed to save settings.', {
        style: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(12px)' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `gcash_qr_${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public_assets')
        .getPublicUrl(filePath);

      setSettings({ ...settings, gcash_qr_url: publicUrl });
      toast.success('QR Code uploaded! Don\'t forget to click Save Settings at the bottom.');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = {
    background: 'var(--admin-card)',
    borderRadius: '1rem',
    border: '1px solid var(--admin-border)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)',
    transition: 'all 0.3s ease'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '800',
    color: 'var(--admin-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '0.5rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--admin-input-bg)',
    border: '1px solid var(--admin-input-border)',
    borderRadius: '0.75rem',
    color: 'var(--admin-text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontWeight: '600'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Area */}
      <PageHeader 
        badge="STUDIO MANAGEMENT"
        title="Settings & Configuration"
        subtitle="Manage your studio's operational parameters and personal appearance preferences."
      />

      {/* BUSINESS SETTINGS GROUP */}
      <section style={{ animation: 'fadeIn 0.5s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: '950', color: 'var(--admin-text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>Business Operations</h2>
          <div style={{ height: '1px', flex: 1, background: 'var(--admin-border)', opacity: 0.5 }}></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {/* Business Information */}
          <div className="setting-card" style={sectionStyle}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--admin-text-primary)' }}>
              <MapPin size={20} color="var(--admin-brand)" /> Studio Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  style={{ ...inputStyle, minHeight: '80px', resize: 'none' }} 
                  value={settings.business_address} 
                  onChange={e => setSettings({...settings, business_address: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="setting-card" style={sectionStyle}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--admin-text-primary)' }}>
              <Clock size={20} color="var(--admin-brand)" /> Operating Hours
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--admin-card)', padding: '0.5rem', borderRadius: '1rem', border: '1px solid var(--admin-border)', width: 'fit-content' }}>
                 <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--admin-text-secondary)', fontWeight: '700' }}>Active Window:</p>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-primary)', fontWeight: '800' }}>{settings.opening_hour} – {settings.closing_hour}</p>
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="setting-card" style={sectionStyle}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--admin-text-primary)' }}>
              <CreditCard size={20} color="var(--admin-brand)" /> Payment Gateways
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  border: '2px dashed var(--admin-border)', 
                  borderRadius: '1rem', 
                  padding: '1.5rem', 
                  textAlign: 'center',
                  background: 'var(--admin-bg)'
                }}>
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    background: 'var(--admin-card)', 
                    borderRadius: '0.75rem', 
                    margin: '0 auto 1rem auto', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    overflow: 'hidden',
                    border: '1px solid var(--admin-border)' 
                  }}>
                    {settings.gcash_qr_url ? (
                      <img src={settings.gcash_qr_url} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>NO QR SET</span>
                    )}
                  </div>
                  <input 
                    type="file" 
                    id="qr-upload" 
                    hidden 
                    accept="image/*" 
                    onChange={handleQRUpload} 
                  />
                  <button 
                    onClick={() => document.getElementById('qr-upload').click()}
                    style={{ 
                      background: 'var(--admin-card)', 
                      border: '1px solid var(--admin-border)', 
                      color: 'var(--admin-text-primary)', 
                      padding: '0.6rem 1.25rem', 
                      borderRadius: '0.6rem', 
                      fontSize: '0.8rem', 
                      fontWeight: '800', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      margin: '0 auto'
                    }}
                  >
                    <Upload size={14} /> Replace QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{ 
            background: 'var(--admin-brand)', 
            color: '#FFFFFF', 
            border: 'none', 
            padding: '1rem 2.5rem', 
            borderRadius: '0.75rem', 
            fontWeight: '800', 
            fontSize: '0.95rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.2)'
          }}
        >
          {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .setting-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .setting-card:hover {
          border-color: var(--admin-brand) !important;
          transform: translateY(-2px);
        }
        button, input, select, textarea {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default AdminSettings;
