#!/bin/sh
set -e

# Start the MCP server in the background
node build/index.js &
MCP_PID=$!

# Wait a moment for the server to start
sleep 2

# Start the MCP inspector with explicit host binding
npx @modelcontextprotocol/inspector --host=0.0.0.0 build/index.js &
INSPECTOR_PID=$!

# Wait for either process to exit
wait -n

# If we get here, one of the processes exited
# Kill the other process
kill $MCP_PID 2>/dev/null || true
kill $INSPECTOR_PID 2>/dev/null || true

# Exit with the same code as the failed process
exit $?