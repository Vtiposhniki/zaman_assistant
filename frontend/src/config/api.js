
// ============================================================
// 📁 src/config/api.js
// ============================================================
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  retries: 3
};