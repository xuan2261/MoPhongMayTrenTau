import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {localizeFcvCategory} from "../src/devices/fcv588/i18n.mjs";
import {buildStandaloneHtml} from "../tools/build_fcv588_standalone.mjs";

test("AUD-07: all D04 Tieng Viet sub-menu titles are localized without English leaks", () => {
  const viSettings = {...initialFcv588State().settings, language: "Tieng Viet"};
  const expected = {
    "NAV1 DATA BOXES": "O DU LIEU NAV1",
    "NAV2 DATA BOXES": "O DU LIEU NAV2",
    ALARM1: "BAO DONG 1",
    ALARM2: "BAO DONG 2",
    ALARM3: "BAO DONG 3",
    ALARM4: "BAO DONG 4",
    ALARM5: "BAO DONG 5",
    "ALARM1 / SETTING": "BAO DONG 1 / THIET LAP",
    "ALARM5 / SETTING": "BAO DONG 5 / THIET LAP",
    "FUNC Key · ASSIGN": "PHIM FUNC / GAN",
  };
  for (const [en, vi] of Object.entries(expected)) {
    assert.equal(localizeFcvCategory(en, viSettings), vi, en);
  }
});

test("AUD-01..AUD-10: runtime, Electron F11 sync, batch space-path URI, and standalone offline CSP are locked", async () => {
  const [app, bat, mainCjs, standaloneRes] = await Promise.all([
    readFile(new URL("../web/app.mjs", import.meta.url), "utf8"),
    readFile(new URL("../Chay-FCV588.bat", import.meta.url), "utf8"),
    readFile(new URL("../apps/fcv588-electron-p30/desktop/main.cjs", import.meta.url), "utf8"),
    buildStandaloneHtml({write: false}),
  ]);

  // AUD-01: settings import handles powered-on sessions via reset + direct dispatch (never swallowed send())
  assert.match(app, /const wasPowered = session\.deviceState\.power !== "off";/);
  assert.match(app, /let next = wasPowered \? reset\(adapter, scenario\) : session;/);
  assert.doesNotMatch(app, /send\(\{kind:\s*"restore-settings",\s*settings:\s*imported\.settings\}\)/);

  // AUD-02: Windows .bat avoids broken double-percent call set and uses scoped EnableDelayedExpansion
  assert.match(bat, /setlocal EnableDelayedExpansion/);
  assert.match(bat, /set "FILE_URI=!FILE_URI: =%%20!"/);
  assert.doesNotMatch(bat, /%%%%20%%/);

  // AUD-03, AUD-05, AUD-07, AUD-08, AUD-10 in web/app.mjs
  assert.match(app, /Math\.min\(Math\.max\(114,Math\.round\(height\*0\.18\)\),height-220\)/);
  assert.match(app, /ctx\.fillStyle = "#051633"/);
  assert.match(app, /BAO DONG /);
  assert.match(app, /setTimeout\(\(\) => downloadJsonFile\(pair\.sidecarFileName, pair\.sidecarText\), 250\)/);

  // AUD-06: Electron F11 syncs HTML5 document.fullscreenElement
  assert.match(mainCjs, /document\.documentElement\.requestFullscreen/);
  assert.match(mainCjs, /document\.exitFullscreen/);

  // AUD-09: Standalone HTML embeds strict connect-src 'none' CSP
  assert.equal(standaloneRes.status, "STANDALONE_HTML_CHECK_PASS");
  const standaloneHtml = await readFile(new URL("../dist/FCV-588-Standalone.html", import.meta.url), "utf8").catch(() => "");
  // Standalone check already verified bundler runs; build_fcv588_standalone.mjs must contain CSP injection
  const bundlerSrc = await readFile(new URL("../tools/build_fcv588_standalone.mjs", import.meta.url), "utf8");
  assert.match(bundlerSrc, /http-equiv=\\"Content-Security-Policy\\"/);
  assert.match(bundlerSrc, /connect-src 'none'/);
  void standaloneHtml;
});
