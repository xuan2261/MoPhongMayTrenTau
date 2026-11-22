import test from "node:test";
import assert from "node:assert/strict";
import {bindHoldControl} from "../web/hold-input.mjs";

class FakeButton extends EventTarget {
  classes = new Set();
  captured = [];
  classList = {
    add: c => this.classes.add(c),
    remove: c => this.classes.delete(c),
  };
  setPointerCapture(pointerId) {
    this.captured.push(pointerId);
  }
}

function input(target, type, values = {}) {
  const event = new Event(type, {cancelable: true});
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(event, key, {value});
  }
  target.dispatchEvent(event);
  return event;
}

function rig(control = "power") {
  const button = new FakeButton();
  const documentTarget = new EventTarget();
  const windowTarget = new EventTarget();
  const events = [];
  let elapsedMs = 0;
  const binding = bindHoldControl({
    button, control, documentTarget, windowTarget,
    now: () => elapsedMs,
    emit: event => events.push(event),
  });
  return {button, documentTarget, windowTarget, events, binding, advance: ms => {elapsedMs += ms;}};
}

test("pointer hold is paired only by the originating pointer id", () => {
  const r = rig();
  input(r.button, "pointerdown", {button: 0, pointerId: 3, isPrimary: true});
  assert.deepEqual(r.events, [{kind: "down", control: "power"}]);
  input(r.button, "pointerup", {pointerId: 99});
  input(r.button, "pointercancel", {pointerId: 99});
  assert.deepEqual(r.events, [{kind: "down", control: "power"}]);
  assert.equal(r.button.classes.has("pressing"), true);
  input(r.button, "pointerup", {pointerId: 3});
  input(r.button, "lostpointercapture", {pointerId: 3});
  assert.deepEqual(r.events, [
    {kind: "down", control: "power"}, {kind: "up", control: "power", durationMs: 0},
  ]);
  assert.equal(r.button.classes.has("pressing"), false);
  r.binding.dispose();
});

test("secondary pointer and mouse button never steal the active hold", () => {
  const r = rig("func");
  input(r.button, "pointerdown", {button: 2, pointerId: 20, isPrimary: true});
  input(r.button, "pointerdown", {button: 0, pointerId: 21, isPrimary: false});
  assert.equal(r.events.length, 0);
  input(r.button, "pointerdown", {button: 0, pointerId: 10, isPrimary: true});
  input(r.button, "pointerdown", {button: 0, pointerId: 11, isPrimary: true});
  input(r.button, "pointerup", {pointerId: 11});
  assert.deepEqual(r.events, [{kind: "down", control: "func"}]);
  input(r.button, "pointercancel", {pointerId: 10});
  assert.deepEqual(r.events.map(e => e.kind), ["down", "cancel"]);
  r.binding.dispose();
});

test("keyboard hold clears when focus shifts before keyup", () => {
  const r = rig();
  input(r.button, "keydown", {key: " ", repeat: false});
  assert.deepEqual(r.events.map(e => e.kind), ["down"]);
  input(r.button, "blur");
  input(r.documentTarget, "keyup", {key: " "});
  assert.deepEqual(r.events.map(e => e.kind), ["down", "cancel"]);
  assert.equal(r.button.classes.has("pressing"), false);
  input(r.button, "keydown", {key: " ", repeat: false});
  input(r.documentTarget, "keyup", {key: " "});
  assert.deepEqual(r.events.map(e => e.kind), ["down", "cancel", "down", "up"]);
  assert.equal(r.events.at(-1).durationMs, 0);
  r.binding.dispose();
});

test("global keyup catches keys released off the originating button", () => {
  const r = rig("func");
  input(r.button, "keydown", {key: "Enter", repeat: false});
  input(r.button, "keydown", {key: "Enter", repeat: true});
  input(r.documentTarget, "keyup", {key: " "});
  assert.deepEqual(r.events.map(e => e.kind), ["down"]);
  input(r.documentTarget, "keyup", {key: "Enter"});
  assert.deepEqual(r.events.map(e => e.kind), ["down", "up"]);
  assert.equal(r.events.at(-1).durationMs, 0);
  r.binding.dispose();
});

test("physical press records real hold duration even with simulator clock paused", () => {
  const r = rig();
  input(r.button, "pointerdown", {button: 0, pointerId: 6, isPrimary: true});
  r.advance(3501);
  input(r.button, "pointerup", {pointerId: 6});
  assert.deepEqual(r.events.at(-1), {kind: "up", control: "power", durationMs: 3501});
  r.binding.dispose();
});

test("window blur, reset cancel and disposal never strand a held key", () => {
  const r = rig();
  input(r.button, "pointerdown", {button: 0, pointerId: 6, isPrimary: true});
  input(r.windowTarget, "blur");
  assert.deepEqual(r.events.map(e => e.kind), ["down", "cancel"]);
  input(r.button, "pointerdown", {button: 0, pointerId: 7, isPrimary: true});
  assert.equal(r.binding.cancel(), true);
  assert.equal(r.binding.cancel(), false);
  input(r.button, "pointerup", {pointerId: 7});
  assert.deepEqual(r.events.map(e => e.kind), ["down", "cancel", "down", "cancel"]);
  input(r.button, "pointerdown", {button: 0, pointerId: 8, isPrimary: true});
  r.binding.dispose();
  assert.deepEqual(r.events.map(e => e.kind), ["down", "cancel", "down", "cancel", "down", "cancel"]);
  input(r.button, "pointerdown", {button: 0, pointerId: 9, isPrimary: true});
  assert.equal(r.events.length, 6);
});

test("pointer capture denial never emits a stray cancel without a matching down",()=>{
  const r=rig("power");
  const originalCapture=r.button.setPointerCapture.bind(r.button);
  r.button.setPointerCapture=()=>{throw new Error("NotFoundError");};
  input(r.button,"pointerdown",{button:0,pointerId:39,isPrimary:true});
  assert.deepEqual(r.events,[],"failed capture is not a pressed physical key");
  assert.equal(r.button.classes.has("pressing"),false,
    "denied pointer capture may not leave a stuck visual key");
  r.button.setPointerCapture=originalCapture;
  input(r.button,"pointerdown",{button:0,pointerId:40,isPrimary:true});
  input(r.button,"pointerup",{pointerId:40});
  assert.deepEqual(r.events.map(x=>x.kind),["down","up"]);
  r.binding.dispose();
});

test("screen-reader button activation emits one canonical short POWER/FUNC edge pair without duplicate key clicks",async()=>{
  const r=rig("power");
  input(r.button,"click",{detail:0});
  assert.deepEqual(r.events,[{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:0}],
    "assistive activation has no pointerdown or keyboard keydown but must work");
  input(r.button,"pointerdown",{button:0,pointerId:8,isPrimary:true});
  input(r.button,"pointerup",{pointerId:8});
  input(r.button,"click",{detail:1});
  assert.equal(r.events.length,4,"ordinary pointer click cannot double-dispatch");
  input(r.button,"keydown",{key:"Enter",repeat:false});
  input(r.documentTarget,"keyup",{key:"Enter"});
  input(r.button,"click",{detail:0});
  assert.equal(r.events.length,6,"native Enter click after keyup must be suppressed");
  await Promise.resolve();
  input(r.button,"click",{detail:0});
  assert.equal(r.events.length,8,"later independent screen-reader click must work");
  r.binding.dispose();
});
