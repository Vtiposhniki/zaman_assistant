// ============================================================
// 📁 src/components/UI/StatCard.jsx
// ============================================================
import React from 'react';

export const StatCard = ({ label, value, icon, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '1.8rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
    transition: 'all 0.2s',
    cursor: 'pointer'
  }}>
    <div style={{ fontSize: '36px', marginBottom: '0.75rem' }}>{icon}</div>
    <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: '500' }}>
      {label}
    </p>
    <p style={{ fontSize: '26px', fontWeight: 'bold', color: color }}>{value}</p>
  </div>
);