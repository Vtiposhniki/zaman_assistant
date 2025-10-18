// ============================================================
// 📁 src/services/analytics.service.js
// ============================================================
import { APIService } from './api.service.js';

export class AnalyticsService extends APIService {
  async analyzeExpenses(file, userId, income) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('monthly_income', income);
    return await this.uploadFile('/analyze_expenses', formData);
  }
}