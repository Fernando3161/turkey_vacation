const fs = require("fs");
const http = require("http");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webp", "image/webp"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ico", "image/x-icon"]
]);

function send(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    "content-type": contentType || "text/plain; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(REPO_ROOT, `.${requestedPath}`);

  if (!filePath.startsWith(REPO_ROOT)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);
  const filePath = resolveRequestPath(requestUrl.pathname);

  if (!filePath) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(response, error.code === "ENOENT" ? 404 : 500, error.code || "Server error");
      return;
    }

    const contentType = MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
    send(response, 200, content, contentType);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${REPO_ROOT} at http://${HOST}:${PORT}/`);
});
