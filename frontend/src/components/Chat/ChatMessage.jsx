// ============================================================
// 📁 src/components/Chat/ChatMessage.jsx
// ============================================================
import React from 'react';

export const ChatMessage = ({ message, isUser }) => (
  <div style={{
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    animation: 'slideIn 0.3s ease'
  }}>
    <div style={{
      maxWidth: '75%',
      padding: '1.2rem 1.5rem',
      borderRadius: '14px',
      background: isUser
        ? 'linear-gradient(135deg, #2D9A86, #14b8a6)'
        : '#f0f9f7',
      color: isUser ? 'white' : '#111827',
      fontSize: '15px',
      lineHeight: '1.6',
      boxShadow: isUser
        ? '0 8px 20px rgba(45, 154, 134, 0.2)'
        : '0 4px 12px rgba(45, 154, 134, 0.08)',
      border: isUser ? 'none' : '2px solid #d1e5e0'
    }}>
      {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
    </div>
  </div>
);