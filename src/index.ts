#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

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
  const transport = new StdioServerTransport();

  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', async (data: string) => {
    try {
      const request = JSON.parse(data);
      const response = {
        jsonrpc: '2.0',
        id: request.id
      };

      switch (request.method) {
        case 'initialize':
          process.stdout.write(JSON.stringify({
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
          }) + '\n');
          break;

        case 'listTools':
          process.stdout.write(JSON.stringify({
            ...response,
            result: { tools }
          }) + '\n');
          break;

        case 'callTool':
          const toolId = request.params?.toolId;
          const tool = tools.find(t => t.id === toolId);
          
          if (!tool) {
            process.stdout.write(JSON.stringify({
              ...response,
              error: {
                code: -32601,
                message: `Tool ${toolId} not found`
              }
            }) + '\n');
            break;
          }

          switch (toolId) {
            case 'list-tasks':
              process.stdout.write(JSON.stringify({
                ...response,
                result: { tasks: [] }
              }) + '\n');
              break;
            case 'add-task':
              process.stdout.write(JSON.stringify({
                ...response,
                result: { success: true }
              }) + '\n');
              break;
            default:
              process.stdout.write(JSON.stringify({
                ...response,
                error: {
                  code: -32601,
                  message: `Tool ${toolId} not implemented`
                }
              }) + '\n');
          }
          break;

        default:
          process.stdout.write(JSON.stringify({
            ...response,
            error: {
              code: -32601,
              message: `Method ${request.method} not found`
            }
          }) + '\n');
      }
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

  console.log("Task Manager MCP server running on stdio");
}

main().catch(console.error);
