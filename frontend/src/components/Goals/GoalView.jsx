// ============================================================
// 📁 src/components/Goals/GoalsView.jsx
// ============================================================
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';

export const GoalsView = ({ goals, onCreateGoal, onUpdateGoal, loading }) => {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (formData) => {
    await onCreateGoal(formData);
    setShowForm(false);
  };

  const activeGoals = goals.filter(g => g.status === 'active');

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2.5rem' 
      }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          Мои цели
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.85rem 1.8rem',
            background: '#2D9A86',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(45, 154, 134, 0.3)'
          }}
        >
          <Plus size={18} />
          Новая цель
        </button>
      </div>

      {showForm && (
        <GoalForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          loading={loading}
        />
      )}

      {activeGoals.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '2px dashed #d1e5e0'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🎯</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            Нет активных целей
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Создайте свою первую финансовую цель, чтобы начать путь к успеху
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.5rem' 
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
    </div>
  );
};