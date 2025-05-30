#!/bin/sh
set -e

# Function to cleanup processes
cleanup() {
    kill $MCP_PID $INSPECTOR_PID 2>/dev/null || true
    exit 0
}

# Function to wait for port to be ready
wait_for_port() {
    local port=$1
    local host=${2:-0.0.0.0}
    local max_attempts=30
    local attempt=1

    echo "Waiting for $host:$port to be ready..."
    while ! nc -z "$host" "$port" >/dev/null 2>&1; do
        if [ $attempt -ge $max_attempts ]; then
            echo "Timeout waiting for $host:$port"
            return 1
        fi
        echo "Attempt $attempt: $host:$port not ready yet..."
        attempt=$((attempt + 1))
        sleep 1
    done
    echo "$host:$port is ready!"
    return 0
}

# Function to setup data directory
setup_data_dir() {
    mkdir -p /app/data
    
    if [ ! -f /app/data/tasks.json ] || [ ! -s /app/data/tasks.json ]; then
        echo "[]" > /app/data/tasks.json
    fi
    
    chmod 755 /app/data
    chmod 644 /app/data/tasks.json
    
    if ! touch /app/data/tasks.json 2>/dev/null; then
        echo "Error: Cannot write to /app/data/tasks.json"
        exit 1
    fi
}

# Setup signal trapping
trap cleanup EXIT INT TERM

# Ensure data directory is properly setup
echo "Setting up data directory..."
setup_data_dir

echo "Starting MCP server in SSE mode..."
node build/index.js &
MCP_PID=$!

# Wait for SSE port to be ready
wait_for_port 6277

echo "Starting MCP Inspector..."
node ./node_modules/@modelcontextprotocol/inspector/bin/mcp-inspector.js --host 0.0.0.0 build/index.js &
INSPECTOR_PID=$!

# Wait for Inspector port to be ready
wait_for_port 6274

echo "All services are running!"
echo "MCP SSE server is available at port 6277"
echo "MCP Inspector UI is available at port 6274"

# Wait for any process to exit
wait $MCP_PID
