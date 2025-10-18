// ============================================================
// 📁 src/components/Goals/GoalCard.jsx
// ============================================================
import React, { useState } from 'react';

export const GoalCard = ({ goal, onUpdate }) => {
  const [savings, setSavings] = useState(goal.current_savings);

  const handleUpdate = () => {
    onUpdate(goal.id, savings);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1.8rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
      transition: 'all 0.2s'
    }}>
      <h3 style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#111827' }}>
        {goal.name}
      </h3>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1.2rem' }}>
        📅 {new Date(goal.target_date).toLocaleDateString('ru-RU')}
      </p>

      <div style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Прогресс</span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2D9A86' }}>
            {goal.progress_percent}%
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
            background: '#2D9A86',
            width: `${goal.progress_percent}%`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1.2rem', fontWeight: '500' }}>
        {(goal.current_savings / 1000000).toFixed(2)}M / {(goal.target_amount / 1000000).toFixed(2)}M ₸
      </p>

      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <input
          type="number"
          value={savings}
          onChange={(e) => setSavings(parseFloat(e.target.value))}
          style={{
            flex: 1,
            padding: '0.7rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'inherit'
          }}
        />
        <button
          onClick={handleUpdate}
          style={{
            padding: '0.7rem 1rem',
            background: '#2D9A86',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          ✓
        </button>
      </div>
    </div>
  );
};
