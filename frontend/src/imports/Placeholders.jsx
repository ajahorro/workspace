import React from 'react';
import PageHeader from '../../components/PageHeader';
import { Construction } from 'lucide-react';

const UnderConstruction = ({ badge, title, subtitle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
    <PageHeader 
      badge={badge}
      title={title}
      subtitle={subtitle}
    />
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '400px',
      background: '#FFFFFF',
      borderRadius: '1rem',
      border: '1px solid var(--admin-border)',
      color: 'var(--admin-text-secondary)',
      gap: '1.25rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    }}>
      <Construction size={48} strokeWidth={1.5} color="var(--admin-brand)" />
      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--admin-text-primary)', letterSpacing: '1px' }}>
        Page Under Construction
      </h2>
      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', textAlign: 'center', maxWidth: '300px' }}>
        This module is currently being calibrated for peak performance.
      </p>
    </div>
  </div>
);

export const Refunds = () => (
  <UnderConstruction 
    badge="FINANCIAL REVERSALS" 
    title="REFUNDS" 
    subtitle="Manage and track customer refund requests." 
  />
);

export const Analytics = () => (
  <UnderConstruction 
    badge="BUSINESS INTELLIGENCE" 
    title="ANALYTICS" 
    subtitle="Deep dive into your shop's performance data." 
  />
);

export const AuditLogs = () => (
  <UnderConstruction 
    badge="SYSTEM SECURITY" 
    title="AUDIT LOGS" 
    subtitle="Track all administrative actions and system changes." 
  />
);

export const StaffManagement = () => (
  <UnderConstruction 
    badge="TEAM COORDINATION" 
    title="STAFF MANAGEMENT" 
    subtitle="Manage technician profiles, roles, and assignments." 
  />
);

export const UserManagement = () => (
  <UnderConstruction 
    badge="ACCESS CONTROL" 
    title="USERS" 
    subtitle="Manage customer accounts and authentication." 
  />
);
