import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {existsSync} from "node:fs";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {withLoopbackServer} from "./helpers/loopback-server.mjs";
import {
  REPO_ROOT,
  loadAdapter,
  loadArpaAis,
  loadBundler,
  loadMdcModule,
  loadModel,
  readWorkspaceJson,
  readWorkspaceText,
} from "./helpers/module-loader.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  FCV588_ADAPTER,
  applySettingsViaCodecRestore,
  assertValidNmeaSentence,
  createMdcBridgeDriver,
  fingerprint,
  getScreenMode,
  setChoiceSetting,
} from "./helpers/session-driver.mjs";
import {extractAtaState, extractAtaTargets, normalizeAtaSettings} from "./helpers/signal-oracle.mjs";
import {assertCleanExecutableTokens} from "./tier1-web-console-ui.mjs";

export const TIER = 3;
export const SUITE = "tier3-web-packaging-policy-combos";

export const TESTS = [
  {
    id: "T3-031",
    name: "Three Packaging & Asset Gates Pass Concurrently Without Interference",
    features: [34, 35],
    async run() {
      await readWorkspaceText("tools/build_mdc2060_standalone.mjs");
      const mdcCheck = JSON.parse(
        execFileSync(process.execPath, ["tools/build_mdc2060_standalone.mjs", "--check"], {cwd: REPO_ROOT, encoding: "utf8"}),
      );
      const fcvCheck = JSON.parse(
        execFileSync(process.execPath, ["tools/build_fcv588_standalone.mjs", "--check"], {cwd: REPO_ROOT, encoding: "utf8"}),
      );
      const assetOut = execFileSync(process.execPath, ["tools/verify_public_runtime_assets.mjs"], {cwd: REPO_ROOT, encoding: "utf8"});
      assert.equal(mdcCheck.status, "STANDALONE_HTML_CHECK_PASS");
      assert.equal(fcvCheck.status, "STANDALONE_HTML_CHECK_PASS");
      assert.match(assetOut, /PUBLIC_RUNTIME_ASSET_POLICY_PASS/);
    },
  },
  {
    id: "T3-032",
    name: "Dual-Console Concurrent HTTP Serving (/ vs /mdc2060) & Zero Cross-Contamination",
    features: [34, 35],
    async run() {
      await withLoopbackServer(async server => {
        const [rFcv, rMdc, rMdcSlash, rMdcApp, rFcvApp] = await Promise.all([
          server.assertHttpOk("/"),
          server.assertHttpOk("/mdc2060"),
          server.assertHttpOk("/mdc2060/"),
          server.assertHttpOk("/web/mdc2060/app.mjs"),
          server.assertHttpOk("/web/app.mjs"),
        ]);
        assert.doesNotMatch(rFcv.text, /MDC-2060|KODEN J2000/);
        assert.match(rMdc.text, /KODEN/);
        assert.match(rMdc.text, /MDC-2060/);
        assert.equal(rMdc.text, rMdcSlash.text);
        assert.equal(rMdcApp.headers.get("content-type"), "text/javascript; charset=utf-8");
        assert.equal(rFcvApp.headers.get("content-type"), "text/javascript; charset=utf-8");
        assert.equal(rFcv.headers.get("content-security-policy"), rMdc.headers.get("content-security-policy"));
      });
    },
  },
  {
    id: "T3-033",
    name: "Read-Only Reuse of hold-input.mjs, key-feedback.mjs, instructor-tabs.mjs",
    features: [28, 35],
    async run() {
      const holdMod = await loadMdcModule("web/hold-input.mjs", ["bindHoldControl"]);
      const soundMod = await loadMdcModule("web/key-feedback.mjs", ["createFcvHardwareBuzzer"]);
      const tabsMod = await loadMdcModule("web/instructor-tabs.mjs", ["nextInstructorTabIndex"]);
      assert.equal(typeof holdMod.bindHoldControl, "function");
      assert.equal(typeof soundMod.createFcvHardwareBuzzer, "function");
      assert.equal(tabsMod.nextInstructorTabIndex(0, 5, "ArrowRight"), 1);

      const appSrc = await readWorkspaceText("web/mdc2060/app.mjs");
      const inputSrc = await readWorkspaceText("web/mdc2060/input-controls.mjs");
      const joined = `${appSrc}\n${inputSrc}`;
      assert.match(joined, /hold-input\.mjs/);
      assert.match(joined, /key-feedback\.mjs/);
      assert.match(joined, /instructor-tabs\.mjs/);
    },
  },
  {
    id: "T3-034",
    name: "Workspace Toolbar Controls Stay Strictly Outside Hardware Bezel & Replay Log",
    features: [32],
    async run() {
      const html = await readWorkspaceText("web/mdc2060/index.html");
      const css = await readWorkspaceText("web/mdc2060/styles.css");
      const asideIdx = html.search(/<aside\b/i);
      assert.ok(asideIdx > 0);
      assert.match(html, /role=["']toolbar["']/i);
      assert.match(
        html,
        /id=["']device-focus-toggle["']|<input[^>]*type=["']checkbox["'][^>]*(?:focus|tập\s*trung)[^>]*>|(?:tập\s*trung\s*vào\s*máy|focus\s*device)/i,
        "Missing workspace device focus toggle control",
      );
      assert.match(
        css,
        /:has\([^)]*focus[^)]*:checked\)|#device-focus-toggle:checked|\[data-focus(?:-mode)?[^\]]*\]|\.(?:device-)?focus(?:-mode)?\b/i,
        "Focus toggle should drive CSS dimming without dispatching core events",
      );
    },
  },
  {
    id: "T3-035",
    name: "Every Module in Standalone Importmap Decodes to Valid Syntax & Zero Dangling Imports",
    features: [34],
    async run() {
      const {buildStandaloneHtml, findModuleSpecifiers, tokenizeModule} = await loadBundler();
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), "mdc2060-e2e-t3035-"));
      const outPath = path.join(tmpDir, "standalone.html");
      try {
        const res = await buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: false});
        const html = typeof res?.html === "string"
          ? res.html
          : (await buildStandaloneHtml({rootDir: REPO_ROOT, outPath, outFile: outPath, write: true}), await readFile(outPath, "utf8"));
        const mapMatch = html.match(/<script\s+type=["']importmap["']>([\s\S]*?)<\/script>/i);
        assert.ok(mapMatch, "Standalone HTML missing <script type=\"importmap\">");
        const importMap = JSON.parse(mapMatch[1]);
        const keys = Object.keys(importMap.imports ?? {});
        assert.ok(keys.length >= 10, `Expected >= 10 entries in importmap, got ${keys.length}`);
        for (const key of keys) {
          assert.match(key, /^mdc(?:2060)?:\/\//, `Importmap key must use mdc2060:// prefix: ${key}`);
          const dataUrl = String(importMap.imports[key]);
          assert.ok(dataUrl.startsWith("data:text/javascript;charset=utf-8;base64,"), `Unexpected module URL format for ${key}`);
          const src = Buffer.from(dataUrl.slice("data:text/javascript;charset=utf-8;base64,".length), "base64").toString("utf8");
          assertCleanExecutableTokens(key, src, tokenizeModule);
          const specs = findModuleSpecifiers(src).map(s => (typeof s === "string" ? s : (s?.value ?? s?.specifier)));
          assert.ok(specs.every(sp => typeof sp === "string" && sp.length > 0), `findModuleSpecifiers returned invalid token(s) in ${key}`);
          for (const sp of specs) {
            assert.ok(
              Object.hasOwn(importMap.imports, sp),
              `Bundled module ${key} references unrewritten or dangling specifier "${sp}"`,
            );
          }
        }
      } finally {
        await rm(tmpDir, {recursive: true, force: true});
      }
    },
  },
  {
    id: "T3-036",
    name: "Complete 5-Tab ARIA Tablist & Screen-Reader Live Region Contract",
    features: [32],
    async run() {
      const {nextInstructorTabIndex} = await loadMdcModule("web/instructor-tabs.mjs", ["nextInstructorTabIndex"]);
      assert.equal(nextInstructorTabIndex(0, 5, "ArrowRight"), 1);
      assert.equal(nextInstructorTabIndex(0, 5, "ArrowLeft"), 4);
      assert.equal(nextInstructorTabIndex(2, 5, "Home"), 0);
      assert.equal(nextInstructorTabIndex(2, 5, "End"), 4);

      const html = await readWorkspaceText("web/mdc2060/index.html");
      const tabTags = html.match(/<[^>]*role=["']tab["'][^>]*>/gi) ?? [];
      const panelTags = html.match(/<[^>]*role=["']tabpanel["'][^>]*>/gi) ?? [];
      assert.equal(tabTags.length, 5);
      assert.equal(panelTags.length, 5);

      const panelIds = new Set(panelTags.map(tag => tag.match(/\bid=["']([^"']+)["']/i)?.[1]).filter(Boolean));
      const tabIds = new Set(tabTags.map(tag => tag.match(/\bid=["']([^"']+)["']/i)?.[1]).filter(Boolean));
      assert.equal(panelIds.size, 5);
      assert.equal(tabIds.size, 5);

      for (const tab of tabTags) {
        const ctrl = tab.match(/\baria-controls=["']([^"']+)["']/i)?.[1];
        assert.ok(ctrl && panelIds.has(ctrl), `Tab aria-controls="${ctrl}" must match a role="tabpanel" id`);
      }
      for (const panel of panelTags) {
        const labelled = panel.match(/\baria-labelledby=["']([^"']+)["']/i)?.[1];
        assert.ok(labelled && tabIds.has(labelled), `Tabpanel aria-labelledby="${labelled}" must match a role="tab" id`);
      }
      assert.doesNotMatch(html, /<canvas[^>]*aria-live/i);
    },
  },
  {
    id: "T3-037",
    name: "Full Accessibility & Ergonomics Media Query Coverage (styles.css)",
    features: [28, 32],
    async run() {
      const css = await readWorkspaceText("web/mdc2060/styles.css");
      assert.match(css, /(?:\.off[-_]?screen\b|\[data-off[-_]?screen[^\]]*\])/i);
      assert.match(css, /(?:\.off[-_]?screen|\[data-off[-_]?screen[^\]]*\])\s*\[hidden\]\s*\{[^}]*display\s*:\s*none|\[hidden\]\s*\{[^}]*display\s*:\s*none/i);
      assert.match(css, /:focus-visible/);
      assert.match(css, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
      assert.match(css, /@media\s*\(\s*forced-colors\s*:\s*active\s*\)/i);
      assert.match(
        css,
        /min-(?:height|width)\s*:\s*(?:(?:4[4-9]|[5-9]\d|\d{3,})px|(?:2\.75|2\.[89]|[3-9](?:\.\d+)?)rem)/i,
        "styles.css must enforce >= 44px (2.75rem) touch target minimum",
      );
    },
  },
  {
    id: "T3-038",
    name: "Cross-Ledger Profile, Revision & Fingerprint Alignment (device-register.json x Adapters)",
    features: [1, 35],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const reg = await readWorkspaceJson("docs/evidence/device-register.json");
      assert.equal(reg.devices[0].profileId, FCV588_ADAPTER.id);
      assert.equal(reg.devices[0].profileRevision, FCV588_ADAPTER.revision);
      assert.equal(reg.devices[0].implementationStatus, "F1_PUBLIC_REFERENCE_PARTIAL");

      assert.equal(reg.devices[1].profileId, MDC2060_ADAPTER.id);
      assert.equal(reg.devices[1].profileRevision, MDC2060_ADAPTER.revision);
      assert.equal(reg.devices[1].implementationStatus, "F1_PUBLIC_REFERENCE_PARTIAL");

      assert.match(fingerprint(FCV588_ADAPTER.profile), /^f0-fnv1a32-[0-9a-f]{8}$/);
      assert.match(fingerprint(MDC2060_ADAPTER.profile), /^f0-fnv1a32-[0-9a-f]{8}$/);
    },
  },
  {
    id: "T3-039",
    name: "Build & Launch Toolchain Cross-Reference Integrity (package.json x Chay-MDC2060.bat x bundler)",
    features: [34],
    async run() {
      const pkg = await readWorkspaceJson("package.json");
      const bat = await readWorkspaceText("Chay-MDC2060.bat");
      assert.equal(pkg.scripts?.["build:standalone:mdc2060"], "node tools/build_mdc2060_standalone.mjs");
      for (const rel of ["tools/build_mdc2060_standalone.mjs", "tools/server.mjs"]) {
        assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `Missing referenced tool: ${rel}`);
        execFileSync(process.execPath, ["--check", rel], {cwd: REPO_ROOT, stdio: "pipe"});
      }
      assert.match(bat, /tools\\build_mdc2060_standalone\.mjs/i);
      assert.match(bat, /tools\\server\.mjs/i);
    },
  },
  {
    id: "T3-040",
    name: "Unified Bridge NMEA Stream Combines Core 7 Sentences + Radar $RATTM in PPI/NAV",
    features: [9, 23, 31],
    async run() {
      const model = await loadModel();
      const arpa = await loadArpaAis();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      });
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.screenMode, "PPI/NAV");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      let ataSt = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), drv.bus().radarContacts[0], 0, drv.bus()));
      const ataCfg = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15});
      for (let t = 1; t <= 6; t++) {
        drv.tick(1);
        ataSt = extractAtaState(arpa.stepAtaTracking(ataSt, drv.bus(), ataCfg, t));
      }
      assert.equal(getScreenMode(drv.state(), MDC2060_ADAPTER), "PPI/NAV");
      const coreSentences = drv.bus().sentences;
      assert.equal(coreSentences.length, 7);
      for (const expectedHeader of ["SDDBT", "SDDPT", "HEHDT", "VWVHW", "VWMTW", "GPRMC", "GPVTG"]) {
        const s = coreSentences.find(line => line.startsWith(`$${expectedHeader},`));
        assert.ok(s, `Core bridge bus missing $${expectedHeader}`);
        assertValidNmeaSentence(s, expectedHeader);
      }
      const tgt = extractAtaTargets(ataSt)[0];
      assertValidNmeaSentence(arpa.formatRattmSentence(tgt, drv.bus().ownship, 6), "RATTM");
    },
  },
];
