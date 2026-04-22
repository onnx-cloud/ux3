import { createSDKServer } from './sdk-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * SDK-backed MCP server over stdio transport.
 */
export class MCPServer {
  private transport: StdioServerTransport | null = null;
  private readonly server: ReturnType<typeof createSDKServer>;

  constructor(projectDir: string) {
    this.server = createSDKServer(projectDir);
  }

  async start(): Promise<void> {
    if (this.transport) {
      return;
    }
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }

  async stop(): Promise<void> {
    await this.server.close();
    this.transport = null;
  }
}
