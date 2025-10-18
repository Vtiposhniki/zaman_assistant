// ============================================================
// 📁 src/components/Chat/ChatInput.jsx
// ============================================================
import React from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export const ChatInput = ({
  input,
  setInput,
  onSend,
  isRecording,
  onToggleRecording,
  voiceEnabled,
  onToggleVoice,
  isSpeaking,
  loading,
  disabled
}) => (
  <div style={{
    padding: '1.5rem 2rem',
    background: '#f9fdfb',
    borderTop: '2px solid #e5e7eb',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  }}>
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
        justifyContent: 'center'
      }}
      title={voiceEnabled ? 'Отключить озвучку' : 'Включить озвучку'}
    >
      {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>

    <button
      onClick={onToggleRecording}
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
        animation: isRecording ? 'pulse 1.5s infinite' : 'none',
        opacity: loading ? 0.6 : 1
      }}
      title={isRecording ? 'Остановить запись' : 'Начать запись'}
    >
      {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
    </button>

    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && !disabled && onSend()}
      placeholder="Введите ваш вопрос..."
      disabled={disabled}
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
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'text'
      }}
    />

    <button
      onClick={onSend}
      disabled={disabled || !input.trim()}
      style={{
        padding: '1rem 2rem',
        background: (disabled || !input.trim()) ? '#9ca3af' : 'linear-gradient(135deg, #2D9A86, #14b8a6)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: (disabled || !input.trim()) ? 'not-allowed' : 'pointer',
        fontWeight: '700',
        fontSize: '16px',
        transition: 'all 0.3s',
        boxShadow: '0 4px 12px rgba(45, 154, 134, 0.2)',
        whiteSpace: 'nowrap'
      }}
    >
      {loading ? '...' : '↑'}
    </button>
  </div>
);