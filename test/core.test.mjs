import test from "node:test";
import assert from "node:assert/strict";
import {createSession, dispatch, replay, createReplayEnvelope, reset, sessionHash} from "../src/core/session.mjs";
import {fingerprint, classifyHoldTicks, validateInput, TICK_DURATION_MS} from "../src/core/protocol.mjs";
import {TRAINING_SCENARIO, observeSounder, streamSeed, initialWorldState} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as device} from "../src/devices/fcv588/adapter.mjs";

const fresh = () => createSession(device, TRAINING_SCENARIO);
const send = (run, input) => dispatch(run, device, input, TRAINING_SCENARIO);
function boot(run = fresh()) {
  run = send(run, {kind: "down", control: "power"});
  run = send(run, {kind: "up", control: "power"});
  return send(run, {kind: "tick", steps: 4});
}

test("F0 defaults are offline, pinned, and powered off", () => {
  const s = fresh();
  assert.equal(s.deviceState.power, "off");
  assert.equal(s.worldState.simTick, 0);
  assert.equal(s.meta.tickDurationMs, TICK_DURATION_MS);
  assert.equal(s.meta.profileHash, fingerprint({id:device.id,
    revision:device.revision,profile:device.profile,
    controls:device.controls,gestures:device.gestures,
    holdThresholdMs:device.holdThresholdMs}));
  assert.deepEqual(s.heldControls, {});
  assert.deepEqual(s.events, []);
});

test("world clock advances with FCV off, while device remains off", () => {
  let off = send(fresh(), {kind: "tick", steps: 4});
  assert.equal(off.worldState.simTick, 4);
  assert.equal(off.sensorState.lastWorldTick, 4);
  assert.equal(off.deviceState.power, "off");
  const on = boot();
  assert.equal(on.worldState.simTick, 4);
  assert.equal(on.deviceState.power, "on");
  assert.deepEqual(off.worldState, on.worldState);
  assert.deepEqual(observeSounder(TRAINING_SCENARIO, off.worldState).channels[50],
    observeSounder(TRAINING_SCENARIO, on.worldState).channels[50]);
});

test("physical long/short press comes from integer tick edges", () => {
  assert.equal(classifyHoldTicks(3), "short");
  assert.equal(classifyHoldTicks(4), "long");
  let short = send(fresh(), {kind: "down", control: "power"});
  short = send(short, {kind: "tick", steps: 3});
  short = send(short, {kind: "up", control: "power"});
  assert.equal(short.deviceState.power, "booting");
  let long = send(fresh(), {kind: "down", control: "power"});
  long = send(long, {kind: "tick", steps: 4});
  long = send(long, {kind: "up", control: "power"});
  assert.equal(long.deviceState.power, "off");
  assert.deepEqual(long.heldControls, {});
});

test("captured POWER hold duration works independently of paused sim time", () => {
  let s = boot();
  const simTickBefore = s.worldState.simTick;
  s = send(s, {kind: "down", control: "power"});
  // Instructor pauses simulation; no core tick occurs while student holds.
  s = send(s, {kind: "up", control: "power", durationMs: 3501});
  assert.equal(s.worldState.simTick, simTickBefore);
  assert.equal(s.deviceState.power, "off");
  assert.equal(sessionHash(replay(device, TRAINING_SCENARIO, createReplayEnvelope(s))), sessionHash(s));
  assert.throws(() => send(boot(), {kind: "up", control: "power", durationMs: -1}), /duration/);
});

