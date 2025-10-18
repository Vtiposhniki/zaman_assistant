// ============================================================
// 📁 src/components/Analytics/AnalyticsView.jsx
// ============================================================
import React, { useState, useRef } from 'react';
import { Upload, FileText, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

export const AnalyticsView = ({ analyticsService, userId }) => {
  const [file, setFile] = useState(null);
  const [income, setIncome] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      alert('Пожалуйста, выберите CSV файл');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !income) {
      alert('Пожалуйста, выберите файл и укажите доход');
      return;
    }

    setLoading(true);
    try {
      const result = await analyticsService.analyzeExpenses(file, userId, parseFloat(income));
      setResults(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Ошибка анализа файла');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setIncome('');
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
        Анализ расходов
      </h1>
      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '2.5rem' }}>
        Загрузите CSV файл с вашими расходами для получения детального анализа
      </p>

      {!results ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
            Загрузка данных
          </h2>

          <div
            style={{
              border: `2px dashed ${dragActive ? '#2D9A86' : '#d1e5e0'}`,
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
              background: dragActive ? '#f0f9f7' : '#ffffff'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} style={{ color: '#2D9A86', marginBottom: '1rem' }} />
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              {file ? file.name : 'Перетащите CSV файл сюда или нажмите для выбора'}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Поддерживаются только CSV файлы с колонками: дата, сумма, категория, описание
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            style={{ display: 'none' }}
          />

          <div style={{ marginTop: '2rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Месячный доход (₸)
            </label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="Введите ваш месячный доход"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              onClick={handleAnalyze}
              disabled={!file || !income || loading}
              style={{
                flex: 1,
                padding: '0.85rem',
                background: (!file || !income || loading) ? '#9ca3af' : 'linear-gradient(135deg, #2D9A86, #14b8a6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: (!file || !income || loading) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
                opacity: (!file || !income || loading) ? 0.5 : 1
              }}
            >
              {loading ? 'Анализирую...' : 'Анализировать расходы'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                Результаты анализа
              </h2>
              <button
                onClick={resetForm}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f0f9f7',
                  color: '#2D9A86',
                  border: '1px solid #d1e5e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Новый анализ
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f9f7', borderRadius: '8px' }}>
                <DollarSign size={24} style={{ color: '#2D9A86', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.25rem' }}>Общие расходы</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                  {results.total_expenses ? `${(results.total_expenses / 1000000).toFixed(1)}M ₸` : 'N/A'}
                </p>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f9f7', borderRadius: '8px' }}>
                <TrendingUp size={24} style={{ color: '#2D9A86', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '0.25rem' }}>Экономия</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                  {results.savings_rate ? `${results.savings_rate}%` : 'N/A'}
                </p>
              </div>
            </div>

            {results.categories && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                  Расходы по категориям
                </h3>
                {Object.entries(results.categories).map(([category, amount]) => (
                  <div key={category} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: '#f9fdfb',
                    borderRadius: '6px',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {category}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2D9A86' }}>
                      {(amount / 1000000).toFixed(1)}M ₸
                    </span>
                  </div>
                ))}
              </div>
            )}

            {results.advice && (
              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f0fdfa, #f0f9ff)',
                borderRadius: '8px',
                border: '1px solid #a7f3d0'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                  💡 Рекомендации
                </h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {results.advice.map((item, index) => (
                    <li key={index} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      fontSize: '14px',
                      color: '#374151'
                    }}>
                      <span style={{ color: '#2D9A86', fontWeight: 'bold' }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
