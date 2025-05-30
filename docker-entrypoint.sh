#!/bin/sh
set -e

# Function to cleanup processes
cleanup() {
    kill $MCP_PID 2>/dev/null || true
    exit 0
}

# Setup signal trapping
trap cleanup EXIT INT TERM

# Start the MCP server and save its output
node build/index.js 2>&1 | tee /tmp/mcp.log &
MCP_PID=$!

# Wait for the server to initialize
sleep 2

# Start the inspector in the foreground
/usr/local/bin/mcp-inspector build/index.js --host 0.0.0.0
