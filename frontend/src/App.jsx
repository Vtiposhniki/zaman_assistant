import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Menu, X, MessageCircle, Upload, TrendingUp, Target, Award, Zap } from 'lucide-react';

class ZamanAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    this.ws = null;
    this.chatMode = null; // текущий режим общения (mentor, analyst, friend, tech)

  }

  // 🩵 Health check
  async health() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch {
      return null;
    }
  }

  // 🟢 Подключение к WebSocket чату (новая версия)
connectChat(userId, onMessage, onOpen, onClose) {
  const isSecure = location.protocol === 'https:';
  const base = this.baseURL.replace(/^https?:\/\//, '');
  const wsUrl = `${isSecure ? 'wss' : 'ws'}://${base}/ws/chat/${userId}`;
  this.ws = new WebSocket(wsUrl);

  this.ws.onopen = () => {
    console.log('✅ WebSocket connected:', wsUrl);
    if (onOpen) onOpen();
  };

  this.ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 WS message from server:', data);

      // 📡 Обработка потокового ответа
      if (data.type === 'stream' && data.reply) {
        onMessage && onMessage({
          type: 'stream',
          reply: data.reply,
          done: !!data.done
        });
      }
      // 📡 Финальное сообщение
      else if (data.reply) {
        onMessage && onMessage({ type: 'final', reply: data.reply });
      }
      // ⚠️ Ошибка
      else if (data.error) {
        console.error('❌ WS error:', data.error);
        onMessage && onMessage({ type: 'error', reply: data.error });
      }
    } catch (err) {
      console.error('⚠️ WS parse error:', err, 'Raw:', event.data);
    }
  };

  this.ws.onclose = () => {
    console.warn('🔌 WebSocket disconnected');
    if (onClose) onClose();
  };

  this.ws.onerror = (err) => {
    console.error('💥 WS error:', err);
  };
}


   // 📨 Отправка сообщения
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        role: 'user',
        content: message,
        mode: this.chatMode || 'mentor'
      }));
    } else {
      console.warn('⚠️ WebSocket not connected');
    }
  }

  // 🧠 Отправка контекста пользователя
  sendUserContext(context) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'context',
        data: context
      }));
      console.log('📤 User context sent:', context);
    } else {
      console.warn('⚠️ WebSocket not ready for context');
    }
  }

  // 🔴 Закрыть соединение
  disconnectChat() {
    if (this.ws) this.ws.close();
  }



