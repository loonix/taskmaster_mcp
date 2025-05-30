#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Redirect console.log to stderr to keep stdout clean for JSON messages
const log = console.log;
console.log = (...args) => {
  console.error(...args);
};

// Define available tools
interface Tool {
  id: string;
  name: string;
  description: string;
}

const tools: Tool[] = [
  {
    id: 'list-tasks',
    name: 'List Tasks',
    description: 'Lists all tasks'
  },
  {
    id: 'add-task',
    name: 'Add Task',
    description: 'Adds a new task'
  }
];

async function main() {
  log("Task Manager MCP server running on stdio");
  
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (data: string) => {
    try {
      const message = JSON.parse(data);
      const { method, params, id } = message;
      const response = {
        jsonrpc: '2.0',
        id
      };

      let result;

      switch (method) {
        case 'initialize':
          result = {
            ...response,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: {
                name: 'ai-taskmaster',
                version: '1.0.0'
              },
              capabilities: {
                tools: {}
              }
            }
          };
          break;

        case 'listTools':
          result = {
            ...response,
            result: { tools }
          };
          break;

        case 'callTool':
          const toolId = params?.toolId;
          const tool = tools.find(t => t.id === toolId);
          
          if (!tool) {
            result = {
              ...response,
              error: {
                code: -32601,
                message: `Tool ${toolId} not found`
              }
            };
            break;
          }

          switch (toolId) {
            case 'list-tasks':
              result = {
                ...response,
                result: { tasks: [] }
              };
              break;
            case 'add-task':
              result = {
                ...response,
                result: { success: true }
              };
              break;
            default:
              result = {
                ...response,
                error: {
                  code: -32601,
                  message: `Tool ${toolId} not implemented`
                }
              };
          }
          break;

        default:
          result = {
            ...response,
            error: {
              code: -32601,
              message: `Method ${method} not found`
            }
          };
      }

      process.stdout.write(JSON.stringify(result) + '\n');
    } catch (error: any) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: error.message || 'Parse error'
        }
      }) + '\n');
    }
  });

  log("MCP server ready for messages");
}

main().catch(error => {
  log("Fatal error:", error);
  process.exit(1);
});
