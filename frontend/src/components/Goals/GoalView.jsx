// frontend/src/components/Goals/GoalView.jsx
import React, { useState } from 'react';
import { Plus, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';

export const GoalsView = ({ goals, onCreateGoal, onUpdateGoal, loading }) => {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (formData) => {
    await onCreateGoal(formData);
    setShowForm(false);
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  // Вычисление статистики
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + (g.current_savings || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: '#111827', 
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            Мои цели 🎯
          </h1>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
            {activeGoals.length} активных целей · {completedGoals.length} завершено
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.85rem 1.8rem',
            background: showForm 
              ? '#f3f4f6' 
              : 'linear-gradient(135deg, #2D9A86, #14b8a6)',
            color: showForm ? '#6b7280' : 'white',
            border: showForm ? '1px solid #e5e7eb' : 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s',
            boxShadow: showForm ? 'none' : '0 4px 12px rgba(45, 154, 134, 0.3)'
          }}
        >
          <Plus size={18} style={{ transform: showForm ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          {showForm ? 'Отменить' : 'Новая цель'}
        </button>
      </div>

      {/* Statistics Cards */}
      {activeGoals.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Накоплено</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                  {(totalSaved / 1000000).toFixed(1)}M ₸
                </p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Общий прогресс</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                  {overallProgress.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Целевая сумма</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                  {(totalTarget / 1000000).toFixed(1)}M ₸
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Form */}
      {showForm && (
        <GoalForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          loading={loading}
        />
      )}

      {/* Goals Grid */}
      {activeGoals.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '2px dashed #d1e5e0',
          marginTop: '2rem'
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
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1.5rem' }}>
            Создайте свою первую финансовую цель, чтобы начать путь к успеху
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Plus size={16} />
            Создать первую цель
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          {activeGoals.map(goal => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onUpdate={onUpdateGoal} 
            />
          ))}
        </div>
      )}

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '1.5rem'
          }}>
            Завершённые цели ✅
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.5rem'
          }}>
            {completedGoals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onUpdate={onUpdateGoal} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};