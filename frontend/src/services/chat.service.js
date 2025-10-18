// ============================================================
// 📁 src/services/chat.service.js
// ============================================================
import { APIService } from './api.service.js';

export class ChatService extends APIService {
  async sendMessage(messages, userId) {
    return await this.post('/chat', { messages, user_id: userId });
  }

  async sendAudioMessage(audioBlob, userId, language = 'ru') {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('user_id', userId);
    formData.append('language', language);
    return await this.uploadFile('/audio/message', formData);
  }

  async textToSpeech(text, voice = 'alloy', speed = 1.0) {
    const response = await fetch(`${this.baseURL}/audio/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed })
    });

    if (!response.ok) {
      throw new Error('TTS failed');
    }

    return await response.blob();
  }
}
