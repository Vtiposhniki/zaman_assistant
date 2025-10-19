#!/bin/bash

echo "Starting Redis for Zaman Assistant Goals Service..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Запуск Redis через Docker Compose
echo "Starting Redis container..."
docker-compose up redis -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Redis started successfully!"
    echo ""
    echo "Redis is available at:"
    echo "  - Host: localhost"
    echo "  - Port: 6379"
    echo "  - URL: redis://localhost:6379"
    echo ""
    echo "To check Redis status:"
    echo "  docker-compose ps redis"
    echo ""
    echo "To view Redis logs:"
    echo "  docker-compose logs redis"
    echo ""
    echo "To stop Redis:"
    echo "  docker-compose stop redis"
    echo ""
    echo "To test Redis connection:"
    echo "  redis-cli ping"
    echo ""
else
    echo ""
    echo "❌ Failed to start Redis"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if Docker is running"
    echo "2. Check if port 6379 is available"
    echo "3. Check docker-compose.yml configuration"
    echo ""
    exit 1
fi
