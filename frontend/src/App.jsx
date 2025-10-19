import React, { useState, useEffect } from 'react';
import { Menu, X, MessageCircle, Target, BarChart3, CreditCard, Activity } from 'lucide-react';

// ==================== IMPORTS ====================
import { API_CONFIG } from './config/api';
import { AnalyticsService } from './services/analytics.service';
import { ChatService } from './services/chat.service';
import { GoalsService } from './services/goals.service';
import { ChatView } from './components/Chat/ChatView';
import { GoalsView } from './components/Goals/GoalView';
import { ProductsView } from './components/Products/ProductsView';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { Notification } from './components/UI/Notification';
import { ErrorBoundary } from './components/UI/ErrorBoundary';

// Import the new DashboardView
import DashboardView from './components/Dashboard/DashboardView';

// ==================== SERVICES INITIALIZATION ====================
const goalsService = new GoalsService(API_CONFIG);
const chatService = new ChatService(API_CONFIG);
const analyticsService = new AnalyticsService(API_CONFIG);

export default function App() {
  // ==================== STATE ====================
  const [view, setView] = useState('dashboard');
  const [chatMode, setChatMode] = useState('mentor');
  const [userId] = useState(1);
  const [goals, setGoals] = useState([]);
  const [health, setHealth] = useState({ status: 'healthy' });
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    loadGoals();
    checkHealth();
    
    // Периодическая проверка здоровья системы
    const healthInterval = setInterval(checkHealth, 60000); // каждую минуту
    
    return () => clearInterval(healthInterval);
  }, []);

  // ==================== DATA LOADING ====================
  const loadGoals = async () => {
    try {
      const data = await goalsService.getGoals(userId);
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка загрузки',
        message: 'Не удалось загрузить цели'
      });
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/health`);
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      setHealth({ status: 'unhealthy' });
      console.error('Health check failed:', error);
    }
  };

  // ==================== NOTIFICATION MANAGEMENT ====================
  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ==================== GOAL HANDLERS ====================
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
      setView('dashboard'); // Возврат на dashboard после создания
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
      await loadGoals(); // Перезагрузка всех целей
      addNotification({
        type: 'success',
        title: 'Успешно!',
        message: 'Накопления обновлены'
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

  // Также добавьте обработчик удаления:
  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту цель?')) {
      return;
    }
    
    setLoading(true);
    try {
      await goalsService.deleteGoal(goalId);
      await loadGoals();
      addNotification({
        type: 'success',
        title: 'Цель удалена',
        message: 'Цель успешно удалена'
      });
    } catch (error) {
      console.error('Failed to delete goal:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось удалить цель'
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== NAVIGATION ====================
  const navigationItems = [
    { id: 'dashboard', label: 'Дашборд', icon: BarChart3 },
    { id: 'chat', label: 'Чат', icon: MessageCircle },
    { id: 'goals', label: 'Цели', icon: Target },
    { id: 'products', label: 'Продукты', icon: CreditCard },
    { id: 'analytics', label: 'Аналитика', icon: Activity }
  ];

  const handleNavigation = (viewId) => {
    setView(viewId);
    setMobileMenuOpen(false);
  };

  // ==================== QUICK ACTIONS (for Dashboard) ====================
  const quickActions = {
    analytics: () => setView('analytics'),
    products: () => setView('products'),
    chat: () => setView('chat')
  };

  // ==================== VIEW RENDERING ====================
  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <DashboardView 
            goals={goals} 
            health={health}
            onUpdateGoal={handleUpdateGoal}
            quickActions={quickActions}
            loading={loading}
          />
        );
      
      case 'chat':
        return (
          <ChatView 
            chatService={chatService} 
            chatMode={chatMode} 
            setChatMode={setChatMode}
            userId={userId}
          />
        );
      
        case 'goals':
          return (
            <GoalsView 
              goals={goals} 
              onCreateGoal={handleCreateGoal} 
              onUpdateGoal={handleUpdateGoal}
              onDeleteGoal={handleDeleteGoal}
              loading={loading} 
            />
          );
      
      case 'products':
        return <ProductsView />;
      
      case 'analytics':
        return (
          <AnalyticsView 
            analyticsService={analyticsService} 
            userId={userId} 
          />
        );
      
      default:
        return (
          <DashboardView 
            goals={goals} 
            health={health}
            onUpdateGoal={handleUpdateGoal}
            quickActions={quickActions}
          />
        );
    }
  };

  // ==================== RENDER ====================
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* ==================== HEADER ==================== */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '2px solid #e5e7eb',
        background: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          padding: '1rem 1.5rem' 
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '2rem' 
          }}>
            {/* Logo */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              minWidth: '200px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(45, 154, 134, 0.3)'
              }}>
                Z
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: '#2D9A86', 
                  margin: 0,
                  letterSpacing: '0.5px' 
                }}>
                  ZAMAN
                </h1>
                <p style={{ 
                  fontSize: '11px', 
                  color: '#9ca3af', 
                  margin: 0, 
                  fontWeight: '500' 
                }}>
                  Financial Assistant
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav style={{ 
              display: 'none',
              gap: '0.5rem',
              flex: 1,
              justifyContent: 'center'
            }}
            className="desktop-nav">
              {navigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    style={{
                      padding: '0.6rem 1.2rem',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      background: view === item.id 
                        ? 'linear-gradient(135deg, #2D9A86, #14b8a6)' 
                        : 'transparent',
                      color: view === item.id ? 'white' : '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      boxShadow: view === item.id 
                        ? '0 4px 12px rgba(45, 154, 134, 0.3)' 
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (view !== item.id) {
                        e.currentTarget.style.background = '#f0f9f7';
                        e.currentTarget.style.color = '#2D9A86';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (view !== item.id) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                      }
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Health Status Indicator */}
            <div style={{ 
              display: 'none',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: health.status === 'healthy' ? '#dcfce7' : '#fee2e2',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              color: health.status === 'healthy' ? '#16a34a' : '#dc2626'
            }}
            className="health-indicator">
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: health.status === 'healthy' ? '#16a34a' : '#dc2626',
                animation: 'pulse 2s infinite'
              }} />
              {health.status === 'healthy' ? 'Online' : 'Offline'}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                color: '#2D9A86',
                display: 'flex',
                alignItems: 'center'
              }}
              className="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{
            borderTop: '1px solid #e5e7eb',
            background: 'white',
            padding: '1rem',
            animation: 'slideDown 0.3s ease'
          }}>
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    background: view === item.id ? '#f0f9f7' : 'transparent',
                    color: view === item.id ? '#2D9A86' : '#6b7280',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ==================== NOTIFICATIONS ==================== */}
      {notifications.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '5rem',
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

      {/* ==================== MAIN CONTENT ==================== */}
      <main style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 80px)'
      }}>
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </main>

      {/* ==================== STYLES ==================== */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* Desktop Navigation */
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-toggle {
            display: none !important;
          }
          .health-indicator {
            display: flex !important;
          }
        }

        /* Mobile adjustments */
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .health-indicator {
            display: none !important;
          }
        }

        /* Smooth transitions */
        * {
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        /* Focus styles for accessibility */
        button:focus-visible {
          outline: 2px solid #2D9A86;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}