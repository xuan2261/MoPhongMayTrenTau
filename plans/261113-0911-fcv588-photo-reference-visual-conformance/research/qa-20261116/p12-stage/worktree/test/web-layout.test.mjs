import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../web/styles.css", import.meta.url), "utf8");
const js = await readFile(new URL("../web/app.mjs", import.meta.url), "utf8");
const guidance = await readFile(new URL("../web/lcd-instructor-meta.mjs", import.meta.url), "utf8");
const facade = html.split('<aside class="training-panel">')[0];
const trackpad = facade.split('<div class="pad"')[1].split("</div>")[0];

test("FCV-588 mock uses native 480x640 portrait screen proportions", () => {
  assert.match(facade, /id="echo-canvas" width="480" height="640"/);
  // The canvas uses exact logical pixels; the independently drawn physical
  // bezel now follows the public 128×171 mm LCD estimate (not OEM pixels).
  assert.match(css, /\.lcd\s*\{[^}]*aspect-ratio:\s*128\s*\/\s*171/);
  assert.ok(Math.abs(128/171 - 480/640)<0.002,
    "public physical LCD dimensions must agree with its 480x640 logical pixel ratio");
});

test("physical controls are not contaminated by desktop assistive plus/minus buttons", () => {
  assert.doesNotMatch(facade, /id="(?:gain|mode)-(?:minus|plus)"/);
  assert.match(html, /class="rotary-assist"[^>]*aria-labelledby="rotary-assist-title"/);
  for (const id of ["gain-minus", "gain-plus", "mode-minus", "mode-plus"]) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1, id);
  }
});

test("ENTER is a distinct physical key, not embedded inside TrackPad", () => {
  assert.doesNotMatch(trackpad, /id="key-enter"/);
  assert.match(facade, /id="key-enter" class="hardware-key enter-key"/);
});

test("NAV shows synthetic/no-data truth and Zoom is explicitly illustrative", () => {
  assert.match(js, /projectFcvManualNavBoxes/);
  assert.match(guidance,/Không có GPS\/NMEA tàu/);
  assert.match(guidance,/projectFcvTrainingReceiver/);
  assert.doesNotMatch(js,/ctx\.fillText\("SYNTHETIC · NO LIVE RECEIVER"/);
  assert.match(js, /staleAfterTicks/);
  // Previously Zoom was a nonfunctional F0 placeholder. Phase4 now performs
  // deterministic bottom/marker zoom but still must not claim OEM sonar pixels.
  assert.match(js, /projectFcvZoom/);
  assert.match(js, /axis:zoom\.zoomMode==="Bottom Lock"\?"bottom-lock":"absolute"/);
  assert.doesNotMatch(js, /ctx\.fillText\("ZOOM:/,
    "photo-grounded zoom uses the existing BL/BZ/MZ status header without an invented legend");
  assert.match(guidance,/Không kết nối đầu dò/);
});