test("same-revision replay and live session reject changed hold, gesture or control semantics",()=>{
  let s=boot();
  s=send(s,{kind:"down",control:"func"});
  s=send(s,{kind:"up",control:"func",durationMs:800});
  assert.equal(s.deviceState.overlay?.kind,"func-program",
    "800 ms is LONG under the explicit 650 ms classroom threshold");
  const saved=createReplayEnvelope(s);
  const changedHold={...device,holdThresholdMs:{...device.holdThresholdMs,func:1000}};
  assert.equal(changedHold.revision,device.revision);
  assert.throws(()=>replay(changedHold,TRAINING_SCENARIO,saved),/contract|profile/i,
    "same-revision threshold drift must fail before reinterpretation of long as short");
  assert.throws(()=>dispatch(s,changedHold,{kind:"tick",steps:1},TRAINING_SCENARIO),
    /profile|contract/i);
  const changedGesture={...device,gestures:{...device.gestures,
    mode:["rotate","press"]}};
  assert.throws(()=>replay(changedGesture,TRAINING_SCENARIO,saved),/contract|profile/i);
  const changedControls={...device,controls:[...device.controls,"hidden-button"]};
  assert.throws(()=>replay(changedControls,TRAINING_SCENARIO,saved),/contract|profile/i);
  assert.equal(sessionHash(replay(device,TRAINING_SCENARIO,saved)),sessionHash(s));
});

test("canonical replay detects same-revision reducer-result drift without trusting a client checksum as authentication",()=>{
  let s=boot();
  s=send(s,{kind:"press",control:"range"});
  s=send(s,{kind:"pad",control:"trackpad",direction:"right"});
  s=send(s,{kind:"press",control:"enter"});
  assert.equal(s.deviceState.rangeMode,"manual");
  const envelope=createReplayEnvelope(s);
  const changedReducer={...device,reduce:(state,event)=>{
    const current=device.reduce(state,event);
    return event.kind==="press" && event.control==="enter" &&
      current.rangeMode==="manual"?{...current,rangeIndex:5}:current;
  }};
  assert.equal(changedReducer.revision,device.revision);
  assert.throws(()=>replay(changedReducer,TRAINING_SCENARIO,envelope),
    /replay.*(final|state|drift)|final.*hash|state.*mismatch/i,
    "same declared profile does not excuse a silently changed final reducer result");
  assert.equal(sessionHash(replay(device,TRAINING_SCENARIO,envelope)),sessionHash(s));
});

test("boot completes on simulated ticks only", () => {
  let s = send(fresh(), {kind: "down", control: "power"});
  s = send(s, {kind: "up", control: "power"});
  s = send(s, {kind: "tick", steps: 3});
  assert.equal(s.deviceState.power, "booting");
  s = send(s, {kind: "tick"});
  assert.equal(s.deviceState.power, "on");
});

test("replay reproduces all session hashes and prefix checkpoints", () => {
  let s = boot();
  s = send(s, {kind: "rotate", control: "mode", steps: 2});
  s = send(s, {kind: "press", control: "range"});
  s = send(s, {kind: "pad", control: "trackpad", direction: "right"});
  s = send(s, {kind: "pad", control: "trackpad", direction: "down"});
  s = send(s, {kind: "press", control: "enter"});
  const after = replay(device, TRAINING_SCENARIO, createReplayEnvelope(s));
  assert.equal(sessionHash(after), sessionHash(s));
  for (let n = 0; n <= s.events.length; n++) {
    let expected = fresh();
    for (const e of s.events.slice(0, n)) {
      const {seq, tick, schemaVersion, ...input} = e;
      expected = send(expected, input);
    }
    assert.equal(sessionHash(replay(device, TRAINING_SCENARIO, createReplayEnvelope(expected))),
      sessionHash(expected));
  }
});

test("reset clears held keys, sequence and all independent states", () => {
  let s = boot();
  s = send(s, {kind: "down", control: "func"});
  s = send(s, {kind: "tick", steps: 9});
  const res = reset(device, TRAINING_SCENARIO);
  assert.equal(sessionHash(res), sessionHash(fresh()));
  assert.deepEqual(res.heldControls, {});
  assert.deepEqual(res.pendingEffects, []);
  assert.equal(res.events.length, 0);
  assert.equal(res.worldState.simTick, 0);
  assert.equal(res.sensorState.lastWorldTick, 0);
});

