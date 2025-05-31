import { createServer, IncomingMessage, ServerResponse } from 'http';
import { spawn } from 'child_process';

const PORT = 6278;
const HOST = '0.0.0.0';

// Create the MCP process
const mcp = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Create HTTP server
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/message') {
    let body = '';
    
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // Parse and validate the JSON request
        const parsedBody = JSON.parse(body);
        if (!parsedBody.method || !parsedBody.jsonrpc || parsedBody.jsonrpc !== '2.0') {
          throw new Error('Invalid JSON-RPC request');
        }

        // Write the request to MCP's stdin
        mcp.stdin.write(JSON.stringify(parsedBody) + '\n');

        // Set up response timeout
        const responseTimeout = setTimeout(() => {
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: parsedBody.id,
            error: {
              code: -32000,
              message: 'Response timeout'
            }
          }));
        }, 30000); // 30 second timeout

        // Get response from MCP's stdout
        mcp.stdout.once('data', (data: Buffer) => {
          clearTimeout(responseTimeout);
          try {
            // Validate response is proper JSON
            JSON.parse(data.toString());
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: parsedBody.id,
              error: {
                code: -32603,
                message: 'Invalid JSON response from MCP server'
              }
            }));
          }
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON request'
          }
        }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`HTTP server listening on ${HOST}:${PORT}`);
});

// Handle process cleanup
process.on('SIGTERM', () => {
  mcp.kill();
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  mcp.kill();
  server.close();
  process.exit(0);
});