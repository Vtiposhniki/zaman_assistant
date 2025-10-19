import React, { useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import TypingIndicator from '../UI/TypingIndicator';

/**
 * Компонент для отображения сообщений чата
 */
const ChatMessages = ({ 
  messages = [], 
  loading = false, 
  isRecording = false, 
  isSpeaking = false,
  isTyping = false,
  chatEndRef 
}) => {
  const messagesEndRef = useRef(null);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Индикатор загрузки
  const LoadingIndicator = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem', 
      color: '#6b7280',
      marginTop: '1rem'
    }}>
      <div style={{ 
        width: '12px', 
        height: '12px', 
        background: '#2D9A86', 
        borderRadius: '50%', 
        animation: 'bounce 1.4s infinite' 
      }} />
      <div style={{ 
        width: '12px', 
        height: '12px', 
        background: '#2D9A86', 
        borderRadius: '50%', 
        animation: 'bounce 1.4s infinite 0.2s' 
      }} />
      <div style={{ 
        width: '12px', 
        height: '12px', 
        background: '#2D9A86', 
        borderRadius: '50%', 
        animation: 'bounce 1.4s infinite 0.4s' 
      }} />
      <span style={{ marginLeft: '0.5rem', fontSize: '14px' }}>
        {isRecording ? 'Распознаю речь...' : 'Ассистент думает...'}
      </span>
    </div>
  );

  // Индикатор воспроизведения речи
  const SpeakingIndicator = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem', 
      color: '#2D9A86', 
      fontSize: '14px',
      marginTop: '1rem'
    }}>
      <Volume2 size={16} style={{ animation: 'pulse 1s infinite' }} />
      <span>Озвучиваю ответ...</span>
    </div>
  );

  // Пустое состояние
  if (messages.length === 0 && !loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        color: '#9ca3af'
      }}>
        <div>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>💬</div>
          <p style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
            Ещё нет сообщений
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            Напишите текст или нажмите на микрофон 🎤
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      background: 'linear-gradient(to bottom, #ffffff, #f9fdfb)'
    }}>
      {messages.map((msg, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            animation: 'slideIn 0.3s ease'
          }}
        >
          <div style={{
            maxWidth: '75%',
            padding: '1.2rem 1.5rem',
            borderRadius: '14px',
            background: msg.role === 'user'
              ? 'linear-gradient(135deg, #2D9A86, #14b8a6)'
              : '#f0f9f7',
            color: msg.role === 'user' ? 'white' : '#111827',
            fontSize: '15px',
            lineHeight: '1.6',
            boxShadow: msg.role === 'user'
              ? '0 8px 20px rgba(45, 154, 134, 0.2)'
              : '0 4px 12px rgba(45, 154, 134, 0.08)',
            border: msg.role === 'user' ? 'none' : '2px solid #d1e5e0',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}>
            {msg.content}
            {msg.timestamp && (
              <div style={{
                fontSize: '11px',
                opacity: 0.7,
                marginTop: '0.5rem',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}>
                {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {loading && <LoadingIndicator />}
      {isSpeaking && <SpeakingIndicator />}
      {isTyping && <TypingIndicator isVisible={true} />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
