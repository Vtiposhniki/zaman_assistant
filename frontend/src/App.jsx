import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Menu, X, MessageCircle, Upload, Mic, TrendingUp, Target, Award, Zap, ArrowRight, ChevronDown } from 'lucide-react';

// ===== API CLIENT =====
class ZamanAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async health() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch (err) {
      console.error('Health check failed:', err);
      return null;
    }
  }

  async createGoal(data) {
    try {
      const response = await fetch(`${this.baseURL}/goals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async getGoals(userId) {
    try {
      const url = userId 
        ? `${this.baseURL}/goals?user_id=${userId}` 
        : `${this.baseURL}/goals`;
      const response = await fetch(url);
      return await response.json();
    } catch (err) {
      console.error('Failed to load goals:', err);
      return { goals: [] };
    }
  }

  async updateGoal(goalId, data) {
    try {
      const response = await fetch(`${this.baseURL}/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async chat(messages, userId) {
    try {
      const response = await fetch(`${this.baseURL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, user_id: userId })
      });
      return await response.json();
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async analyzeExpenses(file, userId, income) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      formData.append('monthly_income', income);
      
      const response = await fetch(`${this.baseURL}/analyze_expenses`, {
        method: 'POST',
        body: formData
      });
      return await response.json();
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

// ===== FLOATING PARTICLES BACKGROUND =====
function ParticlesBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`
          }}
        />
      ))}
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
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
    if (data) setHealth(data);
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
      const result = await api.current.createGoal({
        ...goalData,
        user_id: userId
      });
      setGoals([...goals, result]);
      alert('✅ Цель создана с AI-советами!');
      setView('dashboard');
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (goalId, savings) => {
    try {
      const result = await api.current.updateGoal(goalId, { 
        current_savings: savings 
      });
      setGoals(goals.map(g => g.id === goalId ? result.goal : g));
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const handleSendMessage = async (message) => {
    const newMessages = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(newMessages);
    setLoading(true);

    try {
      const response = await api.current.chat(newMessages, userId);
      setChatMessages([...newMessages, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      setChatMessages([...newMessages, { role: 'assistant', content: '❌ Ошибка подключения' }]);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: TrendingUp },
    { id: 'goals', label: 'Цели', icon: Target },
    { id: 'chat', label: 'AI Чат', icon: MessageCircle },
    { id: 'products', label: 'Продукты', icon: Award },
    { id: 'analyze', label: 'Анализ', icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-900 relative overflow-hidden">
      <ParticlesBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <div className="grid grid-cols-[auto_auto] items-center gap-4 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 rounded-2xl grid place-items-center shadow-2xl transform group-hover:scale-110 transition-transform">
                  <span className="text-white font-black text-2xl">Z</span>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-teal-200 via-cyan-200 to-blue-200 bg-clip-text text-transparent">
                  Zaman
                </h1>
                <p className="text-xs text-teal-200/80">AI-Powered Finance</p>
              </div>
            </div>

            <nav className="hidden md:grid grid-flow-col gap-2 justify-center">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`group relative px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                      view === item.id
                        ? 'text-white'
                        : 'text-teal-200/70 hover:text-white'
                    }`}
                  >
                    {view === item.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-500/50" />
                    )}
                    <div className="relative grid grid-flow-col gap-2 items-center">
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-3 text-white hover:bg-white/10 rounded-xl transition-all"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden backdrop-blur-xl bg-white/10 border-t border-white/20 p-4">
            <div className="grid gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      view === item.id
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                        : 'text-teal-200 hover:bg-white/10'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'dashboard' && <DashboardView goals={goals} health={health} />}
        {view === 'goals' && <GoalsView goals={goals} onCreateGoal={handleCreateGoal} onUpdateGoal={handleUpdateGoal} loading={loading} />}
        {view === 'chat' && <ChatView messages={chatMessages} onSendMessage={handleSendMessage} loading={loading} chatEndRef={chatEndRef} />}
        {view === 'products' && <ProductsView />}
        {view === 'analyze' && <AnalyzeView userId={userId} />}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(0px) translateX(20px); }
          75% { transform: translateY(20px) translateX(10px); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out forwards;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

// ===== DASHBOARD VIEW =====
function DashboardView({ goals, health }) {
  const activeGoals = goals.filter(g => g.status === 'active');
  const totalSaved = activeGoals.reduce((sum, g) => sum + (g.current_savings || 0), 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const stats = [
    { 
      label: 'Активных целей', 
      value: activeGoals.length, 
      icon: Target,
      color: 'from-purple-500 to-pink-600',
      bgGlow: 'shadow-purple-500/50'
    },
    { 
      label: 'Накоплено', 
      value: `${(totalSaved / 1000000).toFixed(1)}M ₸`, 
      icon: TrendingUp,
      color: 'from-teal-500 to-cyan-600',
      bgGlow: 'shadow-teal-500/50'
    },
    { 
      label: 'Целевая сумма', 
      value: `${(totalTarget / 1000000).toFixed(1)}M ₸`, 
      icon: Award,
      color: 'from-orange-500 to-red-600',
      bgGlow: 'shadow-orange-500/50'
    },
    { 
      label: 'API Status', 
      value: health?.status === 'healthy' ? '🟢 Online' : '🔴 Offline', 
      icon: Zap,
      color: 'from-green-500 to-emerald-600',
      bgGlow: 'shadow-green-500/50'
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="group relative"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity ${stat.bgGlow}`} />
              <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 hover:border-white/40 transition-all transform hover:-translate-y-2 hover:shadow-2xl">
                <div className="grid grid-cols-[auto_auto] justify-between items-start mb-4">
                  <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-2xl shadow-lg`}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <ChevronDown className="text-white/50 group-hover:text-white transition-colors" size={20} />
                </div>
                <p className="text-white/70 text-sm font-medium mb-2">{stat.label}</p>
                <p className="text-3xl font-black text-white">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Overview */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
        <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6 mb-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-2">Общий прогресс</h2>
              <p className="text-teal-200/80">Ваш путь к финансовой свободе</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black bg-gradient-to-r from-teal-200 to-cyan-200 bg-clip-text text-transparent">
                {progress.toFixed(0)}%
              </p>
            </div>
          </div>
          
          <div className="relative h-6 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 rounded-full shadow-lg shadow-teal-500/50 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
        <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all">
          <h2 className="text-2xl font-black text-white mb-6 grid grid-flow-col gap-3 justify-start items-center">
            <Target className="text-teal-400" />
            <span>Активные цели</span>
          </h2>
          
          {activeGoals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto mb-4 text-white/30" size={64} />
              <p className="text-white/70 text-lg">Цели не созданы</p>
              <p className="text-white/50 text-sm mt-2">Начните свой путь к мечте!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {activeGoals.slice(0, 6).map((goal, idx) => (
                <div 
                  key={goal.id} 
                  className="group/goal relative"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl blur-lg opacity-0 group-hover/goal:opacity-50 transition-opacity" />
                  <div className="relative backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all transform hover:scale-105">
                    <div className="grid grid-cols-[1fr_auto] items-start gap-4 mb-4">
                      <h4 className="font-bold text-white text-lg">{goal.name}</h4>
                      <span className="px-3 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full text-xs font-bold text-white shadow-lg">
                        {goal.progress_percent}%
                      </span>
                    </div>
                    
                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress_percent}%` }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 items-center gap-2 text-sm">
                      <span className="text-white/70">{(goal.current_savings / 1000000).toFixed(2)}M ₸</span>
                      <ArrowRight className="text-teal-400 justify-self-center" size={16} />
                      <span className="text-teal-200 font-bold justify-self-end">{(goal.target_amount / 1000000).toFixed(2)}M ₸</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== GOALS VIEW =====
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
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <h1 className="text-4xl font-black text-white">Мои цели</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="group relative px-8 py-4 rounded-2xl font-bold text-white overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 transition-transform group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative grid grid-flow-col gap-2 items-center">
            <Plus size={24} />
            <span>Создать цель</span>
          </span>
        </button>
      </div>

      {showForm && (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl blur-2xl opacity-30" />
          <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-black text-white mb-6">✨ Новая цель</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <input 
                  type="text" 
                  placeholder="Название цели" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})} 
                  className="px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all" 
                  required 
                />
                <input 
                  type="number" 
                  placeholder="Целевая сумма (₸)" 
                  value={form.target_amount} 
                  onChange={(e) => setForm({...form, target_amount: e.target.value})} 
                  className="px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all" 
                  required 
                />
                <input 
                  type="number" 
                  placeholder="Текущие накопления" 
                  value={form.current_savings} 
                  onChange={(e) => setForm({...form, current_savings: e.target.value})} 
                  className="px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all" 
                />
                <input 
                  type="date" 
                  value={form.target_date} 
                  onChange={(e) => setForm({...form, target_date: e.target.value})} 
                  className="px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white focus:border-teal-400 focus:outline-none transition-all" 
                  required 
                />
                <input 
                  type="number" 
                  placeholder="Доход/месяц" 
                  value={form.income} 
                  onChange={(e) => setForm({...form, income: e.target.value})} 
                  className="px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all" 
                />
                <input 
                  type="number" 
                  placeholder="Расходы/месяц" 
                  value={form.expenses} 
                  onChange={(e) => setForm({...form, expenses: e.target.value})} 
                  className="px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all" 
                />
              </div>
              <select 
                value={form.goal_type} 
                onChange={(e) => setForm({...form, goal_type: e.target.value})} 
                className="w-full px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white focus:border-teal-400 focus:outline-none transition-all"
              >
                <option value="">Выберите тип цели</option>
                <option value="образование">📚 Образование</option>
                <option value="авто">🚗 Автомобиль</option>
                <option value="путешествие">✈️ Путешествие</option>
                <option value="жилье">🏠 Жилье</option>
                <option value="здоровье">💊 Здоровье</option>
              </select>
              <div className="grid md:grid-cols-2 gap-4">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="relative group px-8 py-4 rounded-2xl font-bold text-white overflow-hidden disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600" />
                  <span className="relative">
                    {loading ? 'Создание...' : '✨ Создать цель'}
                  </span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-bold hover:bg-white/20 transition-all"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.filter(g => g.status === 'active').map((goal, idx) => (
          <div 
            key={goal.id} 
            className="group relative"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 hover:border-white/40 transition-all transform hover:-translate-y-2">
              <h3 className="text-xl font-black text-white mb-2">{goal.name}</h3>
              <p className="text-sm text-teal-200/80 mb-4">🗓️ {new Date(goal.target_date).toLocaleDateString('ru-RU')}</p>
              
              <div className="mb-4">
                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm mb-2">
                  <span className="text-white/70 font-medium">Прогресс</span>
                  <span className="text-teal-300 font-black">{goal.progress_percent}%</span>
                </div>
                <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full shadow-lg transition-all duration-500"
                    style={{ width: `${goal.progress_percent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3">
                  <p className="text-white/70 text-xs mb-1">Накоплено</p>
                  <p className="text-lg font-black text-white">{(goal.current_savings / 1000000).toFixed(2)}M</p>
                </div>
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3">
                  <p className="text-white/70 text-xs mb-1">Цель</p>
                  <p className="text-lg font-black text-teal-300">{(goal.target_amount / 1000000).toFixed(2)}M</p>
                </div>
              </div>

              <div className="grid grid-flow-col gap-2 items-center justify-start mb-4 px-3 py-2 bg-gradient-to-r from-teal-500/20 to-cyan-600/20 rounded-xl">
                <Zap className="text-teal-400" size={16} />
                <p className="text-sm text-teal-200 font-bold">
                  {(goal.monthly_needed / 1000).toFixed(0)}K ₸/месяц
                </p>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input 
                  type="number" 
                  placeholder="Обновить сумму" 
                  defaultValue={goal.current_savings} 
                  id={`savings-${goal.id}`} 
                  className="px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all text-sm" 
                />
                <button 
                  onClick={() => { 
                    const input = document.getElementById(`savings-${goal.id}`); 
                    onUpdateGoal(goal.id, parseFloat(input.value)); 
                  }} 
                  className="px-5 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl text-white font-bold hover:shadow-lg hover:shadow-teal-500/50 transition-all"
                >
                  ✓
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== CHAT VIEW =====
function ChatView({ messages, onSendMessage, loading, chatEndRef }) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Ваш браузер не поддерживает голосовой ввод. Используйте Chrome или Edge.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.language = 'ru-RU';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  return (
    <div className="relative group animate-fadeIn">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl blur-2xl opacity-30" />
      <div className="relative h-[700px] grid grid-rows-[auto_1fr_auto] backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-teal-500/20 to-cyan-600/20">
          <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-2xl grid place-items-center">
              <MessageCircle className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-black text-lg">AI Ассистент</h3>
              <p className="text-teal-200 text-xs">Всегда на связи</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="grid place-items-center h-full text-center">
              <div>
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-3xl grid place-items-center animate-pulse">
                  <MessageCircle size={40} className="text-white" />
                </div>
                <h4 className="text-white font-bold text-xl mb-2">Начните разговор</h4>
                <p className="text-white/70">Спросите о целях, финансах или получите совет</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`grid ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`group relative max-w-xs md:max-w-md ${
                  msg.role === 'user' ? '' : 'grid grid-cols-[auto_1fr] items-start gap-3'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl grid place-items-center flex-shrink-0">
                      <Zap className="text-white" size={20} />
                    </div>
                  )}
                  <div className={`px-5 py-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/50'
                      : 'backdrop-blur-xl bg-white/10 text-white border border-white/20'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="grid justify-start animate-slideUp">
              <div className="grid grid-cols-[auto_1fr] items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl grid place-items-center animate-pulse">
                  <Zap className="text-white" size={20} />
                </div>
                <div className="backdrop-blur-xl bg-white/10 px-5 py-4 rounded-2xl border border-white/20">
                  <div className="grid grid-flow-col gap-2 w-fit">
                    <div className="w-3 h-3 bg-teal-400 rounded-full animate-bounce" />
                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/20 bg-gradient-to-r from-teal-500/10 to-cyan-600/10">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Напишите сообщение..."
              className="px-5 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all"
            />
            <button 
              onClick={handleVoiceInput} 
              disabled={isListening} 
              className={`px-5 py-4 rounded-2xl transition-all ${
                isListening 
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse' 
                  : 'backdrop-blur-xl bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              <Mic size={24} />
            </button>
            <button 
              onClick={handleSend} 
              disabled={loading || !input.trim()} 
              className="group relative px-6 py-4 rounded-2xl font-bold text-white overflow-hidden disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 transition-transform group-hover:scale-105" />
              <Send size={24} className="relative" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== PRODUCTS VIEW =====
function ProductsView() {
  const products = [
    { 
      id: 1, 
      name: 'Выгодный', 
      type: 'Депозит', 
      yield: 17, 
      min: 500000, 
      desc: '17% годовых, 3-12 месяцев',
      color: 'from-teal-500 to-cyan-600',
      icon: TrendingUp
    },
    { 
      id: 2, 
      name: 'Овернайт', 
      type: 'Депозит', 
      yield: 12, 
      min: 1000000, 
      desc: '12% годовых, 1-12 месяцев',
      color: 'from-purple-500 to-pink-600',
      icon: Award
    },
    { 
      id: 3, 
      name: 'Беззалоговый кредит', 
      type: 'Кредит', 
      yield: null, 
      min: 100000, 
      desc: 'До 10M ₸, 3-60 месяцев',
      color: 'from-orange-500 to-red-600',
      icon: Zap
    },
    { 
      id: 4, 
      name: 'Бизнес карта', 
      type: 'Карта', 
      yield: null, 
      min: 100000, 
      desc: 'До 10M ₸ лимит, кэшбэк до 1%',
      color: 'from-green-500 to-emerald-600',
      icon: Target
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black text-white mb-4">Банковские продукты</h1>
        <p className="text-xl text-teal-200">Выбирайте лучшие решения для ваших целей</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product, idx) => {
          const Icon = product.icon;
          return (
            <div 
              key={product.id} 
              className="group relative"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${product.color} rounded-3xl blur-2xl opacity-40 group-hover:opacity-70 transition-opacity`} />
              <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 hover:border-white/40 transition-all transform hover:-translate-y-2 hover:shadow-2xl">
                <div className={`w-16 h-16 bg-gradient-to-r ${product.color} rounded-2xl grid place-items-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="text-white" size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-white mb-2">{product.name}</h3>
                <p className="text-sm text-teal-200/80 mb-4">{product.type}</p>
                
                {product.yield && (
                  <div className={`mb-4 p-4 bg-gradient-to-r ${product.color} bg-opacity-20 rounded-2xl border border-white/20`}>
                    <p className="text-xs text-white/70 mb-1">Доходность</p>
                    <p className="text-4xl font-black text-white">{product.yield}%</p>
                  </div>
                )}
                
                <p className="text-sm text-white/80 mb-4">{product.desc}</p>
                <p className="text-xs text-teal-300 font-bold mb-6">от {(product.min / 1000).toFixed(0)}K ₸</p>
                
                <button className="w-full group/btn relative px-6 py-3 rounded-2xl font-bold text-white overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-r ${product.color} transition-transform group-hover/btn:scale-105`} />
                  <span className="relative grid grid-flow-col gap-2 items-center justify-center">
                    <span>Подробнее</span>
                    <ArrowRight size={20} />
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== ANALYZE VIEW =====
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black text-white mb-4">Анализ расходов</h1>
        <p className="text-xl text-teal-200">AI-powered финансовая аналитика</p>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl blur-2xl opacity-30" />
        <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20">
          <div className="space-y-6">
            <div>
              <label className="text-white font-bold mb-4 grid grid-flow-col gap-2 w-fit items-center">
                <Upload className="text-teal-400" />
                <span>Загрузите CSV с транзакциями</span>
              </label>
              <div className="relative group/upload cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl blur-xl opacity-0 group-hover/upload:opacity-50 transition-opacity" />
                <div className="relative backdrop-blur-xl bg-white/5 border-2 border-dashed border-white/30 rounded-2xl p-8 text-center hover:border-teal-400 transition-all">
                  <Upload size={48} className="text-teal-400 mx-auto mb-4 group-hover/upload:scale-110 transition-transform" />
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files?.[0])}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer block">
                    <p className="text-white font-bold text-lg mb-2">
                      {file ? `📄 ${file.name}` : 'Выберите CSV файл'}
                    </p>
                    <p className="text-white/50 text-sm">или перетащите файл сюда</p>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-white font-bold mb-4">
                💰 Месячный доход (₸)
              </label>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="500000"
                className="w-full px-6 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white text-lg placeholder-white/50 focus:border-teal-400 focus:outline-none transition-all"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full group/btn relative px-8 py-5 rounded-2xl font-black text-xl text-white overflow-hidden disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 transition-transform group-hover/btn:scale-105" />
              <span className="relative grid grid-flow-col gap-3 items-center justify-center">
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Анализирую...</span>
                  </>
                ) : (
                  <>
                    <Zap size={28} />
                    <span>Анализировать расходы</span>
                  </>
                )}
              </span>
            </button>
          </div>

          {result && (
            <div className="mt-8 pt-8 border-t border-white/20 space-y-6 animate-slideUp">
              <h2 className="text-3xl font-black text-white mb-6 grid grid-flow-col gap-3 w-fit items-center">
                <TrendingUp className="text-teal-400" />
                <span>Результаты анализа</span>
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/20">
                  <p className="text-white/70 text-sm mb-2">Всего расходов</p>
                  <p className="text-4xl font-black text-white">{(result.total_spending / 1000000).toFixed(2)}M ₸</p>
                </div>
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/20">
                  <p className="text-white/70 text-sm mb-2">Транзакций</p>
                  <p className="text-4xl font-black text-teal-300">{result.total_transactions}</p>
                </div>
              </div>
              
              {result.categories && (
                <div>
                  <h3 className="text-xl font-black text-white mb-4">📊 Категории расходов</h3>
                  <div className="space-y-3">
                    {result.categories.map((cat, idx) => (
                      <div 
                        key={idx} 
                        className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/20"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="grid grid-cols-[1fr_auto] items-center gap-4 mb-3">
                          <span className="text-white font-bold">{cat.category}</span>
                          <span className="text-teal-300 font-black text-lg">{cat.pct}%</span>
                        </div>
                        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 rounded-full shadow-lg transition-all duration-1000"
                            style={{ width: `${cat.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.advice && (
                <div className="backdrop-blur-xl bg-gradient-to-r from-teal-500/20 to-cyan-600/20 rounded-2xl p-6 border border-teal-400/30">
                  <h3 className="text-xl font-black text-white mb-4 grid grid-flow-col gap-2 w-fit items-center">
                    <Zap className="text-teal-400" />
                    <span>AI Советы по экономии</span>
                  </h3>
                  <div className="space-y-3">
                    {result.advice.map((tip, idx) => (
                      <div 
                        key={idx} 
                        className="grid grid-cols-[auto_1fr] gap-3 text-white/90"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <span className="text-teal-400 font-black text-lg">✓</span>
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
    </div>
  );
}