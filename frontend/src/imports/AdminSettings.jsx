import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Upload, Clock, CreditCard, Sparkles, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const AdminSettings = () => {
  const { profile, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 1024px)');
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
        setSettings(prev => ({
          ...prev,
          ...data,
        }));
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

      const { error } = await supabase
        .from('business_settings')
        .upsert({ 
          id: settings.id || 1,
          ...updateData 
        });
      if (error) throw error;
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings.');
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

      setSettings(prev => ({ ...prev, gcash_qr_url: publicUrl }));
      toast.success('QR Code uploaded! Don\'t forget to click Save Changes.');
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
    padding: isMobile ? '1.25rem' : '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? '1.5rem' : '2rem',
    boxShadow: 'var(--admin-card-shadow)',
    color: 'var(--admin-text-primary)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.7rem',
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
    transition: '0.2s',
    boxSizing: 'border-box',
    fontWeight: '600'
  };

  if (fetching) return <div style={{ padding: '2rem', textAlign: 'center' }}>Synchronizing settings...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      <PageHeader 
        badge="STUDIO MANAGEMENT"
        title="Settings & Configuration"
        subtitle="Manage your studio's operational parameters and personal appearance preferences."
      />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: isMobile ? '1rem' : '2rem', alignItems: 'start' }}>
        
        {/* Business Settings Container */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <MapPin size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Studio Configuration</h2>
          </div>
          
          {/* Operating Hours */}
          <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: '2rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', opacity: 0.8 }}>
              <Clock size={16} color="var(--admin-brand)" />
              <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Operating Hours</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '1.5rem' }}>
              <div>
                <label style={labelStyle}>Opening Time</label>
                <input type="time" style={inputStyle} value={settings.opening_hour} onChange={e => setSettings({...settings, opening_hour: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Closing Time</label>
                <input type="time" style={inputStyle} value={settings.closing_hour} onChange={e => setSettings({...settings, closing_hour: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Payment Gateways */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', opacity: 0.8 }}>
              <CreditCard size={16} color="var(--admin-brand)" />
              <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Gateways</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '1.5rem' }}>
                <div>
                  <label style={labelStyle}>GCash Number</label>
                  <input style={inputStyle} value={settings.gcash_number} onChange={e => setSettings({...settings, gcash_number: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Account Name</label>
                  <input style={inputStyle} value={settings.gcash_name} onChange={e => setSettings({...settings, gcash_name: e.target.value})} />
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '1.5rem', 
                padding: '2rem', 
                background: 'var(--admin-bg)', 
                borderRadius: '1rem', 
                border: '2px dashed var(--admin-border)',
                textAlign: 'center'
              }}>
                <div style={{ 
                  width: '160px', 
                  height: '160px', 
                  background: '#fff', 
                  borderRadius: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  border: '1px solid var(--admin-border)'
                }}>
                  {settings.gcash_qr_url ? (
                    <img src={settings.gcash_qr_url} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={32} color="var(--admin-text-secondary)" opacity={0.3} />
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-secondary)' }}>NO QR SET</span>
                    </div>
                  )}
                </div>
                
                <div style={{ width: '100%' }}>
                  <input type="file" id="qr-upload" hidden accept="image/*" onChange={handleQRUpload} />
                  <button 
                    onClick={() => document.getElementById('qr-upload').click()} 
                    style={{ 
                      width: '100%',
                      padding: '0.85rem', 
                      background: 'var(--admin-card)', 
                      border: '1px solid var(--admin-border)', 
                      borderRadius: '0.75rem', 
                      fontSize: '0.8rem', 
                      fontWeight: '900', 
                      color: 'var(--admin-text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--admin-brand)'; e.currentTarget.style.background = 'var(--admin-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--admin-border)'; e.currentTarget.style.background = 'var(--admin-card)'; }}
                  >
                    <Upload size={18} color="var(--admin-brand)" /> UPLOAD NEW QR CODE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Appearance Container */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Sparkles size={20} color="var(--admin-brand)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>System Appearance</h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-secondary)', fontWeight: '600', lineHeight: '1.6' }}>
            Personalize your workspace. Choose how the Speedway Studio interface appears on your current device.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
            {['system', 'light', 'dark'].map(t => (
              <button
                key={t}
                onClick={() => toggleTheme(t)}
                style={{
                  padding: '1.25rem',
                  background: theme === t ? 'var(--admin-brand)' : 'var(--admin-bg)',
                  color: theme === t ? '#fff' : 'var(--admin-text-primary)',
                  border: theme === t ? 'none' : '1px solid var(--admin-border)',
                  borderRadius: '0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: '900',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                {t}
                {theme === t && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button 
          onClick={handleSave}
          disabled={loading}
          style={{ 
            background: 'var(--admin-brand)', 
            color: '#fff', 
            border: 'none', 
            padding: '1rem 2.5rem', 
            borderRadius: '0.75rem', 
            fontWeight: '900', 
            fontSize: '0.9rem', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.2)'
          }}
        >
          {loading ? 'Saving...' : <><Save size={18} /> SAVE CHANGES</>}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default AdminSettings;
