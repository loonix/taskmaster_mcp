#!/bin/sh
set -e

# Start the MCP server
node build/index.js &
MCP_PID=$!

# Wait a moment for the server to start
sleep 2

# Start the MCP inspector
npx @modelcontextprotocol/inspector --host=0.0.0.0 build/index.js &
INSPECTOR_PID=$!

# Trap interrupts and exit signals to properly terminate both processes
trap "kill $MCP_PID $INSPECTOR_PID 2>/dev/null" EXIT TERM INT

# Keep the script running
while kill -0 $MCP_PID 2>/dev/null && kill -0 $INSPECTOR_PID 2>/dev/null; do
    sleep 1
done

# If we get here, one of the processes died
exit 1