// ============================================================
// 📁 src/components/Products/ProductsView.jsx
// ============================================================
import React from 'react';

export const ProductsView = () => {
  const products = [
    { name: 'Финансирования', type: 'Онлайн', yield: 17, min: 60000, desc: '17% годовых, 3-60 мес' },
    { name: 'Вакала Zaman', type: 'Агентский депозит', yield: 12, min: 50000, desc: 'до 20% годовых, 3-36 мес' },
    { name: 'Карты', type: 'Виртуальная карта', yield: null, min: 0, desc: 'срок работы 3 года' },
    { name: 'Для корпоративных клиентов', type: 'Онлайн-банк', yield: null, min: 100000, desc: 'Лимит до 10M ₸' }
  ];

  return (
    <div>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
        Банковские продукты
      </h1>
      <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '2.5rem' }}>
        Выбирайте лучшие решения для ваших целей
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {products.map((product, idx) => (
          <div 
            key={idx} 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.8rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(45, 154, 134, 0.08)',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(45, 154, 134, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(45, 154, 134, 0.08)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem' }}>
                  {product.name}
                </h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {product.type}
                </p>
              </div>
              {product.yield && (
                <div style={{
                  background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {product.yield}%
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0.5rem' }}>
                {product.desc}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Мин. сумма: {(product.min / 1000000).toFixed(1)}M ₸
              </p>
            </div>
            
            <button style={{
              width: '100%',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #2D9A86, #14b8a6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              Подробнее
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};