import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

http
  .createServer(async (req, res) => {
    let file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(dir)) return res.writeHead(403).end();
    try {
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(await fs.readFile(path.join(dir, '404.html')).catch(() => 'Not found'));
    }
  })
  .listen(port, () => console.log(`Serving ${dir} at http://localhost:${port}/`));
