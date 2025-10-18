# ===== PERFORMANCE MONITORING SCRIPT =====
# File: infra/scripts/monitor-performance.sh

#!/bin/bash
# Real-time performance monitoring

set -e

API_URL="${API_URL:-https://staging.zamanbank.kz}"
DURATION="${DURATION:-300}"
INTERVAL="${INTERVAL:-5}"

echo "🔍 Starting performance monitoring..."
echo "Target: $API_URL"
echo "Duration: ${DURATION}s"
echo "Interval: ${INTERVAL}s"
echo ""

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))

# Create results directory
RESULTS_DIR="performance-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "timestamp,response_time,status_code,endpoint" > "$RESULTS_DIR/metrics.csv"

while [ $(date +%s) -lt $END_TIME ]; do
  TIMESTAMP=$(date +%s)
  
  # Test health endpoint
  HEALTH_START=$(date +%s%3N)
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
  HEALTH_END=$(date +%s%3N)
  HEALTH_TIME=$((HEALTH_END - HEALTH_START))
  
  echo "$TIMESTAMP,$HEALTH_TIME,$HEALTH_STATUS,/health" >> "$RESULTS_DIR/metrics.csv"
  
  # Test products endpoint
  PRODUCTS_START=$(date +%s%3N)
  PRODUCTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/products")
  PRODUCTS_END=$(date +%s%3N)
  PRODUCTS_TIME=$((PRODUCTS_END - PRODUCTS_START))
  
  echo "$TIMESTAMP,$PRODUCTS_TIME,$PRODUCTS_STATUS,/products" >> "$RESULTS_DIR/metrics.csv"
  
  # Test stats endpoint
  STATS_START=$(date +%s%3N)
  STATS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/stats/dashboard")
  STATS_END=$(date +%s%3N)
  STATS_TIME=$((STATS_END - STATS_START))
  
  echo "$TIMESTAMP,$STATS_TIME,$STATS_STATUS,/stats/dashboard" >> "$RESULTS_DIR/metrics.csv"
  
  # Print real-time stats
  echo "[$(date +'%H:%M:%S')] Health: ${HEALTH_TIME}ms | Products: ${PRODUCTS_TIME}ms | Stats: ${STATS_TIME}ms"
  
  sleep $INTERVAL
done

echo ""
echo "✅ Monitoring complete!"
echo "📊 Results saved to: $RESULTS_DIR/"

# Generate summary
python3 << EOF
import pandas as pd
import numpy as np

df = pd.read_csv('$RESULTS_DIR/metrics.csv')

print("\n" + "="*60)
print("PERFORMANCE SUMMARY")
print("="*60)

for endpoint in df['endpoint'].unique():
    endpoint_data = df[df['endpoint'] == endpoint]
    print(f"\n{endpoint}:")
    print(f"  Requests: {len(endpoint_data)}")
    print(f"  Avg Response Time: {endpoint_data['response_time'].mean():.2f}ms")
    print(f"  P50: {endpoint_data['response_time'].quantile(0.5):.2f}ms")
    print(f"  P95: {endpoint_data['response_time'].quantile(0.95):.2f}ms")
    print(f"  P99: {endpoint_data['response_time'].quantile(0.99):.2f}ms")
    print(f"  Max: {endpoint_data['response_time'].max():.2f}ms")
    print(f"  Success Rate: {(endpoint_data['status_code'] == 200).sum() / len(endpoint_data) * 100:.2f}%")

print("\n" + "="*60)
EOF

echo ""
echo "📈 View detailed metrics: $RESULTS_DIR/metrics.csv"