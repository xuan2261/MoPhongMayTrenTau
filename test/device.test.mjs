import test from "node:test";
import assert from "node:assert/strict";
import {createSession, dispatch} from "../src/core/session.mjs";
import {TRAINING_SCENARIO, observeSounder, makeEchoFrame} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as device} from "../src/devices/fcv588/adapter.mjs";
import {DISPLAY_MODES} from "../src/devices/fcv588/model.mjs";

function run(...events) {
  let session = createSession(device, TRAINING_SCENARIO);
  for (const ev of [{kind: "down", control: "power"}, {kind: "up", control: "power"},
    {kind: "tick", steps: 4}, ...events]) {
    session = dispatch(session, device, ev, TRAINING_SCENARIO);
  }
  return session;
}
const add = (s, ev) => dispatch(s, device, ev, TRAINING_SCENARIO);

test("FCV MODE selector cycles seven candidates, then commits on timeout (OME §1.4)", () => {
  let s = run();
  assert.equal(s.deviceState.mode, "LF");
  const startIndex = DISPLAY_MODES.indexOf("LF");
  for (let i = 0; i < DISPLAY_MODES.length; i++) s = add(s, {kind: "rotate", control: "mode", steps: 1});
  assert.equal(s.deviceState.overlay.kind, "mode");
  assert.equal(s.deviceState.overlay.candidate, DISPLAY_MODES[startIndex]);
  // The F0 immediate-switch assertion was provisional; the public-reference
  // selector preserves effective mode until its recorded UI timeout.
  assert.equal(s.deviceState.mode, DISPLAY_MODES[startIndex]);
  s = add(s, {kind: "rotate", control: "mode", steps: -1});
  assert.equal(s.deviceState.overlay.candidate, "LF-ZOOM");
  assert.equal(s.deviceState.mode, "LF");
  s = add(s, {kind: "ui-tick", elapsedMs: 6000});
  assert.equal(s.deviceState.mode, "LF-ZOOM");
});

test("range selection stages edits and only ENTER commits", () => {
  let s = run({kind: "press", control: "range"},
    {kind: "pad", control: "trackpad", direction: "right"},
    {kind: "pad", control: "trackpad", direction: "down"});
  assert.equal(s.deviceState.rangeMode, "auto");
  assert.equal(s.deviceState.overlay.index, 4);
  s = add(s, {kind: "press", control: "menu"});
  assert.equal(s.deviceState.rangeMode, "auto");
  assert.equal(s.deviceState.overlay, null);
  s = add(s, {kind: "press", control: "range"});
  s = add(s, {kind: "pad", control: "trackpad", direction: "right"});
  s = add(s, {kind: "press", control: "enter"});
  assert.equal(s.deviceState.rangeMode, "manual");
});

test("GAIN push selects manual mode and rotary changes 0..10", () => {
  let s = run({kind: "push", control: "gain"});
  assert.equal(s.deviceState.overlay.kind, "gain");
  s = add(s, {kind: "pad", control: "trackpad", direction: "up"}); // off
  s = add(s, {kind: "press", control: "enter"});
  assert.equal(s.deviceState.gainMode, "off");
  s = add(s, {kind: "rotate", control: "gain", steps: 3});
  assert.equal(s.deviceState.manualGain, 6.5);
  for (let i = 0; i < 12; i++) s = add(s, {kind: "rotate", control: "gain", steps: 20});
  assert.equal(s.deviceState.manualGain, 10);
});

test("GAIN in automatic mode changes only Auto Gain Offset, not manual gain (OME §1.6)", () => {
  let s = run();
  const before = s.deviceState.manualGain;
  s = add(s, {kind: "rotate", control: "gain", steps: 1});
  assert.equal(s.deviceState.manualGain, before);
  assert.equal(s.deviceState.autoGainOffset, 1);
  assert.match(s.deviceState.notice, /Auto Gain Offset/);
});

test("brilliance can be adjusted in dialog and committed with MENU/ESC", () => {
  let s = run({kind: "down", control: "power"}, {kind: "up", control: "power"});
  assert.equal(s.deviceState.overlay.kind, "brill");
  s = add(s, {kind: "pad", control: "trackpad", direction: "left"});
  s = add(s, {kind: "press", control: "menu"});
  assert.equal(s.deviceState.brightness, 8);
  assert.equal(s.deviceState.overlay, null);
});

test("free TrackPad adjusts VRM depth while sonar mode is active, not NAV", () => {
  let s = run();
  assert.equal(s.deviceState.vrmVisible, false);
  s = add(s, {kind: "pad", control: "trackpad", direction: "down"});
  assert.equal(s.deviceState.vrmVisible, true);
  assert.equal(s.deviceState.vrmDepthM, 16);
  s = add(s, {kind: "pad", control: "trackpad", direction: "up"});
  assert.equal(s.deviceState.vrmDepthM, 15);
  s = add(s, {kind: "rotate", control: "mode", steps: 5}); // Candidate NAV1
  s = add(s, {kind: "ui-tick", elapsedMs: 6000}); // Confirmed by UI selector timeout
  assert.equal(s.deviceState.mode, "NAV1");
  const depth = s.deviceState.vrmDepthM;
  s = add(s, {kind: "pad", control: "trackpad", direction: "down"});
  assert.equal(s.deviceState.vrmDepthM, depth);
});

test("MARK rejects absent positioning; FUNC hold opens the source-backed assignment selector", () => {
  let s = run({kind: "press", control: "mark"});
  // Supersedes F0 placeholder: MARK is now implemented only when a course
  // explicitly opts into synthetic positioning (public manual §1.20).
  assert.match(s.deviceState.notice, /NO POSITION/);
  assert.equal(s.deviceState.navigation.waypoints.length, 0);
  s = add(s, {kind: "down", control: "func"});
  s = add(s, {kind: "tick", steps: 4});
  s = add(s, {kind: "up", control: "func"});
  assert.equal(s.deviceState.overlay?.kind,"func-program",
    "manual §1.19 long FUNC must open the programmable selection list");
  assert.equal(s.deviceState.overlay?.itemIndex,0);
  s=add(s,{kind:"press",control:"menu"});
  assert.equal(s.deviceState.overlay,null,"MENU cancels without reassigning the key");
  assert.equal(s.deviceState.settings.keySetup,"Pic. Advance");
});

test("observation remains identical under manual Range and Gain, display reacts", () => {
  let s = run();
  const observation = observeSounder(TRAINING_SCENARIO, s.worldState, {columns: 48, rows: 301});
  const before = makeEchoFrame(observation, s.deviceState, {rows: 90});
  s = add(s, {kind: "push", control: "gain"});
  s = add(s, {kind: "pad", control: "trackpad", direction: "up"});
  s = add(s, {kind: "press", control: "enter"});
  s = add(s, {kind: "rotate", control: "gain", steps: 8});
  s = add(s, {kind: "press", control: "range"});
  s = add(s, {kind: "pad", control: "trackpad", direction: "right"});
  s = add(s, {kind: "press", control: "enter"});
  const after = makeEchoFrame(observation, s.deviceState, {rows: 90});
  assert.notEqual(after.rangeM, before.rangeM);
  assert.notEqual(after.gain, before.gain);
  assert.notDeepEqual([...after.pixels], [...before.pixels]);
  const unchanged = observeSounder(TRAINING_SCENARIO, s.worldState, {columns: 48, rows: 301});
  assert.deepEqual(unchanged.channels[50], observation.channels[50]);
});