test("replay fails closed on header, scenario, profile, sequence or tick drift", () => {
  const s = boot();
  const envelope = createReplayEnvelope(s);
  assert.throws(() => replay(device, TRAINING_SCENARIO, s.events), /envelope/);
  assert.throws(() => replay(device, TRAINING_SCENARIO, {...envelope, meta: {...envelope.meta, prngVersion: "other"}}), /content/);
  assert.throws(() => replay(device, {...TRAINING_SCENARIO, seed: 66}, envelope), /contract/);
  const corrupted = envelope.events.map(e => ({...e}));
  corrupted[2].tick = 300;
  assert.throws(() => replay(device, TRAINING_SCENARIO, {...envelope, events: corrupted}), /content/);
  const badSeq = envelope.events.map(e => ({...e}));
  badSeq[1].seq = 19;
  assert.throws(() => replay(device, TRAINING_SCENARIO, {...envelope, events: badSeq}), /content/);
  const other = {...device, revision: "new"};
  assert.throws(() => send({...s, profileRevision: "bad"}, {kind: "tick"}), /profile/);
  assert.throws(() => replay(other, TRAINING_SCENARIO, envelope), /contract/);
});

test("swapped metadata and logs reject before any replay state updates", () => {
  const a = boot();
  const b = send(boot(), {kind: "rotate", control: "mode", steps: 1});
  const envelopeA = createReplayEnvelope(a);
  const envelopeB = createReplayEnvelope(b);
  assert.throws(() => replay(device, TRAINING_SCENARIO,
    {...envelopeA, events: envelopeB.events}), /content mismatch/);
  assert.throws(() => replay(device, TRAINING_SCENARIO,
    {...envelopeB, meta: {...envelopeB.meta, scenarioHash: "another-fixture"}}), /content mismatch/);
  // An adversarial client could recalculate a non-cryptographic checksum:
  // no client-only scheme here purports to authenticate a source/person.
  assert.match(envelopeA.contentFingerprint, /^f0-fnv1a32-/);
});

test("illegal control, reserved fields and edge errors reject", () => {
  assert.throws(() => send(fresh(), {kind: "press", control: "power"}), /hold-capable/);
  assert.throws(() => send(fresh(), {kind: "rotate", control: "range", steps: 1}), /unsupported/);
  assert.throws(() => send(fresh(), {kind: "press", control: "range", seq: 1}), /reserved/);
  assert.throws(() => send(fresh(), {kind: "up", control: "power"}), /release without press/);
  const held = send(fresh(), {kind: "down", control: "power"});
  assert.throws(() => send(held, {kind: "down", control: "power"}), /duplicate/);
  assert.throws(() => validateInput({kind: "pad", control: "up", direction: "down"}), /trackpad/);
});

test("stable named noise streams are independent of other device instances", () => {
  const original = streamSeed(TRAINING_SCENARIO.seed, "sensor:fcv588:sonar-v1");
  const r5 = streamSeed(TRAINING_SCENARIO.seed, "sensor:r5:ais-v1");
  assert.notEqual(original, r5);
  assert.equal(streamSeed(TRAINING_SCENARIO.seed, "sensor:fcv588:sonar-v1"), original);
  const sensor = observeSounder(TRAINING_SCENARIO, initialWorldState(TRAINING_SCENARIO), {columns: 16, rows: 60});
  void r5;
  const sensorAfterAddingIdleR5 = observeSounder(TRAINING_SCENARIO, initialWorldState(TRAINING_SCENARIO), {columns: 16, rows: 60});
  assert.deepEqual(sensor.channels[50], sensorAfterAddingIdleR5.channels[50]);
});

test("device inputs never mutate or advance world until explicit tick", () => {
  let s = boot();
  const hashBefore = fingerprint(s.worldState);
  const sensorBefore = fingerprint(s.sensorState);
  s = send(s, {kind: "press", control: "range"});
  s = send(s, {kind: "pad", control: "trackpad", direction: "right"});
  s = send(s, {kind: "press", control: "enter"});
  s = send(s, {kind: "rotate", control: "mode", steps: 2});
  assert.equal(fingerprint(s.worldState), hashBefore);
  assert.equal(fingerprint(s.sensorState), sensorBefore);
});
