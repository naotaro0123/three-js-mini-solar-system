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

collect_descendants() {
  local pid="$1"
  local child_pid

  while IFS= read -r child_pid; do
    [ -n "$child_pid" ] || continue
    collect_descendants "$child_pid"
    printf '%s\n' "$child_pid"
  done < <(pgrep -P "$pid" 2>/dev/null || true)
}

kill_process_tree() {
  local pid="$1"
  local targets=()
  local target_pid

  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  while IFS= read -r target_pid; do
    [ -n "$target_pid" ] || continue
    targets+=("$target_pid")
  done < <(collect_descendants "$pid")

  targets+=("$pid")

  kill -TERM "${targets[@]}" 2>/dev/null || true
  sleep 1

  for target_pid in "${targets[@]}"; do
    if kill -0 "$target_pid" 2>/dev/null; then
      kill -KILL "$target_pid" 2>/dev/null || true
    fi
  done
}

cleanup() {
  local exit_code="${1:-0}"

  trap - INT TERM EXIT
  echo "\nStopping processes..."

  kill_process_tree "$BACKEND_PID"
  kill_process_tree "$FRONTEND_PID"
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  exit "$exit_code"
}

trap 'cleanup 130' INT
trap 'cleanup 143' TERM
trap 'cleanup $?' EXIT

wait "$BACKEND_PID" "$FRONTEND_PID" || true
