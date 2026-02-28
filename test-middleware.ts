import * as http from 'http';

const server = http.createServer((req, res) => {
  console.log('Request received for:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from test server!');
});

server.listen(5173, 'localhost', () => {
  console.log('Test server listening on http://localhost:5173');
});
