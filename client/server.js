import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveFile(res, filePath) {
  const data = await readFile(filePath);
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(data);
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const filePath = join(DIST, pathname === '/' ? 'index.html' : pathname);
  try {
    await serveFile(res, filePath);
  } catch {
    // SPA fallback - serve index.html for all routes
    try {
      await serveFile(res, join(DIST, 'index.html'));
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

const port = 8080;
server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on http://0.0.0.0:${port}`);
});
