const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const root = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const send = (response, status, body, contentType = 'text/plain; charset=utf-8') => {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store'
  });
  response.end(body);
};

const resolvePath = (urlPath) => {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const requested = cleanPath === '/' ? '/index.html' : cleanPath;
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    return null;
  }

  return filePath;
};

const server = http.createServer((request, response) => {
  const filePath = resolvePath(request.url || '/');

  if (!filePath) {
    send(response, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(root, 'index.html'), (fallbackError, fallbackData) => {
          if (fallbackError) {
            send(response, 404, 'Not found');
            return;
          }
          send(response, 200, fallbackData, mimeTypes['.html']);
        });
        return;
      }

      send(response, 500, 'Server error');
      return;
    }

    send(response, 200, data, mimeTypes[path.extname(filePath)] || 'application/octet-stream');
  });
});

server.listen(port, () => {
  console.log(`SnapPass running on port ${port}`);
});
