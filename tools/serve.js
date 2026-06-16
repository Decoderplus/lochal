// Statische server voor de LocHal-app (gebruikt door npm run serve én shot.js).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

export function startServer(port = 8123) {
  const server = http.createServer(async (req, res) => {
    try {
      let pad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (pad === '/') pad = '/index.html';
      const bestand = normalize(join(ROOT, pad));
      if (!bestand.startsWith(normalize(ROOT))) { res.writeHead(403); res.end(); return; }
      const data = await readFile(bestand);
      res.writeHead(200, { 'Content-Type': MIME[extname(bestand).toLowerCase()] ?? 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('404');
    }
  });
  server.listen(port);
  return server;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const port = Number(process.argv[2] ?? 8123);
  startServer(port);
  console.log(`LocHal: http://localhost:${port}/`);
}
