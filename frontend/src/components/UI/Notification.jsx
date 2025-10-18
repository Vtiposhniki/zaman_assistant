// ============================================================
// 📁 src/components/UI/Notification.jsx
// ============================================================
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const Notification = ({ 
  type = 'info', 
  message, 
  title, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} style={{ color: '#10b981' }} />;
      case 'error':
        return <AlertCircle size={20} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertCircle size={20} style={{ color: '#f59e0b' }} />;
      default:
        return <Info size={20} style={{ color: '#3b82f6' }} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'linear-gradient(135deg, #d1fae5, #a7f3d0)';
      case 'error':
        return 'linear-gradient(135deg, #fee2e2, #fecaca)';
      case 'warning':
        return 'linear-gradient(135deg, #fef3c7, #fde68a)';
      default:
        return 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getBorderColor()}`,
      borderRadius: '12px',
      padding: '1rem 1.5rem',
      marginBottom: '1rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      animation: 'slideIn 0.3s ease-out',
      maxWidth: '400px'
    }}>
      {getIcon()}
      <div style={{ flex: 1 }}>
        {title && (
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '0.25rem',
            margin: 0
          }}>
            {title}
          </h4>
        )}
        <p style={{ 
          fontSize: '14px', 
          color: '#374151', 
          margin: 0,
          lineHeight: '1.4'
        }}>
          {message}
        </p>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
        }}
      >
        <X size={16} style={{ color: '#6b7280' }} />
      </button>
    </div>
  );
};
