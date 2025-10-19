import { useState, useEffect, useRef, useCallback } from 'react';
import ZamanSocket from '../services/websocket.js';

/**
 * Хук для управления WebSocket соединением
 * @param {string} url - WebSocket URL
 * @param {object} options - Опции для ZamanSocket
 * @returns {object} - { messages, sendMessage, connected, error }
 */
export const useWebSocket = (url, options = {}) => {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Инициализация WebSocket соединения
  useEffect(() => {
    if (!url) return;

    const socket = new ZamanSocket(url, options);
    socketRef.current = socket;

    // Обработчики событий
    socket.onOpen = () => {
      setConnected(true);
      setError(null);
      console.log('WebSocket connected');
    };

    socket.onClose = () => {
      setConnected(false);
    };

    socket.onError = (err) => {
      setError(err);
      setConnected(false);
    };

    socket.onMessage = (data) => {
      // Ensure we're handling the data structure correctly
      let messageData = data;
      
      // If data has the structure {text, from_cache, latency_ms}, extract the text
      if (data && typeof data === 'object' && data.text) {
        messageData = {
          role: 'assistant',
          content: data.text,
          timestamp: new Date().toISOString(),
          metadata: {
            from_cache: data.from_cache,
            latency_ms: data.latency_ms
          }
        };
      }
      
      setMessages(prev => [...prev, messageData]);
    };

    return () => {
      socket.close();
    };
  }, [url, JSON.stringify(options)]);

  // Функция отправки сообщения
  const sendMessage = useCallback((messageData) => {
    if (socketRef.current && socketRef.current.connected) {
      const success = socketRef.current.sendMessage(messageData);
      if (success) {
        // Добавляем сообщение пользователя в локальное состояние
        setMessages(prev => [...prev, {
          role: 'user',
          content: messageData.message,
          timestamp: new Date().toISOString()
        }]);
      }
      return success;
    }
    return false;
  }, []);

  // Функция очистки сообщений
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Функция переподключения
  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      // Переподключение произойдет автоматически
    }
  }, []);

  return {
    messages,
    sendMessage,
    connected,
    error,
    clearMessages,
    reconnect
  };
};

export default useWebSocket;
