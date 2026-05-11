import { IncomingMessage, ServerResponse } from 'http';
import { createSDKServer } from './sdk-server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/**
 * HTTP transport handler for MCP protocol using official SDK.
 * Maintains a singleton server instance for session-aware transports.
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
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
        'Access-Control-Expose-Headers': 'Mcp-Session-Id',
        'Access-Control-Max-Age': '600',
      });
      res.end();
      return;
    }

    if (req.method === 'DELETE') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ jsonrpc: '2.0', result: {}, id: null }));
      return;
    }

    if (req.method === 'GET' || req.method === 'POST') {
      await this.handleMcpRequest(req, res);
      return;
    }

    res.writeHead(405, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  private async handleMcpRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    const protocol = String(req.headers['x-forwarded-proto'] || 'http');
    const host = String(req.headers.host || 'localhost');
    const server = createSDKServer(this.projectDir, `${protocol}://${host}`);

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
      res.on('close', () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal error',
            },
            id: null,
          }),
        );
      }
      transport.close().catch(() => {});
      server.close().catch(() => {});
    }
  }
}
