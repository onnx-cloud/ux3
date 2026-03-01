import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import http from 'http';

/**
 * Simple static file server used by `ux3 preview` command.  A `--once`
 * option makes the command exit automatically after startup, which is
 * useful for unit tests.
 */
export const previewCommand = new Command()
  .name('preview')
  .description('Preview built output with a simple HTTP server')
  .option('--port <port>', 'port to bind (0 = random)', '8080')
  .option('--dir <dir>', 'directory to serve', 'dist')
  .option('--once', 'start server and then exit after short delay', false)
  .action((options) => {
    const projectDir = process.cwd();
    const serveDir = path.resolve(projectDir, options.dir);

    if (!fs.existsSync(serveDir)) {
      console.error(`❌ Directory not found: ${serveDir}`);
      process.exit(1);
    }

    const port = parseInt(options.port, 10) || 8080;
    const server = http.createServer((req, res) => {
      let reqPath = req.url || '/';
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(serveDir, decodeURIComponent(reqPath));
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('Not found');
        } else {
          res.end(data);
        }
      });
    });

    // if --once is provided we return a promise that resolves after server closes
    if (options.once) {
      return new Promise<void>((resolve) => {
        server.listen(port, () => {
          const addr = server.address();
          const actualPort = typeof addr === 'string' ? addr : addr?.port;
          console.log(`🔎 Previewing ${serveDir} on http://localhost:${actualPort}`);
          setTimeout(() => {
            server.close(() => {
              console.log('🛑 Preview server closed');
              resolve();
            });
          }, 100);
        });
      });
    }

    server.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'string' ? addr : addr?.port;
      console.log(`🔎 Previewing ${serveDir} on http://localhost:${actualPort}`);
    });

    process.on('SIGINT', () => {
      server.close(() => process.exit(0));
    });
  });
