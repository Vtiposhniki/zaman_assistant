// ============================================================
// 📁 src/services/goals.service.js
// ============================================================
import { APIService } from './api.service.js';

export class GoalsService extends APIService {
  async getGoals(userId) {
    try {
      return await this.get(`/goals?user_id=${userId}`);
    } catch {
      return { goals: [] };
    }
  }

  async createGoal(goalData) {
    return await this.post('/goals/create', goalData);
  }

  async updateGoal(goalId, data) {
    const params = new URLSearchParams();
    if (data.current_savings !== undefined) {
      params.append('current_savings', data.current_savings);
    }
    if (data.status) {
      params.append('status', data.status);
    }
    return await this.put(`/goals/${goalId}?${params}`, {});
  }

  async deleteGoal(goalId) {
    return await this.delete(`/goals/${goalId}`);
  }
}
