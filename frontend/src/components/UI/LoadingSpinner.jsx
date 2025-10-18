// ============================================================
// 📁 src/components/UI/LoadingSpinner.jsx
// ============================================================
import React from 'react';

export const LoadingSpinner = ({ size = 'medium', text = 'Загрузка...' }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { width: '20px', height: '20px' };
      case 'large':
        return { width: '48px', height: '48px' };
      default:
        return { width: '32px', height: '32px' };
    }
  };

  const spinnerSize = getSize();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem'
    }}>
      <div style={{
        width: spinnerSize.width,
        height: spinnerSize.height,
        border: '3px solid #e5e7eb',
        borderTop: '3px solid #2D9A86',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      {text && (
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: 0,
          textAlign: 'center'
        }}>
          {text}
        </p>
      )}
    </div>
  );
};
