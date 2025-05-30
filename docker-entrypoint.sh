#!/bin/sh
set -e

# Function to cleanup processes
cleanup() {
    kill $MCP_PID 2>/dev/null || true
    exit 0
}

# Function to ensure data directory is properly setup
setup_data_dir() {
    # Create data directory if it doesn't exist
    mkdir -p /app/data
    
    # Initialize tasks.json if it doesn't exist or is empty
    if [ ! -f /app/data/tasks.json ] || [ ! -s /app/data/tasks.json ]; then
        echo "[]" > /app/data/tasks.json
    fi
    
    # Ensure proper permissions
    chmod 755 /app/data
    chmod 644 /app/data/tasks.json
    
    # Verify write access
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

# Start the MCP server in background
echo "Starting MCP server..."
node build/index.js 2>&1 | tee /tmp/mcp.log &
MCP_PID=$!

# Wait for the server to initialize
sleep 2

# Start the inspector
echo "Starting MCP inspector..."
if [ -x "/home/taskmaster/.npm-global/bin/mcp-inspector" ]; then
    exec /home/taskmaster/.npm-global/bin/mcp-inspector build/index.js --host 0.0.0.0
else
    exec npx @modelcontextprotocol/inspector build/index.js --host 0.0.0.0
fi
