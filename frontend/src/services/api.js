/**
 * Улучшенный API сервис для ZAMAN AI
 * Объединяет базовый APIService с функциональностью из old_App.jsx
 */

class ZamanAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    this.timeout = 10000; // 10 секунд
  }

  /**
   * Базовый метод для HTTP запросов
   */
  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Загрузка файла (для FormData)
   */
  async uploadFile(endpoint, formData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
        // Не устанавливаем Content-Type, браузер сам установит для FormData
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ==================== HEALTH & STATUS ====================

  async health() {
    try {
      const response = await fetch(`${this.baseURL}/goals?user_id=1`);
      if (response.ok) return { status: 'healthy' };
      return null;
    } catch { 
      return null; 
    }
  }

  // ==================== GOALS API ====================

  async getGoals(userId) {
    try {
      return await this.request(`/goals?user_id=${userId}`);
    } catch (err) {
      console.error('Error fetching goals:', err);
      return { goals: [] };
    }
  }

  async createGoal(goalData) {
    return await this.request('/goals/create', {
      method: 'POST',
      body: JSON.stringify(goalData)
    });
  }

  async updateGoal(goalId, data) {
    const params = new URLSearchParams();
    if (data.current_savings !== undefined) params.append('current_savings', data.current_savings);
    if (data.status) params.append('status', data.status);
    
    return await this.request(`/goals/${goalId}?${params}`, { 
      method: 'PUT' 
    });
  }

  async deleteGoal(goalId) {
    return await this.request(`/goals/${goalId}`, { 
      method: 'DELETE' 
    });
  }

  // ==================== CHAT API ====================

  async sendChatMessage(messages, userId) {
    return await this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: messages,
        user_id: userId
      })
    });
  }

  // ==================== AUDIO API ====================

  async processAudioMessage(audioBlob, userId = 1, language = 'ru') {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('user_id', userId);
    formData.append('language', language);

    return await this.uploadFile('/audio/message', formData);
  }

  async synthesizeSpeech(text, voice = 'alloy', speed = 1.0) {
    return await this.request('/audio/speak', {
      method: 'POST',
      body: JSON.stringify({
        text: text,
        voice: voice,
        speed: speed
      })
    });
  }

  // ==================== ANALYTICS API ====================

  async analyzeExpenses(file, userId, income) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('monthly_income', income);

    return await this.uploadFile('/analyze_expenses', formData);
  }

  async getAnalytics(userId, period = 'month') {
    return await this.request(`/analytics?user_id=${userId}&period=${period}`);
  }

  // ==================== PRODUCTS API ====================

  async getProducts() {
    return await this.request('/products');
  }

  async getProductRecommendations(userId, goalId) {
    return await this.request(`/products/recommendations?user_id=${userId}&goal_id=${goalId}`);
  }

  // ==================== USER API ====================

  async getUserProfile(userId) {
    return await this.request(`/users/${userId}`);
  }

  async updateUserProfile(userId, profileData) {
    return await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Проверка доступности API
   */
  async isApiAvailable() {
    try {
      const health = await this.health();
      return health?.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Получение WebSocket URL
   */
  getWebSocketUrl() {
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (wsUrl) return wsUrl;
    
    // Fallback: конвертируем HTTP URL в WebSocket URL
    const url = new URL(this.baseURL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${url.toString()}ws`;
  }
}

// Создаем единственный экземпляр API
const api = new ZamanAPI();

export default api;
export { ZamanAPI };
