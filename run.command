#!/bin/bash
set -euo pipefail

# Always run from this script's directory.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting backend..."
yarn dev:backend &
BACKEND_PID=$!

echo "Starting frontend..."
yarn dev:frontend &
FRONTEND_PID=$!

cleanup() {
  echo "\nStopping processes..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$BACKEND_PID" "$FRONTEND_PID"
