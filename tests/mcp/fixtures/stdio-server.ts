import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSDKServer } from '../../../src/mcp/sdk-server.js';

const projectDir = process.argv[2];

if (!projectDir) {
  throw new Error('Expected projectDir argument');
}

const server = createSDKServer(projectDir);
const transport = new StdioServerTransport();

await server.connect(transport);