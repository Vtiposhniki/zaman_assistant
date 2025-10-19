import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Menu, X, MessageCircle, Upload, TrendingUp, Target, Award, Zap, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

class ZamanAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async health() {
    try {
      const response = await fetch(`${this.baseURL}/goals?user_id=1`);
      if (response.ok) return { status: 'healthy' };
      return null;
    } catch { return null; }
  }

  async getGoals(userId) {
    try {
      const response = await fetch(`${this.baseURL}/goals?user_id=${userId}`);
      return await response.json();
    } catch (err) {
      return { goals: [] };
    }
  }

  async createGoal(goalData) {
    const response = await fetch(`${this.baseURL}/goals/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData)
    });
    return await response.json();
  }

  async updateGoal(goalId, data) {
    const params = new URLSearchParams();
    if (data.current_savings !== undefined) params.append('current_savings', data.current_savings);
    if (data.status) params.append('status', data.status);
    
    const response = await fetch(`${this.baseURL}/goals/${goalId}?${params}`, { method: 'PUT' });
    return await response.json();
  }

  async analyzeExpenses(file, userId, income) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('monthly_income', income);

    const response = await fetch(`${this.baseURL}/analyze_expenses`, {
      method: 'POST',
      body: formData
    });
    return await response.json();
  }
}

export default function App() {
  const [chatMode, setChatMode] = useState('mentor');
  const [view, setView] = useState('chat');
  const [userId] = useState(1);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState({ status: 'healthy' });

  const api = useRef(new ZamanAPI());
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const data = await api.current.getGoals(userId);
    setGoals(data.goals || []);
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
              }}>Z</div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D9A86', margin: 0, letterSpacing: '0.5px' }}>ZAMAN</h1>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, fontWeight: '500' }}>Financial Assistant</p>
              </div>
            </div>

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
                      transition: 'all 0.2s'
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

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
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {view === 'dashboard' && <DashboardView goals={goals} health={health} />}
        {view === 'goals' && <GoalsView goals={goals} onCreateGoal={handleCreateGoal} onUpdateGoal={handleUpdateGoal} loading={loading} />}
        {view === 'chat' && <ChatView chatEndRef={chatEndRef} chatMode={chatMode} setChatMode={setChatMode} />}
        {view === 'products' && <ProductsView />}
        {view === 'analyze' && <AnalyzeView userId={userId} api={api.current} />}
      </main>
    </div>
  );
}

function ChatView({ chatEndRef, chatMode, setChatMode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Ошибка доступа к микрофону:', err);
      alert('Не удалось получить доступ к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('user_id', '1');
      formData.append('language', 'ru');

      const response = await fetch('http://localhost:8000/audio/message', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.transcription) {
        setMessages(prev => [...prev, { role: 'user', content: data.transcription }]);
      }
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        
        if (voiceEnabled) {
          await speakText(data.reply);
        }
      }
    } catch (err) {
      console.error('Ошибка обработки аудио:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка обработки голосового сообщения' }]);
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text) => {
    try {
      setIsSpeaking(true);
      const response = await fetch('http://localhost:8000/audio/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: 'alloy',
          speed: 1.0
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };
          await audioRef.current.play();
        }
      }
    } catch (err) {
      console.error('Ошибка озвучивания:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMsg }],
          user_id: 1
        })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      
      if (voiceEnabled && data.reply) {
        await speakText(data.reply);
      }
    } catch (err) {
      console.error('Error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка подключения' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const modeIcons = {
    mentor: '🧘',
    analyst: '💼',
    friend: '💬',
    tech: '🤖'
  };

  const modeNames = {
    mentor: 'Финансовый ментор',
    analyst: 'Финансовый аналитик',
    friend: 'Дружелюбный ассистент',
    tech: 'Технический эксперт'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '2rem',
      padding: '2rem',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 10px 30px rgba(45, 154, 134, 0.1)',
        height: 'fit-content',
        position: 'sticky',
        top: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '60px',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 30px rgba(45, 154, 134, 0.2)'
          }}>
            {modeIcons[chatMode] || '🧘'}
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
            Zaman Assistant
          </h2>
          <p style={{ fontSize: '14px', color: '#2D9A86', fontWeight: '600', margin: 0 }}>
            {modeNames[chatMode] || 'Финансовый ментор'}
          </p>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Режим общения
          </h3>
          <select
            value={chatMode}
            onChange={(e) => setChatMode(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #d1e5e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2D9A86',
              background: '#f9fdfb',
              cursor: 'pointer'
            }}
          >
            <option value="mentor">🧘 Ментор</option>
            <option value="analyst">💼 Аналитик</option>
            <option value="friend">💬 Друг</option>
            <option value="tech">🤖 Технарь</option>
          </select>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9f7', borderRadius: '8px', borderLeft: '4px solid #2D9A86' }}>
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
            💡 <strong>Совет:</strong> Используйте микрофон для голосовых сообщений. Ассистент автоматически озвучит ответ.
          </p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        height: '85vh'
      }}>
        <div style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
          color: 'white',
          borderBottom: '3px solid #258170'
        }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            Начните разговор
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            {isRecording ? '🎤 Запись голоса...' : isSpeaking ? '🔊 Озвучивание...' : 'Введите вопрос или используйте микрофон'}
          </p>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          background: 'linear-gradient(to bottom, #ffffff, #f9fdfb)'
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              color: '#9ca3af'
            }}>
              <div>
                <div style={{ fontSize: '64px', marginBottom: '1rem' }}>💬</div>
                <p style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                  Ещё нет сообщений
                </p>
                <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                  Напишите текст или нажмите на микрофон 🎤
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'slideIn 0.3s ease'
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '1.2rem 1.5rem',
                  borderRadius: '14px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #2D9A86, #14b8a6)'
                    : '#f0f9f7',
                  color: msg.role === 'user' ? 'white' : '#111827',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  boxShadow: msg.role === 'user'
                    ? '0 8px 20px rgba(45, 154, 134, 0.2)'
                    : '0 4px 12px rgba(45, 154, 134, 0.08)',
                  border: msg.role === 'user' ? 'none' : '2px solid #d1e5e0'
                }}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
              <div style={{ width: '12px', height: '12px', background: '#2D9A86', borderRadius: '50%', animation: 'bounce 1.4s infinite' }} />
              <div style={{ width: '12px', height: '12px', background: '#2D9A86', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.2s' }} />
              <div style={{ width: '12px', height: '12px', background: '#2D9A86', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.4s' }} />
              <span style={{ marginLeft: '0.5rem', fontSize: '14px' }}>
                {isRecording ? 'Распознаю речь...' : 'Ассистент думает...'}
              </span>
            </div>
          )}
          {isSpeaking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2D9A86', fontSize: '14px' }}>
              <Volume2 size={16} style={{ animation: 'pulse 1s infinite' }} />
              <span>Озвучиваю ответ...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{
          padding: '1.5rem 2rem',
          background: '#f9fdfb',
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (isSpeaking) stopSpeaking();
            }}
            style={{
              padding: '1rem',
              background: voiceEnabled ? '#2D9A86' : '#e5e7eb',
              color: voiceEnabled ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={voiceEnabled ? 'Отключить озвучку' : 'Включить озвучку'}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            disabled={loading}
            style={{
              padding: '1rem',
              background: isRecording ? '#ef4444' : '#2D9A86',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none',
              opacity: loading ? 0.6 : 1
            }}
            title={isRecording ? 'Остановить запись' : 'Начать запись'}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && !isRecording && sendMessage()}
            placeholder="Введите ваш вопрос..."
            disabled={loading || isRecording}
            style={{
              flex: 1,
              padding: '1rem',
              border: '2px solid #d1e5e0',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: '#ffffff',
              fontFamily: 'inherit',
              transition: 'all 0.3s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              opacity: (loading || isRecording) ? 0.6 : 1,
              cursor: (loading || isRecording) ? 'not-allowed' : 'text'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || isRecording}
            style={{
              padding: '1rem 2rem',
              background: (loading || !input.trim() || isRecording) ? '#9ca3af' : 'linear-gradient(135deg, #2D9A86, #14b8a6)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: (loading || !input.trim() || isRecording) ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '16px',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(45, 154, 134, 0.2)',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? '...' : '↑'}
          </button>
        </div>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
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
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '2.5rem' }}>Дашборд</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard label="Активных целей" value={activeGoals.length} icon="🎯" color="#2D9A86" />
        <StatCard label="Накоплено" value={`${(totalSaved / 1000000).toFixed(1)}M ₸`} icon="💰" color="#EEFF6D" />
        <StatCard label="Целевая сумма" value={`${(totalTarget / 1000000).toFixed(1)}M ₸`} icon="🎪" color="#2D9A86" />
        <StatCard label="Статус" value={health?.status === 'healthy' ? '🟢 Online' : '🔴 Offline'} icon="📡" color="#2D9A86" />
      </div>

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
      />
    </div>
  );
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
            }}>
              Подробнее →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyzeView({ userId, api }) {
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
      </div>

      {result && (
        <div style={{
          marginTop: '2rem',
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem' }}>
            📊 Результаты анализа
          </h2>
          <pre style={{ 
            background: '#f9fdfb', 
            padding: '1.5rem', 
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#374151'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 