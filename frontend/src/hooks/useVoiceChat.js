import { useState, useRef, useCallback } from 'react';

/**
 * Хук для управления голосовыми функциями (запись, воспроизведение)
 * @param {object} options - Опции для голосового чата
 * @returns {object} - Состояние и методы для работы с голосом
 */
export const useVoiceChat = (options = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  const {
    onAudioRecorded,
    onTranscriptionReceived,
    onSpeakingStarted,
    onSpeakingEnded,
    apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  } = options;

  // Начало записи
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        // Останавливаем все треки
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        // Вызываем callback с записанным аудио
        onAudioRecorded?.(audioBlob);
      };

      mediaRecorder.start(100); // Записываем по 100ms чанкам
      setIsRecording(true);
      
    } catch (err) {
      console.error('Ошибка доступа к микрофону:', err);
      throw new Error('Не удалось получить доступ к микрофону');
    }
  }, [onAudioRecorded]);

  // Остановка записи
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Отправка аудио на сервер для транскрипции
  const sendAudioForTranscription = useCallback(async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('user_id', '1');
      formData.append('language', 'ru');

      const response = await fetch(`${apiUrl}/audio/message`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.transcription) {
        onTranscriptionReceived?.(data.transcription);
      }
      
      return data;
    } catch (err) {
      console.error('Ошибка обработки аудио:', err);
      throw err;
    }
  }, [apiUrl, onTranscriptionReceived]);

  // Синтез речи (TTS)
  const speakText = useCallback(async (text, voice = 'alloy', speed = 1.0) => {
    if (!voiceEnabled || !text) return;

    try {
      setIsSpeaking(true);
      onSpeakingStarted?.();

      const response = await fetch(`${apiUrl}/audio/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: voice,
          speed: speed
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          onSpeakingEnded?.();
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          setIsSpeaking(false);
          onSpeakingEnded?.();
          URL.revokeObjectURL(audioUrl);
        };
        
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Ошибка озвучивания:', err);
      setIsSpeaking(false);
      onSpeakingEnded?.();
    }
  }, [voiceEnabled, apiUrl, onSpeakingStarted, onSpeakingEnded]);

  // Остановка воспроизведения
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      onSpeakingEnded?.();
    }
  }, [onSpeakingEnded]);

  // Переключение голосовых функций
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      const newValue = !prev;
      if (!newValue && isSpeaking) {
        stopSpeaking();
      }
      return newValue;
    });
  }, [isSpeaking, stopSpeaking]);

  // Очистка ресурсов
  const cleanup = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    if (isSpeaking) {
      stopSpeaking();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording, isSpeaking, stopRecording, stopSpeaking]);

  return {
    // Состояние
    isRecording,
    isSpeaking,
    voiceEnabled,
    
    // Методы записи
    startRecording,
    stopRecording,
    sendAudioForTranscription,
    
    // Методы воспроизведения
    speakText,
    stopSpeaking,
    toggleVoice,
    
    // Утилиты
    cleanup,
    
    // Refs для компонентов
    audioRef
  };
};

export default useVoiceChat;
