import { useState, useEffect, useCallback } from 'react';

/**
 * Хук для управления историей чата с сохранением в localStorage
 * @param {string} storageKey - Ключ для localStorage
 * @param {number} maxMessages - Максимальное количество сообщений для хранения
 * @returns {object} - { messages, addMessage, clearHistory, loadHistory }
 */
export const useChatHistory = (storageKey = 'zaman_chat_history', maxMessages = 100) => {
  const [messages, setMessages] = useState([]);

  // Загрузка истории из localStorage
  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        setMessages(Array.isArray(parsedMessages) ? parsedMessages : []);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории чата:', error);
      setMessages([]);
    }
  }, [storageKey]);

  // Сохранение истории в localStorage
  const saveHistory = useCallback((newMessages) => {
    try {
      // Ограничиваем количество сообщений
      const messagesToSave = newMessages.slice(-maxMessages);
      localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Ошибка сохранения истории чата:', error);
    }
  }, [storageKey, maxMessages]);

  // Добавление нового сообщения
  const addMessage = useCallback((message) => {
    setMessages(prev => {
      const newMessages = [...prev, {
        ...message,
        id: message.id || Date.now() + Math.random(),
        timestamp: message.timestamp || new Date().toISOString()
      }];
      saveHistory(newMessages);
      return newMessages;
    });
  }, [saveHistory]);

  // Очистка истории
  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Ошибка очистки истории чата:', error);
    }
  }, [storageKey]);

  // Загрузка истории при инициализации
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Автосохранение при изменении сообщений
  useEffect(() => {
    if (messages.length > 0) {
      saveHistory(messages);
    }
  }, [messages, saveHistory]);

  return {
    messages,
    addMessage,
    clearHistory,
    loadHistory,
    setMessages
  };
};

export default useChatHistory;
