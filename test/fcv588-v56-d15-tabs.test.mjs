import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../web/styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../web/app.mjs", import.meta.url), "utf8");
const device = html.slice(html.indexOf('<div class="device-frame"'),
  html.indexOf('<aside class="training-panel">'));
const instructor = html.slice(html.indexOf('<aside class="training-panel">'),
  html.indexOf("</aside>") + "</aside>".length);

test("V56: D15 provides actual tablist/tabpanel structure instead of a 3230px stack", () => {
  assert.match(instructor, /role="tablist"/, "D15 must expose accessible small tabs");
  const tabs = instructor.match(/role="tab"/g) ?? [];
  const panels = instructor.match(/role="tabpanel"/g) ?? [];
  assert.ok(tabs.length >= 4 && tabs.length <= 7, "bounded number of small tabs");
  assert.equal(tabs.length, panels.length, "each tab owns one panel");
  assert.match(instructor, /class="d15-tablist"[^>]*hidden/,
    "no-JS fallback keeps all instructor content usable");
  assert.match(css, /\.d15-tabpanel\[hidden\]/,
    "only inactive D15 panels are hidden after enhancement");
  assert.match(css, /\.d15-tab\b[^{}]*\{[^}]*min-height:\s*44px/s);
});

test("V56: all existing instructor capabilities and live regions remain unique", () => {
  const ids = [
    "operator-guidance", "operator-guidance-announcement",
    "instructor-source-matrix", "source-matrix-announcement",
    "source-matrix-c11-state", "source-matrix-d09-state", "source-matrix-d14-state",
    "tick-count", "event-count", "mode-state", "status-line", "clock-line",
    "dial-readout", "gain-minus", "gain-plus", "mode-minus", "mode-plus",
    "btn-pause", "btn-step", "btn-reset", "btn-replay",
    "btn-nav-fixture", "btn-mount-fixture", "btn-tankenmaru-fixture",
    "btn-battery-fixture", "btn-error-fixture", "training-fault-status",
    "lesson-picker", "lesson-instruction", "btn-start-lesson",
    "btn-score", "lesson-result", "validation-status",
  ];
  for (const id of ids) {
    assert.equal((html.match(new RegExp('id="' + id + '"', "g")) ?? []).length, 1,
      "preserve exact unique DOM ID " + id);
  }
  assert.doesNotMatch(device, /d15-tab|source-matrix-announcement|btn-score/,
    "instructor UI cannot enter the OEM-lookalike face");
  assert.match(instructor, /id="source-matrix-c11-title"/);
  assert.match(instructor, /id="source-matrix-d09-title"/);
  assert.match(instructor, /id="source-matrix-d14-title"/);
});

test("V56: tab selection is owned by a one-time UI binder, never reducer/replay", () => {
  assert.match(app, /bindInstructorTabs\(/);
  assert.doesNotMatch(device, /role="tablist"/);
});
