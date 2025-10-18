// # ===== SPIKE TEST =====
// # File: infra/load-tests/spike-test.js

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },    // Normal load
    { duration: '1m', target: 10 },     // Stay normal
    { duration: '10s', target: 1000 },  // SPIKE!
    { duration: '3m', target: 1000 },   // Stay at spike
    { duration: '10s', target: 10 },    // Return to normal
    { duration: '3m', target: 10 },     // Recover
    { duration: '10s', target: 0 },     // Ramp down
  ],
};

const BASE_URL = __ENV.TARGET_URL || 'https://staging.zamanbank.kz';

export default function() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 3000,
  });
}