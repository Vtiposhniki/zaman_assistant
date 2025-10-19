/**
 * Тесты для ChatView компонента
 * Проверяет интеграцию WebSocket и голосовых функций
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatView from '../ChatView';

// Мокаем хуки
jest.mock('../../hooks/useWebSocket');
jest.mock('../../hooks/useVoiceChat');
jest.mock('../../hooks/useChatHistory');
jest.mock('../../services/api');

describe('ChatView Integration Tests', () => {
  const mockUseWebSocket = require('../../hooks/useWebSocket').default;
  const mockUseVoiceChat = require('../../hooks/useVoiceChat').default;
  const mockUseChatHistory = require('../../hooks/useChatHistory').default;

  beforeEach(() => {
    // Сброс всех моков
    jest.clearAllMocks();
    
    // Мок useWebSocket
    mockUseWebSocket.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      connected: true,
      error: null
    });

    // Мок useVoiceChat
    mockUseVoiceChat.mockReturnValue({
      isRecording: false,
      isSpeaking: false,
      voiceEnabled: true,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      speakText: jest.fn(),
      stopSpeaking: jest.fn(),
      toggleVoice: jest.fn(),
      sendAudioForTranscription: jest.fn(),
      audioRef: { current: null }
    });

    // Мок useChatHistory
    mockUseChatHistory.mockReturnValue({
      messages: [],
      addMessage: jest.fn(),
      setMessages: jest.fn()
    });
  });

  test('рендерит компонент чата', () => {
    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    expect(screen.getByText('Zaman Assistant')).toBeInTheDocument();
    expect(screen.getByText('Финансовый ментор')).toBeInTheDocument();
    expect(screen.getByText('Начните разговор')).toBeInTheDocument();
  });

  test('отображает статус WebSocket соединения', () => {
    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    expect(screen.getByText('Подключено')).toBeInTheDocument();
  });

  test('показывает режимы чата', () => {
    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    const select = screen.getByDisplayValue('🧘 Ментор');
    expect(select).toBeInTheDocument();
  });

  test('обрабатывает отправку текстового сообщения', async () => {
    const mockSendMessage = jest.fn();
    mockUseWebSocket.mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      connected: true,
      error: null
    });

    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    const input = screen.getByPlaceholderText('Введите ваш вопрос...');
    const sendButton = screen.getByText('↑');
    
    fireEvent.change(input, { target: { value: 'Тестовое сообщение' } });
    fireEvent.click(sendButton);
    
    expect(mockSendMessage).toHaveBeenCalledWith({
      user_id: 1,
      message: 'Тестовое сообщение',
      chat_mode: 'mentor'
    });
  });

  test('обрабатывает голосовую запись', () => {
    const mockStartRecording = jest.fn();
    mockUseVoiceChat.mockReturnValue({
      isRecording: false,
      isSpeaking: false,
      voiceEnabled: true,
      startRecording: mockStartRecording,
      stopRecording: jest.fn(),
      speakText: jest.fn(),
      stopSpeaking: jest.fn(),
      toggleVoice: jest.fn(),
      sendAudioForTranscription: jest.fn(),
      audioRef: { current: null }
    });

    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    const micButton = screen.getByTitle('Начать запись');
    fireEvent.click(micButton);
    
    expect(mockStartRecording).toHaveBeenCalled();
  });

  test('переключает режим чата', () => {
    const mockSetChatMode = jest.fn();
    render(<ChatView chatMode="mentor" setChatMode={mockSetChatMode} />);
    
    const select = screen.getByDisplayValue('🧘 Ментор');
    fireEvent.change(select, { target: { value: 'analyst' } });
    
    expect(mockSetChatMode).toHaveBeenCalledWith('analyst');
  });

  test('отображает пустое состояние', () => {
    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    expect(screen.getByText('Ещё нет сообщений')).toBeInTheDocument();
    expect(screen.getByText('Напишите текст или нажмите на микрофон 🎤')).toBeInTheDocument();
  });

  test('показывает индикатор загрузки', () => {
    mockUseChatHistory.mockReturnValue({
      messages: [],
      addMessage: jest.fn(),
      setMessages: jest.fn()
    });

    // Мокаем состояние загрузки
    const { rerender } = render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    // Симулируем загрузку
    rerender(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
  });
});

describe('WebSocket Integration', () => {
  test('подключается к WebSocket', () => {
    const mockUseWebSocket = require('../../hooks/useWebSocket').default;
    
    mockUseWebSocket.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      connected: true,
      error: null
    });

    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    expect(mockUseWebSocket).toHaveBeenCalled();
  });

  test('обрабатывает ошибки WebSocket', () => {
    const mockUseWebSocket = require('../../hooks/useWebSocket').default;
    
    mockUseWebSocket.mockReturnValue({
      messages: [],
      sendMessage: jest.fn(),
      connected: false,
      error: new Error('Connection failed')
    });

    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    expect(screen.getByText('Отключено')).toBeInTheDocument();
  });
});

describe('Voice Chat Integration', () => {
  test('инициализирует голосовые функции', () => {
    const mockUseVoiceChat = require('../../hooks/useVoiceChat').default;
    
    mockUseVoiceChat.mockReturnValue({
      isRecording: false,
      isSpeaking: false,
      voiceEnabled: true,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      speakText: jest.fn(),
      stopSpeaking: jest.fn(),
      toggleVoice: jest.fn(),
      sendAudioForTranscription: jest.fn(),
      audioRef: { current: null }
    });

    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    expect(mockUseVoiceChat).toHaveBeenCalled();
  });

  test('показывает состояние записи', () => {
    const mockUseVoiceChat = require('../../hooks/useVoiceChat').default;
    
    mockUseVoiceChat.mockReturnValue({
      isRecording: true,
      isSpeaking: false,
      voiceEnabled: true,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      speakText: jest.fn(),
      stopSpeaking: jest.fn(),
      toggleVoice: jest.fn(),
      sendAudioForTranscription: jest.fn(),
      audioRef: { current: null }
    });

    render(<ChatView chatMode="mentor" setChatMode={jest.fn()} />);
    
    expect(screen.getByText('🎤 Запись голоса...')).toBeInTheDocument();
  });
});
