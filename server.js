/* server.js — локальный статический сервер для просмотра вживую.
   Запуск: node server.js [порт]   (по умолчанию 8080) */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml"
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const target = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  const file = path.join(ROOT, target);

  if (!file.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("403");
    return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404 — не найдено: " + target);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log("Свод открыт: http://localhost:" + PORT + "/   (Ctrl+C — остановить)");
});