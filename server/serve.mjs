// Small static file server.  Usage: node server/serve.mjs [folder] [port] [address]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = path.resolve(process.argv[2] || process.env.FOG_DIST || 'dist');
const port = Number(process.argv[3] || process.env.PORT || 8043);
const host = process.argv[4] || process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const HEADERS = {
  // Files are small and checked with ETags; the app keeps its own offline copy.
  'Cache-Control': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

async function read(file) {
  const data = await fs.promises.readFile(file);
  return { data, etag: `"${crypto.createHash('sha1').update(data).digest('base64url')}"` };
}

function send(req, res, status, file, { data, etag }) {
  const headers = { ...HEADERS, 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', ETag: etag };
  if (path.extname(file) === '.svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'";
  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  res.writeHead(status, { ...headers, 'Content-Length': data.length });
  res.end(req.method === 'HEAD' ? undefined : data);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    const url = new URL(req.url, 'http://localhost');
    if (process.env.FOG_LOG) console.log(`${req.method} ${url.pathname}`);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      pathname = '/\0';
    }
    const file = path.join(dir, path.normalize(pathname));
    if (pathname.includes('\0') || (file !== dir && !file.startsWith(dir + path.sep))) throw Object.assign(new Error('outside'), { code: 'ENOENT' });

    let target = file;
    const stat = await fs.promises.stat(file);
    if (stat.isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
        return res.end();
      }
      target = path.join(file, 'index.html');
    }
    send(req, res, 200, target, await read(target));
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR' && error.code !== 'EISDIR') console.error(error);
    try {
      send(req, res, 404, '404.html', await read(path.join(dir, '404.html')));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Page not found');
    }
  }
});

server.listen(port, host, () => console.log(`Serving ${dir} on http://${host}:${port}`));
