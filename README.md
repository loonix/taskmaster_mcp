# Task Manager MCP Server

This is a Model Context Protocol (MCP) server that provides task management functionality.

Join my discord channel: https://discord.gg/8pem5GAe


Models Tested:
- Claude 3.5
- mychen76/qwen3_cline_roocode:32b (local with ollama)

## Running with Docker

### Prerequisites
- Docker
- Docker Compose

### Quick Start

1. Clone the repository:
```bash
git clone [repository-url]
cd taskmaster_mcp
```

2. Start the server:
```bash
docker compose up -d
```

The server will be available with:
- HTTP Server: http://localhost:6278/message (JSON-RPC endpoint)
- MCP Inspector UI: http://localhost:6274
- MCP Inspector Proxy: port 6277

### Docker Commands

- Start the server:
  ```bash
  docker compose up -d
  ```

- View logs:
  ```bash
  docker compose logs -f
  ```

- Stop the server:
  ```bash
  docker compose down
  ```

- Rebuild and restart:
  ```bash
  docker compose down -v && docker compose build --no-cache && docker compose up -d
  ```

## Manual Installation (without Docker)

### Requirements
- Node.js v20 or higher (tested with v20.11.0)
- npm v10 or higher (tested with v10.2.4)

### Installation Steps

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the server:
```bash
node build/index.js
```

## Available Tools

The server provides the following tools:

- `listTasks`: View all tasks
  - No parameters required

- `addTask`: Add a new task
  - Required: description
  - Optional: priority ('high' | 'medium' | 'low')

## API Usage

1. Initialize the connection:
```bash
curl -X POST http://localhost:6278/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "sampling": {},
        "roots": { "listChanged": true }
      },
      "clientInfo": {
        "name": "curl-test",
        "version": "0.1"
      }
    }
  }'
```

2. List available tools:
```bash
curl -X POST http://localhost:6278/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "listTools",
    "params": {}
  }'
```

3. Call a tool:
```bash
curl -X POST http://localhost:6278/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "callTool",
    "params": {
      "toolId": "list-tasks"
    }
  }'
```

## Troubleshooting

### Port Conflicts
If you see port conflicts:
```bash
# Find processes using the ports
lsof -i :6274
lsof -i :6277
lsof -i :6278

# Kill the processes if needed
kill <PID>
# or force kill
sudo kill -9 <PID>
```

### Docker Issues
- Clear all containers and volumes:
  ```bash
  docker compose down -v
  ```
- Rebuild without cache:
  ```bash
  docker compose build --no-cache
  ```

### Data Persistence
Task data is stored in a Docker volume `taskmaster_mcp_taskdata`. To reset all data:
```bash
docker compose down -v
