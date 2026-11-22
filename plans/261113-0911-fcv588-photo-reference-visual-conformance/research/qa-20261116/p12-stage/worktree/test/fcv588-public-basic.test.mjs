import test from "node:test";
import assert from "node:assert/strict";
import {createSession, dispatch, replay, createReplayEnvelope, sessionHash} from "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";

const send = (s, input) => dispatch(s, adapter, input, TRAINING_SCENARIO);
function start() {
  let s = createSession(adapter, TRAINING_SCENARIO);
  s = send(s, {kind: "down", control: "power"});
  s = send(s, {kind: "up", control: "power", durationMs: 100});
  return send(s, {kind: "tick", steps: 4});
}
function rotate(s, control, steps = 1) {
  return send(s, {kind: "rotate", control, steps});
}
const press = (s, control) => send(s, {kind: "press", control});
const pad = (s, direction) => send(s, {kind: "pad", control: "trackpad", direction});
const ui = (s, elapsedMs) => send(s, {kind: "ui-tick", elapsedMs});

test("first MODE detent opens selection without immediate effective mode switch", () => {
  let s = rotate(start(), "mode", 1);
  assert.equal(s.deviceState.mode, "LF");
  assert.equal(s.deviceState.overlay?.kind, "mode");
  assert.equal(s.deviceState.overlay?.candidate, "DUAL");
  s = rotate(s, "mode", 1);
  assert.equal(s.deviceState.mode, "LF");
  assert.equal(s.deviceState.overlay?.candidate, "HF");
});

test("UI clock expires MODE independently of paused world and is replay-deterministic", () => {
  let s = rotate(start(), "mode", 1);
  assert.equal(s.deviceState.mode, "LF", "cannot pass with an immediate F0 mode change");
  assert.equal(s.deviceState.overlay?.kind, "mode");
  const before = s.worldState.simTick;
  s = ui(s, 6000);
  assert.equal(s.worldState.simTick, before, "UI timeout must not run world clock");
  assert.equal(s.deviceState.mode, "DUAL");
  assert.equal(s.deviceState.overlay, null);
  assert.equal(sessionHash(replay(adapter, TRAINING_SCENARIO, createReplayEnvelope(s))), sessionHash(s));
  assert.throws(() => ui(s, -1), /elapsed|invalid/i);
});

test("public reducer revision rejects replay envelopes bound to F0 semantics", () => {
  assert.notEqual(adapter.revision, "F0-provisional-1");
  const envelope = createReplayEnvelope(start());
  const older = {...adapter, revision: "F0-provisional-1",
    profile: {...adapter.profile, revision: "F0-provisional-1"}};
  assert.throws(() => replay(older, TRAINING_SCENARIO, envelope), /contract|profile/i);
});

test("brilliance key cycles levels and an independent UI timeout commits the preview", () => {
  let s = start();
  s = send(s, {kind: "down", control: "power"});
  s = send(s, {kind: "up", control: "power", durationMs: 200});
  assert.equal(s.deviceState.overlay?.kind, "brill");
  s = send(s, {kind: "down", control: "power"});
  s = send(s, {kind: "up", control: "power", durationMs: 200});
  assert.equal(s.deviceState.overlay?.value, 8, "OEM §1.3 requires 9→8");
  const tickBefore = s.worldState.simTick;
  s = ui(s, 6000);
  assert.equal(s.deviceState.brightness, 8);
  assert.equal(s.worldState.simTick, tickBefore);
  assert.equal(s.deviceState.overlay, null);
});

test("POWER hold boundary is greater than 3000ms and F0 remains isolated", () => {
  let s = start();
  s = send(s, {kind: "down", control: "power"});
  s = send(s, {kind: "up", control: "power", durationMs: 3000});
  assert.equal(s.deviceState.power, "on");
  s = send(s, {kind: "down", control: "power"});
  s = send(s, {kind: "up", control: "power", durationMs: 3001});
  assert.equal(s.deviceState.power, "off");
});

test("POWER hold shows a replayable countdown and cancelled input does not shut down", () => {
  let s=start();
  const worldBefore=s.worldState.simTick;
  s=send(s,{kind:"down",control:"power"});
  assert.equal(s.deviceState.overlay?.kind,"power-hold",
    "physical down edge must show shutdown countdown, not wait for release");
  s=ui(s,1250);
  assert.equal(s.deviceState.overlay?.remainingMs,1750);
  assert.equal(s.worldState.simTick,worldBefore,"countdown is UI time, not world time");
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(s.deviceState.power,"on");
  assert.equal(s.deviceState.overlay,null);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s),"cancelled holds must replay");
});

test("RANGE repeated press in manual mode stages next preset until ENTER", () => {
  let s = start();
  s = press(s, "range");
  s = pad(s, "right");
  s = press(s, "enter");
  assert.equal(s.deviceState.rangeMode, "manual");
  s = press(s, "range");
  const oldIndex = s.deviceState.rangeIndex;
  s = press(s, "range");
  assert.notEqual(s.deviceState.overlay?.index, oldIndex);
  assert.equal(s.deviceState.rangeIndex, oldIndex);
  s = press(s, "enter");
  assert.equal(s.deviceState.rangeIndex, (oldIndex + 1) % 8);
});

test("GAIN Auto Offset is bounded independently from manual gain", () => {
  let s = start();
  const manual = s.deviceState.manualGain;
  s = rotate(s, "gain", 12);
  assert.equal(s.deviceState.manualGain, manual);
  assert.equal(s.deviceState.autoGainOffset, 5);
  s = rotate(s, "gain", -20);
  assert.equal(s.deviceState.autoGainOffset, -5);
  s = press(s, "range");
  s = press(s, "menu");
  assert.equal(s.deviceState.autoGainOffset, -5);
});

test("free VRM is disabled in NAV after MODE selection commits", () => {
  let s = start();
  s = rotate(s, "mode", 5);
  assert.equal(s.deviceState.mode, "LF");
  assert.equal(s.deviceState.overlay?.kind, "mode");
  s = ui(s, 6000);
  assert.equal(s.deviceState.mode, "NAV1");
  const before = s.deviceState.vrmDepthM;
  s = pad(s, "down");
  assert.equal(s.deviceState.vrmDepthM, before);
});
