import React, { useState } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

/**
 * Компонент ввода сообщений с поддержкой голосового ввода
 */
const ChatInput = ({
  onSendMessage,
  onStartRecording,
  onStopRecording,
  onToggleVoice,
  isRecording = false,
  isSpeaking = false,
  voiceEnabled = true,
  loading = false,
  disabled = false
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading || isRecording || disabled) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleMicrophoneClick = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const isInputDisabled = loading || isRecording || disabled;

  return (
    <div style={{
      padding: '1.5rem 2rem',
      background: '#f9fdfb',
      borderTop: '2px solid #e5e7eb',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    }}>
      {/* Кнопка переключения голоса */}
      <button
        onClick={onToggleVoice}
        style={{
          padding: '1rem',
          background: voiceEnabled ? '#2D9A86' : '#e5e7eb',
          color: voiceEnabled ? 'white' : '#9ca3af',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '48px',
          height: '48px'
        }}
        title={voiceEnabled ? 'Отключить озвучку' : 'Включить озвучку'}
      >
        {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      {/* Кнопка микрофона */}
      <button
        onClick={handleMicrophoneClick}
        disabled={loading}
        style={{
          padding: '1rem',
          background: isRecording ? '#ef4444' : '#2D9A86',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '48px',
          height: '48px',
          animation: isRecording ? 'recording 1.5s infinite' : 'none',
          opacity: loading ? 0.6 : 1
        }}
        title={isRecording ? 'Остановить запись' : 'Начать запись'}
      >
        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      {/* Поле ввода */}
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Введите ваш вопрос..."
          disabled={isInputDisabled}
          style={{
            flex: 1,
            padding: '1rem',
            border: '2px solid #d1e5e0',
            borderRadius: '10px',
            fontSize: '15px',
            color: '#111827',
            backgroundColor: '#ffffff',
            fontFamily: 'inherit',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            opacity: isInputDisabled ? 0.6 : 1,
            cursor: isInputDisabled ? 'not-allowed' : 'text'
          }}
        />
      </form>

      {/* Кнопка отправки */}
      <button
        onClick={handleSubmit}
        disabled={loading || !input.trim() || isRecording || disabled}
        style={{
          padding: '1rem 2rem',
          background: (loading || !input.trim() || isRecording || disabled) 
            ? '#9ca3af' 
            : 'linear-gradient(135deg, #2D9A86, #14b8a6)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: (loading || !input.trim() || isRecording || disabled) 
            ? 'not-allowed' 
            : 'pointer',
          fontWeight: '700',
          fontSize: '16px',
          transition: 'all 0.3s',
          boxShadow: '0 4px 12px rgba(45, 154, 134, 0.2)',
          whiteSpace: 'nowrap',
          minWidth: '60px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {loading ? '...' : '↑'}
      </button>
    </div>
  );
};

export default ChatInput;