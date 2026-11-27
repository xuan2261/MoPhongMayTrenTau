import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {withLoopbackServer} from "./helpers/loopback-server.mjs";
import {
  REPO_ROOT,
  loadBundler,
  readWorkspaceJson,
  readWorkspaceText,
} from "./helpers/module-loader.mjs";

export const TIER = 1;
export const SUITE = "tier1-packaging-server-registry";

export const TESTS = [
  {
    id: "T1-115",
    name: "tools/server.mjs Serves /mdc2060 & /mdc2060/ with HTTP 200 & Strict Security Headers",
    features: [34],
    async run() {
      await withLoopbackServer(async server => {
        const res1 = await server.assertHttpOk("/mdc2060");
        const res2 = await server.assertHttpOk("/mdc2060/");
        const sourceHtml = await readWorkspaceText("web/mdc2060/index.html");
        assert.equal(res1.text, sourceHtml, "GET /mdc2060 body must match web/mdc2060/index.html");
        assert.equal(res2.text, sourceHtml, "GET /mdc2060/ body must match web/mdc2060/index.html");

        for (const r of [res1, res2]) {
          assert.equal(r.headers.get("content-type"), "text/html; charset=utf-8");
          const csp = r.headers.get("content-security-policy") ?? "";
          assert.match(csp, /default-src 'self'/);
          assert.match(csp, /connect-src 'none'/);
          assert.match(csp, /frame-ancestors 'none'/);
          assert.equal(r.headers.get("x-content-type-options"), "nosniff");
          assert.equal(r.headers.get("referrer-policy"), "no-referrer");
          assert.equal(r.headers.get("cache-control"), "no-store");
        }
      });
    },
  },
  {
    id: "T1-116",
    name: "tools/build_mdc2060_standalone.mjs --check Passes Dry-Run & Exports Public API",
    features: [34],
    async run() {
      const bundler = await loadBundler();
      assert.equal(typeof bundler.tokenizeModule, "function");
      assert.equal(typeof bundler.findModuleSpecifiers, "function");
      assert.equal(typeof bundler.buildStandaloneHtml, "function");

      const stdout = execFileSync(process.execPath, ["tools/build_mdc2060_standalone.mjs", "--check"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      const report = JSON.parse(stdout);
      assert.equal(report.status, "STANDALONE_HTML_CHECK_PASS");
      assert.ok(Number(report.modulesBundled) >= 10, `Expected >= 10 bundled modules, got ${report.modulesBundled}`);
      assert.ok(Number(report.bytes) > 50000, `Expected standalone HTML > 50KB, got ${report.bytes}`);
      assert.match(String(report.sha256 ?? ""), /^[0-9a-f]{64}$/);
    },
  },
  {
    id: "T1-117",
    name: "tools/build_mdc2060_standalone.mjs Builds Valid Offline Standalone HTML",
    features: [34],
    async run() {
      const {buildStandaloneHtml} = await loadBundler();
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mdc2060-e2e-build-"));
      const outPath = path.join(tmpDir, "MDC-2060-Standalone.html");
      try {
        const res = await buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: false});
        const html = typeof res?.html === "string"
          ? res.html
          : (await buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: true}), await readFile(outPath, "utf8"));
        assert.match(html, /^<!doctype html>/i);
        assert.match(html, /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*connect-src 'none'/i);
        const importMapIdx = html.search(/<script\s+type=["']importmap["']>/i);
        const moduleIdx = html.search(/<script\s+type=["']module["']>/i);
        assert.ok(importMapIdx > 0 && moduleIdx > importMapIdx, "<script type=\"importmap\"> must precede <script type=\"module\">");
        assert.match(html, /mdc(?:2060)?:\/\//);
        assert.match(html, /<style[\s>]/i, "Standalone HTML must inline CSS");
        assert.doesNotMatch(html, /(?:href|src)=["']\/(?:web|src)\//i, "Standalone HTML must contain zero external /web/ or /src/ links");
      } finally {
        await rm(tmpDir, {recursive: true, force: true});
      }
    },
  },
  {
    id: "T1-118",
    name: "package.json Script & Chay-MDC2060.bat Windows Launcher Contract",
    features: [34],
    async run() {
      const pkg = await readWorkspaceJson("package.json");
      assert.equal(pkg.scripts?.["build:standalone:mdc2060"], "node tools/build_mdc2060_standalone.mjs");
      assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0, "Zero runtime npm dependencies allowed");

      const bat = await readWorkspaceText("Chay-MDC2060.bat");
      assert.match(bat, /dist\\MDC-2060-Standalone\.html/i);
      assert.match(bat, /tools\\build_mdc2060_standalone\.mjs/i);
      assert.match(bat, /http:\/\/127\.0\.0\.1:4173\/mdc2060/i);
      assert.match(bat, /--app=/i);
      assert.match(bat, /EnableDelayedExpansion/i);
    },
  },
  {
    id: "T1-119",
    name: "docs/evidence/device-register.json Registers koden.mdc2060.mrd104 at Index 1 Under HOLD",
    features: [35],
    async run() {
      const reg = await readWorkspaceJson("docs/evidence/device-register.json");
      assert.equal(reg.schemaVersion, 1);
      assert.equal(reg.devices.length, 6);
      assert.equal(reg.devices[0].profileId, "furuno.fcv588.cv588e");
      const mdc = reg.devices[1];
      assert.equal(mdc.profileId, "koden.mdc2060.mrd104");
      assert.equal(mdc.controllerVariant, "mrd-104-integrated-panel");
      assert.equal(mdc.implementationStatus, "F1_PUBLIC_REFERENCE_PARTIAL");
      assert.equal(mdc.profileRevision, "F1-mdc2060-public-ref-1");
      assert.equal(mdc.evidenceStatus, "public-reference-hardware-unverified");
      assert.equal(mdc.releaseApproval, "HOLD");
      assert.equal(mdc.assetLicenseClearance, false);
      assert.equal(mdc.firmwareVersion, null);
    },
  },
  {
    id: "T1-120",
    name: "tools/verify_public_runtime_assets.mjs Passes Across Entire Repo Including MDC-2060",
    features: [35],
    async run() {
      const stdout = execFileSync(process.execPath, ["tools/verify_public_runtime_assets.mjs"], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      assert.match(stdout, /PUBLIC_RUNTIME_ASSET_POLICY_PASS/);
    },
  },
];
