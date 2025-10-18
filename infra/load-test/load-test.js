// # ===== K6 LOAD TEST SCRIPT =====
// # File: infra/load-tests/load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  
  thresholds: {
    'http_req_duration': ['p(95)<2000'],  // 95% of requests < 2s
    'http_req_failed': ['rate<0.05'],     // Error rate < 5%
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'https://staging.zamanbank.kz';

export default function() {
  // Test 1: Health Check
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status 200': (r) => r.status === 200,
  });
  requestCount.add(1);
  errorRate.add(healthRes.status !== 200);
  responseTime.add(healthRes.timings.duration);

  sleep(1);

  // Test 2: List Products
  let productsRes = http.get(`${BASE_URL}/products`);
  check(productsRes, {
    'products status 200': (r) => r.status === 200,
    'products response time OK': (r) => r.timings.duration < 1000,
  });
  requestCount.add(1);
  errorRate.add(productsRes.status !== 200);
  responseTime.add(productsRes.timings.duration);

  sleep(2);

  // Test 3: Create Goal
  const goalPayload = JSON.stringify({
    name: 'Load Test Goal',
    target_amount: 1000000,
    current_savings: 100000,
    target_date: '2026-12-31',
    income: 500000,
    expenses: 300000,
  });

  const goalHeaders = { 'Content-Type': 'application/json' };
  let goalRes = http.post(`${BASE_URL}/goals/create`, goalPayload, {
    headers: goalHeaders,
  });
  
  check(goalRes, {
    'create goal status 200': (r) => r.status === 200,
    'goal has id': (r) => JSON.parse(r.body).goal_id !== undefined,
  });
  requestCount.add(1);
  errorRate.add(goalRes.status !== 200);
  responseTime.add(goalRes.timings.duration);

  sleep(2);

  // Test 4: Chat Request
  const chatPayload = JSON.stringify({
    messages: [
      { role: 'user', content: 'Какой депозит выбрать?' }
    ],
  });

  let chatRes = http.post(`${BASE_URL}/chat`, chatPayload, {
    headers: goalHeaders,
  });
  
  check(chatRes, {
    'chat status 200': (r) => r.status === 200,
    'chat has reply': (r) => JSON.parse(r.body).reply !== undefined,
  });
  requestCount.add(1);
  errorRate.add(chatRes.status !== 200);
  responseTime.add(chatRes.timings.duration);

  sleep(3);

  // Test 5: Get Dashboard Stats
  let statsRes = http.get(`${BASE_URL}/stats/dashboard`);
  check(statsRes, {
    'stats status 200': (r) => r.status === 200,
  });
  requestCount.add(1);
  errorRate.add(statsRes.status !== 200);
  responseTime.add(statsRes.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}