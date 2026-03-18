#!/bin/bash
# Bar Trivia - Standalone / USB Mode
#
# This script bundles the frontend and runs everything from a single Node.js server.
# No internet connection is required after the first "npm install".
#
# Usage:
#   chmod +x start-standalone.sh
#   ./start-standalone.sh
#
# Players connect from phones/TVs using the Network URL printed at startup.

set -e
cd "$(dirname "$0")"

echo ""
echo "🎮  Bar Trivia — Standalone Mode"
echo "────────────────────────────────"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌  Node.js is not installed."
    echo "    Download it from https://nodejs.org (version 16 or newer)."
    exit 1
fi

echo "📦  Installing backend dependencies..."
cd backend
npm install --prefer-offline --quiet
cd ..

echo "📦  Installing frontend dependencies..."
cd frontend
npm install --prefer-offline --quiet

echo "🔨  Building frontend (this takes ~30 seconds)..."
npm run build
cd ..

echo ""
echo "🚀  Starting server..."
echo "    (Press Ctrl+C to stop)"
echo ""

cd backend
node server.js
