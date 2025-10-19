// frontend/src/components/Goals/GoalCard.jsx
import React, { useState } from 'react';
import { Calendar, TrendingUp, DollarSign, Check, X } from 'lucide-react';

export const GoalCard = ({ goal, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newSavings, setNewSavings] = useState(goal.current_savings);
  const [isUpdating, setIsUpdating] = useState(false);

  const progress = goal.target_amount > 0 
    ? Math.min(100, (goal.current_savings / goal.target_amount) * 100)
    : 0;

  const daysLeft = goal.target_date 
    ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  const isCompleted = goal.status === 'completed' || progress >= 100;

  const handleUpdate = async () => {
    if (newSavings === goal.current_savings) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(goal.id, parseFloat(newSavings));
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert('Ошибка обновления цели');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setNewSavings(goal.current_savings);
    setIsEditing(false);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      padding: '1.8rem',
      border: isCompleted ? '2px solid #22c55e' : '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
      transition: 'all 0.3s',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Completed Badge */}
      {isCompleted && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          padding: '0.4rem 0.8rem',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          color: 'white',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
        }}>
          <Check size={12} />
          ВЫПОЛНЕНО
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.2rem' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem', 
          color: '#111827',
          paddingRight: isCompleted ? '100px' : '0'
        }}>
          {goal.name}
        </h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={13} />
            {new Date(goal.target_date).toLocaleDateString('ru-RU')}
          </span>
          {daysLeft > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              ⏰ {daysLeft} дней осталось
            </span>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '0.6rem',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
            Прогресс
          </span>
          <span style={{ 
            fontSize: '15px', 
            fontWeight: 'bold', 
            color: isCompleted ? '#22c55e' : '#2D9A86' 
          }}>
            {progress.toFixed(1)}%
          </span>
        </div>
        
        <div style={{
          height: '10px',
          background: isCompleted ? '#dcfce7' : '#f0f9f7',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '1px solid ' + (isCompleted ? '#86efac' : '#d1e5e0')
        }}>
          <div style={{
            height: '100%',
            background: isCompleted 
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #2D9A86, #14b8a6)',
            width: `${progress}%`,
            transition: 'width 0.5s ease',
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
      </div>

      {/* Amount Display */}
      <div style={{ 
        padding: '1rem',
        background: isCompleted ? '#f0fdf4' : '#f9fdfb',
        borderRadius: '8px',
        marginBottom: '1.2rem',
        border: '1px solid ' + (isCompleted ? '#bbf7d0' : '#d1e5e0')
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.25rem' }}>
              Накоплено
            </p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
              {(goal.current_savings / 1000000).toFixed(2)}M ₸
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.25rem' }}>
              Цель
            </p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
              {(goal.target_amount / 1000000).toFixed(2)}M ₸
            </p>
          </div>
        </div>
        {goal.monthly_needed > 0 && !isCompleted && (
          <div style={{ 
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid ' + (isCompleted ? '#bbf7d0' : '#d1e5e0')
          }}>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>
              Ежемесячно нужно: <strong style={{ color: '#2D9A86' }}>
                {(goal.monthly_needed / 1000).toFixed(0)}K ₸
              </strong>
            </p>
          </div>
        )}
      </div>

      {/* Update Section */}
      {!isCompleted && (
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem',
          paddingTop: '1rem',
          borderTop: '1px solid #f3f4f6'
        }}>
          {isEditing ? (
            <>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="number"
                  value={newSavings}
                  onChange={(e) => {
                    e.preventDefault();
                    setNewSavings(e.target.value);
                  }}
                  min="0"
                  step="1000"
                  disabled={isUpdating}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.7rem 0.7rem 2.5rem',
                    border: '2px solid #2D9A86',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    fontWeight: '600',
                    outline: 'none',
                    opacity: isUpdating ? 0.5 : 1,
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                />
                <DollarSign 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '0.7rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#2D9A86'
                  }} 
                />
              </div>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                style={{
                  padding: '0.7rem 1rem',
                  background: isUpdating 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #2D9A86, #14b8a6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  opacity: isUpdating ? 0.5 : 1
                }}
              >
                {isUpdating ? (
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : (
                  <Check size={16} />
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                style={{
                  padding: '0.7rem 1rem',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  opacity: isUpdating ? 0.5 : 1
                }}
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#f0f9f7',
                color: '#2D9A86',
                border: '2px solid #d1e5e0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d1e5e0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f0f9f7';
              }}
            >
              <TrendingUp size={16} />
              Обновить накопления
            </button>
          )}
        </div>
      )}
    </div>
  );
};