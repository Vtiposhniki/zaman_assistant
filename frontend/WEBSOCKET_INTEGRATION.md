# WebSocket и Voice Chat Integration

## 📋 Обзор

Этот документ описывает интеграцию WebSocket и системы голосового общения из старого React-монолита `old_App.jsx` в новую модульную архитектуру ZAMAN AI.

## 🏗️ Архитектура

### Новые компоненты

```
frontend/src/
├── services/
│   ├── websocket.js          # WebSocket клиент (ZamanSocket)
│   └── api.js               # Улучшенный API сервис
├── hooks/
│   ├── useWebSocket.js      # Хук для WebSocket соединения
│   ├── useVoiceChat.js      # Хук для голосовых функций
│   └── useChatHistory.js    # Хук для истории чата
├── components/
│   ├── Chat/
│   │   ├── ChatView.jsx     # Основной компонент чата
│   │   ├── ChatMessages.jsx # Отображение сообщений
│   │   └── ChatInput.jsx    # Ввод сообщений
│   └── UI/
│       ├── TypingIndicator.jsx # Индикатор набора текста
│       └── animations.css   # CSS анимации
└── config/
    └── environment.js       # Конфигурация окружения
```

## 🚀 Использование

### 1. Основной компонент чата

```jsx
import ChatView from './components/Chat/ChatView';

function App() {
  const [chatMode, setChatMode] = useState('mentor');
  
  return (
    <ChatView 
      chatMode={chatMode} 
      setChatMode={setChatMode} 
    />
  );
}
```

### 2. WebSocket соединение

```jsx
import useWebSocket from './hooks/useWebSocket';

function MyComponent() {
  const { messages, sendMessage, connected } = useWebSocket('ws://localhost:8000/ws');
  
  const handleSend = () => {
    sendMessage({
      user_id: 1,
      message: 'Привет!',
      chat_mode: 'mentor'
    });
  };
}
```

### 3. Голосовые функции

```jsx
import useVoiceChat from './hooks/useVoiceChat';

function VoiceComponent() {
  const {
    isRecording,
    isSpeaking,
    startRecording,
    stopRecording,
    speakText
  } = useVoiceChat({
    onAudioRecorded: (audioBlob) => {
      // Обработка записанного аудио
    }
  });
}
```

## ⚙️ Конфигурация

### Переменные окружения

Создайте файл `.env` в корне frontend:

```env
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws

# Feature flags
VITE_ENABLE_VOICE_CHAT=true
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_CHAT_HISTORY=true

# Chat settings
VITE_MAX_MESSAGES=100
VITE_TYPING_INDICATOR_DELAY=1000
```

### Конфигурация WebSocket

```javascript
import config from './config/environment';

const wsOptions = {
  reconnectInterval: config.websocket.reconnectInterval,
  maxReconnectAttempts: config.websocket.maxReconnectAttempts,
  reconnectDecay: config.websocket.reconnectDecay
};
```

## 🔧 API Endpoints

### WebSocket Events

```javascript
// Отправка сообщения
{
  "user_id": 1,
  "message": "Текст сообщения",
  "chat_mode": "mentor" // mentor, analyst, friend, tech
}

// Получение ответа
{
  "role": "assistant",
  "content": "Ответ ассистента",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### HTTP API

```javascript
import api from './services/api';

// Отправка текстового сообщения
const response = await api.sendChatMessage([{
  role: 'user',
  content: 'Привет!'
}], 1);

// Обработка аудио
const audioData = await api.processAudioMessage(audioBlob, 1, 'ru');

// Синтез речи
const audioBlob = await api.synthesizeSpeech('Привет!', 'alloy', 1.0);
```

## 🎨 Стили и анимации

### CSS классы

```css
/* Анимации */
.animate-slide-in     /* Появление сообщений */
.animate-bounce       /* Загрузка */
.animate-pulse        /* Пульсация */
.animate-typing       /* Набор текста */
.animate-recording    /* Запись голоса */
.animate-speaking     /* Воспроизведение речи */
```

### Применение анимаций

```jsx
<div className="animate-slide-in">
  Сообщение с анимацией
</div>
```

## 📱 Функциональность

### ✅ Реализовано

- [x] WebSocket клиент с авто-реконнектом
- [x] Голосовая запись и транскрипция
- [x] Синтез речи (TTS)
- [x] Переключение режимов чата
- [x] История чата с автосохранением
- [x] Индикатор набора текста
- [x] Анимации и переходы
- [x] Обработка ошибок
- [x] Fallback на HTTP API

### 🔄 Режимы чата

- **mentor** 🧘 - Финансовый ментор
- **analyst** 💼 - Финансовый аналитик  
- **friend** 💬 - Дружелюбный ассистент
- **tech** 🤖 - Технический эксперт

## 🐛 Отладка

### Логирование

```javascript
// Включить отладку
VITE_DEBUG=true

// Уровни логирования
VITE_LOG_LEVEL=debug // debug, info, warn, error
```

### Проверка соединения

```javascript
import api from './services/api';

// Проверка доступности API
const isAvailable = await api.isApiAvailable();

// Получение WebSocket URL
const wsUrl = api.getWebSocketUrl();
```

## 🚨 Обработка ошибок

### WebSocket ошибки

```javascript
const { error, reconnect } = useWebSocket(url);

if (error) {
  console.error('WebSocket error:', error);
  reconnect(); // Попытка переподключения
}
```

### Голосовые ошибки

```javascript
const { startRecording } = useVoiceChat({
  onError: (error) => {
    console.error('Voice error:', error);
    // Показать уведомление пользователю
  }
});
```

## 📊 Производительность

### Оптимизации

- Автоматическая очистка аудио ресурсов
- Ограничение истории сообщений (100 по умолчанию)
- Debounced переподключение WebSocket
- Lazy loading компонентов

### Мониторинг

```javascript
// Статистика WebSocket
console.log('Connected:', wsConnected);
console.log('Messages count:', messages.length);

// Статистика голоса
console.log('Recording:', isRecording);
console.log('Speaking:', isSpeaking);
```

## 🔮 Будущие улучшения

- [ ] Поддержка групповых чатов
- [ ] Файловые вложения
- [ ] Эмодзи реакции
- [ ] Темы оформления
- [ ] Экспорт истории чата
- [ ] Голосовые команды
- [ ] Многоязычная поддержка

## 📞 Поддержка

При возникновении проблем:

1. Проверьте консоль браузера на ошибки
2. Убедитесь, что backend сервер запущен
3. Проверьте переменные окружения
4. Проверьте WebSocket соединение в DevTools

---

**Создано:** 2024  
**Версия:** 1.0.0  
**Статус:** ✅ Готово к использованию