export default function App() {
  const [chatMode, setChatMode] = useState('mentor');
  const [view, setView] = useState('dashboard');
  const [userId] = useState(1);
  const [goals, setGoals] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState(null);

  const api = useRef(new ZamanAPI());
  const chatEndRef = useRef(null);

  useEffect(() => {
    checkHealth();
    loadGoals();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const checkHealth = async () => {
    const data = await api.current.health();
    setHealth(data);
  };

  const loadGoals = async () => {
    setLoading(true);
    const data = await api.current.getGoals(userId);
    setGoals(data.goals || []);
    setLoading(false);
  };

  const handleCreateGoal = async (goalData) => {
    setLoading(true);
    try {
      const result = await api.current.createGoal({ ...goalData, user_id: userId });
      setGoals([...goals, result]);
      alert('✅ Цель создана!');
      setView('dashboard');
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (goalId, savings) => {
    try {
      const result = await api.current.updateGoal(goalId, { current_savings: savings });
      setGoals(goals.map(g => g.id === goalId ? result.goal : g));
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

 


  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: TrendingUp },
    { id: 'goals', label: 'Цели', icon: Target },
    { id: 'chat', label: 'Чат', icon: MessageCircle },
    { id: 'products', label: 'Продукты', icon: Award },
    { id: 'analyze', label: 'Анализ', icon: Zap }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '2px solid #2D9A86',
        background: 'white',
        boxShadow: '0 2px 8px rgba(45, 154, 134, 0.1)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.2rem 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '2rem' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: '#2D9A86',
                borderRadius: '10px',
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
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D9A86', margin: 0, letterSpacing: '0.5px' }}>ZAMAN</h1>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, fontWeight: '500' }}>Financial Assistant</p>
              </div>
            </div>

            {/* Nav Desktop */}
            <nav style={{ display: 'grid', gap: '1rem', gridAutoFlow: 'column', justifyContent: 'center' }}>
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    style={{
                      padding: '0.6rem 1.2rem',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      background: view === item.id ? '#2D9A86' : '#f0f9f7',
                      color: view === item.id ? 'white' : '#2D9A86',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      transition: 'all 0.2s',
                      '@media (max-width: 768px)': { display: 'none' }
                    }}
                    onMouseOver={e => {
                      if (view !== item.id) {
                        e.target.style.background = '#e8f5f1';
                        e.target.style.color = '#2D9A86';
                      }
                    }}
                    onMouseOut={e => {
                      if (view !== item.id) {
                        e.target.style.background = '#f0f9f7';
                      }
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Menu Button Mobile */}
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              color: '#2D9A86',
              display: 'none'
            }}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div style={{
            borderTop: '2px solid #f0f9f7',
            background: '#f9fdfb',
            padding: '1rem',
            display: 'grid',
            gap: '0.5rem'
          }}>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setMenuOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    background: view === item.id ? '#2D9A86' : '#f0f9f7',
                    color: view === item.id ? 'white' : '#2D9A86',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
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

      {/* Main */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {view === 'dashboard' && <DashboardView goals={goals} health={health} />}
        {view === 'goals' && <GoalsView goals={goals} onCreateGoal={handleCreateGoal} onUpdateGoal={handleUpdateGoal} loading={loading} />}
        {view === 'chat' && (
  <div>
    {/* 🎭 Переключатель личности ассистента */}
    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label style={{ fontWeight: '600', color: '#374151' }}>Режим общения:</label>
      <select
        value={chatMode}
        onChange={(e) => setChatMode(e.target.value)}
        style={{
          padding: '0.5rem 0.8rem',
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          fontSize: '14px',
          color: '#111827',
        }}
      >
        <option value="mentor">🧘 Ментор</option>
        <option value="analyst">💼 Аналитик</option>
        <option value="friend">💬 Друг</option>
        <option value="tech">🤖 Технарь</option>
      </select>
    </div>

    {/* 👇 Передаём выбранный режим в чат */}
    <ChatView chatEndRef={chatEndRef} chatMode={chatMode} />
  </div>
)}

        {view === 'products' && <ProductsView />}
        {view === 'analyze' && <AnalyzeView userId={userId} />}
      </main>
    </div>
  );
}

// 🧠 Отправка контекста пользователя
sendUserContext(context) {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(JSON.stringify({
      type: 'context',
      data: context
    }));
    console.log('📤 User context sent:', context);
  } else {
    console.warn('⚠️ WebSocket not ready for context');
  }
}


function ProductsView() {
  const products = [
    { name: 'Выгодный', type: 'Депозит', yield: 17, min: 500000, desc: '17% годовых, 3-12 мес' },
    { name: 'Овернайт', type: 'Депозит', yield: 12, min: 1000000, desc: '12% годовых, 1-12 мес' },
    { name: 'Беззалоговый кредит', type: 'Кредит', yield: null, min: 100000, desc: 'До 10M ₸, 3-60 мес' },
    { name: 'Бизнес карта', type: 'Карта', yield: null, min: 100000, desc: 'Лимит до 10M ₸' }
  ];

  return (
    <div>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Банковские продукты</h1>
      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '2.5rem' }}>Выбирайте лучшие решения для ваших целей</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {products.map((product, idx) => (
          <div key={idx} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.8rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
            transition: 'all 0.2s'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>{product.name}</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '1rem' }}>{product.type}</p>
            
            {product.yield && (
              <div style={{
                background: '#f0f9f7',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #d1e5e0'
              }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.3rem' }}>Доходность</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D9A86', margin: 0 }}>{product.yield}%</p>
              </div>
            )}
            
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '1rem' }}>{product.desc}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1.5rem', fontWeight: '500' }}>От {(product.min / 1000).toFixed(0)}K ₸</p>
            
            <button style={{
              width: '100%',
              padding: '0.85rem',
              background: '#2D9A86',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
              e.target.style.background = '#258170';
            }}
            onMouseOut={e => {
              e.target.style.background = '#2D9A86';
            }}>
              Подробнее →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyzeView({ userId }) {
  const [file, setFile] = useState(null);
  const [income, setIncome] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!file || !income) {
      alert('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const api = new ZamanAPI();
      const data = await api.analyzeExpenses(file, userId, parseFloat(income));
      setResult(data);
    } catch (err) {
      alert('Ошибка анализа: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Анализ расходов</h1>
      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '2.5rem' }}>AI-powered финансовая аналитика</p>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
      }}>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '0.75rem', display: 'block' }}>
              📄 Загрузите CSV с транзакциями
            </label>
            <div style={{
              border: '2px dashed #d1e5e0',
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: '#f9fdfb'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = '#2D9A86';
              e.currentTarget.style.background = '#f0f9f7';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#d1e5e0';
              e.currentTarget.style.background = '#f9fdfb';
            }}>
              <Upload size={40} style={{ color: '#2D9A86', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0])}
                style={{ display: 'none' }}
                id="csv-upload"
              />
              <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 0.3rem 0' }}>
                  {file ? `📄 ${file.name}` : 'Выберите CSV файл'}
                </p>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>или перетащите файл сюда</p>
              </label>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
              💰 Месячный доход (₸)
            </label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="500000"
              style={{
                width: '100%',
                padding: '0.85rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2D9A86';
                e.target.style.boxShadow = '0 0 0 3px rgba(45, 154, 134, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              padding: '0.95rem',
              background: '#2D9A86',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Анализирую...' : 'Анализировать расходы'}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem' }}>Результаты анализа</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f9fdfb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Всего расходов</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D9A86', margin: 0 }}>{(result.total_spending / 1000000).toFixed(2)}M ₸</p>
              </div>
              <div style={{ background: '#f9fdfb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 0.5rem 0' }}>Транзакций</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2D9A86', margin: 0 }}>{result.total_transactions}</p>
              </div>
            </div>
            
            {result.categories && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>📊 Категории расходов</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {result.categories.map((cat, idx) => (
                    <div key={idx} style={{
                      background: '#f9fdfb',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{cat.category}</span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D9A86' }}>{cat.pct}%</span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: '#e5e7eb',
                        borderRadius: '999px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: '#2D9A86',
                          width: `${cat.pct}%`,
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.advice && (
              <div style={{ marginTop: '1.5rem', background: '#f0f9f7', padding: '1rem', borderRadius: '8px', border: '1px solid #d1e5e0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', marginBottom: '1rem', margin: 0 }}>💡 AI Советы по экономии</h3>
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                  {result.advice.map((tip, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', fontSize: '13px', color: '#374151' }}>
                      <span style={{ color: '#2D9A86', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardView({ goals, health }) {
  const activeGoals = goals.filter(g => g.status === 'active');
  const totalSaved = activeGoals.reduce((sum, g) => sum + (g.current_savings || 0), 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '2.5rem', letterSpacing: '-0.5px' }}>Дашборд</h1>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard label="Активных целей" value={activeGoals.length} icon="🎯" color="#2D9A86" />
        <StatCard label="Накоплено" value={`${(totalSaved / 1000000).toFixed(1)}M ₸`} icon="💰" color="#EEFF6D" />
        <StatCard label="Целевая сумма" value={`${(totalTarget / 1000000).toFixed(1)}M ₸`} icon="🎪" color="#2D9A86" />
        <StatCard label="Статус" value={health?.status === 'healthy' ? '🟢 Online' : '🔴 Offline'} icon="📡" color="#2D9A86" />
      </div>

      {/* Progress Bar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid #e5e7eb',
        marginBottom: '2.5rem',
        boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>Общий прогресс</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Прогресс накоплений</span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D9A86' }}>{progress.toFixed(0)}%</span>
        </div>
        <div style={{
          height: '16px',
          background: '#f0f9f7',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            height: '100%',
            background: '#2D9A86',
            width: `${progress}%`,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Goals */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>Активные цели</h2>
        {activeGoals.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem 0', fontSize: '15px' }}>Нет активных целей. Создайте первую цель!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {activeGoals.map(goal => (
              <div key={goal.id} style={{
                background: '#f9fdfb',
                borderRadius: '10px',
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#111827' }}>{goal.name}</h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1rem' }}>Прогресс: {goal.progress_percent}%</p>
                <div style={{
                  height: '8px',
                  background: '#e5e7eb',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    height: '100%',
                    background: '#2D9A86',
                    width: `${goal.progress_percent}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>{(goal.current_savings / 1000000).toFixed(2)}M / {(goal.target_amount / 1000000).toFixed(2)}M ₸</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1.8rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onMouseOver={e => {
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(45, 154, 134, 0.15)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseOut={e => {
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(45, 154, 134, 0.08)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      <div style={{ fontSize: '36px', marginBottom: '0.75rem' }}>{icon}</div>
      <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '0.5rem', fontWeight: '500' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: 'bold', color: color }}>{value}</p>
    </div>
  );
}

function GoalsView({ goals, onCreateGoal, onUpdateGoal, loading }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', target_amount: '', current_savings: '', target_date: '',
    income: '', expenses: '', goal_type: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreateGoal({
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_savings: parseFloat(form.current_savings) || 0,
      income: form.income ? parseFloat(form.income) : undefined,
      expenses: form.expenses ? parseFloat(form.expenses) : undefined
    });
    setShowForm(false);
    setForm({ name: '', target_amount: '', current_savings: '', target_date: '', income: '', expenses: '', goal_type: '' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Мои цели</h1>
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
          onMouseOver={e => {
            e.currentTarget.style.background = '#258170';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(45, 154, 134, 0.4)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = '#2D9A86';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(45, 154, 134, 0.3)';
          }}
        >
          <Plus size={18} />
          Новая цель
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          marginBottom: '2.5rem',
          boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>Создать новую цель</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
              <FormField label="Название цели" type="text" value={form.name} onChange={(v) => setForm({...form, name: v})} placeholder="Например: Автомобиль" />
              <FormField label="Целевая сумма (₸)" type="number" value={form.target_amount} onChange={(v) => setForm({...form, target_amount: v})} placeholder="1000000" />
              <FormField label="Текущие накопления" type="number" value={form.current_savings} onChange={(v) => setForm({...form, current_savings: v})} placeholder="0" />
              <FormField label="Дата достижения" type="date" value={form.target_date} onChange={(v) => setForm({...form, target_date: v})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} style={{
                flex: 1,
                padding: '0.85rem',
                background: '#2D9A86',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}>
                {loading ? 'Создание...' : 'Создать цель'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                flex: 1,
                padding: '0.85rem',
                background: '#f0f9f7',
                color: '#2D9A86',
                border: '1px solid #d1e5e0',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {goals.filter(g => g.status === 'active').map((goal) => (
          <div key={goal.id} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.8rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
            transition: 'all 0.2s'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#111827' }}>{goal.name}</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1.2rem' }}>📅 {new Date(goal.target_date).toLocaleDateString('ru-RU')}</p>
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Прогресс</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2D9A86' }}>{goal.progress_percent}%</span>
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
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1.2rem', fontWeight: '500' }}>{(goal.current_savings / 1000000).toFixed(2)}M / {(goal.target_amount / 1000000).toFixed(2)}M ₸</p>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <input type="number" defaultValue={goal.current_savings} id={`input-${goal.id}`} style={{
                flex: 1,
                padding: '0.7rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'inherit'
              }} />
              <button onClick={() => {
                const val = parseFloat(document.getElementById(`input-${goal.id}`).value);
                onUpdateGoal(goal.id, val);
              }} style={{
                padding: '0.7rem 1rem',
                background: '#2D9A86',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}>✓</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormField({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'inherit',
          transition: 'all 0.2s'
        }}
        onFocus={e => {
          e.target.style.borderColor = '#2D9A86';
          e.target.style.boxShadow = '0 0 0 3px rgba(45, 154, 134, 0.1)';
        }}
        onBlur={e => {
          e.target.style.borderColor = '#d1d5db';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

function ChatView({ chatEndRef, chatMode, goals, health }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [emotion, setEmotion] = useState('neutral');

  const api = useRef(new ZamanAPI());
  api.current.chatMode = chatMode;
  const userId = 1;

  // 🎤 Голосовой ввод
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('🎤 SpeechRecognition не поддерживается этим браузером');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('🎧 Распознано:', transcript);
      setInput(transcript);
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  // ⚡ Подключение WebSocket с контекстом пользователя
  useEffect(() => {
    let accumulatedReply = '';

    api.current.connectChat(
      userId,
      (data) => {
        if (data.type === 'stream' && data.reply) {
          setIsTyping(true);
          accumulatedReply += data.reply;

          setMessages(prev => {
            const last = [...prev];
            // если последнее сообщение от ассистента — обновляем
            if (last.length && last[last.length - 1].role === 'assistant' && !data.done) {
              last[last.length - 1].content = accumulatedReply;
              return last;
            } else if (!data.done) {
              // начало потока — создаём новое сообщение
              return [...last, { role: 'assistant', content: data.reply }];
            } else {
              // поток завершён — обновляем финальный текст
              last[last.length - 1].content = accumulatedReply;
              return last;
            }
          });

          // если поток завершён
          if (data.done) {
            setIsTyping(false);
            setTimeout(() => speak(accumulatedReply), 300);
            accumulatedReply = '';
          }
        } else if (data.reply) {
          // обычный ответ
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
          speak(data.reply);
        } else if (data.error) {
          setMessages(prev => [...prev, { role: 'assistant', content: '❌ Ошибка: ' + data.error }]);
          setIsTyping(false);
        }
      },
      () => {
        setConnected(true);
        // 🚀 Отправляем контекст пользователя при подключении
        const userContext = {
          goals,
          health,
          mode: chatMode,
          timestamp: new Date().toISOString(),
        };
        api.current.sendUserContext?.(userContext);
      },
      () => setConnected(false)
    );

    return () => api.current.disconnectChat();
  }, [chatMode]);

  // 🎙️ Отправка сообщения
  const sendMessage = () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    api.current.sendMessage(msg);
    setInput('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🔊 Озвучка ответа
  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel(); // отмена старой озвучки

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';

    if (api.current.chatMode === 'analyst') {
      utterance.rate = 0.95;
      utterance.pitch = 0.8;
    } else if (api.current.chatMode === 'friend') {
      utterance.rate = 1.1;
      utterance.pitch = 1.3;
    } else if (api.current.chatMode === 'tech') {
      utterance.rate = 1.0;
      utterance.pitch = 0.9;
    } else {
      utterance.rate = 1;
      utterance.pitch = 1.1;
    }

    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang === 'ru-RU') || voices[0];

    setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);

    // 🎭 Определяем "эмоцию"
    if (text.includes('отлично') || text.includes('рад')) setEmotion('happy');
    else if (text.includes('ошибка') || text.includes('извини')) setEmotion('sad');
    else if (text.includes('вперёд') || text.includes('давай')) setEmotion('motivated');
    else setEmotion('neutral');
  };

  const modeName = (mode) => {
    switch (mode) {
      case 'analyst': return 'Финансовый аналитик';
      case 'friend': return 'Дружелюбный ассистент';
      case 'tech': return 'Технический эксперт';
      default: return 'Ментор по привычкам';
    }
  };

  return (
    <div style={{
      height: '700px',
      display: 'flex',
      flexDirection: 'column',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        background: '#f9fdfb',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background:
                emotion === 'happy'
                  ? 'linear-gradient(135deg, #22c55e, #86efac)'
                  : emotion === 'sad'
                  ? 'linear-gradient(135deg, #3b82f6, #93c5fd)'
                  : emotion === 'motivated'
                  ? 'linear-gradient(135deg, #f59e0b, #fde68a)'
                  : 'linear-gradient(135deg, #14b8a6, #99f6e4)',
              boxShadow: speaking
                ? '0 0 25px rgba(20,184,166,0.6)'
                : listening
                ? '0 0 20px rgba(245,158,11,0.6)'
                : '0 0 10px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '30px',
              fontWeight: 'bold',
              transition: 'all 0.4s ease'
            }}
          >
            {chatMode === 'analyst'
              ? '💼'
              : chatMode === 'friend'
              ? '💬'
              : chatMode === 'tech'
              ? '🤖'
              : '🧘'}
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              Zaman Assistant
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              {connected ? '🟢 Онлайн' : '🔴 Оффлайн'} — {modeName(chatMode)}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#2D9A86' : '#f0f9f7',
            color: msg.role === 'user' ? 'white' : '#111827',
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            maxWidth: '70%',
            fontSize: '14px',
            lineHeight: 1.4
          }}>
            {msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Индикатор активности ассистента */}
      {(isTyping || speaking) && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: speaking ? '#10b981' : '#6b7280',
            marginBottom: '0.5rem',
            fontStyle: 'italic',
            transition: 'color 0.3s ease'
          }}
        >
          {speaking ? 'Ассистент говорит...' : 'Ассистент печатает...'}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Введите сообщение..."
          style={{
            flex: 1,
            padding: '0.8rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#111827',
            background: '#ffffff'
          }}
        />

        {/* 🎤 Голосовой ввод */}
        <button
          onClick={() => {
            if (!recognitionRef.current) return;
            if (listening) {
              recognitionRef.current.stop();
              setListening(false);
            } else {
              recognitionRef.current.start();
              setListening(true);
            }
          }}
          style={{
            padding: '0.8rem',
            background: listening ? '#ef4444' : '#f0f9f7',
            color: listening ? 'white' : '#2D9A86',
            border: '1px solid #d1e5e0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '16px'
          }}
          title="Нажми, чтобы говорить"
        >
          {listening ? '🛑' : '🎙️'}
        </button>

        <button
          onClick={sendMessage}
          disabled={!connected || !input.trim()}
          style={{
            padding: '0.8rem 1.2rem',
            background: connected ? '#2D9A86' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: connected ? 'pointer' : 'not-allowed'
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}