import React from 'react';

/**
 * Индикатор набора текста для чата
 */
const TypingIndicator = ({ 
  isVisible = true, 
  text = 'Ассистент печатает...',
  dots = 3 
}) => {
  if (!isVisible) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: '#6b7280',
      fontSize: '14px',
      padding: '1rem 1.5rem',
      background: '#f0f9f7',
      borderRadius: '14px',
      border: '2px solid #d1e5e0',
      maxWidth: 'fit-content',
      margin: '0.5rem 0'
    }}>
      <span style={{ marginRight: '0.5rem' }}>{text}</span>
      <div style={{ display: 'flex', gap: '0.2rem' }}>
        {Array.from({ length: dots }, (_, i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              background: '#2D9A86',
              borderRadius: '50%',
              animation: `typing 1.4s infinite ${i * 0.2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default TypingIndicator;
