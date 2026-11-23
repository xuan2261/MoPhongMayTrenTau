import test from "node:test";
import assert from "node:assert/strict";
import {readFile, access} from "node:fs/promises";
import {constants} from "node:fs";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {shouldRouteFcvShortcut} from "../web/keyboard-shortcuts.mjs";

const execFileAsync = promisify(execFile);

test("Zero-CLS Grid & Ergonomics: .device-frame and .training-panel anchor at Row 1 while #source-cue docks below", async () => {
  const [css, app] = await Promise.all([
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../web/app.mjs", import.meta.url), "utf8"),
  ]);

  // 1. .device-frame is pinned to grid-column: 1; grid-row: 1 (never pushed down by #source-cue)
  assert.match(css, /\.device-frame\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1;/s);
  // 2. .training-panel is pinned to grid-column: 2; grid-row: 1 / span 4
  assert.match(css, /\.training-panel\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1\s*\/\s*span\s*4;/s);
  // 3. .source-cue docks below .device-frame in Column 1 Row 3 on desktop and order > .device-frame on narrow viewports
  assert.match(css, /\.source-cue\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*3;/s);
  assert.match(css, /@media\s*\(max-width:\s*1240px\)[\s\S]*?\.device-frame\s*\{[^}]*order:\s*2;[\s\S]*?\.source-cue\s*\{[^}]*order:\s*4;/);

  // 4. Instant double-click mode commit and live countdown seconds in control footer
  assert.match(app, /document\.querySelector\("\.mode-scale"\)\?\.addEventListener\("dblclick"/);
  assert.match(app, /\$\("mode-knob"\)\?\.addEventListener\("dblclick"/);
  assert.match(app, /\(projected\.remainingMs\/1000\)\.toFixed\(1\)\+"s\)"/);
});

test("Focus-mode checkbox passes FCV-588 hardware keys through while keeping Space/Enter for checkbox toggle", () => {
  const checkboxTarget = {
    type: "checkbox",
    closest(selector) {
      if (selector.includes(".training-panel")) return null;
      if (selector.includes("input")) return this;
      return null;
    },
  };
  for (const key of ["r", "b", "g", "m", "f", "ArrowUp", "ArrowDown", "Escape", "[", "]"]) {
    assert.equal(
      shouldRouteFcvShortcut({key, repeat: false, target: checkboxTarget}),
      true,
      `shortcut '${key}' must not be trapped when #device-focus-toggle checkbox is focused`,
    );
  }
  for (const toggleKey of [" ", "Spacebar", "Enter"]) {
    assert.equal(shouldRouteFcvShortcut({key: toggleKey, repeat: false, target: checkboxTarget}), false);
  }
});

test("Live Chrome pixel audit: 0.00px vertical/horizontal shift on .device-frame across Power Off, LF, White Marker 4-line cue, and DUAL", async t => {
  try {
    await access("/usr/bin/google-chrome", constants.X_OK);
  } catch {
    t.skip("/usr/bin/google-chrome not installed on this runner");
    return;
  }
  const pyScript = `
import json, os, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright

srv = subprocess.Popen(
    ["node", "tools/server.mjs"],
    env={**os.environ, "PORT": "4197"},
    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
)
try:
    for _ in range(30):
        try:
            urllib.request.urlopen("http://127.0.0.1:4197/", timeout=0.5)
            break
        except Exception:
            time.sleep(0.1)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://127.0.0.1:4197/", wait_until="load")
        page.wait_for_selector(".training-panel.d15-enhanced")

        def measure():
            return page.evaluate("""() => {
                const pick = s => {
                    const r = document.querySelector(s).getBoundingClientRect();
                    return {top: r.top, left: r.left, bottom: r.bottom, width: r.width, height: r.height};
                };
                const cue = document.getElementById("source-cue");
                return {
                    device: pick(".device-frame"),
                    panel: pick(".training-panel"),
                    powerKey: pick("#key-power"),
                    cueHidden: cue.hidden,
                    cueHeight: cue.getBoundingClientRect().height,
                    cueTop: cue.getBoundingClientRect().top,
                };
            }""")

        m_off = measure()
        page.click("#btn-quick-power")
        m_lf = measure()

        # Open Menu -> Sounder -> White Marker (longest 500-char multi-line #source-cue + active #operator-quick-guide-bottom)
        page.click("#key-menu")
        for _ in range(7):
            page.click("#pad-down")
        m_whitemarker = measure()

        # Close menu and double-click DUAL on .mode-scale for instant 0ms mode switch!
        page.click("#key-menu")
        page.locator('.mode-scale [data-mode="DUAL"]').dblclick()
        m_dual = measure()
        mode_now = page.locator("#mode-state").inner_text()

        print(json.dumps({
            "off": m_off,
            "lf": m_lf,
            "whiteMarker": m_whitemarker,
            "dual": m_dual,
            "modeAfterDblClick": mode_now,
        }))
        browser.close()
finally:
    srv.terminate()
    srv.wait(timeout=5)
`;
  const {stdout} = await execFileAsync(
    "python3",
    ["-B", "-c", pyScript],
    {cwd: new URL("..", import.meta.url).pathname, env: {...process.env, PYTHONDONTWRITEBYTECODE: "1"}},
  );
  const res = JSON.parse(stdout.trim());

  assert.equal(res.off.cueHidden, true);
  assert.equal(res.lf.cueHidden, false);
  assert.ok(res.whiteMarker.cueHeight > res.lf.cueHeight, "White Marker renders multi-line provenance note");
  assert.equal(res.modeAfterDblClick, "DUAL", "double-clicking DUAL label switches mode immediately");

  for (const [label, snap] of [["lf", res.lf], ["whiteMarker", res.whiteMarker], ["dual", res.dual]]) {
    assert.ok(Math.abs(snap.device.top - res.off.device.top) < 0.01, `device.top shifted in ${label}: ${snap.device.top} vs ${res.off.device.top}`);
    assert.ok(Math.abs(snap.device.left - res.off.device.left) < 0.01, `device.left shifted in ${label}`);
    assert.ok(Math.abs(snap.powerKey.top - res.off.powerKey.top) < 0.01, `#key-power shifted in ${label}`);
    assert.ok(Math.abs(snap.panel.top - res.off.panel.top) < 0.01, `.training-panel shifted in ${label}`);
    assert.ok(snap.cueTop >= snap.device.bottom - 1, `#source-cue must sit below .device-frame in ${label}`);
  }
});
