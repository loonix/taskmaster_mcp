#!/bin/sh
set -e

# Function to cleanup processes
cleanup() {
    kill $MCP_PID 2>/dev/null || true
    exit 0
}

# Setup signal trapping
trap cleanup EXIT INT TERM

# Start the MCP server in background
node build/index.js 2>&1 | tee /tmp/mcp.log &
MCP_PID=$!

# Wait for the server to initialize
sleep 2

# Try to start the inspector using different methods
echo "Attempting to start MCP inspector..."

# First try global installation
if [ -x "/home/taskmaster/.npm-global/bin/mcp-inspector" ]; then
    echo "Using global installation"
    exec /home/taskmaster/.npm-global/bin/mcp-inspector build/index.js --host 0.0.0.0
    exit 0
fi

# Then try local installation
if [ -x "./node_modules/.bin/mcp-inspector" ]; then
    echo "Using local installation"
    exec ./node_modules/.bin/mcp-inspector build/index.js --host 0.0.0.0
    exit 0
fi

# Finally, fall back to npx
echo "Using npx fallback"
exec npx @modelcontextprotocol/inspector build/index.js --host 0.0.0.0
