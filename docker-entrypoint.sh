#!/bin/sh
set -e

# Function to cleanup processes
cleanup() {
    if [ -n "$INSPECTOR_PID" ]; then
        kill $INSPECTOR_PID 2>/dev/null || true
    fi
    if [ -n "$HTTP_SERVER_PID" ]; then
        kill $HTTP_SERVER_PID 2>/dev/null || true
    fi
    exit 0
}

# Function to setup data directory
setup_data_dir() {
    mkdir -p /app/data
    if [ ! -f /app/data/tasks.json ] || [ ! -s /app/data/tasks.json ]; then
        echo "[]" > /app/data/tasks.json
    fi
    chmod 755 /app/data
    chmod 644 /app/data/tasks.json
}

# Setup signal trapping
trap cleanup EXIT INT TERM

# Ensure data directory is properly setup
echo "Setting up data directory..."
setup_data_dir

# Start our HTTP server wrapper
echo "Starting HTTP server wrapper..."
node build/httpServer.js &
HTTP_SERVER_PID=$!

# Start MCP Inspector
echo "Starting MCP Inspector..."
/usr/local/bin/mcp-inspector build/index.js -- --host 0.0.0.0 &
INSPECTOR_PID=$!

echo "All services started!"
echo "MCP HTTP server listening on port 6277"
echo "MCP Inspector UI available at port 6274"

# Keep the script running
wait $HTTP_SERVER_PID
