/**
 * Конфигурация окружения для ZAMAN AI
 */

const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  
  // Development settings
  debug: import.meta.env.VITE_DEBUG === 'true' || false,
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  
  // Feature flags
  enableVoiceChat: import.meta.env.VITE_ENABLE_VOICE_CHAT !== 'false',
  enableWebSocket: import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false',
  enableChatHistory: import.meta.env.VITE_ENABLE_CHAT_HISTORY !== 'false',
  
  // Audio settings
  audio: {
    sampleRate: parseInt(import.meta.env.VITE_AUDIO_SAMPLE_RATE) || 44100,
    channels: parseInt(import.meta.env.VITE_AUDIO_CHANNELS) || 1,
    bitrate: parseInt(import.meta.env.VITE_AUDIO_BITRATE) || 128000,
    echoCancellation: true,
    noiseSuppression: true
  },
  
  // Chat settings
  chat: {
    maxMessages: parseInt(import.meta.env.VITE_MAX_MESSAGES) || 100,
    typingIndicatorDelay: parseInt(import.meta.env.VITE_TYPING_INDICATOR_DELAY) || 1000,
    autoScroll: import.meta.env.VITE_AUTO_SCROLL !== 'false'
  },
  
  // WebSocket settings
  websocket: {
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    reconnectDecay: 1.5
  }
};

// Валидация конфигурации
if (config.debug) {
  console.log('ZAMAN AI Config:', config);
}

export default config;
