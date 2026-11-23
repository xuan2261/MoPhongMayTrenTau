/**
 * Strict localhost-only static server for the training F0 demo.
 * Serves only /web and /src; never exposes workspace documents or host devices.
 */
import http from "node:http";
import {readFile, realpath, stat} from "node:fs/promises";
import {dirname, extname, isAbsolute, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = resolve(ROOT, "web");
const SRC = resolve(ROOT, "src");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 4173);
const MAX_SERVED_FILE_BYTES = 4 * 1024 * 1024;
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error("invalid local port");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
// Public trees are not generic file-download endpoints. If an OEM/manual/media
// asset is accidentally placed under src/ or web/, still deny its bytes.
const ALLOWED_SRC_EXTENSIONS = new Set([".mjs", ".js"]);
const ALLOWED_WEB_EXTENSIONS = new Set([".html", ".mjs", ".js", ".css", ".svg"]);
const inside = (root, target) => {
  const rel = relative(root, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel));
};
const hasDotOrEmptySegment = relPath =>
  relPath.split(/[\\/]/).some(segment => segment === "" || segment.startsWith("."));

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), usb=(), serial=(), bluetooth=()");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405); res.end("Method not allowed"); return;
  }
  try {
    const url = new URL(req.url, "http://" + HOST + ":" + PORT);
    const decoded = decodeURIComponent(url.pathname);
    let base;
    let requestPath;
    if (decoded === "/") {
      base = WEB; requestPath = "index.html";
    } else if (decoded.startsWith("/web/")) {
      base = WEB; requestPath = decoded.slice(5);
    } else if (decoded.startsWith("/src/")) {
      base = SRC; requestPath = decoded.slice(5);
    } else {
      res.writeHead(404); res.end("Not found"); return;
    }
    if (hasDotOrEmptySegment(requestPath)) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    const path = resolve(base, requestPath);
    if (!inside(base, path)) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    const realBase = await realpath(base);
    const realFile = await realpath(path);
    const relReal = relative(realBase, realFile);
    const info = await stat(realFile);
    if (!inside(realBase, realFile) || hasDotOrEmptySegment(relReal) ||
        !info.isFile() || info.size > MAX_SERVED_FILE_BYTES) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    const extension = extname(realFile).toLowerCase();
    const allowed = base === SRC ? ALLOWED_SRC_EXTENSIONS : ALLOWED_WEB_EXTENSIONS;
    if (!allowed.has(extension)) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    const content = await readFile(realFile);
    if (content.byteLength > MAX_SERVED_FILE_BYTES) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    res.writeHead(200, {"Content-Type": MIME[extension]});
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
});
server.listen(PORT, HOST, () => {
  console.log("TRAINING-ONLY local UI: http://" + HOST + ":" + PORT);
});
