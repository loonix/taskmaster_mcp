#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Redirect all logging to stderr
const consoleError = console.error;

console.log = (...args) => {
  consoleError(...args);
};
console.error = (...args) => {
  consoleError(...args);
};

interface Task {
  id: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in-progress' | 'done';
  dependencies?: string[];
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

const TASKS_FILE = 'data/tasks.json';

function loadTasks(): Task[] {
  if (!fs.existsSync(TASKS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(TASKS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveTasks(tasks: Task[]) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

const tools = [
  {
    id: 'addTask',
    name: 'Add Task',
    description: 'Add a new task',
    inputSchema: {
      type: 'object',
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
      },
      required: ['description']
    }
  },
  {
    id: 'listTasks',
    name: 'List Tasks',
    description: 'List all tasks',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    id: 'updateTask',
    name: 'Update Task',
    description: 'Update a task',
    inputSchema: {
      type: 'object',
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
      },
      required: ['id']
    }
  },
  {
    id: 'deleteTask',
    name: 'Delete Task',
    description: 'Delete a task',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Task ID'
        }
      },
      required: ['id']
    }
  }
];

// Create MCP process handler
async function handleMessage(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { method, params, id } = request;

  try {
    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'ai-taskmaster',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        };
        break;

      case 'listTools':
        result = { tools };
        break;

      case 'callTool':
        const toolId = params?.toolId;
        const tool = tools.find(t => t.id === toolId);
        
        if (!tool) {
          throw new Error(`Tool ${toolId} not found`);
        }

        switch (toolId) {
          case 'listTasks':
            const tasks = loadTasks();
            result = { tasks };
            break;

          case 'addTask': 
            const newTask: Task = {
              id: uuidv4(),
              description: params.description,
              priority: params.priority || 'medium',
              status: 'pending',
              dependencies: []
            };
            const currentTasks = loadTasks();
            currentTasks.push(newTask);
            saveTasks(currentTasks);
            result = { task: newTask };
            break;

          case 'updateTask':
            const taskList = loadTasks();
            const taskIndex = taskList.findIndex(t => t.id === params.id);
            if (taskIndex === -1) {
              throw new Error(`Task ${params.id} not found`);
            }
            const updatedTask = {
              ...taskList[taskIndex],
              ...params
            };
            taskList[taskIndex] = updatedTask;
            saveTasks(taskList);
            result = { task: updatedTask };
            break;

          case 'deleteTask':
            const allTasks = loadTasks();
            const filteredTasks = allTasks.filter(t => t.id !== params.id);
            if (filteredTasks.length === allTasks.length) {
              throw new Error(`Task ${params.id} not found`);
            }
            saveTasks(filteredTasks);
            result = { success: true };
            break;

          default:
            throw new Error(`Tool ${toolId} not implemented`);
        }
        break;

      default:
        throw new Error(`Method ${method} not found`);
    }

    return {
      jsonrpc: '2.0',
      id,
      result
    };
  } catch (error: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: error.message || 'Unknown error'
      }
    };
  }
}

// Set up stdin/stdout handler
process.stdin.setEncoding('utf-8');
process.stdin.on('data', async (data: string) => {
  try {
    const request = JSON.parse(data) as JsonRpcRequest;
    const response = await handleMessage(request);
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (err: any) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: err.message || 'Invalid JSON request'
      }
    }) + '\n');
  }
});

consoleError("Task Manager MCP server running");
process.stdout.write('\n'); // Initial newline to signal ready
consoleError("MCP server ready for messages");
