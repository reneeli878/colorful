import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT ?? 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  try {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (requestPath.includes('\0')) throw new URIError('Invalid path');
    const file = path.resolve(root, '.' + (requestPath === '/' ? '/index.html' : requestPath));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!(await stat(file)).isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const code = error instanceof URIError ? 400 : error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500;
    res.writeHead(code);
    res.end(code === 404 ? 'Not found' : code === 400 ? 'Invalid request' : 'Server error');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Stop the previous preview first.`
    : error.message);
  process.exit(1);
});
server.listen(port, '0.0.0.0', () => {
  console.log('OSUCUP server starting');
  console.log(`Local: http://localhost:${port}/`);
  let interfaces = {};
  try { interfaces = os.networkInterfaces(); } catch {
    console.log('Network address unavailable. Local preview is still ready.');
  }
  for (const adapters of Object.values(interfaces)) {
    for (const address of adapters ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        console.log(`iPad / Network: http://${address.address}:${port}/`);
      }
    }
  }
  console.log('Keep this terminal open. Press Ctrl+C to stop.');
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
