// frontend/src/components/Goals/GoalForm.jsx
import React, { useState } from 'react';

export const GoalForm = ({ onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_savings: '0',
    target_date: '',
    income: '',
    expenses: '',
    goal_type: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Введите название цели';
    }
    
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) {
      newErrors.target_amount = 'Введите корректную сумму';
    }
    
    if (!form.target_date) {
      newErrors.target_date = 'Выберите дату';
    } else {
      const selectedDate = new Date(form.target_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate <= today) {
        newErrors.target_date = 'Дата должна быть в будущем';
      }
    }
    
    if (form.current_savings && parseFloat(form.current_savings) < 0) {
      newErrors.current_savings = 'Сумма не может быть отрицательной';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_savings: parseFloat(form.current_savings) || 0,
      income: form.income ? parseFloat(form.income) : undefined,
      expenses: form.expenses ? parseFloat(form.expenses) : undefined
    });
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Очистить ошибку при вводе
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const FormField = ({ label, type, value, field, placeholder, required = false, min, step }) => (
    <div>
      <label style={{ 
        display: 'block', 
        fontSize: '13px', 
        fontWeight: '600', 
        color: '#374151', 
        marginBottom: '0.5rem' 
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => {
          e.preventDefault();
          handleInputChange(field, e.target.value);
        }}
        placeholder={placeholder}
        min={min}
        step={step}
        autoComplete="off"
        style={{
          width: '100%',
          padding: '0.75rem',
          border: errors[field] ? '2px solid #ef4444' : '2px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
          outline: 'none',
          backgroundColor: 'white',
          color: '#111827'
        }}
        onFocus={(e) => {
          if (!errors[field]) {
            e.target.style.borderColor = '#2D9A86';
          }
        }}
        onBlur={(e) => {
          if (!errors[field]) {
            e.target.style.borderColor = '#d1d5db';
          }
        }}
        onKeyDown={(e) => {
          // Предотвращаем конфликты с клавиатурными событиями
          e.stopPropagation();
        }}
      />
      {errors[field] && (
        <p style={{ 
          fontSize: '12px', 
          color: '#ef4444', 
          marginTop: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          ⚠️ {errors[field]}
        </p>
      )}
    </div>
  );

  const goalTypes = [
    'Автомобиль',
    'Недвижимость',
    'Образование',
    'Путешествие',
    'Бизнес',
    'Свадьба',
    'Другое'
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '2rem',
      border: '1px solid #e5e7eb',
      marginBottom: '2rem',
      boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
      animation: 'slideDown 0.3s ease'
    }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: 'bold', 
        marginBottom: '1.5rem', 
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        ✨ Создать новую цель
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Row 1: Name and Type */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            <FormField 
              label="Название цели" 
              type="text" 
              value={form.name} 
              field="name"
              placeholder="Например: Новый автомобиль" 
              required
            />
            
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Тип цели
              </label>
              <select
                value={form.goal_type}
                onChange={(e) => {
                  e.preventDefault();
                  handleInputChange('goal_type', e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  color: '#111827'
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
              >
                <option value="">Выберите тип</option>
                {goalTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Amounts */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            <FormField 
              label="Целевая сумма" 
              type="number" 
              value={form.target_amount} 
              field="target_amount"
              placeholder="5000000" 
              required
              min="1"
              step="1000"
            />
            
            <FormField 
              label="Текущие накопления" 
              type="number" 
              value={form.current_savings} 
              field="current_savings"
              placeholder="0" 
              min="0"
              step="1000"
            />
            
            <FormField 
              label="Дата достижения" 
              type="date" 
              value={form.target_date} 
              field="target_date"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Row 3: Optional Fields */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}>
            <FormField 
              label="Месячный доход (опционально)" 
              type="number" 
              value={form.income} 
              field="income"
              placeholder="500000" 
              min="0"
              step="1000"
            />
            
            <FormField 
              label="Месячные расходы (опционально)" 
              type="number" 
              value={form.expenses} 
              field="expenses"
              placeholder="300000" 
              min="0"
              step="1000"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              flex: 1,
              padding: '1rem',
              background: loading 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #2D9A86, #14b8a6)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1,
              boxShadow: loading ? 'none' : '0 4px 12px rgba(45, 154, 134, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Создание...
              </>
            ) : (
              <>✓ Создать цель</>
            )}
          </button>
          
          <button 
            type="button" 
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: '1rem',
              background: '#f0f9f7',
              color: '#2D9A86',
              border: '2px solid #d1e5e0',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1
            }}
          >
            Отмена
          </button>
        </div>
      </form>

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
      `}</style>
    </div>
  );
};