import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, DollarSign, Activity, AlertCircle, CheckCircle, Clock, Calendar, Award, Zap } from 'lucide-react';

// Компонент статистической карточки
const StatCard = ({ label, value, icon: Icon, color, trend, subtitle }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(45, 154, 134, 0.08)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = '0 12px 24px rgba(45, 154, 134, 0.15)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(45, 154, 134, 0.08)';
  }}>
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '80px',
      height: '80px',
      background: `${color}15`,
      borderRadius: '0 0 0 100%'
    }} />
    
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 12px ${color}40`
      }}>
        <Icon size={24} style={{ color: 'white' }} />
      </div>
      
      {trend && (
        <div style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          background: trend > 0 ? '#dcfce7' : '#fee2e2',
          color: trend > 0 ? '#16a34a' : '#dc2626',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
    
    <p style={{ 
      fontSize: '13px', 
      color: '#6b7280', 
      marginBottom: '0.5rem', 
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}>
      {label}
    </p>
    
    <p style={{ 
      fontSize: '28px', 
      fontWeight: 'bold', 
      color: '#111827',
      marginBottom: '0.25rem',
      lineHeight: '1'
    }}>
      {value}
    </p>
    
    {subtitle && (
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '0.5rem' }}>
        {subtitle}
      </p>
    )}
  </div>
);

// Компонент карточки цели
const GoalCard = ({ goal, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newAmount, setNewAmount] = useState(goal.current_savings);
  
  const progressPercent = goal.target_amount > 0 
    ? Math.min(100, (goal.current_savings / goal.target_amount) * 100) 
    : 0;
  
  const daysLeft = goal.target_date 
    ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '0.25rem'
          }}>
            {goal.name}
          </h3>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '12px', color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} />
              {new Date(goal.target_date).toLocaleDateString('ru-RU')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={14} />
              {daysLeft} дней
            </span>
          </div>
        </div>
        
        <div style={{
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          background: progressPercent >= 100 ? '#dcfce7' : '#f0f9f7',
          color: progressPercent >= 100 ? '#16a34a' : '#2D9A86',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          {progressPercent.toFixed(0)}%
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '0.5rem',
          fontSize: '13px'
        }}>
          <span style={{ color: '#6b7280' }}>Прогресс</span>
          <span style={{ fontWeight: '600', color: '#111827' }}>
            {(goal.current_savings / 1000000).toFixed(2)}M / {(goal.target_amount / 1000000).toFixed(2)}M ₸
          </span>
        </div>
        
        <div style={{
          height: '8px',
          background: '#f0f9f7',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '1px solid #d1e5e0'
        }}>
          <div style={{
            height: '100%',
            background: progressPercent >= 100 
              ? 'linear-gradient(90deg, #16a34a, #22c55e)'
              : 'linear-gradient(90deg, #2D9A86, #14b8a6)',
            width: `${progressPercent}%`,
            transition: 'width 0.5s ease',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '50%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))',
              animation: 'shimmer 2s infinite'
            }} />
          </div>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem',
        paddingTop: '1rem',
        borderTop: '1px solid #f3f4f6'
      }}>
        {isEditing ? (
          <>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(parseFloat(e.target.value))}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: '2px solid #2D9A86',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={() => {
                onUpdate(goal.id, newAmount);
                setIsEditing(false);
              }}
              style={{
                padding: '0.6rem 1.25rem',
                background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              ✓
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: '0.6rem 1rem',
                background: '#f3f4f6',
                color: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              flex: 1,
              padding: '0.6rem',
              background: '#f0f9f7',
              color: '#2D9A86',
              border: '1px solid #d1e5e0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            Обновить накопления
          </button>
        )}
      </div>
    </div>
  );
};

// Главный компонент Dashboard
export default function DashboardView({ goals = [], health = { status: 'healthy' } }) {
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(false);
  
  // Вычисление статистики
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalSaved = activeGoals.reduce((sum, g) => sum + (g.current_savings || 0), 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  
  // Вычисление среднего прогресса
  const avgProgress = activeGoals.length > 0
    ? activeGoals.reduce((sum, g) => {
        const progress = g.target_amount > 0 ? (g.current_savings / g.target_amount) * 100 : 0;
        return sum + progress;
      }, 0) / activeGoals.length
    : 0;

  const handleUpdateGoal = (goalId, newSavings) => {
    console.log(`Updating goal ${goalId} with ${newSavings}`);
    // Здесь будет вызов API через пропс
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '2rem' }}>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ 
        marginBottom: '2rem',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          Добро пожаловать! 👋
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          marginBottom: '1rem'
        }}>
          Вот обзор ваших финансовых целей
        </p>
        
        {/* Time range selector */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['week', 'month', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '0.5rem 1rem',
                background: timeRange === range ? '#2D9A86' : 'white',
                color: timeRange === range ? 'white' : '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {range === 'week' ? 'Неделя' : range === 'month' ? 'Месяц' : 'Год'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem',
        animation: 'fadeIn 0.6s ease-out 0.1s both'
      }}>
        <StatCard
          label="Активных целей"
          value={activeGoals.length}
          icon={Target}
          color="#2D9A86"
          subtitle={`${completedGoals.length} завершено`}
        />
        <StatCard
          label="Накоплено"
          value={`${(totalSaved / 1000000).toFixed(1)}M ₸`}
          icon={DollarSign}
          color="#14b8a6"
          trend={12}
          subtitle="Общие накопления"
        />
        <StatCard
          label="Целевая сумма"
          value={`${(totalTarget / 1000000).toFixed(1)}M ₸`}
          icon={Award}
          color="#06b6d4"
          subtitle="До достижения целей"
        />
        <StatCard
          label="Статус системы"
          value={health?.status === 'healthy' ? 'Online' : 'Offline'}
          icon={health?.status === 'healthy' ? CheckCircle : AlertCircle}
          color={health?.status === 'healthy' ? '#22c55e' : '#ef4444'}
          subtitle={health?.status === 'healthy' ? 'Все системы работают' : 'Проблемы с подключением'}
        />
      </div>

      {/* Overall Progress Section */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid #e5e7eb',
        marginBottom: '2.5rem',
        boxShadow: '0 4px 12px rgba(45, 154, 134, 0.08)',
        animation: 'fadeIn 0.7s ease-out 0.2s both'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#111827',
              marginBottom: '0.25rem'
            }}>
              Общий прогресс накоплений
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Средний прогресс по всем активным целям: {avgProgress.toFixed(1)}%
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.25rem' }}>
                Выполнено
              </p>
              <p style={{ 
                fontSize: '32px', 
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {overallProgress.toFixed(0)}%
              </p>
            </div>
            <Zap size={40} style={{ color: '#EEFF6D' }} />
          </div>
        </div>
        
        <div style={{
          height: '20px',
          background: 'linear-gradient(90deg, #f0f9f7, #f0fdfa)',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '2px solid #d1e5e0',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #2D9A86, #14b8a6, #06b6d4)',
            width: `${overallProgress}%`,
            transition: 'width 1s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite'
            }} />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: '1rem',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          <span>{(totalSaved / 1000000).toFixed(2)}M ₸ накоплено</span>
          <span>{((totalTarget - totalSaved) / 1000000).toFixed(2)}M ₸ осталось</span>
        </div>
      </div>

      {/* Goals Section */}
      <div style={{
        animation: 'fadeIn 0.8s ease-out 0.3s both'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#111827'
          }}>
            Активные цели
          </h2>
          <button style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(45, 154, 134, 0.3)',
            transition: 'all 0.2s'
          }}>
            + Создать новую цель
          </button>
        </div>
        
        {activeGoals.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '2px dashed #d1e5e0'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🎯</div>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Нет активных целей
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Создайте свою первую финансовую цель, чтобы начать путь к успеху
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {activeGoals.map(goal => (
              <GoalCard 
                key={goal.id}
                goal={goal}
                onUpdate={handleUpdateGoal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{
        marginTop: '2.5rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #f0fdfa, #f0f9ff)',
        borderRadius: '16px',
        border: '1px solid #a7f3d0',
        animation: 'fadeIn 0.9s ease-out 0.4s both'
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#111827',
          marginBottom: '1rem'
        }}>
          💡 Быстрые действия
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button style={{
            padding: '0.75rem 1.5rem',
            background: 'white',
            color: '#2D9A86',
            border: '1px solid #d1e5e0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            📊 Анализ расходов
          </button>
          <button style={{
            padding: '0.75rem 1.5rem',
            background: 'white',
            color: '#2D9A86',
            border: '1px solid #d1e5e0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            💳 Банковские продукты
          </button>
          <button style={{
            padding: '0.75rem 1.5rem',
            background: 'white',
            color: '#2D9A86',
            border: '1px solid #d1e5e0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            💬 Чат с ассистентом
          </button>
        </div>
      </div>
    </div>
  );
}