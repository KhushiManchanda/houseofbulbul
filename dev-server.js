// ============================================================
// HOUSE OF BULBUL — LOCAL DEVELOPMENT SERVER
// Serves static assets, SPA routes, and executes /api serverless functions
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function resolveApiHandler(apiPath) {
  const parts = apiPath.replace(/^\/+|\/+$/g, '').split('/');
  return findHandler(path.join(ROOT, 'api'), parts, {});
}

function findHandler(currentDir, parts, queryParams) {
  if (!fs.existsSync(currentDir)) return null;

  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    const indexPath = path.join(currentDir, 'index.js');
    if (fs.existsSync(indexPath)) return { file: indexPath, params: queryParams };
    return null;
  }

  const [segment, ...rest] = parts;

  // Direct file match
  if (rest.length === 0) {
    const directFile = path.join(currentDir, `${segment}.js`);
    if (fs.existsSync(directFile)) return { file: directFile, params: queryParams };
  }

  // Direct directory match
  const directDir = path.join(currentDir, segment);
  if (fs.existsSync(directDir) && fs.statSync(directDir).isDirectory()) {
    const res = findHandler(directDir, rest, queryParams);
    if (res) return res;
  }

  // Dynamic file [param].js
  if (rest.length === 0) {
    const files = fs.readdirSync(currentDir);
    const dynamicFile = files.find(f => f.startsWith('[') && f.endsWith('].js'));
    if (dynamicFile) {
      const paramName = dynamicFile.slice(1, -5);
      return {
        file: path.join(currentDir, dynamicFile),
        params: { ...queryParams, [paramName]: segment }
      };
    }
  }

  // Dynamic dir [param]
  const files = fs.readdirSync(currentDir);
  const dynamicDir = files.find(f => f.startsWith('[') && f.endsWith(']') && fs.statSync(path.join(currentDir, f)).isDirectory());
  if (dynamicDir) {
    const paramName = dynamicDir.slice(1, -1);
    return findHandler(path.join(currentDir, dynamicDir), rest, { ...queryParams, [paramName]: segment });
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Extend response with Express/Vercel helper methods
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    this.end(JSON.stringify(data));
    return this;
  };
  res.send = function(data) {
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return this.json(data);
    }
    this.end(data);
    return this;
  };

  // 1. API routes
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.slice(4);
    try {
      const match = resolveApiHandler(apiPath);
      if (match) {
        req.query = { ...parsedUrl.query, ...match.params };
        // Delete require cache in development for hot reloading
        delete require.cache[require.resolve(match.file)];
        const handler = require(match.file);
        return await handler(req, res);
      } else {
        return res.status(404).json({ error: `API route not found: ${pathname}` });
      }
    } catch (err) {
      console.error(`API Error on ${pathname}:`, err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
      return;
    }
  }

  // 2. Admin rewrite
  let filePath;
  if (pathname === '/admin' || pathname === '/admin/') {
    filePath = path.join(ROOT, 'admin', 'index.html');
  } else {
    filePath = path.join(ROOT, pathname);
  }

  // 3. Static file check
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return fs.createReadStream(filePath).pipe(res);
  }

  // 4. Directory index
  const dirIndex = path.join(filePath, 'index.html');
  if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return fs.createReadStream(dirIndex).pipe(res);
  }

  // 5. SPA Fallback (Storefront routes like /products/:slug)
  if (!pathname.startsWith('/admin')) {
    const spaIndex = path.join(ROOT, 'index.html');
    if (fs.existsSync(spaIndex)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return fs.createReadStream(spaIndex).pipe(res);
    }
  }

  res.status(404).end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🪶 House of Bulbul Local Dev Server`);
  console.log(`   ➜ Storefront: http://localhost:${PORT}`);
  console.log(`   ➜ Admin:      http://localhost:${PORT}/admin\n`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    const altPort = PORT + 1;
    console.log(`Port ${PORT} in use, trying ${altPort}...`);
    server.listen(altPort, () => {
      console.log(`\n🪶 House of Bulbul Local Dev Server`);
      console.log(`   ➜ Storefront: http://localhost:${altPort}`);
      console.log(`   ➜ Admin:      http://localhost:${altPort}/admin\n`);
    });
  } else {
    console.error('Server error:', e);
  }
});
