# ===== TEST RUNNER SCRIPT =====
# File: backend/run_tests.sh (chmod +x)

#!/bin/bash

set -e

echo "🧪 Zaman Assistant Test Suite"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest not found. Installing...${NC}"
    pip install pytest pytest-asyncio pytest-cov
fi

# Parse arguments
ARGS=""
COVERAGE=false
WATCH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --unit)
            ARGS="$ARGS -m unit"
            shift
            ;;
        --integration)
            ARGS="$ARGS -m integration"
            shift
            ;;
        --fast)
            ARGS="$ARGS -m 'not slow'"
            shift
            ;;
        *)
            ARGS="$ARGS $1"
            shift
            ;;
    esac
done

# Add coverage if requested
if [ "$COVERAGE" = true ]; then
    ARGS="$ARGS --cov=. --cov-report=html --cov-report=term-missing"
fi

# Run tests
echo -e "${BLUE}📝 Running tests...${NC}"
echo ""

if [ "$WATCH" = true ]; then
    # Watch mode (requires pytest-watch)
    if ! command -v ptw &> /dev/null; then
        echo -e "${YELLOW}⚠️ pytest-watch not found. Installing...${NC}"
        pip install pytest-watch
    fi
    ptw -- $ARGS
else
    # Normal mode
    pytest tests/ $ARGS
    EXIT_CODE=$?
fi

# Show coverage report if generated
if [ "$COVERAGE" = true ] && [ -d "htmlcov" ]; then
    echo ""
    echo -e "${GREEN}✅ Coverage report generated${NC}"
    echo -e "${BLUE}📊 Open: htmlcov/index.html${NC}"
fi

echo ""
echo "=============================="
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
fi
echo "=============================="

exit ${EXIT_CODE:-0}