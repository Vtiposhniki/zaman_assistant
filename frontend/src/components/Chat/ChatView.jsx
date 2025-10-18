// ============================================================
// 📁 src/components/Chat/ChatView.jsx
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

export const ChatView = ({ chatService, chatMode, setChatMode }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const chatEndRef = useRef(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { isSpeaking, speak, stop, audioRef } = useTextToSpeech(chatService);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const data = await chatService.sendMessage(
        [{ role: 'user', content: userMsg }],
        1
      );
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      
      if (voiceEnabled && data.reply) {
        await speak(data.reply);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Ошибка подключения к серверу' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        await sendAudioMessage(audioBlob);
      }
    } else {
      try {
        await startRecording();
      } catch (err) {
        alert('Не удалось получить доступ к микрофону');
      }
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    setLoading(true);
    try {
      const data = await chatService.sendAudioMessage(audioBlob, 1, 'ru');
      
      if (data.transcription) {
        setMessages(prev => [...prev, { 
          role: 'user', 
          content: data.transcription.text || data.transcription 
        }]);
      }
      
      if (data.reply || data.response?.text) {
        const replyText = data.reply || data.response.text;
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: replyText 
        }]);
        
        if (voiceEnabled) {
          await speak(replyText);
        }
      }
    } catch (err) {
      console.error('Audio processing error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Ошибка обработки голосового сообщения' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (isSpeaking) stop();
  };

  const modeConfig = {
    mentor: { icon: '🧘', name: 'Финансовый ментор' },
    analyst: { icon: '💼', name: 'Финансовый аналитик' },
    friend: { icon: '💬', name: 'Дружелюбный ассистент' },
    tech: { icon: '🤖', name: 'Технический эксперт' }
  };

  const currentMode = modeConfig[chatMode] || modeConfig.mentor;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '2rem',
      padding: '2rem',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%)'
    }}>
      {/* Sidebar */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 10px 30px rgba(45, 154, 134, 0.1)',
        height: 'fit-content',
        position: 'sticky',
        top: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '60px',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 30px rgba(45, 154, 134, 0.2)'
          }}>
            {currentMode.icon}
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
            Zaman Assistant
          </h2>
          <p style={{ fontSize: '14px', color: '#2D9A86', fontWeight: '600', margin: 0 }}>
            {currentMode.name}
          </p>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: '700', 
            color: '#111827', 
            marginBottom: '1rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px' 
          }}>
            Режим общения
          </h3>
          <select
            value={chatMode}
            onChange={(e) => setChatMode(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1e5e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2D9A86',
              background: '#f9fdfb',
              cursor: 'pointer'
            }}
          >
            <option value="mentor">🧘 Ментор</option>
            <option value="analyst">💼 Аналитик</option>
            <option value="friend">💬 Друг</option>
            <option value="tech">🤖 Технарь</option>
          </select>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: '#f0f9f7', 
          borderRadius: '8px', 
          borderLeft: '4px solid #2D9A86' 
        }}>
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
            💡 <strong>Совет:</strong> Используйте микрофон для голосовых сообщений. 
            Ассистент автоматически озвучит ответ.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        height: '85vh'
      }}>
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
          color: 'white',
          borderBottom: '3px solid #258170'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            Начните разговор
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            {isRecording ? '🎤 Запись голоса...' : isSpeaking ? '🔊 Озвучивание...' : 'Введите вопрос или используйте микрофон'}
          </p>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          background: 'linear-gradient(to bottom, #ffffff, #f9fdfb)'
        }}>
          {messages.length === 0 ? (
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
          ) : (
            messages.map((msg, i) => (
              <ChatMessage 
                key={i} 
                message={msg} 
                isUser={msg.role === 'user'} 
              />
            ))
          )}
          
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
              <div style={{ width: '12px', height: '12px', background: '#2D9A86', borderRadius: '50%', animation: 'bounce 1.4s infinite' }} />
              <div style={{ width: '12px', height: '12px', background: '#2D9A86', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.2s' }} />
              <div style={{ width: '12px', height: '12px', background: '#2D9A86', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.4s' }} />
              <span style={{ marginLeft: '0.5rem', fontSize: '14px' }}>
                {isRecording ? 'Распознаю речь...' : 'Ассистент думает...'}
              </span>
            </div>
          )}
          
          {isSpeaking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2D9A86', fontSize: '14px' }}>
              <Volume2 size={16} style={{ animation: 'pulse 1s infinite' }} />
              <span>Озвучиваю ответ...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          voiceEnabled={voiceEnabled}
          onToggleVoice={handleToggleVoice}
          isSpeaking={isSpeaking}
          loading={loading}
          disabled={loading || isRecording}
        />
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};