#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';

interface Task {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'done';
  dependencies: string[];
}

class TaskManagerServer {
  private server: Server;
  private tasksPath: string;

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'ai-taskmaster',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tasksPath = path.join(process.cwd(), 'data', 'tasks.json');
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
  }

  private async ensureTasksFile() {
    try {
      await fs.access(this.tasksPath);
    } catch {
      await fs.mkdir(path.dirname(this.tasksPath), { recursive: true });
      await fs.writeFile(this.tasksPath, JSON.stringify([], null, 2));
    }
  }

  private async loadTasks(): Promise<Task[]> {
    await this.ensureTasksFile();
    const data = await fs.readFile(this.tasksPath, 'utf8');
    return JSON.parse(data);
  }

  private async saveTasks(tasks: Task[]) {
    await fs.writeFile(this.tasksPath, JSON.stringify(tasks, null, 2));
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'addTask',
          description: 'Add a new task',
          inputSchema: {
            type: 'object',
            required: ['description'],
            properties: {
              description: {
                type: 'string',
                description: 'Task description'
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Task priority'
              }
            }
          }
        },
        {
          name: 'listTasks',
          description: 'List all tasks',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'updateTask',
          description: 'Update a task',
          inputSchema: {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'string',
                description: 'Task ID'
              },
              description: {
                type: 'string',
                description: 'New task description'
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'New task priority'
              },
              status: {
                type: 'string',
                enum: ['pending', 'in-progress', 'done'],
                description: 'New task status'
              }
            }
          }
        },
        {
          name: 'deleteTask',
          description: 'Delete a task',
          inputSchema: {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'string',
                description: 'Task ID'
              }
            }
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let response: any;

        switch (name) {
          case 'addTask': {
            if (!args || typeof args !== 'object' || typeof args.description !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid task description');
            }
            const priority = args.priority as 'high' | 'medium' | 'low' || 'medium';
            
            const tasks = await this.loadTasks();
            const newTask: Task = {
              id: uuidv4(),
              description: args.description,
              priority,
              status: 'pending',
              dependencies: []
            };
            tasks.push(newTask);
            await this.saveTasks(tasks);
            response = newTask;
            break;
          }

          case 'listTasks': {
            response = await this.loadTasks();
            break;
          }

          case 'updateTask': {
            if (!args || typeof args !== 'object' || typeof args.id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid task ID');
            }

            const tasks = await this.loadTasks();
            const index = tasks.findIndex(t => t.id === args.id);
            if (index === -1) {
              throw new McpError(ErrorCode.InvalidParams, 'Task not found');
            }
            
            const updates: Partial<Task> = {};
            if (typeof args.description === 'string') updates.description = args.description;
            if (args.priority && ['high', 'medium', 'low'].includes(args.priority as string)) {
              updates.priority = args.priority as 'high' | 'medium' | 'low';
            }
            if (args.status && ['pending', 'in-progress', 'done'].includes(args.status as string)) {
              updates.status = args.status as 'pending' | 'in-progress' | 'done';
            }

            tasks[index] = {
              ...tasks[index],
              ...updates
            };
            await this.saveTasks(tasks);
            response = tasks[index];
            break;
          }

          case 'deleteTask': {
            if (!args || typeof args !== 'object' || typeof args.id !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid task ID');
            }

            const tasks = await this.loadTasks();
            const filtered = tasks.filter(t => t.id !== args.id);
            if (filtered.length === tasks.length) {
              throw new McpError(ErrorCode.InvalidParams, 'Task not found');
            }
            await this.saveTasks(filtered);
            response = { success: true };
            break;
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error?.message || 'Unknown error'}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Task Manager MCP server running on stdio');
  }
}

const server = new TaskManagerServer();
server.run().catch(console.error);
