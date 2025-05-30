import { createServer, IncomingMessage, ServerResponse } from 'http';
import * as child_process from 'child_process';

const PORT = 6278;
const HOST = '0.0.0.0';

// Create the MCP process
const mcp = child_process.spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Create HTTP server
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST' && req.url === '/message') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      // Write the request to MCP's stdin as a single line
      mcp.stdin.write(JSON.stringify(JSON.parse(body)) + '\n');

      // Get response from MCP's stdout
      mcp.stdout.once('data', (data) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
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