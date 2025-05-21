# Task Manager MCP Server

This is a Model Context Protocol (MCP) server that provides task management functionality.

## Requirements

- Node.js v20 or higher (tested with v20.11.0)
- npm v10 or higher (tested with v10.2.4)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Running the Server

1. Make sure you're using Node.js v20 or higher:
```bash
# If using nvm
nvm use 20

# Check Node.js version
node --version
```

2. Start the server:
```bash
node build/index.js
```

3. To interact with the server, install the MCP Inspector globally:
```bash
npm install -g @modelcontextprotocol/inspector
```

4. Run the MCP Inspector:
```bash
mcp-inspector build/index.js
```

The inspector will be available at http://127.0.0.1:6274

## Available Tools

The server provides the following tools:

- `addTask`: Add a new task
  - Required: description
  - Optional: priority ('high' | 'medium' | 'low')

- `listTasks`: View all tasks
  - No parameters required

- `updateTask`: Modify an existing task
  - Required: id
  - Optional: description, priority, status

- `deleteTask`: Remove a task
  - Required: id

## Integration with Roo

To add this MCP server to Roo, add it to your VSCode settings at `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`:

```json
{
  "mcpServers": {
    "ai-taskmaster": {
      "command": "/Users/YOURUSERNAME/.nvm/versions/node/v20.11.0/bin/node",  // change this
      "args": [
        "/Users/YOURUSERNAME/Development/taskmaster_mcp/build/index.js"  // change this
      ],
      "stdio": [
        "pipe",
        "pipe",
        "pipe"
      ],
      "cwd": "/Users/YOURUSERNAME/Development/taskmaster_mcp", // change this
      "transportType": "stdio",
      "description": "Task management MCP server that provides tools for managing tasks",
      "capabilities": {
        "tools": {
          "addTask": {
            "description": "Add a new task",
            "inputSchema": {
              "type": "object",
              "required": ["description"],
              "properties": {
                "description": {
                  "type": "string",
                  "description": "Task description"
                },
                "priority": {
                  "type": "string",
                  "enum": ["high", "medium", "low"],
                  "description": "Task priority"
                }
              }
            }
          },
          "listTasks": {
            "description": "List all tasks",
            "inputSchema": {
              "type": "object",
              "properties": {}
            }
          },
          "updateTask": {
            "description": "Update a task",
            "inputSchema": {
              "type": "object",
              "required": ["id"],
              "properties": {
                "id": {
                  "type": "string",
                  "description": "Task ID"
                },
                "description": {
                  "type": "string",
                  "description": "New task description"
                },
                "priority": {
                  "type": "string",
                  "enum": ["high", "medium", "low"],
                  "description": "New task priority"
                },
                "status": {
                  "type": "string",
                  "enum": ["pending", "in-progress", "done"],
                  "description": "New task status"
                }
              }
            }
          },
          "deleteTask": {
            "description": "Delete a task",
            "inputSchema": {
              "type": "object",
              "required": ["id"],
              "properties": {
                "id": {
                  "type": "string",
                  "description": "Task ID"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

After adding the configuration, you can use the tools in any mode via the `use_mcp_tool` command:

```xml
<use_mcp_tool>
<server_name>ai-taskmaster</server_name>
<tool_name>addTask</tool_name>
<arguments>
{
  "description": "Complete project documentation",
  "priority": "high"
}
</arguments>
</use_mcp_tool>

## Windows-Specific Instructions

### Installation
1. Install nvm-windows from https://github.com/coreybutler/nvm-windows/releases
2. Open a new PowerShell terminal and install Node.js v20:
   ```powershell
   nvm install 20.11.0
   nvm use 20.11.0
   ```

### Configuration
The VSCode settings location on Windows is different:
```
%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json
```

When configuring paths in mcp_settings.json, use Windows path format:
```json
{
  "mcpServers": {
    "ai-taskmaster": {
      "command": "C:\\Users\\YourUsername\\AppData\\Roaming\\nvm\\v20.11.0\\node.exe",
      "args": [
        "C:\\path\\to\\taskmaster_mcp\\build\\index.js"
      ],
      "stdio": [
        "pipe",
        "pipe",
        "pipe"
      ],
      "cwd": "C:\\path\\to\\taskmaster_mcp",
      "transportType": "stdio",
      "description": "Task management MCP server that provides tools for managing tasks"
    }
  }
}
```

### Windows-Specific Troubleshooting
- If you get permission errors, run PowerShell as Administrator
- For port conflicts on Windows:
  ```powershell
  # Find process using port 6277
  netstat -ano | findstr :6277
  # Kill the process
  taskkill /PID <PID> /F
  ```
- Use `where node` to verify the correct Node.js version is in your PATH
- If you have issues with global npm installations, try:
  ```powershell
  npm config set prefix "C:\Users\YourUsername\AppData\Roaming\npm"
  ```

## Troubleshooting

### Node.js Version Issues
- Make sure you're using Node.js v20+ with the correct npm version
- If using nvm, use `nvm use --delete-prefix v20.11.0` to avoid npm prefix issues
- The global MCP inspector must be installed with the same Node.js version:
  ```bash
  nvm use v20.11.0
  npm install -g @modelcontextprotocol/inspector
  ```

### Port Conflicts
If you see "Proxy Server PORT IS IN USE at port 6277":
1. Find processes using the port:
   ```bash
   lsof -i :6277
   ```
2. Kill the processes:
   ```bash
   kill <PID>
   # or force kill if needed
   sudo kill -9 <PID>
   ```
3. Restart the server and inspector

### VSCode Integration
- Use absolute paths in mcp_settings.json configuration
- Include stdio and working directory settings:
  ```json
  "stdio": ["pipe", "pipe", "pipe"],
  "cwd": "/path/to/taskmaster_mcp"
  ```
- After changing mcp_settings.json, restart VSCode for changes to take effect

### Connection Issues
If Roo reports "Not connected":
1. Ensure the server is running with the correct Node.js version
2. Check that the path in mcp_settings.json matches your actual installation directory
3. Make sure the stdio transport settings are properly configured
