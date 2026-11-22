// V55-B QA-only synthetic EventTarget bridge test.
// This is NOT actual Windows window.blur and NOT Narrator/NVDA spoken-output QA.
// Do not promote a passing result to hardware accessibility acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import {bindHoldControl} from "../../../web/hold-input.mjs";
import {FCV588_ADAPTER as adapter} from "../../../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../../../src/core/scenario.mjs";
import {createSession, dispatch, createReplayEnvelope, replay, sessionHash}
  from "../../../src/core/session.mjs";

class TestButton extends EventTarget {
  classes = new Set();
  classList = {
    add: value => this.classes.add(value),
    remove: value => this.classes.delete(value),
  };
  setPointerCapture() {}
}

function fire(target, type, values = {}) {
  const event = new Event(type, {cancelable: true});
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, {value});
  }
  target.dispatchEvent(event);
  return event;
}

function boot() {
  let session = createSession(adapter, scenario);
  for (const event of [
    {kind: "down", control: "power"},
    {kind: "up", control: "power", durationMs: 100},
    {kind: "tick", steps: 4},
  ]) session = dispatch(session, adapter, event, scenario);
  assert.equal(session.deviceState.power, "on");
  return session;
}

function rig() {
  const button = new TestButton();
  const documentTarget = new EventTarget();
  const windowTarget = new EventTarget();
  const emitted = [];
  const state = {session: boot()};
  let elapsedMs = 0;
  const binding = bindHoldControl({
    button, control: "power", documentTarget, windowTarget,
    now: () => elapsedMs,
    emit: event => {
      emitted.push({...event});
      state.session = dispatch(state.session, adapter, event, scenario);
    },
  });
  const down = id => fire(button, "pointerdown",
    {button: 0, isPrimary: true, pointerId: id});
  const up = id => fire(button, "pointerup", {pointerId: id});
  const checkReplay = () => assert.equal(
    sessionHash(replay(adapter, scenario, createReplayEnvelope(state.session))),
    sessionHash(state.session), "adapter-originated event log must replay exactly");
  return {
    button, documentTarget, windowTarget, state, emitted, binding,
    down, up, checkReplay,
    advance: ms => {elapsedMs += ms;},
    tick: ms => {state.session = dispatch(state.session, adapter,
      {kind: "ui-tick", elapsedMs: ms}, scenario);},
  };
}

test("V55-B UNIT: simulated blur during POWER hold cancels exactly once and replays", () => {
  const r = rig();
  const beforeWorld = r.state.session.worldState.simTick;
  r.down(41);
  assert.equal(r.state.session.deviceState.overlay?.kind, "power-hold");
  r.tick(1250);
  assert.equal(r.state.session.deviceState.overlay?.remainingMs, 1750);
  fire(r.windowTarget, "blur"); // Synthetic EventTarget only, NOT OS blur.
  r.up(41);
  fire(r.button, "lostpointercapture", {pointerId: 41});
  assert.deepEqual(r.emitted.map(x => x.kind), ["down", "cancel"]);
  assert.equal(r.state.session.deviceState.power, "on");
  assert.equal(r.state.session.deviceState.overlay, null);
  assert.deepEqual(r.state.session.heldControls, {});
  assert.equal(r.state.session.worldState.simTick, beforeWorld);
  assert.equal(r.button.classes.has("pressing"), false);
  r.checkReplay();
  r.binding.dispose();
});

test("V55-B UNIT: blur restores prior BRILL overlay and does not double-cancel", () => {
  const r = rig();
  fire(r.button, "click", {detail: 0});
  const old = r.state.session.deviceState.overlay;
  assert.equal(old?.kind, "brill");
  r.down(42);
  fire(r.windowTarget, "blur"); // Synthetic only.
  fire(r.windowTarget, "blur");
  fire(r.button, "pointercancel", {pointerId: 42});
  assert.deepEqual(r.emitted.map(x => x.kind),
    ["down", "up", "down", "cancel"]);
  assert.deepEqual(r.state.session.deviceState.overlay, old);
  assert.equal(r.state.session.deviceState.power, "on");
  r.checkReplay();
  r.binding.dispose();
});

test("V55-B UNIT: button focus loss before document keyup is a single cancel", () => {
  const r = rig();
  fire(r.button, "keydown", {key: "Enter", repeat: false});
  fire(r.button, "blur");
  fire(r.documentTarget, "keyup", {key: "Enter"});
  fire(r.windowTarget, "blur");
  assert.deepEqual(r.emitted.map(x => x.kind), ["down", "cancel"]);
  assert.equal(r.state.session.deviceState.power, "on");
  assert.deepEqual(r.state.session.heldControls, {});
  r.checkReplay();
  r.binding.dispose();
});

test("V55-B UNIT: simulated assistive native activation is one replayable short pair", () => {
  const r = rig();
  fire(r.button, "click", {detail: 0});
  assert.deepEqual(r.emitted, [
    {kind: "down", control: "power"},
    {kind: "up", control: "power", durationMs: 0},
  ]);
  assert.equal(r.state.session.deviceState.overlay?.kind, "brill");
  assert.equal(r.state.session.deviceState.power, "on");
  r.checkReplay();
  r.binding.dispose();
});

test("V55-B UNIT: non-cancelled >3000ms pointer hold powers down and replays", () => {
  const r = rig();
  r.down(44);
  r.advance(3001);
  r.up(44);
  assert.deepEqual(r.emitted.map(x => x.kind), ["down", "up"]);
  assert.equal(r.emitted[1].durationMs, 3001);
  assert.equal(r.state.session.deviceState.power, "off");
  r.checkReplay();
  r.binding.dispose();
});
