import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Menu, X, MessageCircle, Upload, Mic } from 'lucide-react';

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

  async recommend(params) {
    try {
      const response = await fetch(`${this.baseURL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
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
    { id: 'dashboard', label: '📊 Дашборд' },
    { id: 'goals', label: '🎯 Цели' },
    { id: 'chat', label: '💬 Чат' },
    { id: 'products', label: '🏦 Продукты' },
    { id: 'analyze', label: '📈 Анализ' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-teal-100 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Zaman
            </h1>
          </div>

          <nav className="hidden md:flex gap-4">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === item.id
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t bg-white p-3 flex flex-col gap-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setMenuOpen(false);
                }}
                className="text-left px-4 py-2 hover:bg-gray-100 rounded-lg text-sm"
              >
                {item.label}
              </button>
            ))}
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
    </div>
  );
}

// ===== DASHBOARD VIEW =====
function DashboardView({ goals, health }) {
  const activeGoals = goals.filter(g => g.status === 'active');
  const totalSaved = activeGoals.reduce((sum, g) => sum + (g.current_savings || 0), 0);
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.target_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Активных целей', value: activeGoals.length, icon: '🎯' },
          { label: 'Накоплено', value: `${(totalSaved / 1000000).toFixed(1)}M`, icon: '💰' },
          { label: 'Целевая сумма', value: `${(totalTarget / 1000000).toFixed(1)}M`, icon: '🚀' },
          { label: 'API Status', value: health?.status === 'healthy' ? '✅ OK' : '❌ Down', icon: '⚙️' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-teal-500">
            <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
            <div className="text-3xl mt-4">{stat.icon}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Последние цели</h2>
        {activeGoals.length === 0 ? (
          <p className="text-gray-500">Цели не созданы. Начните с первой цели!</p>
        ) : (
          <div className="space-y-3">
            {activeGoals.slice(0, 5).map(goal => (
              <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{goal.name}</h4>
                  <div className="w-full h-2 bg-gray-300 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-600"
                      style={{ width: `${goal.progress_percent}%` }}
                    />
                  </div>
                </div>
                <p className="ml-4 text-sm font-semibold text-teal-600">{goal.progress_percent}%</p>
              </div>
            ))}
          </div>
        )}
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Мои цели</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-3 rounded-lg hover:shadow-lg"
        >
          <Plus size={20} />
          Создать цель
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-teal-500">
          <h2 className="text-2xl font-bold mb-6">Новая цель</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Название" 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500" 
                required 
              />
              <input 
                type="number" 
                placeholder="Целевая сумма (KZT)" 
                value={form.target_amount} 
                onChange={(e) => setForm({...form, target_amount: e.target.value})} 
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500" 
                required 
              />
              <input 
                type="number" 
                placeholder="Текущие накопления" 
                value={form.current_savings} 
                onChange={(e) => setForm({...form, current_savings: e.target.value})} 
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500" 
              />
              <input 
                type="date" 
                value={form.target_date} 
                onChange={(e) => setForm({...form, target_date: e.target.value})} 
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500" 
                required 
              />
              <input 
                type="number" 
                placeholder="Доход/месяц" 
                value={form.income} 
                onChange={(e) => setForm({...form, income: e.target.value})} 
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500" 
              />
              <input 
                type="number" 
                placeholder="Расходы/месяц" 
                value={form.expenses} 
                onChange={(e) => setForm({...form, expenses: e.target.value})} 
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500" 
              />
            </div>
            <select 
              value={form.goal_type} 
              onChange={(e) => setForm({...form, goal_type: e.target.value})} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
            >
              <option value="">Тип цели</option>
              <option value="образование">📚 Образование</option>
              <option value="авто">🚗 Автомобиль</option>
              <option value="путешествие">✈️ Путешествие</option>
              <option value="жилье">🏠 Жилье</option>
              <option value="здоровье">💊 Здоровье</option>
            </select>
            <div className="flex gap-4 pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 rounded-lg hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Создание...' : '✨ Создать цель'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {goals.filter(g => g.status === 'active').map(goal => (
          <div key={goal.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-teal-500">
            <h3 className="text-xl font-bold text-gray-900">{goal.name}</h3>
            <p className="text-sm text-gray-600 mt-1">Срок: {new Date(goal.target_date).toLocaleDateString('ru-RU')}</p>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-700 font-medium">Прогресс</span>
                <span className="text-teal-600 font-bold">{goal.progress_percent}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-600" 
                  style={{ width: `${goal.progress_percent}%` }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-600">Накоплено</p>
                <p className="text-lg font-bold">{(goal.current_savings / 1000000).toFixed(1)}M KZT</p>
              </div>
              <div>
                <p className="text-gray-600">Цель</p>
                <p className="text-lg font-bold">{(goal.target_amount / 1000000).toFixed(1)}M KZT</p>
              </div>
            </div>

            <p className="text-sm text-cyan-600 font-semibold mt-3">Откладывать: {(goal.monthly_needed / 1000).toFixed(0)}K KZT/мес</p>

            <div className="mt-4 flex gap-2">
              <input 
                type="number" 
                placeholder="Обновить" 
                defaultValue={goal.current_savings} 
                id={`savings-${goal.id}`} 
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" 
              />
              <button 
                onClick={() => { 
                  const input = document.getElementById(`savings-${goal.id}`); 
                  onUpdateGoal(goal.id, parseFloat(input.value)); 
                }} 
                className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600"
              >
                ✓
              </button>
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
    <div className="h-[600px] flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageCircle size={48} className="text-teal-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Начните разговор с AI ассистентом</p>
              <p className="text-sm text-gray-500 mt-2">Спросите о целях, финансах или анализе расходов</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-900 rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-3 rounded-lg rounded-bl-none">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Расскажите о ваших финансовых целях..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
          />
          <button 
            onClick={handleVoiceInput} 
            disabled={isListening} 
            className={`px-4 py-3 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <Mic size={20} />
          </button>
          <button 
            onClick={handleSend} 
            disabled={loading || !input.trim()} 
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== PRODUCTS VIEW =====
function ProductsView() {
  const products = [
    { id: 'prod_5', name: 'Выгодный', type: 'Депозит', yield: 17, min: 500000, desc: '17% годовых, 3-12 месяцев' },
    { id: 'prod_4', name: 'Овернайт', type: 'Депозит', yield: 12, min: 1000000, desc: '12% годовых, 1-12 месяцев' },
    { id: 'prod_2', name: 'Беззалоговый кредит', type: 'Кредит', yield: null, min: 100000, desc: 'До 10M KZT, 3-60 месяцев' },
    { id: 'prod_1', name: 'Бизнес карта', type: 'Карта', yield: null, min: 100000, desc: 'До 10M KZT лимит, кэшбэк до 1%' }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Банковские продукты</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-lg transition-all border-t-4 border-teal-500">
            <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
            <p className="text-xs text-gray-600 mt-1">{product.type}</p>
            {product.yield && (
              <div className="mt-3 p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg">
                <p className="text-xs text-gray-600">Доходность</p>
                <p className="text-2xl font-bold text-teal-600">{product.yield}%</p>
              </div>
            )}
            <p className="text-sm text-gray-600 mt-3">{product.desc}</p>
            <p className="text-xs text-gray-500 mt-2">от {(product.min / 1000).toFixed(0)}K KZT</p>
            <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg text-sm hover:shadow-lg transition-all">
              Подробнее
            </button>
          </div>
        ))}
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Анализ расходов</h1>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Загрузите CSV с транзакциями
            </label>
            <div className="border-2 border-dashed border-teal-300 rounded-lg p-6 text-center hover:border-teal-500 cursor-pointer">
              <Upload size={32} className="text-teal-500 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <p className="text-gray-700 font-medium">{file ? file.name : 'Выберите файл CSV'}</p>
                <p className="text-sm text-gray-500">или перетащите сюда</p>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Месячный доход (KZT)
            </label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="500000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
          >
            {loading ? 'Анализирую...' : '📊 Анализировать расходы'}
          </button>
        </div>

        {result && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Результаты анализа</h2>
            <div className="space-y-4">
              <p className="text-lg text-gray-700"><strong>Всего расходов:</strong> {(result.total_spending / 1000000).toFixed(2)}M KZT</p>
              <p className="text-lg text-gray-700"><strong>Транзакций:</strong> {result.total_transactions}</p>
              
              {result.categories && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Категории расходов:</h3>
                  <div className="space-y-2">
                    {result.categories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{cat.category}</span>
                        <div className="flex items-center gap-4">
                          <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-cyan-600"
                              style={{ width: `${cat.pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-12 text-right">{cat.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.advice && (
                <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                  <h3 className="font-semibold text-gray-900 mb-2">💡 Советы по экономии:</h3>
                  <ul className="space-y-2">
                    {result.advice.map((tip, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex gap-2">
                        <span className="text-teal-600 font-bold">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}