import { IncomingMessage, ServerResponse } from 'http';
import { createSDKServer } from './sdk-server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/**
 * HTTP transport handler for MCP protocol using official SDK.
 * Handles JSON-RPC 2.0 requests over HTTP POST.
 */
export class MCPHTTPHandler {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' || req.method === 'POST' || req.method === 'DELETE') {
      // Some browser clients omit one of the accepted media types required by
      // Streamable HTTP. Normalize headers so SDK transport negotiation succeeds.
      const accept = String(req.headers.accept || '');
      if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
        req.headers.accept = 'application/json, text/event-stream';
      }

      // SDK requirement: in stateless mode, each request must use a fresh transport.
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      const server = createSDKServer(this.projectDir);

      await server.connect(transport);
      try {
        await transport.handleRequest(req, res);
      } finally {
        await server.close();
      }
      return;
    }

    res.writeHead(405, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
}
