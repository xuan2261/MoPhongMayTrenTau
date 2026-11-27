import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {existsSync, lstatSync} from "node:fs";
import {mkdir, mkdtemp, readdir, readFile, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {withLoopbackServer} from "./helpers/loopback-server.mjs";
import {
  REPO_ROOT,
  loadBundler,
  readWorkspaceJson,
  readWorkspaceText,
} from "./helpers/module-loader.mjs";
import {
  BRIDGE_RUNTIME_VERSION,
  CORE_CONTRACT_VERSION,
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  EVENT_SCHEMA_VERSION,
  FCV588_ADAPTER,
  MARITIME_WORLD_VERSION,
  NMEA_BUS_CONTRACT_VERSION,
  REPLAY_ENVELOPE_VERSION,
  assertValidNmeaSentence,
  initialMaritimeWorldState,
  projectMaritimeSensorBus,
} from "./helpers/session-driver.mjs";
import {assertCleanExecutableTokens} from "./tier1-web-console-ui.mjs";

export const TIER = 2;
export const SUITE = "tier2-security-packaging-isolation-bounds";

async function walkTreeEntries(relDir) {
  const absRoot = path.join(REPO_ROOT, relDir);
  const out = [];
  const walk = async dir => {
    const entries = await readdir(dir, {withFileTypes: true});
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const rel = path.relative(REPO_ROOT, abs);
      const lst = lstatSync(abs);
      out.push({name: e.name, rel, abs, stat: lst, isDir: e.isDirectory()});
      if (e.isDirectory() && !lst.isSymbolicLink()) await walk(abs);
    }
  };
  await walk(absRoot);
  return out;
}

async function withTempBundlerFixture(prefix, appSource, fn) {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    await mkdir(path.join(tmpRoot, "src"), {recursive: true});
    await mkdir(path.join(tmpRoot, "web", "mdc2060"), {recursive: true});
    await writeFile(path.join(tmpRoot, "src", "noop.mjs"), "export const noop = 1;\n", "utf8");
    await writeFile(
      path.join(tmpRoot, "web", "favicon.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"></svg>\n',
      "utf8",
    );
    await writeFile(path.join(tmpRoot, "web", "mdc2060", "styles.css"), "body { margin: 0; }\n", "utf8");
    await writeFile(
      path.join(tmpRoot, "web", "mdc2060", "index.html"),
      '<!doctype html><html lang="vi"><head><meta charset="utf-8"><link rel="icon" href="/web/favicon.svg"><link rel="stylesheet" href="/web/mdc2060/styles.css"></head><body><script type="module" src="/web/mdc2060/app.mjs"></script></body></html>\n',
      "utf8",
    );
    await writeFile(path.join(tmpRoot, "web", "mdc2060", "app.mjs"), appSource, "utf8");
    return await fn(tmpRoot);
  } finally {
    await rm(tmpRoot, {recursive: true, force: true});
  }
}

