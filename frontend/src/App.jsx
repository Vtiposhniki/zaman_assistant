// ============================================================
// 📁 src/App.jsx (Main Application Component)
// ============================================================
import React, { useState, useEffect } from 'react';
import { Menu, X, MessageCircle, Target, BarChart3, CreditCard, Activity } from 'lucide-react';
import { API_CONFIG } from './config/api';
import { AnalyticsService } from './services/analytics.service';
import { ChatService } from './services/chat.service';
import { GoalsService } from './services/goals.service';
import { ChatView } from './components/Chat/ChatView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { GoalsView } from './components/Goals/GoalView';
import { ProductsView } from './components/Products/ProductsView';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { Notification } from './components/UI/Notification';
import { ErrorBoundary } from './components/UI/ErrorBoundary';

// Initialize services
const goalsService = new GoalsService(API_CONFIG);
const chatService = new ChatService(API_CONFIG);
const analyticsService = new AnalyticsService(API_CONFIG);

export default function App() {
  const [view, setView] = useState('dashboard');
  const [chatMode, setChatMode] = useState('mentor');
  const [userId] = useState(1);
  const [goals, setGoals] = useState([]);
  const [health, setHealth] = useState({ status: 'healthy' });
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadGoals();
    checkHealth();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await goalsService.getGoals(userId);
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/health`);
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      setHealth({ status: 'unhealthy' });
    }
  };

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleCreateGoal = async (goalData) => {
    setLoading(true);
    try {
      await goalsService.createGoal({ ...goalData, user_id: userId });
      await loadGoals();
      addNotification({
        type: 'success',
        title: 'Цель создана',
        message: `Цель "${goalData.name}" успешно создана!`
      });
    } catch (error) {
      console.error('Failed to create goal:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось создать цель. Попробуйте еще раз.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (goalId, currentSavings) => {
    setLoading(true);
    try {
      await goalsService.updateGoal(goalId, { current_savings: currentSavings });
      await loadGoals();
      addNotification({
        type: 'success',
        title: 'Цель обновлена',
        message: 'Накопления успешно обновлены!'
      });
    } catch (error) {
      console.error('Failed to update goal:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось обновить цель. Попробуйте еще раз.'
      });
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Дашборд', icon: BarChart3 },
    { id: 'chat', label: 'Чат', icon: MessageCircle },
    { id: 'goals', label: 'Цели', icon: Target },
    { id: 'products', label: 'Продукты', icon: CreditCard },
    { id: 'analytics', label: 'Аналитика', icon: Activity }
  ];

  const renderView = () => {
    switch (view) {
      case 'chat':
        return <ChatView chatService={chatService} chatMode={chatMode} setChatMode={setChatMode} />;
      case 'goals':
        return (
          <GoalsView 
            goals={goals} 
            onCreateGoal={handleCreateGoal} 
            onUpdateGoal={handleUpdateGoal} 
            loading={loading} 
          />
        );
      case 'products':
        return <ProductsView />;
      case 'analytics':
        return <AnalyticsView analyticsService={analyticsService} userId={userId} />;
      case 'dashboard':
      default:
        return <DashboardView goals={goals} health={health} />;
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-box">Z</div>
            <div className="logo-text">Zaman Assistant</div>
          </div>

          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`nav-button ${view === item.id ? 'active' : ''}`}
              >
                <item.icon size={18} style={{ marginRight: '0.5rem' }} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {navigationItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setMobileMenuOpen(false);
              }}
              className="mobile-menu-item"
            >
              <item.icon size={18} style={{ marginRight: '0.5rem' }} />
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1000,
          maxWidth: '400px'
        }}>
          {notifications.map(notification => (
            <Notification
              key={notification.id}
              {...notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </main>
    </div>
  );
}