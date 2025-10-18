#!/bin/bash

echo "Starting Zaman Assistant Frontend..."
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo
fi

# Start development server
echo "Starting development server..."
npm run dev
