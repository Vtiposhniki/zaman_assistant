import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import TypingIndicator from '../UI/TypingIndicator';
import useWebSocket from '../../hooks/useWebSocket';
import useVoiceChat from '../../hooks/useVoiceChat';
import useChatHistory from '../../hooks/useChatHistory';
import api from '../../services/api';

/**
 * Основной компонент чата с поддержкой WebSocket и голосовых функций
 */
const ChatView = ({ chatMode = 'mentor', setChatMode }) => {
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // История чата с автосохранением
  const { messages, addMessage, setMessages } = useChatHistory(`zaman_chat_${chatMode}`);

  // WebSocket соединение
  const wsUrl = api.getWebSocketUrl();
  const { 
    messages: wsMessages, 
    sendMessage: sendWsMessage, 
    connected: wsConnected 
  } = useWebSocket(wsUrl);

  // Голосовые функции
  const {
    isRecording,
    isSpeaking,
    voiceEnabled,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking,
    toggleVoice,
    sendAudioForTranscription,
    audioRef
  } = useVoiceChat({
    onAudioRecorded: handleAudioRecorded,
    onTranscriptionReceived: handleTranscriptionReceived,
    onSpeakingStarted: () => console.log('Speaking started'),
    onSpeakingEnded: () => console.log('Speaking ended')
  });

  // Обработка записанного аудио
  async function handleAudioRecorded(audioBlob) {
    setLoading(true);
    try {
      const data = await sendAudioForTranscription(audioBlob);
      
      if (data.transcription) {
        // Добавляем транскрипцию как сообщение пользователя
        const userMessage = {
          role: 'user',
          content: data.transcription,
          timestamp: new Date().toISOString()
        };
        addMessage(userMessage);
        
        // Отправляем через WebSocket
        sendWsMessage({
          user_id: 1,
          message: data.transcription,
          chat_mode: chatMode
        });
      }
      
      if (data.reply) {
        // Добавляем ответ ассистента
        const assistantMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString()
        };
        addMessage(assistantMessage);
        
        // Озвучиваем ответ
        if (voiceEnabled) {
          await speakText(data.reply);
        }
      }
    } catch (err) {
      console.error('Ошибка обработки аудио:', err);
      const errorMessage = {
        role: 'assistant',
        content: 'Ошибка обработки голосового сообщения',
        timestamp: new Date().toISOString()
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // Обработка полученной транскрипции
  function handleTranscriptionReceived(transcription) {
    const userMessage = {
      role: 'user',
      content: transcription,
      timestamp: new Date().toISOString()
    };
    addMessage(userMessage);
  }

  // Отправка текстового сообщения
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    setLoading(true);
    
    // Добавляем сообщение пользователя
    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    addMessage(userMessage);

    try {
      // Отправляем через WebSocket
      const wsSuccess = sendWsMessage({
        user_id: 1,
        message: text,
        chat_mode: chatMode
      });

      // Если WebSocket недоступен, используем HTTP API
      if (!wsSuccess) {
        const data = await api.sendChatMessage([userMessage], 1);
        
        if (data.reply) {
          const assistantMessage = {
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toISOString()
          };
          addMessage(assistantMessage);
          
          // Озвучиваем ответ
          if (voiceEnabled) {
            await speakText(data.reply);
          }
        }
      }
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
      const errorMessage = {
        role: 'assistant',
        content: 'Ошибка подключения к серверу',
        timestamp: new Date().toISOString()
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Обработка сообщений от WebSocket
  useEffect(() => {
    if (wsMessages.length > 0) {
      const lastMessage = wsMessages[wsMessages.length - 1];
      
      if (lastMessage.role === 'assistant') {
        addMessage(lastMessage);
        
        // Озвучиваем ответ
        if (voiceEnabled && lastMessage.content) {
          speakText(lastMessage.content);
        }
      }
    }
  }, [wsMessages, voiceEnabled, speakText]);

  // Режимы чата
  const modeIcons = {
    mentor: '🧘',
    analyst: '💼',
    friend: '💬',
    tech: '🤖'
  };

  const modeNames = {
    mentor: 'Финансовый ментор',
    analyst: 'Финансовый аналитик',
    friend: 'Дружелюбный ассистент',
    tech: 'Технический эксперт'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '2rem',
      padding: '2rem',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%)'
    }}>
      {/* Боковая панель */}
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
            {modeIcons[chatMode] || '🧘'}
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
            Zaman Assistant
          </h2>
          <p style={{ fontSize: '14px', color: '#2D9A86', fontWeight: '600', margin: 0 }}>
            {modeNames[chatMode] || 'Финансовый ментор'}
          </p>
        </div>

        {/* Статус соединения */}
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '0.75rem', 
          background: wsConnected ? '#f0f9f7' : '#fef2f2', 
          borderRadius: '8px', 
          borderLeft: `4px solid ${wsConnected ? '#2D9A86' : '#ef4444'}` 
        }}>
          <p style={{ 
            fontSize: '12px', 
            color: wsConnected ? '#2D9A86' : '#ef4444', 
            fontWeight: '600', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: wsConnected ? '#2D9A86' : '#ef4444',
              animation: wsConnected ? 'pulse 2s infinite' : 'none'
            }} />
            {wsConnected ? 'Подключено' : 'Отключено'}
          </p>
        </div>

        {/* Выбор режима */}
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

        {/* Подсказка */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9f7', borderRadius: '8px', borderLeft: '4px solid #2D9A86' }}>
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
            💡 <strong>Совет:</strong> Используйте микрофон для голосовых сообщений. Ассистент автоматически озвучит ответ.
          </p>
        </div>
      </div>

      {/* Основная область чата */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        height: '85vh'
      }}>
        {/* Заголовок чата */}
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

        {/* Сообщения */}
        <ChatMessages
          messages={messages}
          loading={loading}
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          isTyping={isTyping}
          chatEndRef={chatEndRef}
        />

        {/* Ввод сообщений */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onToggleVoice={toggleVoice}
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          voiceEnabled={voiceEnabled}
          loading={loading}
        />
      </div>

      {/* Скрытый audio элемент для воспроизведения речи */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ChatView;