export const TESTS = [
  {
    id: "T2-083",
    name: "Server Path Traversal Blocking on /mdc2060 & /web/mdc2060",
    features: [34],
    async run() {
      await withLoopbackServer(async server => {
        const probes = [
          "/mdc2060/../docs/evidence/device-register.json",
          "/web/mdc2060/../../package.json",
          "/web/mdc2060/%2e%2e/%2e%2e/package.json",
          "/src/%2e%2e/package.json",
        ];
        for (const p of probes) {
          const res = await server.fetchPath(p);
          const body = await res.text();
          assert.ok(res.status === 403 || res.status === 404, `Traversal probe ${p} returned ${res.status}`);
          assert.doesNotMatch(body, /"schemaVersion"|"scripts"|"devDependencies"/, `Traversal probe ${p} leaked workspace content`);
        }
      });
    },
  },
  {
    id: "T2-084",
    name: "Server Dot-Segment & Restricted Tree Blocking",
    features: [34],
    async run() {
      await withLoopbackServer(async server => {
        const probes = [
          "/web/mdc2060/.env",
          "/src/devices/mdc2060/.hidden",
          "/docs/evidence/device-register.json",
          "/sources/manuals/MANIFEST.json",
        ];
        for (const p of probes) {
          const res = await server.fetchPath(p);
          await res.arrayBuffer();
          assert.ok(res.status === 403 || res.status === 404, `Restricted path ${p} returned ${res.status}`);
        }
      });
    },
  },
  {
    id: "T2-085",
    name: "Server HTTP Method Enforcement (405 on POST/PUT/DELETE, 200 Empty Body on HEAD)",
    features: [34],
    async run() {
      await withLoopbackServer(async server => {
        await server.assertHttpOk("/mdc2060");
        for (const method of ["POST", "PUT", "DELETE"]) {
          const res = await server.fetchPath("/mdc2060", {method});
          await res.arrayBuffer();
          assert.equal(res.status, 405, `${method} /mdc2060 must return 405`);
        }
        const headRes = await server.fetchPath("/mdc2060", {method: "HEAD"});
        const headBody = await headRes.text();
        assert.equal(headRes.status, 200);
        assert.equal(headRes.headers.get("content-type"), "text/html; charset=utf-8");
        assert.equal(headBody.length, 0, "HEAD /mdc2060 must return empty body");
      });
    },
  },
  {
    id: "T2-086",
    name: "Server Security Headers & 4 MiB Constant Guard Intact",
    features: [34],
    async run() {
      const serverSrc = await readWorkspaceText("tools/server.mjs");
      assert.match(serverSrc, /MAX_SERVED_FILE_BYTES\s*=\s*4\s*\*\s*1024\s*\*\s*1024/);
      assert.doesNotMatch(serverSrc, /"\.json"\s*:/, "tools/server.mjs must not serve .json MIME type");
      await withLoopbackServer(async server => {
        const res = await server.assertHttpOk("/mdc2060");
        const csp = res.headers.get("content-security-policy") ?? "";
        for (const token of ["default-src 'self'", "script-src 'self'", "connect-src 'none'", "frame-ancestors 'none'", "worker-src 'none'"]) {
          assert.ok(csp.includes(token), `CSP missing "${token}"`);
        }
        assert.match(res.headers.get("permissions-policy") ?? "", /usb=\(\)/);
        assert.equal(res.headers.get("referrer-policy"), "no-referrer");
        assert.equal(res.headers.get("x-content-type-options"), "nosniff");
        assert.equal(res.headers.get("cache-control"), "no-store");
      });
    },
  },
  {
    id: "T2-087",
    name: "Server Rejects Disallowed Extensions Under /src/ & /web/",
    features: [34],
    async run() {
      await withLoopbackServer(async server => {
        for (const p of ["/src/devices/mdc2060/spec.json", "/web/mdc2060/icon.png", "/web/mdc2060/font.woff2"]) {
          const res = await server.fetchPath(p);
          await res.arrayBuffer();
          assert.ok(res.status === 403 || res.status === 404, `Disallowed extension ${p} returned ${res.status}`);
        }
      });
    },
  },
  {
    id: "T2-088",
    name: "FCV-588 Non-Regression: web/index.html Contains ZERO MDC-2060 / KODEN J2000 Mentions",
    features: [35],
    async run() {
      const fcvHtml = await readWorkspaceText("web/index.html");
      assert.doesNotMatch(fcvHtml, /MDC-2060|KODEN J2000/, "web/index.html must never mention MDC-2060 or KODEN J2000");
    },
  },
  {
    id: "T2-089",
    name: "FCV-588 Non-Regression: DEFAULT_BRIDGE_WORLD_SCENARIO Completely Unmodified",
    features: [30, 35],
    async run() {
      assert.equal(MARITIME_WORLD_VERSION, "maritime-2d-world-v1");
      assert.equal(NMEA_BUS_CONTRACT_VERSION, "nmea0183-bridge-bus-v1");
      assert.equal(DEFAULT_BRIDGE_WORLD_SCENARIO.id, "bridge-coastal-traffic-001");
      assert.equal(DEFAULT_BRIDGE_WORLD_SCENARIO.traffic.length, 2);
      assert.deepEqual(
        DEFAULT_BRIDGE_WORLD_SCENARIO.traffic.map(t => t.name),
        ["PACIFIC STAR", "HAI AU 18"],
      );
      const bus = projectMaritimeSensorBus(
        DEFAULT_BRIDGE_WORLD_SCENARIO,
        initialMaritimeWorldState(DEFAULT_BRIDGE_WORLD_SCENARIO),
      );
      assert.equal(bus.sentences.length, 7);
      assert.ok(bus.sentences.includes("$HEHDT,89.0,T*1E"), `Core bridge NMEA bus must preserve exact $HEHDT,89.0,T*1E sentence, got ${JSON.stringify(bus.sentences)}`);
      for (const s of bus.sentences) {
        assertValidNmeaSentence(s);
      }
    },
  },
  {
    id: "T2-090",
    name: "device-register.json: Universal HOLD, assetLicenseClearance: false, firmwareVersion: null Across All 6 Devices",
    features: [1, 35],
    async run() {
      const reg = await readWorkspaceJson("docs/evidence/device-register.json");
      assert.equal(reg.devices.length, 6);
      const ids = new Set();
      for (const d of reg.devices) {
        assert.equal(d.releaseApproval, "HOLD", `${d.profileId} must stay releaseApproval: HOLD`);
        assert.equal(d.assetLicenseClearance, false, `${d.profileId} must stay assetLicenseClearance: false`);
        assert.equal(d.firmwareVersion, null, `${d.profileId} must stay firmwareVersion: null`);
        ids.add(d.profileId);
      }
      assert.equal(ids.size, 6, "All 6 device profileIds must be unique");
    },
  },
  {
    id: "T2-091",
    name: "device-register.json: Remaining 4 Devices Strictly NOT_STARTED & KODEN J2000 identity-HOLD",
    features: [35],
    async run() {
      const reg = await readWorkspaceJson("docs/evidence/device-register.json");
      assert.equal(reg.devices[1].profileId, "koden.mdc2060.mrd104");
      const others = reg.devices.filter(
        d => d.profileId !== "furuno.fcv588.cv588e" && d.profileId !== "koden.mdc2060.mrd104",
      );
      assert.equal(others.length, 4);
      for (const d of others) {
        assert.equal(d.implementationStatus, "NOT_STARTED", `${d.profileId} must stay NOT_STARTED`);
        assert.equal(d.profileRevision, null);
        assert.equal(d.controllerVariant, null);
      }
      const j2000 = others.find(d => d.profileId.includes("j2000"));
      assert.ok(j2000);
      assert.equal(j2000.evidenceStatus, "identity-HOLD");
    },
  },
  {
    id: "T2-092",
    name: "device-register.json: KODEN Manual AI-Processing Hold Preserved",
    features: [35],
    async run() {
      const reg = await readWorkspaceJson("docs/evidence/device-register.json");
      const mdc = reg.devices[1];
      assert.match(String(mdc.manualRights), /RESTRICTED_REFERENCE_ONLY/);
      assert.match(String(mdc.manualRights), /PERMISSION_REQUIRED_FOR_AI_PROCESSING/);
      assert.ok(Array.isArray(mdc.manualArchive) && mdc.manualArchive.length === 3);
    },
  },
  {
    id: "T2-093",
    name: "Standalone Bundler Rejects import.meta in Runtime Modules",
    features: [34],
    async run() {
      const bundler = await loadBundler();
      const tmpOutDir = await mkdtemp(path.join(os.tmpdir(), "mdc2060-e2e-t2093-out-"));
      const outPath = path.join(tmpOutDir, "standalone.html");
      let html;
      try {
        const res = await bundler.buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: false});
        html = typeof res?.html === "string"
          ? res.html
          : (await bundler.buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: true}), await readFile(outPath, "utf8"));
      } finally {
        await rm(tmpOutDir, {recursive: true, force: true});
      }
      assert.ok(typeof html === "string" && html.length > 0, "buildStandaloneHtml must produce non-empty standalone HTML");
      const mapMatch = html.match(/<script\s+type=["']importmap["']>([\s\S]*?)<\/script>/i);
      assert.ok(mapMatch, "Standalone HTML must include <script type=\"importmap\">");
      const map = JSON.parse(mapMatch[1]);
      const entries = Object.entries(map.imports ?? {});
      assert.ok(entries.length >= 10, `Expected >= 10 bundled importmap modules, got ${entries.length}`);
      for (const [spec, dataUrl] of entries) {
        const b64 = String(dataUrl).split("base64,")[1] ?? "";
        assert.ok(b64.length > 0, `Bundled module ${spec} must contain non-empty base64 payload`);
        const decoded = Buffer.from(b64, "base64").toString("utf8");
        assertCleanExecutableTokens(spec, decoded, bundler.tokenizeModule);
      }

      await withTempBundlerFixture(
        "mdc2060-e2e-t2093-",
        "export const leaked = import.meta.url;\n",
        async tmpRoot => {
          await assert.rejects(
            () => bundler.buildStandaloneHtml({rootDir: tmpRoot, write: false}),
            err => err instanceof Error && /import\.meta/i.test(err.message) && !/ENOENT/i.test(err.message),
            "buildStandaloneHtml must reject a runtime module containing import.meta (and not fail with ENOENT)",
          );
        },
      );
    },
  },
  {
    id: "T2-094",
    name: "Standalone Bundler Detects Specifiers & Rejects External https:// & Bare Specifiers",
    features: [34],
    async run() {
      const {findModuleSpecifiers, buildStandaloneHtml} = await loadBundler();
      const sample = [
        'import {a} from "./local.mjs";',
        'export * from "../shared.mjs";',
        'const x = import("https://cdn.example.com/x.js");',
        'import lodash from "lodash";',
      ].join("\n");
      const found = findModuleSpecifiers(sample);
      const specs = found.map(item => (typeof item === "string" ? item : (item?.value ?? item?.specifier)));
      assert.ok(specs.includes("./local.mjs"));
      assert.ok(specs.includes("../shared.mjs"));
      assert.ok(specs.includes("https://cdn.example.com/x.js"));
      assert.ok(specs.includes("lodash"));

      await withTempBundlerFixture(
        "mdc2060-e2e-t2094-https-",
        'import "https://cdn.example.com/x.js";\n',
        async tmpRoot => {
          await assert.rejects(
            () => buildStandaloneHtml({rootDir: tmpRoot, write: false}),
            err => err instanceof Error && /specifier|bare|external|https|unsupported|invalid|remote/i.test(err.message) && !/ENOENT/i.test(err.message),
            "buildStandaloneHtml must reject external https:// module specifiers",
          );
        },
      );

      await withTempBundlerFixture(
        "mdc2060-e2e-t2094-bare-",
        'import lodash from "lodash";\nexport const x = lodash;\n',
        async tmpRoot => {
          await assert.rejects(
            () => buildStandaloneHtml({rootDir: tmpRoot, write: false}),
            err => err instanceof Error && /specifier|bare|external|lodash|unsupported|invalid/i.test(err.message) && !/ENOENT/i.test(err.message),
            "buildStandaloneHtml must reject bare npm module specifiers",
          );
        },
      );
    },
  },
  {
    id: "T2-095",
    name: "Standalone HTML Output Zero External Asset Leakage & Strict Offline CSP",
    features: [34],
    async run() {
      const {buildStandaloneHtml} = await loadBundler();
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mdc2060-e2e-t2095-"));
      const outPath = path.join(tmpDir, "standalone.html");
      try {
        const res = await buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: false});
        const html = typeof res?.html === "string"
          ? res.html
          : (await buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: true}), await readFile(outPath, "utf8"));
        assert.doesNotMatch(html, /(?:href|src)=["']\/(?:web|src)\//i);
        assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i);
        const imIdx = html.search(/<script\s+type=["']importmap["']>/i);
        const modIdx = html.search(/<script\s+type=["']module["']>/i);
        assert.ok(imIdx > 0 && modIdx > imIdx);
        assert.match(html, /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*connect-src 'none'/i);
      } finally {
        await rm(tmpDir, {recursive: true, force: true});
      }
    },
  },
  {
    id: "T2-096",
    name: "Runtime Asset Extension & Size Policy (<= 4,000,000 Bytes, Zero Binaries/Dotfiles/Symlinks)",
    features: [28, 29, 35],
    async run() {
      // Ensure directories exist
      await readWorkspaceText("src/devices/mdc2060/spec.mjs");
      await readWorkspaceText("web/mdc2060/index.html");
      const srcEntries = await walkTreeEntries("src/devices/mdc2060");
      const webEntries = await walkTreeEntries("web/mdc2060");
      const allowedSrc = new Set([".mjs", ".js"]);
      const allowedWeb = new Set([".html", ".mjs", ".js", ".css", ".svg"]);

      assert.ok(srcEntries.some(e => !e.isDir), "src/devices/mdc2060 must contain files");
      assert.ok(webEntries.some(e => !e.isDir), "web/mdc2060 must contain files");

      for (const e of srcEntries) {
        assert.equal(e.stat.isSymbolicLink(), false, `Symlink forbidden in src/: ${e.rel}`);
        assert.equal(e.name.startsWith("."), false, `Dotfile forbidden in src/: ${e.rel}`);
        if (!e.isDir) {
          assert.ok(allowedSrc.has(path.extname(e.name).toLowerCase()), `Forbidden extension in src/: ${e.rel}`);
          assert.ok(e.stat.size <= 4_000_000, `File exceeds 4MB limit: ${e.rel}`);
        }
      }
      for (const e of webEntries) {
        assert.equal(e.stat.isSymbolicLink(), false, `Symlink forbidden in web/: ${e.rel}`);
        assert.equal(e.name.startsWith("."), false, `Dotfile forbidden in web/: ${e.rel}`);
        if (!e.isDir) {
          assert.ok(allowedWeb.has(path.extname(e.name).toLowerCase()), `Forbidden extension in web/: ${e.rel}`);
          assert.ok(e.stat.size <= 4_000_000, `File exceeds 4MB limit: ${e.rel}`);
        }
      }
    },
  },
  {
    id: "T2-097",
    name: "Chay-MDC2060.bat Space-Safe URI Encoding Guard (AUD-02)",
    features: [34],
    async run() {
      const bat = await readWorkspaceText("Chay-MDC2060.bat");
      assert.match(bat, /setlocal\s+EnableDelayedExpansion/i);
      assert.match(bat, /set\s+"FILE_URI=!FILE_URI: =%%20!"/i);
      assert.match(bat, /endlocal/i);
      assert.doesNotMatch(bat, /%%%%20%%/, "Broken quadruple-percent URI encoding must not appear");
    },
  },
  {
    id: "T2-098",
    name: "Zero Dangerous Dynamic Code (eval, new Function, document.write, innerHTML=)",
    features: [28, 35],
    async run() {
      await readWorkspaceText("src/devices/mdc2060/spec.mjs");
      await readWorkspaceText("web/mdc2060/app.mjs");
      await readWorkspaceText("tools/build_mdc2060_standalone.mjs");
      const files = [
        ...(await walkTreeEntries("src/devices/mdc2060")).filter(e => !e.isDir).map(e => e.rel),
        ...(await walkTreeEntries("web/mdc2060")).filter(e => !e.isDir && /\.(?:mjs|js)$/.test(e.name)).map(e => e.rel),
        "tools/build_mdc2060_standalone.mjs",
      ];
      for (const rel of files) {
        const src = await readWorkspaceText(rel);
        assert.doesNotMatch(src, /\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(|\.innerHTML\s*=/, `Dangerous dynamic code in ${rel}`);
      }
    },
  },
  {
    id: "T2-099",
    name: "build_mdc2060_standalone.mjs --check Produces Zero Disk Side Effects",
    features: [34],
    async run() {
      await readWorkspaceText("tools/build_mdc2060_standalone.mjs");
      const distFile = path.join(REPO_ROOT, "dist", "MDC-2060-Standalone.html");
      const existedBefore = existsSync(distFile);
      const mtimeBefore = existedBefore ? lstatSync(distFile).mtimeMs : null;
      execFileSync(process.execPath, ["tools/build_mdc2060_standalone.mjs", "--check"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      const existedAfter = existsSync(distFile);
      const mtimeAfter = existedAfter ? lstatSync(distFile).mtimeMs : null;
      assert.equal(existedAfter, existedBefore, "--check must not create or delete dist/MDC-2060-Standalone.html");
      assert.equal(mtimeAfter, mtimeBefore, "--check must not overwrite dist/MDC-2060-Standalone.html");
    },
  },
  {
    id: "T2-100",
    name: "Zero src/core/ & Zero src/devices/fcv588/ Contract Regression (Core Constants Intact)",
    features: [1, 35],
    async run() {
      assert.equal(CORE_CONTRACT_VERSION, "f1-core-7");
      assert.equal(EVENT_SCHEMA_VERSION, 5);
      assert.equal(REPLAY_ENVELOPE_VERSION, 7);
      assert.equal(BRIDGE_RUNTIME_VERSION, 1);
      assert.equal(FCV588_ADAPTER.id, "furuno.fcv588.cv588e");
      assert.equal(Object.isFrozen(FCV588_ADAPTER), true);
    },
  },
];
