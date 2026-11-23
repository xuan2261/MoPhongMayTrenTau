import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {readFile} from "node:fs/promises";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

test("local server serves only UI and source, blocks dot-segments, and sets hardened headers", {timeout: 16000}, async () => {
  const port = await freeLoopbackPort();
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, ["tools/server.mjs"], {
    cwd: ROOT, env: {...process.env, PORT: String(port)},
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let exited = false;
  let stderr = "";
  child.once("exit", () => { exited = true; });
  child.stderr.on("data", bytes => { stderr += String(bytes); });
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      if (exited) throw new Error("server exited before readiness: " + stderr);
      try {
        const r = await fetch(origin + "/");
        ready = r.status === 200;
        if (ready) break;
      } catch {}
      await sleep(50);
    }
    assert.ok(ready, "server not ready on loopback");
    const index = await fetch(origin + "/");
    assert.equal(index.status, 200);
    const html = await index.text();
    assert.match(html, /<h1\b[^>]*>FCV-588/);
    assert.match(html, /Training Console<\/span>/);
    const csp = index.headers.get("content-security-policy") ?? "";
    assert.match(csp, /connect-src 'none'/);
    assert.match(csp, /form-action 'none'/);
    assert.match(csp, /frame-src 'none'/);
    assert.match(csp, /worker-src 'none'/);
    assert.equal(index.headers.get("referrer-policy"), "no-referrer");
    assert.equal(
      index.headers.get("permissions-policy"),
      "geolocation=(), microphone=(), camera=(), usb=(), serial=(), bluetooth=()",
    );
    assert.equal(index.headers.get("x-content-type-options"), "nosniff");
    assert.equal((await fetch(origin + "/src/core/session.mjs")).status, 200);
    assert.equal((await fetch(origin + "/web/styles.css")).status, 200);
    assert.equal((await fetch(origin + "/web/favicon.svg")).status, 200);
    for (const path of [
      "/docs/evidence/FCV-588.md",
      "/VietMoPhongChoTatCaCacMay.md",
      "/.git/config",
      "/web/%2e%2e/%2e%2e/VietMoPhongChoTatCaCacMay.md",
    ]) {
      assert.equal((await fetch(origin + path)).status, 404, path);
    }
    for (const dotPath of [
      "/web/.hidden.js",
      "/web/sub/.hidden.mjs",
      "/src/.hidden.mjs",
      "/src/core/.env.mjs",
    ]) {
      assert.equal((await fetch(origin + dotPath)).status, 403, dotPath);
    }
    assert.equal((await fetch(origin + "/", {method: "POST"})).status, 405);
  } finally {
    if (!exited) child.kill();
  }
});

test("runtime server fails closed on binary/media/json extensions and enforces 4 MiB ceiling", async () => {
  const source = await readFile(new URL("../tools/server.mjs", import.meta.url), "utf8");
  assert.match(source, /ALLOWED_SRC_EXTENSIONS/);
  assert.match(source, /ALLOWED_WEB_EXTENSIONS/);
  assert.match(source, /MAX_SERVED_FILE_BYTES\s*=\s*4\s*\*\s*1024\s*\*\s*1024/);
  assert.doesNotMatch(source, /"\.json"\s*:/,
    "unused .json MIME entry must be omitted from static server");
  assert.doesNotMatch(source, /MIME\[extname\(realFile\)\]\s*\?\?\s*"application\/octet-stream"/,
    "unrecognized extensions must never be served as generic binary downloads");
});
