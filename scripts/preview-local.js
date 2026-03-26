const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = 4173;

const MIME_TYPES = {
  ".css": "text/css; charset=UTF-8",
  ".html": "text/html; charset=UTF-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=UTF-8",
  ".xml": "application/xml; charset=UTF-8",
};

function resolvePath(urlPath) {
  const sanitized = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = sanitized === "/" ? "index.html" : sanitized.replace(/^\/+/, "");
  const normalized = path.normalize(relativePath);
  return path.join(ROOT, normalized);
}

const server = http.createServer((request, response) => {
  const filePath = resolvePath(request.url || "/");

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    response.end("Acceso denegado.");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      response.end("No encontrado.");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });

    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, () => {
  console.log(`Vista previa disponible en http://localhost:${PORT}`);
});
