import json
import sys

def check_thresholds(results_file):
    """Check if performance thresholds are met"""
    with open(results_file, 'r') as f:
        data = json.load(f)
    
    metrics = data.get('metrics', {})
    
    # Define thresholds
    thresholds = {
        'http_req_duration': {
            'p95': 2000,  # 95th percentile < 2s
            'p99': 5000,  # 99th percentile < 5s
        },
        'http_req_failed': {
            'rate': 0.05,  # Error rate < 5%
        },
    }
    
    failures = []
    
    # Check response time
    if 'http_req_duration' in metrics:
        p95 = metrics['http_req_duration']['values'].get('p(95)', 0)
        p99 = metrics['http_req_duration']['values'].get('p(99)', 0)
        
        if p95 > thresholds['http_req_duration']['p95']:
            failures.append(f"❌ P95 response time: {p95}ms (threshold: 2000ms)")
        else:
            print(f"✅ P95 response time: {p95}ms")
        
        if p99 > thresholds['http_req_duration']['p99']:
            failures.append(f"❌ P99 response time: {p99}ms (threshold: 5000ms)")
        else:
            print(f"✅ P99 response time: {p99}ms")
    
    # Check error rate
    if 'http_req_failed' in metrics:
        error_rate = metrics['http_req_failed']['values'].get('rate', 0)
        
        if error_rate > thresholds['http_req_failed']['rate']:
            failures.append(f"❌ Error rate: {error_rate*100:.2f}% (threshold: 5%)")
        else:
            print(f"✅ Error rate: {error_rate*100:.2f}%")
    
    # Print summary
    print("\n" + "="*60)
    if failures:
        print("❌ PERFORMANCE TEST FAILED")
        print("="*60)
        for failure in failures:
            print(failure)
        sys.exit(1)
    else:
        print("✅ ALL PERFORMANCE THRESHOLDS MET")
        print("="*60)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python check_thresholds.py <results.json>")
        sys.exit(1)
    
    check_thresholds(sys.argv[1])
