import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawn, spawnSync} from "node:child_process";
import {once} from "node:events";
import {existsSync} from "node:fs";
import {mkdtemp, readFile, rm, stat} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {
  buildStandaloneHtml,
  findModuleSpecifiers,
} from "../tools/build_fcv588_standalone.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function findChromiumBinary() {
  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ];
  return candidates.find(bin => existsSync(bin)) ?? null;
}

async function runHeadlessFileSmoke(htmlFilePath, browserBin) {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "fcv588-standalone-cdp-"));
  const chrome = spawn(
    browserBin,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {stdio: ["ignore", "pipe", "pipe"], windowsHide: true},
  );

  let ws = null;
  try {
    const wsBrowserUrl = await new Promise((resolve, reject) => {
      let stderr = "";
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for DevTools WebSocket:\n${stderr}`)),
        15000,
      );
      chrome.stderr.on("data", chunk => {
        stderr += chunk.toString();
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      chrome.once("exit", code => {
        clearTimeout(timer);
        reject(new Error(`Browser exited early (${code}):\n${stderr}`));
      });
    });

    const debugPort = new URL(wsBrowserUrl).port;
    const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(r => r.json());
    const pageTarget = targets.find(t => t.type === "page");
    assert.ok(pageTarget?.webSocketDebuggerUrl, "Expected CDP page target");

    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let nextId = 1;
    const pending = new Map();
    const consoleErrors = [];
    const pageErrors = [];
    let markLoaded;
    const pageLoaded = new Promise(resolve => {
      markLoaded = resolve;
    });

    ws.onmessage = event => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && pending.has(msg.id)) {
        const entry = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
        else entry.resolve(msg.result);
        return;
      }
      if (msg.method === "Runtime.exceptionThrown") {
        const d = msg.params?.exceptionDetails;
        pageErrors.push(d?.exception?.description || d?.text || JSON.stringify(d));
      } else if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
        consoleErrors.push(
          (msg.params.args ?? []).map(a => a.value ?? a.description ?? "").join(" "),
        );
      } else if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") {
        const entry = msg.params.entry;
        // Ignore favicon-unrelated internal browser noise if any; capture all script/network errors
        consoleErrors.push(`${entry.source}: ${entry.text}`);
      } else if (msg.method === "Page.loadEventFired") {
        markLoaded?.();
      }
    };

    const send = (method, params = {}) => {
      const id = nextId++;
      ws.send(JSON.stringify({id, method, params}));
      return new Promise((resolve, reject) => pending.set(id, {resolve, reject}));
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");

    const fileUrl = pathToFileURL(htmlFilePath).href;
    await send("Page.navigate", {url: fileUrl});
    await pageLoaded;

    const evalRes = await send("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        await new Promise(r => setTimeout(r, 80));
        const powerBtn = document.getElementById("key-power");
        const stepBtn = document.getElementById("btn-step");
        const replayBtn = document.getElementById("btn-replay");
        if (!powerBtn || !stepBtn || !replayBtn) {
          throw new Error("Missing core FCV-588 controls in standalone DOM");
        }
        powerBtn.click();
        for (let i = 0; i < 4; i += 1) {
          stepBtn.click();
        }
        replayBtn.click();
        return {
          protocol: location.protocol,
          screenTop: document.getElementById("screen-top")?.textContent ?? "",
          offHidden: document.getElementById("off-screen")?.hidden ?? false,
          depthText: document.getElementById("depth-display")?.textContent ?? "",
          tickCount: document.getElementById("tick-count")?.textContent ?? "",
          validationStatus: document.getElementById("validation-status")?.textContent ?? "",
        };
      })()`,
    });

    if (evalRes.exceptionDetails) {
      throw new Error(`Renderer evaluation threw: ${JSON.stringify(evalRes.exceptionDetails)}`);
    }

    return {
      state: evalRes.result.value,
      consoleErrors,
      pageErrors,
    };
  } finally {
    try {
      ws?.close();
    } catch {
      // ignore close errors
    }
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill("SIGKILL");
      await once(chrome, "exit").catch(() => {});
    }
    await rm(userDataDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 100});
  }
}

