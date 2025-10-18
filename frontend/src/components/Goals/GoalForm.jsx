// ============================================================
// 📁 src/components/Goals/GoalForm.jsx
// ============================================================
import React, { useState } from 'react';

export const GoalForm = ({ onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_savings: '',
    target_date: '',
    income: '',
    expenses: '',
    goal_type: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_savings: parseFloat(form.current_savings) || 0,
      income: form.income ? parseFloat(form.income) : undefined,
      expenses: form.expenses ? parseFloat(form.expenses) : undefined
    });
  };

  const FormField = ({ label, type, value, field, placeholder }) => (
    <div>
      <label style={{ 
        display: 'block', 
        fontSize: '13px', 
        fontWeight: '600', 
        color: '#374151', 
        marginBottom: '0.5rem' 
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder}
        required={['name', 'target_amount', 'target_date'].includes(field)}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'inherit',
          transition: 'all 0.2s'
        }}
      />
    </div>
  );

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '2rem',
      border: '1px solid #e5e7eb',
      marginBottom: '2.5rem',
      boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
        Создать новую цель
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
          <FormField 
            label="Название цели" 
            type="text" 
            value={form.name} 
            field="name"
            placeholder="Например: Автомобиль" 
          />
          <FormField 
            label="Целевая сумма (₸)" 
            type="number" 
            value={form.target_amount} 
            field="target_amount"
            placeholder="1000000" 
          />
          <FormField 
            label="Текущие накопления" 
            type="number" 
            value={form.current_savings} 
            field="current_savings"
            placeholder="0" 
          />
          <FormField 
            label="Дата достижения" 
            type="date" 
            value={form.target_date} 
            field="target_date"
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: '#2D9A86',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Создание...' : 'Создать цель'}
          </button>
          <button 
            type="button" 
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.85rem',
              background: '#f0f9f7',
              color: '#2D9A86',
              border: '1px solid #d1e5e0',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};