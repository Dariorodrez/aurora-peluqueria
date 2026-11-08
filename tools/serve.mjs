#!/usr/bin/env node
/**
 * Servidor estático mínimo (sin dependencias) para desarrollo y para los tests
 * de Playwright. No cachea, no lista directorios y no sale de la raíz.
 *
 *   node tools/serve.mjs            → http://127.0.0.1:4173
 *   PORT=8080 node tools/serve.mjs
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    send(res, 405, "Method not allowed", { allow: "GET, HEAD" });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", `http://${host}`).pathname);
  } catch {
    send(res, 400, "Bad request");
    return;
  }

  let filePath = resolve(join(root, pathname));
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    send(res, 403, "Forbidden");
    return;
  }

  let info = await stat(filePath).catch(() => null);
  if (info?.isDirectory()) {
    filePath = join(filePath, "index.html");
    info = await stat(filePath).catch(() => null);
  }

  if (!info?.isFile()) {
    send(res, 404, "Not found");
    return;
  }

  const body = await readFile(filePath);
  res.writeHead(200, {
    "content-type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "content-length": body.byteLength,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(method === "HEAD" ? undefined : body);
});

server.listen(port, host, () => {
  console.log(`Aurora en http://${host}:${port}`);
});
