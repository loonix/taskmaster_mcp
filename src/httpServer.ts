import { createServer, IncomingMessage, ServerResponse } from 'http';
import { spawn } from 'child_process';
import { parse as parseUrl } from 'url';

const PORT = 6278;  // Changed back to original port to avoid conflict
const HOST = '0.0.0.0';

// Create the MCP process
const mcp = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Store SSE clients
const clients = new Map<string, ServerResponse>();

// Create HTTP server
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = parseUrl(req.url || '', true);
  const sessionId = url.query.sessionId as string;

  // Handle SSE endpoint
  if (req.method === 'GET' && url.pathname === '/events') {
    console.log(`New SSE connection with session ${sessionId}`);
    
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial connection message
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    
    // Store client connection
    if (sessionId) {
      clients.set(sessionId, res);
      console.log(`SSE client connected with session ${sessionId}`);

      // Set up keepalive for SSE connection
      const keepalive = setInterval(() => {
        if (res.writable) {
          res.write(':\n\n'); // SSE comment for keepalive
        }
      }, 30000);

      // Remove client when connection closes
      req.on('close', () => {
        clients.delete(sessionId);
        clearInterval(keepalive);
        console.log(`SSE client disconnected: ${sessionId}`);
      });
    }

    return;
  }

  // Handle message endpoint
  if (req.method === 'POST' && url.pathname === '/message') {
    let body = '';
    
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // Parse and validate the JSON request
        const parsedBody = JSON.parse(body);
        console.log('Received request:', parsedBody);
        
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
            // Parse and validate response
            const response = JSON.parse(data.toString());
            console.log('Sending response:', response);

            // Send response via SSE if client is connected
            const client = sessionId ? clients.get(sessionId) : null;
            if (client && client.writable) {
              // Format as SSE data
              client.write(`data: ${JSON.stringify(response)}\n\n`);
              // Send acknowledgment to POST request
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'ok' }));
            } else {
              // Fall back to direct response if no SSE connection
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(data);
            }
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