test("ESM lexical specifier parser handles multiline imports/exports while ignoring comments, strings, and regexes", () => {
  const sample = [
    "// import fake from './comment.mjs';",
    "/* export * from './block-comment.mjs'; */",
    "import {\n  alpha,\n  from as aliasedFrom,\n} from \"../src/core/protocol.mjs\";",
    "import * as ns from './local-ns.mjs';",
    "import './side-effect.mjs';",
    "export {\n  alpha as beta\n} from './reexport.mjs';",
    "export * from './star-reexport.mjs';",
    "const str = \"import x from './inside-string.mjs'\";",
    "const tpl = `prefix ${`import y from './inside-tpl.mjs'`} suffix`;",
    "const rx = /import z from '.\\/inside-regex.mjs'/g;",
    "export function keepLocal() { const from = './not-an-import.mjs'; return from; }",
  ].join("\n");

  const found = findModuleSpecifiers(sample).map(t => t.value);
  assert.deepEqual(found, [
    "../src/core/protocol.mjs",
    "./local-ns.mjs",
    "./side-effect.mjs",
    "./reexport.mjs",
    "./star-reexport.mjs",
  ]);
});

test("build_fcv588_standalone.mjs passes --check without writing disk and builds self-contained dist/FCV-588-Standalone.html", async () => {
  const checkRun = spawnSync(
    process.execPath,
    ["tools/build_fcv588_standalone.mjs", "--check"],
    {cwd: ROOT, encoding: "utf8", windowsHide: true},
  );
  assert.equal(checkRun.status, 0, checkRun.stderr || checkRun.stdout);
  const checkJson = JSON.parse(checkRun.stdout.trim());
  assert.equal(checkJson.status, "STANDALONE_HTML_CHECK_PASS");
  assert.ok(checkJson.modulesBundled >= 30, `expected >= 30 modules, got ${checkJson.modulesBundled}`);

  const buildRun = spawnSync(
    process.execPath,
    ["tools/build_fcv588_standalone.mjs"],
    {cwd: ROOT, encoding: "utf8", windowsHide: true},
  );
  assert.equal(buildRun.status, 0, buildRun.stderr || buildRun.stdout);
  const buildJson = JSON.parse(buildRun.stdout.trim());
  assert.equal(buildJson.status, "STANDALONE_HTML_BUILT");
  assert.equal(buildJson.output, "dist/FCV-588-Standalone.html");
  assert.equal(buildJson.modulesBundled, checkJson.modulesBundled);

  const outPath = path.join(ROOT, "dist", "FCV-588-Standalone.html");
  const htmlBytes = await readFile(outPath);
  const actualSha = createHash("sha256").update(htmlBytes).digest("hex");
  assert.equal(actualSha, buildJson.sha256);
  assert.equal(htmlBytes.length, buildJson.bytes);

  const html = htmlBytes.toString("utf8");
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml;base64,/);
  assert.match(html, /<style>[\s\S]*<\/style>/);
  assert.doesNotMatch(html, /(?:href|src)=["']\/(?:web|src)\//i);

  const importMapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(importMapMatch, "Standalone HTML must include <script type=\"importmap\">");
  const importMap = JSON.parse(importMapMatch[1]);
  const entries = Object.entries(importMap.imports);
  assert.equal(entries.length, buildJson.modulesBundled);

  for (const [spec, dataUrl] of entries) {
    assert.ok(spec.startsWith("fcv://"), `unexpected specifier key: ${spec}`);
    assert.ok(
      dataUrl.startsWith("data:text/javascript;charset=utf-8;base64,"),
      `expected base64 JS data URL for ${spec}`,
    );
    const b64 = dataUrl.slice("data:text/javascript;charset=utf-8;base64,".length);
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    for (const innerSpec of findModuleSpecifiers(decoded)) {
      assert.ok(
        innerSpec.value.startsWith("fcv://") && Object.hasOwn(importMap.imports, innerSpec.value),
        `unresolved specifier ${innerSpec.value} inside bundled ${spec}`,
      );
    }
  }

  // Also verify programmatic API in-memory mode does not require writing
  const memResult = await buildStandaloneHtml({rootDir: ROOT, write: false});
  assert.equal(memResult.sha256, buildJson.sha256);
});

test("Real Headless Chrome loads file:///.../dist/FCV-588-Standalone.html offline with zero errors, powers on to AUTO_R, and passes replay", async (t) => {
  const browserBin = findChromiumBinary();
  if (!browserBin) {
    t.skip("No local Chrome/Edge binary found for headless file:// CDP verification");
    return;
  }

  const outPath = path.join(ROOT, "dist", "FCV-588-Standalone.html");
  if (!existsSync(outPath)) {
    await buildStandaloneHtml({rootDir: ROOT, write: true});
  }

  const {state, consoleErrors, pageErrors} = await runHeadlessFileSmoke(outPath, browserBin);
  assert.deepEqual(pageErrors, [], `Unexpected page errors on file:// load: ${pageErrors.join("; ")}`);
  assert.deepEqual(consoleErrors, [], `Unexpected console errors on file:// load: ${consoleErrors.join("; ")}`);
  assert.equal(state.protocol, "file:");
  assert.equal(state.offHidden, true, "LCD off-screen veil must be hidden after powering on and stepping 4 ticks");
  assert.match(state.screenTop, /AUTO_R/, `Expected LCD screen-top header to include AUTO_R, got: ${state.screenTop}`);
  assert.equal(state.tickCount, "0004");
  assert.match(state.validationStatus, /REPLAY PASS/i);
});

test("Electron sync, offline bundle security gates, Windows installer configs, launchers, and Electron test suites pass", async () => {
  const bundleRun = spawnSync(
    process.execPath,
    ["apps/fcv588-electron-p30/desktop/build-bundle.mjs"],
    {cwd: ROOT, encoding: "utf8", windowsHide: true},
  );
  assert.equal(bundleRun.status, 0, bundleRun.stderr || bundleRun.stdout);
  const bundleSummary = JSON.parse(bundleRun.stdout.trim());
  assert.equal(bundleSummary.status, "BUNDLE_ALLOWLIST_PASS");
  assert.equal(bundleSummary.forbiddenOEMFilesPacked, 0);
  assert.ok(bundleSummary.webSrcFiles >= 45);

  const manifestPath = path.join(ROOT, "apps/fcv588-electron-p30/bundle/runtime-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.schema, "FCV588_ELECTRON_RUNTIME_MANIFEST_V1");
  assert.equal(manifest.forbiddenOEMFilesPacked, 0);
  assert.ok(Object.hasOwn(manifest.files, "src/core/maritime-world.mjs"));
  assert.ok(Object.hasOwn(manifest.files, "src/devices/fcv588/i18n.mjs"));
  assert.ok(Object.hasOwn(manifest.files, "web/desktop-settings.mjs"));

  // Verify Electron main.cjs and builder configuration contracts
  const mainCjs = await readFile(path.join(ROOT, "apps/fcv588-electron-p30/desktop/main.cjs"), "utf8");
  assert.match(mainCjs, /FURUNO FCV-588 — Mô phỏng Máy Đo Sâu Dò Cá Độc Lập/);
  assert.match(mainCjs, /app\.setAccessibilitySupportEnabled\(true\)/);
  assert.match(mainCjs, /input\.key==="F11"/);
  assert.match(mainCjs, /\^FCV588-\[A-Za-z0-9\._-\]\+\\\.json\$/);

  const electronPkg = JSON.parse(
    await readFile(path.join(ROOT, "apps/fcv588-electron-p30/package.json"), "utf8"),
  );
  assert.equal(electronPkg.version, "1.0.0");
  assert.equal(electronPkg.devDependencies.electron, "^33.3.1");
  assert.equal(electronPkg.devDependencies["electron-builder"], "^25.1.8");
  assert.equal(electronPkg.devDependencies["@electron/fuses"], "^1.8.0");

  for (const relFile of [
    "apps/fcv588-electron-p30/desktop/fcv588-builder.config.cjs",
    "Chay-FCV588.bat",
    "DongGoi-BoCai-FCV588.bat",
    ".github/workflows/release-fcv588-standalone.yml",
  ]) {
    const st = await stat(path.join(ROOT, relFile));
    assert.ok(st.isFile() && st.size > 100, `Expected non-empty ${relFile}`);
  }

  // Run both Electron test suites
  const electronTests = spawnSync(
    process.execPath,
    [
      "--test",
      "apps/fcv588-electron-p30/desktop/settings-transfer.test.mjs",
      "apps/fcv588-electron-p30/test/fcv588-p28-mode-replay-matrix.test.mjs",
    ],
    {cwd: ROOT, encoding: "utf8", windowsHide: true},
  );
  assert.equal(electronTests.status, 0, electronTests.stderr || electronTests.stdout);
});
