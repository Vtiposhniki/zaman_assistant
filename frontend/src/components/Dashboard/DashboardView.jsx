// ============================================================
// 📁 src/components/Dashboard/DashboardView.jsx
// ============================================================
import React, { useState } from 'react';

export const DashboardView = ({ goals, health }) => {
  const [activeTab, setActiveTab] = useState('mentor');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Здравствуйте! Как я могу вам помочь сегодня?', isUser: false },
    { id: 2, text: 'hi', isUser: true },
    { id: 3, text: 'Я хотел бы кредит на автомобиль.', isUser: true },
    { id: 4, text: 'Чтобы помочь вам с кредитом на автомобиль, мне нужно знать, какую сумму вы планируете взять в кредит и на какой срок. Также будет полезно знать, есть ли у вас первоначальный взнос.', isUser: false }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const activeGoals = goals.filter(g => g.status === 'active');
  const totalSaved = activeGoals.reduce((sum, g) => sum + (g.current_savings || 0), 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: inputMessage,
        isUser: true
      };
      setMessages([...messages, newMessage]);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '1rem 2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            background: '#059669',
            color: 'white',
            borderRadius: '50%',
            height: '40px',
            width: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            Z
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>ZAMAN</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Financial Assistant</div>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}>Дашборд</button>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}>Цели</button>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}>Продукты</button>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: '#374151',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}>Анализ</button>
          <button style={{
            background: '#059669',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            transition: 'all 0.2s'
          }}>Чат</button>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
        <div style={{
          width: '70%',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '80vh'
        }}>
          {/* Chat header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                background: '#dcfce7',
                borderRadius: '50%',
                height: '40px',
                width: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: '#166534', fontSize: '20px' }}>💬</span>
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  Zaman Assistant
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  Онлайн — Ментор по привычкам
                </p>
              </div>
            </div>
            <div style={{ width: '150px' }}>
              <div style={{
                display: 'flex',
                background: '#f3f4f6',
                borderRadius: '8px',
                padding: '2px'
              }}>
                <button
                  onClick={() => setActiveTab('mentor')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: activeTab === 'mentor' ? 'white' : 'transparent',
                    color: activeTab === 'mentor' ? '#1f2937' : '#6b7280',
                    boxShadow: activeTab === 'mentor' ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Ментор
                </button>
                <button
                  onClick={() => setActiveTab('finance')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: activeTab === 'finance' ? 'white' : 'transparent',
                    color: activeTab === 'finance' ? '#1f2937' : '#6b7280',
                    boxShadow: activeTab === 'finance' ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Финансы
                </button>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            overflowY: 'auto',
            background: '#f9fafb',
            padding: '1rem',
            borderRadius: '0 0 16px 16px'
          }}>
            {messages.map(message => (
              <div
                key={message.id}
                style={{
                  alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                  background: message.isUser ? '#059669' : '#dcfce7',
                  color: message.isUser ? 'white' : '#1f2937',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  maxWidth: '70%',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}
              >
                {message.text}
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '1rem',
            borderTop: '1px solid #e5e7eb',
            padding: '0.75rem',
            gap: '0.5rem'
          }}>
            <input
              type="text"
              placeholder="Введите сообщение..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                outline: 'none',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#059669';
                e.target.style.boxShadow = '0 0 0 3px rgba(5, 150, 105, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSendMessage}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.25rem',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#047857';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#059669';
              }}
            >
              ▶
            </button>
          </div>
        </div>
      </main>

      {/* Stats Section - Compact version */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        gap: '1rem',
        zIndex: 1000
      }}>
        <StatCard 
          label="Активных целей" 
          value={activeGoals.length} 
          icon="🎯" 
          color="#2D9A86" 
          compact={true}
        />
        <StatCard 
          label="Накоплено" 
          value={`${(totalSaved / 1000000).toFixed(1)}M ₸`} 
          icon="💰" 
          color="#EEFF6D" 
          compact={true}
        />
        <StatCard 
          label="Прогресс" 
          value={`${progress.toFixed(0)}%`} 
          icon="📈" 
          color="#2D9A86" 
          compact={true}
        />
      </div>
    </div>
  );
};

// Встроенный StatCard компонент с поддержкой компактного режима
function StatCard({ label, value, icon, color, compact = false }) {
  if (compact) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '0.75rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.2s',
        cursor: 'pointer',
        minWidth: '120px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '20px', marginBottom: '0.25rem' }}>{icon}</div>
        <p style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '0.25rem', fontWeight: '500' }}>
          {label}
        </p>
        <p style={{ fontSize: '14px', fontWeight: 'bold', color: color }}>{value}</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1.8rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}>
      <div style={{ fontSize: '36px', marginBottom: '0.75rem' }}>{icon}</div>
      <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: '500' }}>
        {label}
      </p>
      <p style={{ fontSize: '26px', fontWeight: 'bold', color: color }}>{value}</p>
    </div>
  );
}
