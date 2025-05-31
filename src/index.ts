#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Redirect console.log to stderr to keep stdout clean for JSON messages
const log = console.log;
console.log = (...args) => {
  console.error(...args);
};

interface Task {
  id: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in-progress' | 'done';
  dependencies?: string[];
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
            case 'listTasks':
              const tasks = loadTasks();
              result = {
                ...response,
                result: { tasks }
              };
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
              result = {
                ...response,
                result: { task: newTask }
              };
              break;

            case 'updateTask':
              const taskList = loadTasks();
              const taskIndex = taskList.findIndex(t => t.id === params.id);
              if (taskIndex === -1) {
                result = {
                  ...response,
                  error: {
                    code: -32602,
                    message: `Task ${params.id} not found`
                  }
                };
                break;
              }
              const updatedTask = {
                ...taskList[taskIndex],
                ...params
              };
              taskList[taskIndex] = updatedTask;
              saveTasks(taskList);
              result = {
                ...response,
                result: { task: updatedTask }
              };
              break;

            case 'deleteTask':
              const allTasks = loadTasks();
              const filteredTasks = allTasks.filter(t => t.id !== params.id);
              if (filteredTasks.length === allTasks.length) {
                result = {
                  ...response,
                  error: {
                    code: -32602,
                    message: `Task ${params.id} not found`
                  }
                };
                break;
              }
              saveTasks(filteredTasks);
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
