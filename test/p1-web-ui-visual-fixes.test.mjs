import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {performance} from "node:perf_hooks";
import {projectFcvDepthTicks, projectFcvMainMenu} from "../web/lcd-presentation.mjs";
import {rasterizeFcvEcho} from "../web/fcv588-echo-rasterizer.mjs";
import {ARCHIVE_MAX_JSON_NODES, decodeFcv588ArchivePair} from "../web/fcv588-archive-import.mjs";
import {createFcv588ArchiveTimeline} from "../web/fcv588-archive-timeline.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {getFcvReplayAdapter} from "../src/devices/fcv588/replay-compat.mjs";
import {createSession, dispatch, createReplayEnvelope} from "../src/core/session.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createFcv588ArchiveSidecar} from "../src/devices/fcv588/archive-compat.mjs";

const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../web/styles.css", import.meta.url), "utf8");
const appCode = await readFile(new URL("../web/app.mjs", import.meta.url), "utf8");

test("BUG-07 & dead CSS: .lcd-menu-value removes 48% truncation and .detent dead rule is gone", () => {
  const menuValueBlock = css.match(
    /\.lcd-overlay\[data-layout="main-menu"\]\s+\.lcd-menu-value\s*\{([^}]*)\}/s,
  )?.[1] ?? "";
  assert.ok(menuValueBlock.length > 0, "main-menu .lcd-menu-value rule must exist");
  assert.doesNotMatch(menuValueBlock, /max-width\s*:\s*48%/,
    "48% self-column max-width must be removed so menu values are not truncated");
  assert.doesNotMatch(css, /\.detent\s*\{/, "unused .detent rule should be removed");
});

test("BUG-08 UI: projectFcvMainMenu renders explicit fallback for null draft and disabled language", () => {
  const state = {
    power: "on",
    overlay: {kind: "menu", category: "System", itemIndex: 0, editing: false, draftValue: null},
    settings: {draft: null},
    trainingFixture: {},
    syntheticConditions: {speedKn: 7, depthM: 49.6},
  };
  const view = projectFcvMainMenu(state, {profileRevision: "F1-public-reference-22"});
  assert.ok(view, "System menu view must project");
  const draftRow = view.rows.find(item => item.id === "system.draft");
  const langRow = view.rows.find(item => item.id === "system.language");
  assert.equal(draftRow?.valueText, "--", "fail-closed null draft renders explicit -- instead of blank");
  assert.equal(langRow?.valueText, "English", "disabled D04 language renders English instead of blank");
});

test("BUG-02: depth ticks use integer Y coordinates aligned with sonar viewport and [DEMO] avoids 80m mark", () => {
  const ticks = projectFcvDepthTicks(
    {startDepthM: 0, rangeM: 80},
    {height: 640, top: 62, bottom: 12, units: "Metric"},
  );
  assert.equal(ticks.length, 5);
  assert.ok(ticks.every(t => Number.isInteger(t.y)), "all depth ticks must be integer-aligned pixels");
  assert.equal(ticks[0].y, 62);
  assert.equal(ticks[4].y, 628);
  assert.match(css, /\.lcd\s*>\s*#demo-indicator\s*\{[^}]*top:\s*4px[^}]*bottom:\s*auto/s,
    "#demo-indicator must sit in header area rather than overlapping bottom 80 m scale label");
  assert.match(appCode, /const\s+sonarTop\s*=\s*y0\s*\+\s*62[\s\S]*?drawImage\([^,]+,\s*x0,\s*sonarTop,\s*w,\s*sonarH\)/,
    "sonar canvas drawImage must align with depth scale top offset");
});

test("BUG-14: rasterizeFcvEcho handles missing startDepthM without NaN and preserves surface clutter on shallow range", () => {
  const white = getFcvDisplayPalette({palette: "White", colors: "8"});
  const columns = 48, rows = 80;
  const pixels = new Uint8Array(columns * rows);
  pixels[5 * columns + 4] = 40;
  pixels[6 * columns + 12] = 35;
  pixels[7 * columns + 20] = 45;
  pixels[8 * columns + 30] = 50;
  const shallowFrame = {
    frequencyKhz: 50,
    columns,
    rows,
    pixels,
    rangeM: 20,
    bottomDepthM: 49.6,
    synthetic: true,
    overlays: {},
    projectionKey: "shallow-20m",
  };
  const raster = rasterizeFcvEcho(shallowFrame, white, {clutterPct: 0});
  assert.ok(raster.data.every(n => Number.isFinite(n)), "no NaN bytes when startDepthM is omitted");
  const bg = white[0].join(",");
  let topColored = 0;
  for (let y = 0; y < Math.floor(raster.height * 0.16); y++) {
    for (let x = 0; x < raster.width; x++) {
      const i = (y * raster.width + x) * 4;
      if ([raster.data[i], raster.data[i + 1], raster.data[i + 2]].join(",") !== bg) topColored++;
    }
  }
  assert.ok(topColored > 500, `near-surface clutter must persist when bottom > rangeM (got ${topColored})`);
});

test("Bezel & BUG-19: authentic FURUNO bezel label, lang='en' on English regions, mobile >=44px targets, reduced-motion/forced-colors", () => {
  assert.match(html, /<span class="manufacturer-name"[^>]*\blang="en"[^>]*>FURUNO<\/span>/,
    "bezel must preserve authentic FURUNO label with lang='en'");
  for (const id of ["key-menu", "key-enter", "key-range", "key-mark", "key-func", "screen-top", "demo-indicator"]) {
    const tag = html.match(new RegExp(`<[^>]*id="${id}"[^>]*>`))?.[0] ?? "";
    assert.match(tag, /\blang="en"/, `#${id} must carry lang="en" for WCAG 3.1.2`);
  }
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(css, /#archive-envelope-file,\s*#archive-sidecar-file,\s*#archive-timeline-range[\s\S]*?min-height:\s*44px/);
});

test("BUG-20(b) & S-08: archive node budget accepts large settings envelopes and 1000-event timeline seeks quickly", () => {
  assert.ok(ARCHIVE_MAX_JSON_NODES >= 200000);
  const adapter = getFcvReplayAdapter("F1-public-reference-22");
  let session = createSession(adapter, TRAINING_SCENARIO);
  session = dispatch(session, adapter, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  session = dispatch(session, adapter, {kind: "up", control: "power"}, TRAINING_SCENARIO);
  for (let i = 0; i < 996; i++) {
    session = dispatch(session, adapter, {kind: "tick", steps: 1}, TRAINING_SCENARIO);
  }
  const envelope = createReplayEnvelope(session);
  const sidecar = createFcv588ArchiveSidecar(envelope, {presentationContract: "P23_LOWER_BOTTOM"});
  const envText = JSON.stringify(envelope);
  const sideText = JSON.stringify(sidecar);

  const t0 = performance.now();
  const summary = decodeFcv588ArchivePair(envText, sideText);
  const timeline = createFcv588ArchiveTimeline(envText, sideText);
  const frameEnd = timeline.select(998);
  const frameMid = timeline.select(500);
  const elapsedMs = performance.now() - t0;

  assert.equal(summary.eventCount, 998);
  assert.equal(frameEnd.fullSessionHash, summary.sessionHash);
  assert.equal(frameMid.index, 500);
  assert.ok(elapsedMs < 800, `archive import + timeline init + 2 seeks took ${elapsedMs.toFixed(1)} ms (expected < 800 ms)`);
});
