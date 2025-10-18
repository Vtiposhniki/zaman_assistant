// # ===== STRESS TEST =====
// # File: infra/load-tests/stress-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 200 },   // Increase
    { duration: '5m', target: 200 },   // Stay at 200
    { duration: '2m', target: 300 },   // Spike
    { duration: '5m', target: 300 },   // Stay at 300
    { duration: '2m', target: 400 },   // Breaking point
    { duration: '5m', target: 400 },   // Stay at 400
    { duration: '5m', target: 0 },     // Ramp down
  ],
  
  thresholds: {
    'http_req_duration': ['p(99)<5000'],
    'http_req_failed': ['rate<0.1'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'https://staging.zamanbank.kz';

export default function() {
  const responses = http.batch([
    ['GET', `${BASE_URL}/health`],
    ['GET', `${BASE_URL}/products`],
    ['GET', `${BASE_URL}/stats/dashboard`],
  ]);
  
  responses.forEach((res) => {
    check(res, {
      'status is 200': (r) => r.status === 200,
    });
  });
  
  sleep(1);
}