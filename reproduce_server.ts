import * as http from 'http';
import * as path from 'path';
import { DevServer } from './src/dev/dev-server';

async function run() {
  const projectDir = path.resolve('examples/iam');
  const server = new DevServer(projectDir, 5173, '127.0.0.1', { verbose: true });
  await server.start();
}

run().catch((e) => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
