import test from "node:test";
import assert from "node:assert/strict";
import { fingerprint } from "../src/core/protocol.mjs";
import {
  createSession,
  dispatch,
  createReplayEnvelope,
  replay,
  sessionHash,
} from "../src/core/session.mjs";
import {
  createBridgeSession,
  dispatchBridgeInput,
  createBridgeReplay,
  replayBridgeSession,
  bridgeSessionHash,
} from "../src/core/device-runtime.mjs";
import { MDC2060_ADAPTER } from "../src/devices/mdc2060/adapter.mjs";
import {
  MDC2060_PROFILE,
  MDC2060_SETTINGS_STORAGE_KEY,
  MDC2060_SETTINGS_SCHEMA_VERSION,
  encodeMdc2060Settings,
  decodeMdc2060Settings,
  initialMdc2060State,
  reduceMdc2060,
  probeMdc2060,
} from "../src/devices/mdc2060/model.mjs";
import {
  MDC2060_RANGES,
  MDC2060_FKEY_PRESETS,
  MDC2060_MAIN_MENU_TREE,
  MDC2060_SYSTEM_MENU_TREE,
} from "../src/devices/mdc2060/spec.mjs";
import {
  MDC2060_COASTAL_SCENARIO,
  MDC2060_STORM_SCENARIO,
} from "../src/devices/mdc2060/scenarios.mjs";

const SCENARIO = MDC2060_COASTAL_SCENARIO;
const ADAPTERS = [MDC2060_ADAPTER];
const DEV = MDC2060_ADAPTER.id;

function bStep(bridge, input, scenario = SCENARIO) {
  const target = input.kind === "tick" ? "bridge" : DEV;
  return dispatchBridgeInput(bridge, ADAPTERS, target, input, scenario);
}

function bState(bridge) {
  return bridge.devices[DEV].deviceState;
}

function bShortPressHoldKey(bridge, control, durationMs = 200, scenario = SCENARIO) {
  let b = bStep(bridge, { kind: "down", control }, scenario);
  b = bStep(b, { kind: "up", control, durationMs }, scenario);
  return b;
}

function bBootToTx(scenario = SCENARIO, { fast = true } = {}) {
  let b = createBridgeSession(ADAPTERS, scenario);
  if (fast) {
    b = bStep(b, { kind: "training-fixture", fixture: "fastPreheat", enabled: true }, scenario);
  }
  b = bShortPressHoldKey(b, "power", 200, scenario);
  if (fast) {
    b = bStep(b, { kind: "tick", steps: 5 }, scenario);
  } else {
    for (let i = 0; i < 6; i++) {
      b = bStep(b, { kind: "tick", steps: 20 }, scenario);
    }
  }
  b = bStep(b, { kind: "press", control: "stby_tx" }, scenario);
  return b;
}

function navigateMainMenuItem(bridge, groupIdx, itemIdx, scenario = SCENARIO) {
  let b = bShortPressHoldKey(bridge, "menu", 200, scenario);
  for (let g = 0; g < groupIdx; g++) {
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }, scenario);
  }
  for (let i = 0; i < itemIdx; i++) {
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }, scenario);
  }
  return b;
}

function assertNoNegativeZeroOrNonFinite(obj, path = "root") {
  if (typeof obj === "number") {
    assert.ok(Number.isFinite(obj), `${path} must be finite, got ${obj}`);
    assert.ok(!Object.is(obj, -0), `${path} must not be -0`);
    return;
  }
  if (obj === null || typeof obj === "string" || typeof obj === "boolean") return;
  assert.ok(typeof obj === "object", `${path} has unsupported type ${typeof obj}`);
  assert.ok(!(obj instanceof Uint8Array) && !(obj instanceof Map) && !(obj instanceof Set),
    `${path} has non-JSON container`);
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      assertNoNegativeZeroOrNonFinite(obj[i], `${path}[${i}]`);
    }
    return;
  }
  for (const [k, v] of Object.entries(obj)) {
    assert.notEqual(v, undefined, `${path}.${k} must not be undefined`);
    assertNoNegativeZeroOrNonFinite(v, `${path}.${k}`);
  }
}

test("MDC2060_ADAPTER is deeply frozen and has identical profileHash in single and bridge sessions", () => {
  assert.ok(Object.isFrozen(MDC2060_ADAPTER));
  assert.ok(Object.isFrozen(MDC2060_ADAPTER.profile));
  assert.ok(Object.isFrozen(MDC2060_ADAPTER.profile.menuEntryOrderIds));
  assert.ok(Object.isFrozen(MDC2060_ADAPTER.controls));
  assert.ok(Object.isFrozen(MDC2060_ADAPTER.holdThresholdMs));
  assert.ok(Object.isFrozen(MDC2060_ADAPTER.fixtures));
  assert.ok(Object.isFrozen(MDC2060_ADAPTER.gestures));
  for (const ctrl of MDC2060_ADAPTER.controls) {
    assert.ok(Array.isArray(MDC2060_ADAPTER.gestures[ctrl]), `missing gestures for ${ctrl}`);
    assert.ok(Object.isFrozen(MDC2060_ADAPTER.gestures[ctrl]), `unfrozen gestures for ${ctrl}`);
  }
  assert.equal(MDC2060_PROFILE.firmware, null);
  assert.equal(MDC2060_PROFILE.menuEntryOrderIds.length, 42 + 15);

  const single = createSession(MDC2060_ADAPTER, SCENARIO);
  const bridge = createBridgeSession(ADAPTERS, SCENARIO);
  assert.equal(single.meta.profileHash, bridge.devices[DEV].profileHash);
  assertNoNegativeZeroOrNonFinite(initialMdc2060State());
});

test("Power & magnetron preheat (120s authentic, 5s fastPreheat, skipPreheat) and STBY/TX state machine", () => {
  // Authentic 120s preheat
  let b = createBridgeSession(ADAPTERS, SCENARIO);
  assert.equal(bState(b).powerMode, "off");
  assert.equal(bState(b).trainingFixture.fastPreheat, false);
  assert.equal(bState(b).trainingFixture.skipPreheat, false);

  // Ticking while off still advances simTick without booting
  b = bStep(b, { kind: "tick", steps: 10 });
  assert.equal(bState(b).powerMode, "off");
  assert.equal(bState(b).simTick, 10);

  // skipPreheat while OFF must NEVER turn on the radar
  b = bStep(b, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
  assert.equal(bState(b).powerMode, "off");
  b = bStep(b, { kind: "training-fixture", fixture: "skipPreheat", enabled: false });

  // Short power boots into authentic 120s preheat
  b = bShortPressHoldKey(b, "power", 300);
  assert.equal(bState(b).powerMode, "preheat");
  assert.equal(bState(b).preheatRemainingSec, 120);

  // STBY/TX ignored during preheat
  b = bStep(b, { kind: "press", control: "stby_tx" });
  assert.equal(bState(b).powerMode, "preheat");

  // 5x20 = 100s -> still preheat (20s remaining)
  for (let i = 0; i < 5; i++) b = bStep(b, { kind: "tick", steps: 20 });
  assert.equal(bState(b).powerMode, "preheat");
  assert.equal(bState(b).preheatRemainingSec, 20);
  assert.equal(bState(b).txSeconds, 0);

  // Final 20s -> transitions to standby (NEVER skips to transmit)
  b = bStep(b, { kind: "tick", steps: 20 });
  assert.equal(bState(b).powerMode, "standby");
  assert.equal(bState(b).preheatRemainingSec, 0);
  assert.equal(bState(b).txSeconds, 0);

  // Toggle standby <-> transmit
  b = bStep(b, { kind: "press", control: "stby_tx" });
  assert.equal(bState(b).powerMode, "transmit");
  b = bStep(b, { kind: "tick", steps: 5 });
  assert.equal(bState(b).txSeconds, 5);
  assert.equal(bState(b).sweepAzimuthDeg, (5 * 144) % 360);
  b = bStep(b, { kind: "press", control: "stby_tx" });
  assert.equal(bState(b).powerMode, "standby");

  // Mid-preheat fastPreheat clamp & skipPreheat immediate standby
  let b2 = createBridgeSession(ADAPTERS, SCENARIO);
  b2 = bShortPressHoldKey(b2, "power", 200);
  assert.equal(bState(b2).preheatRemainingSec, 120);
  b2 = bStep(b2, { kind: "training-fixture", fixture: "fastPreheat", enabled: true });
  assert.equal(bState(b2).preheatRemainingSec, 5);
  b2 = bStep(b2, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
  assert.equal(bState(b2).powerMode, "standby");
  assert.equal(bState(b2).preheatRemainingSec, 0);
});

test("Power hold <=3000ms (BRILL dialog) vs >3000ms (power off), ui-tick clock-skew latch, cancel & all 4 states", () => {
  // Direct press on hold-capable controls must throw
  const bErr = createBridgeSession(ADAPTERS, SCENARIO);
  assert.throws(() => bStep(bErr, { kind: "press", control: "power" }), /hold-capable/);
  assert.throws(() => bStep(bErr, { kind: "press", control: "ent" }), /hold-capable/);
  assert.throws(() => bStep(bErr, { kind: "press", control: "menu" }), /hold-capable/);

  // 3000ms is strictly short -> opens BRILL dialog
  let b = bBootToTx();
  b = bStep(b, { kind: "down", control: "power" });
  assert.equal(bState(b).overlay?.kind, "power-hold");
  b = bStep(b, { kind: "ui-tick", elapsedMs: 3000 });
  assert.equal(bState(b).powerMode, "transmit");
  assert.equal(bState(b).overlay?.remainingMs, 0);
  b = bStep(b, { kind: "up", control: "power", durationMs: 3000 });
  assert.equal(bState(b).powerMode, "transmit");
  assert.equal(bState(b).overlay?.kind, "brill");

  // BRILL cursorpad adjusts LCD (1..10) & Panel (0..10), ui-tick >= 6000ms auto-commits
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" });
  assert.equal(bState(b).overlay.lcdBrightness, 7);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
  assert.equal(bState(b).overlay.activeField, "panel");
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  assert.equal(bState(b).overlay.panelBrightness, 8);
  // Stray keys blocked inside BRILL
  const rangeBefore = bState(b).rangeIndex;
  b = bStep(b, { kind: "press", control: "range_up" });
  assert.equal(bState(b).rangeIndex, rangeBefore);
  b = bStep(b, { kind: "ui-tick", elapsedMs: 6000 });
  assert.equal(bState(b).overlay, null);
  assert.equal(bState(b).brightness, 7);
  assert.equal(bState(b).panelBrightness, 8);

  // cancel("power") restores priorOverlay including active menu edit draft
  b = navigateMainMenuItem(b, 0, 0); // ECHO > FTC
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  assert.equal(bState(b).overlay.editing, true);
  assert.equal(bState(b).overlay.draftValue, 1);
  b = bStep(b, { kind: "down", control: "power" });
  b = bStep(b, { kind: "ui-tick", elapsedMs: 1500 });
  b = bStep(b, { kind: "cancel", control: "power" });
  assert.equal(bState(b).overlay.kind, "menu");
  assert.equal(bState(b).overlay.editing, true);
  assert.equal(bState(b).overlay.draftValue, 1);

  // ui-tick > 3000ms powers OFF immediately AND latches against clock-skewed short up!
  b = bStep(b, { kind: "down", control: "power" });
  b = bStep(b, { kind: "ui-tick", elapsedMs: 3001 });
  assert.equal(bState(b).powerMode, "off");
  assert.equal(bState(b).powerOffHoldPendingRelease, true);
  b = bStep(b, { kind: "up", control: "power", durationMs: 2950 });
  assert.equal(bState(b).powerMode, "off");
  assert.equal(bState(b).powerOffHoldPendingRelease, false);

  // Power off via durationMs: 3001 from ALL 4 powered states: preheat, standby, transmit, sleep
  for (const targetState of ["preheat", "standby", "transmit", "sleep"]) {
    let s = createBridgeSession(ADAPTERS, SCENARIO);
    s = bStep(s, { kind: "training-fixture", fixture: "fastPreheat", enabled: true });
    s = bShortPressHoldKey(s, "power", 200);
    if (targetState !== "preheat") {
      s = bStep(s, { kind: "tick", steps: 5 });
    }
    if (targetState === "transmit" || targetState === "sleep") {
      s = bStep(s, { kind: "press", control: "stby_tx" });
    }
    if (targetState === "sleep") {
      s = navigateMainMenuItem(s, 6, 0); // SLEEP > MODE
      s = bShortPressHoldKey(s, "ent", 200);
      s = bStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
      s = bShortPressHoldKey(s, "ent", 200);
    }
    assert.equal(bState(s).powerMode, targetState);
    s = bStep(s, { kind: "down", control: "power" });
    s = bStep(s, { kind: "up", control: "power", durationMs: 3001 });
    assert.equal(bState(s).powerMode, "off", `failed power-off from ${targetState}`);
  }
});

test("SLEEP economy mode: exact resting interval, 30s active TX burst, multi-step associativity & key wake", () => {
  // Path A: 20-step batches
  let a = bBootToTx();
  a = navigateMainMenuItem(a, 6, 0); // SLEEP > MODE = ON (5m = 300s)
  a = bShortPressHoldKey(a, "ent", 200);
  a = bStep(a, { kind: "pad", control: "cursorpad", direction: "right" });
  a = bShortPressHoldKey(a, "ent", 200);
  assert.equal(bState(a).powerMode, "sleep");
  assert.equal(bState(a).sleepState.phase, "resting");
  assert.equal(bState(a).sleepState.remainingSec, 300);

  // Clone starting point for 1-step associative comparison
  let b = a;

  // Advance 300s resting (15 x 20s): zero TX accrued
  for (let i = 0; i < 15; i++) a = bStep(a, { kind: "tick", steps: 20 });
  assert.equal(bState(a).sleepState.phase, "burst");
  assert.equal(bState(a).sleepState.remainingSec, 30);
  assert.equal(bState(a).txSeconds, 0);

  // Advance 30s burst (20s + 10s): exactly 30 TX seconds, sweep rotates, back to resting!
  a = bStep(a, { kind: "tick", steps: 20 });
  assert.equal(bState(a).sleepState.phase, "burst");
  assert.equal(bState(a).txSeconds, 20);
  a = bStep(a, { kind: "tick", steps: 10 });
  assert.equal(bState(a).sleepState.phase, "resting");
  assert.equal(bState(a).sleepState.remainingSec, 300);
  assert.equal(bState(a).txSeconds, 30);

  // Compare with 1-step ticks over identical 330s interval
  for (let i = 0; i < 330; i++) b = bStep(b, { kind: "tick", steps: 1 });
  assert.equal(bState(b).txSeconds, bState(a).txSeconds);
  assert.equal(bState(b).sweepAzimuthDeg, bState(a).sweepAzimuthDeg);
  assert.deepEqual(bState(b).sleepState, bState(a).sleepState);

  // Wake immediately to transmit on any physical key press (e.g. stby_tx does NOT go to standby!)
  const woken = bStep(a, { kind: "press", control: "stby_tx" });
  assert.equal(bState(woken).powerMode, "transmit");
  assert.equal(bState(woken).settings.sleepMode, "OFF");
  assert.equal(bState(woken).sleepState.phase, "inactive");
});

test("18 standard ranges (0.0625..64 NM), independent subRangeIndex, GAIN/STC, ECHO/ADJUST settings & instructor analogs", () => {
  let b = bBootToTx();
  assert.equal(bState(b).rangeIndex, 10);
  assert.equal(probeMdc2060(bState(b)).rangeNm, 6);
  assert.equal(bState(b).effectiveModes.pw, "M2");

  // Step all the way down to index 0 (0.0625 NM) and verify clamp + VRM clamp
  for (let i = 0; i < 15; i++) b = bStep(b, { kind: "press", control: "range_down" });
  assert.equal(bState(b).rangeIndex, 0);
  assert.equal(MDC2060_RANGES[bState(b).rangeIndex].nm, 0.0625);
  assert.equal(bState(b).effectiveModes.pw, "S1");
  assert.ok(bState(b).vrm1Nm <= 0.0625);
  assert.ok(bState(b).vrm2Nm <= 0.0625);

  // Step all the way up to index 17 (64 NM) and verify clamp
  for (let i = 0; i < 25; i++) b = bStep(b, { kind: "press", control: "range_up" });
  assert.equal(bState(b).rangeIndex, 17);
  assert.equal(MDC2060_RANGES[bState(b).rangeIndex].nm, 64);
  assert.equal(bState(b).effectiveModes.pw, "L");

  // Independent subRangeIndex
  assert.equal(bState(b).subRangeIndex, 7);
  b = bStep(b, { kind: "press", control: "sub_range_up" });
  assert.equal(bState(b).subRangeIndex, 8);
  assert.equal(bState(b).rangeIndex, 17);
  for (let i = 0; i < 20; i++) b = bStep(b, { kind: "press", control: "sub_range_down" });
  assert.equal(bState(b).subRangeIndex, 0);

  // GAIN & STC via rotate and analog including -0 normalization
  b = bStep(b, { kind: "rotate", control: "gain", steps: 10 });
  assert.equal(bState(b).gain, 75);
  b = bStep(b, { kind: "analog", control: "gain", value: -0 });
  assert.ok(Object.is(bState(b).gain, 0));
  b = bStep(b, { kind: "analog", control: "gain", value: 140 });
  assert.equal(bState(b).gain, 100);
  b = bStep(b, { kind: "rotate", control: "stc", steps: 15 });
  assert.equal(bState(b).stc, 30);
  b = bStep(b, { kind: "analog", control: "stc", value: -5 });
  assert.equal(bState(b).stc, 0);

  // Instructor numeric controls work even while menu is open
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).overlay?.kind, "menu");
  b = bStep(b, { kind: "analog", control: "inst_sea_state", value: 5 });
  b = bStep(b, { kind: "analog", control: "inst_rain", value: 85 });
  b = bStep(b, { kind: "analog", control: "inst_ftc", value: 6 });
  assert.equal(bState(b).instructor.seaState, 5);
  assert.equal(bState(b).instructor.rain, 85);
  assert.equal(bState(b).instructor.ftc, 6);
  assert.equal(bState(b).effectiveModes.ftc, 6);
  // Reset inst_ftc back to -1 (device settings.ftc)
  b = bStep(b, { kind: "analog", control: "inst_ftc", value: -1 });
  assert.equal(bState(b).effectiveModes.ftc, bState(b).settings.ftc);
});

test("Presentation modes, sensor faults (HDG/GPS/SPD), TM 66% auto-reset, OFF-CENTER <=0.66 & mutual exclusion", () => {
  let b = bBootToTx();

  // Set MODE = N-UP, MOTION = TM, TRAIL MODE = T
  b = navigateMainMenuItem(b, 1, 0); // DISPLAY > MODE -> N-UP
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).effectiveModes.presentationMode, "N-UP");

  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // MOTION -> TM
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).effectiveModes.motionMode, "TM");

  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // SCREEN
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // OFF CENT
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // TRAIL MODE -> T
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200); // close menu
  assert.equal(bState(b).effectiveModes.trailMode, "T");

  // Drop headingSensor -> HDG NO SIGNAL degrades N-UP->H-UP, BRG T->R, TM->RM, TRAIL T->R, VECTOR T->R
  b = bStep(b, { kind: "training-fixture", fixture: "headingSensor", enabled: false });
  assert.equal(bState(b).sensorFaults.hdgNoSignal, true);
  assert.equal(bState(b).effectiveModes.presentationMode, "H-UP");
  assert.equal(bState(b).effectiveModes.brgMode, "R");
  assert.equal(bState(b).effectiveModes.motionMode, "RM");
  assert.equal(bState(b).effectiveModes.trailMode, "R");
  assert.equal(bState(b).effectiveModes.vectorMode, "R");
  // Restore HDG
  b = bStep(b, { kind: "training-fixture", fixture: "headingSensor", enabled: true });
  assert.equal(bState(b).effectiveModes.presentationMode, "N-UP");
  assert.equal(bState(b).effectiveModes.motionMode, "TM");

  // Drop GPS -> gpsNoSignal, llNoSignal, lat/lon null; W-UP degrades to N-UP (with HDG)
  b = navigateMainMenuItem(b, 1, 0); // MODE -> W-UP (3 steps from N-UP: C-UP, W-UP -> 2 right)
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).settings.presentationMode, "W-UP");
  b = bStep(b, { kind: "training-fixture", fixture: "gpsSensor", enabled: false });
  assert.equal(bState(b).sensorFaults.gpsNoSignal, true);
  assert.equal(bState(b).sensorFaults.llNoSignal, true);
  assert.equal(bState(b).ownshipSnapshot.lat, null);
  assert.equal(bState(b).cursor.lat, null);
  assert.equal(bState(b).effectiveModes.presentationMode, "N-UP");
  // Drop SPD too -> TM & True Trail degrade to RM / R
  b = bStep(b, { kind: "training-fixture", fixture: "speedSensor", enabled: false });
  assert.equal(bState(b).sensorFaults.spdNoSignal, true);
  assert.equal(bState(b).effectiveModes.motionMode, "RM");
  assert.equal(bState(b).effectiveModes.trailMode, "R");

  // Restore GPS + SPD, drop range to 0.25 NM so TM hits 66% edge and auto-resets quickly!
  b = bStep(b, { kind: "training-fixture", fixture: "gpsSensor", enabled: true });
  b = bStep(b, { kind: "training-fixture", fixture: "speedSensor", enabled: true });
  for (let i = 0; i < 8; i++) b = bStep(b, { kind: "press", control: "range_down" }); // 0.25 NM
  let sawAdvance = false;
  let sawReset = false;
  let prevX = bState(b).tmOffset.xFrac;
  let prevY = bState(b).tmOffset.yFrac;
  for (let i = 0; i < 12; i++) {
    b = bStep(b, { kind: "tick", steps: 10 });
    const { xFrac, yFrac } = bState(b).tmOffset;
    const mag = Math.hypot(xFrac, yFrac);
    assert.ok(mag <= 0.66, `TM offset exceeded 0.66: ${mag}`);
    if (mag > 0.05) sawAdvance = true;
    if (xFrac * prevX + yFrac * prevY < -0.1) sawReset = true;
    prevX = xFrac;
    prevY = yFrac;
  }
  assert.ok(sawAdvance, "TM offset should advance");
  assert.ok(sawReset, "TM offset should auto-reset opposite course at 66% edge");

  // OFF-CENTER at extreme corner clamps strictly <= 0.66 AND switches TM -> RM
  b = bStep(b, { kind: "pointer", control: "ppi_cursor", dx: 450, dy: 450 });
  b = navigateMainMenuItem(b, 1, 3); // DISPLAY > OFF CENT = ON
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).settings.offCenter, "ON");
  assert.equal(bState(b).settings.motionMode, "RM");
  assert.deepEqual(bState(b).tmOffset, { xFrac: 0, yFrac: 0 });
  const ocMag = Math.hypot(bState(b).offCenterOffset.xFrac, bState(b).offCenterOffset.yFrac);
  assert.ok(ocMag > 0.6 && ocMag <= 0.66, `OFF-CENTER magnitude ${ocMag} must be <= 0.66`);
});

test("Target trails: True Trail (T) anchored tanker leaves ZERO wake vs moving ship wake; Relative Trail (R) leaves relative wake", () => {
  // True Trail (T)
  let bt = bBootToTx();
  bt = navigateMainMenuItem(bt, 1, 4); // DISPLAY > TRAIL MODE = T
  bt = bShortPressHoldKey(bt, "ent", 200);
  bt = bStep(bt, { kind: "pad", control: "cursorpad", direction: "right" });
  bt = bShortPressHoldKey(bt, "ent", 200);
  bt = bShortPressHoldKey(bt, "menu", 200);
  assert.equal(bState(bt).effectiveModes.trailMode, "T");

  for (let i = 0; i < 15; i++) bt = bStep(bt, { kind: "tick", steps: 1 });
  const anchoredTrue = bState(bt).trails.find(t => t.contactId === "tgt-574007009"); // VIETNAM TANKER 09 (0 kn)
  const movingTrue = bState(bt).trails.find(t => t.contactId === "tgt-574002101");   // PACIFIC STAR (13.5 kn)
  assert.ok(anchoredTrue && anchoredTrue.points.length <= 1, "Anchored tanker must leave zero wake in True Trail");
  assert.ok(movingTrue && movingTrue.points.length >= 10, "Moving vessel must leave multi-point wake in True Trail");

  // Relative Trail (R)
  let br = bBootToTx();
  assert.equal(bState(br).effectiveModes.trailMode, "R");
  for (let i = 0; i < 15; i++) br = bStep(br, { kind: "tick", steps: 1 });
  const anchoredRel = bState(br).trails.find(t => t.contactId === "tgt-574007009");
  assert.ok(anchoredRel && anchoredRel.points.length >= 10, "Anchored tanker must draw relative wake in Relative Trail");

  // Bounded cap <= 48 points per contact
  for (let i = 0; i < 60; i++) br = bStep(br, { kind: "tick", steps: 1 });
  for (const t of bState(br).trails) {
    assert.ok(t.points.length <= 48, `trail length ${t.points.length} exceeded 48`);
  }
});

test("EBL1/2 (+ EBL1 FLOAT), VRM1/2, PI, cursor, 2-point measure, and ENT hold HL OFF (1200ms vs 1201ms)", () => {
  let b = bBootToTx();

  // Hold ENT immediately suppresses heading line on down, cancel clears it
  b = bStep(b, { kind: "down", control: "ent" });
  assert.equal(bState(b).hlSuppressed, true);
  assert.equal(bState(b).entHeld, true);
  b = bStep(b, { kind: "cancel", control: "ent" });
  assert.equal(bState(b).hlSuppressed, false);
  assert.equal(bState(b).entHeld, false);

  // Long ENT (>1200ms, e.g. 1201ms) clears suppression with ZERO short-press side effect (no measureAnchor!)
  b = bStep(b, { kind: "down", control: "ent" });
  b = bStep(b, { kind: "up", control: "ent", durationMs: 1201 });
  assert.equal(bState(b).hlSuppressed, false);
  assert.equal(bState(b).measureAnchor, null);

  // Short ENT (1200ms boundary) starts 2-point measurement, second completes, third clears
  b = bStep(b, { kind: "down", control: "ent" });
  b = bStep(b, { kind: "up", control: "ent", durationMs: 1200 });
  assert.ok(bState(b).measureAnchor !== null);
  b = bStep(b, { kind: "pointer", control: "ppi_cursor", dx: 105, dy: 0 });
  b = bShortPressHoldKey(b, "ent", 150);
  assert.ok(bState(b).measureResult !== null);
  assert.ok(bState(b).measureResult.rangeNm > 2.5 && bState(b).measureResult.rangeNm < 3.5);
  b = bShortPressHoldKey(b, "ent", 150);
  assert.equal(bState(b).measureAnchor, null);
  assert.equal(bState(b).measureResult, null);

  // EBL1 + VRM1 via F1 + cursor tracking + EBL1 FLOAT detached origin
  b = bStep(b, { kind: "press", control: "f1" });
  assert.equal(bState(b).settings.ebl1, "ON");
  assert.equal(bState(b).settings.vrm1, "ON");
  b = bStep(b, { kind: "touch", control: "ppi_cursor", x: 345, y: 195, phase: "down" });
  assert.ok(bState(b).vrm1Nm > 0);

  // Enable EBL1 FLOAT -> snaps origin to current cursor and computes bearing from detached origin
  const anchorX = bState(b).cursor.xFrac;
  const anchorY = bState(b).cursor.yFrac;
  b = navigateMainMenuItem(b, 2, 4); // EBL/VRM > EBL1 FLOAT = ON
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).settings.ebl1Float, "ON");
  assert.equal(bState(b).ebl1Origin.xFrac, anchorX);
  assert.equal(bState(b).ebl1Origin.yFrac, anchorY);
  b = bShortPressHoldKey(b, "menu", 200); // close menu to move cursor while EBL1 FLOAT is ON

  // Move cursor straight south from anchor (x=345, y=300 => same xFrac=0.5, yFrac=0.0):
  // from ownship (0,0) this is 090 deg on screen (179 deg true),
  // while from detached ebl1Origin (0.5, -0.5) it is 180 deg on screen (269 deg true)!
  b = bStep(b, { kind: "touch", control: "ppi_cursor", x: 345, y: 300, phase: "down" });
  assert.equal(bState(b).cursor.bearingDeg, 179);
  assert.equal(bState(b).ebl1Deg, 269);

  // Switch DISPLAY > BRG MODE = R and verify relative bearing math vs T mode
  b = navigateMainMenuItem(b, 1, 8); // DISPLAY > BRG MODE (group 1, item 8)
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // R
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).settings.brgMode, "R");
  assert.equal(bState(b).effectiveModes.brgMode, "R");
  // Move cursor straight south of ebl1Origin again: screenAngle=180 deg -> true=269, rel=269-89=180 deg
  b = bStep(b, { kind: "touch", control: "ppi_cursor", x: 345, y: 310, phase: "move" });
  assert.equal(bState(b).ebl1Deg, 180);
  // Restore BRG MODE = T
  b = navigateMainMenuItem(b, 1, 8);
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" }); // T
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).effectiveModes.brgMode, "T");

  // Enable EBL2 & VRM2 and assert BOTH ebl2Deg AND vrm2Nm update together on cursor movement
  b = navigateMainMenuItem(b, 2, 3); // EBL/VRM > VRM2
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "up" }); // VRM1
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "up" }); // EBL2
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).settings.ebl2, "ON");
  assert.equal(bState(b).settings.vrm2, "ON");
  assert.equal(bState(b).activeMarker, "ebl2_vrm2");
  const ebl2Before = bState(b).ebl2Deg;
  const vrm2Before = bState(b).vrm2Nm;
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" });
  assert.notEqual(bState(b).ebl2Deg, ebl2Before, "EBL2 bearing must update when paired ebl2_vrm2 is active");
  assert.notEqual(bState(b).vrm2Nm, vrm2Before, "VRM2 range must update when paired ebl2_vrm2 is active");

  // Toggle F1 (EBL1_VRM1) OFF while EBL2/VRM2 remain ON -> activeMarker must fall back to "ebl2_vrm2"
  b = bStep(b, { kind: "press", control: "f1" });
  assert.equal(bState(b).settings.ebl1, "OFF");
  assert.equal(bState(b).settings.vrm1, "OFF");
  assert.equal(bState(b).activeMarker, "ebl2_vrm2");
  const ebl2AfterF1 = bState(b).ebl2Deg;
  const vrm2AfterF1 = bState(b).vrm2Nm;
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "up" });
  assert.notEqual(bState(b).ebl2Deg, ebl2AfterF1);
  assert.notEqual(bState(b).vrm2Nm, vrm2AfterF1);

  // Enable Parallel Index (PI LINE = "2") in DISPLAY > PI LINE (group 1, item 7)
  b = navigateMainMenuItem(b, 1, 7);
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).settings.piLine, "2");
  b = bShortPressHoldKey(b, "menu", 200);

  // ECHO menu settings: EXP, PROCESS, PW, SUB GAIN + SYSTEM > SYSTEM MENU > ADJUST (STC CURVE, BRG ADJ, TUNE)
  b = navigateMainMenuItem(b, 0, 2); // ECHO > EXP = "1"
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // PROCESS = "AVG1"
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // PW = "S1"
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // SUB GAIN = -1
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).settings.exp, "1");
  assert.equal(bState(b).settings.process, "AVG1");
  assert.equal(bState(b).settings.pw, "S1");
  assert.equal(bState(b).effectiveModes.pw, "S1");
  assert.equal(bState(b).settings.subGain, -1);

  // Open System Menu via Main Menu > SYSTEM > SYSTEM MENU (group 7) and edit ADJUST items
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" }); // wrap 0 -> 7 (SYSTEM)
  b = bShortPressHoldKey(b, "ent", 200); // opens system-menu
  assert.equal(bState(b).overlay?.kind, "system-menu");
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // ADJUST
  b = bShortPressHoldKey(b, "ent", 200); // STC CURVE 4 -> 5
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // BRG ADJ 0 -> -0.5
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // TUNE AUTO -> MAN
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).settings.stcCurve, 5);
  assert.equal(bState(b).settings.brgAdjDeg, -0.5);
  assert.equal(bState(b).settings.tuneMode, "MAN");
  b = bShortPressHoldKey(b, "menu", 200);

  // ATA manual ACQ + DEL + DEL ALL via Main Menu > ATA
  b = navigateMainMenuItem(b, 4, 0); // ATA > ACQ
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).ata.targets.length, 1);
  b = bStep(b, { kind: "press", control: "f2" }); // acquire 2nd target
  assert.equal(bState(b).ata.targets.length, 2);
  b = navigateMainMenuItem(b, 4, 1); // ATA > DEL
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).ata.targets.length, 1);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // ATA > DEL ALL
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).ata.targets.length, 0);
});

test("Main Menu (8 groups), System Menu (4 groups, 1500ms vs 1501ms), all 12 F-key presets, PANEL/LCD TEST & ALL RESET", () => {
  let b = bBootToTx();

  // Short menu (1500ms) -> Main Menu
  b = bStep(b, { kind: "down", control: "menu" });
  b = bStep(b, { kind: "up", control: "menu", durationMs: 1500 });
  assert.equal(bState(b).overlay?.kind, "menu");
  assert.equal(MDC2060_MAIN_MENU_TREE.length, 8);
  // Cycle all 8 groups and wrap around
  for (let i = 0; i < 8; i++) {
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  }
  assert.equal(bState(b).overlay.groupIndex, 0);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).overlay, null);

  // Long menu (1501ms) -> System Menu (4 groups)
  b = bStep(b, { kind: "down", control: "menu" });
  b = bStep(b, { kind: "up", control: "menu", durationMs: 1501 });
  assert.equal(bState(b).overlay?.kind, "system-menu");
  assert.equal(MDC2060_SYSTEM_MENU_TREE.length, 4);

  // Navigate to MAINT > PANEL TEST (group 3, item 0)
  for (let i = 0; i < 3; i++) b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).overlay?.kind, "panel-test");
  const rngBefore = bState(b).rangeIndex;
  b = bStep(b, { kind: "press", control: "range_up" });
  assert.equal(bState(b).overlay.lastControl, "range_up");
  assert.equal(bState(b).rangeIndex, rngBefore); // panel-test must NOT mutate settings
  b = bShortPressHoldKey(b, "menu", 200); // back to system-menu MAINT

  // MAINT > LCD TEST (item 1)
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).overlay?.kind, "lcd-test");
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  assert.equal(bState(b).overlay.patternIndex, 1);
  b = bShortPressHoldKey(b, "menu", 200);

  // MAINT > TX HOURS (item 2 readonly -> ENT no-op)
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).overlay.editing, false);

  // PRESET > ALL RESET (group 2, item 2): cancel vs confirm
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" }); // group 2
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).overlay?.kind, "confirm-all-reset");
  assert.equal(bState(b).overlay.confirm, false);
  b = bShortPressHoldKey(b, "menu", 200); // cancel back to system menu
  assert.equal(bState(b).overlay?.kind, "system-menu");
  b = bShortPressHoldKey(b, "menu", 200); // close system menu

  // Exercise ALL 12 F1 presets with concrete behavioral state assertions
  const assertPresetTransition = (presetId, before, after) => {
    switch (presetId) {
      case "EBL1_VRM1":
        assert.equal(before.settings.ebl1, "OFF");
        assert.equal(after.settings.ebl1, "ON");
        assert.equal(after.settings.vrm1, "ON");
        assert.equal(after.activeMarker, "ebl1_vrm1");
        break;
      case "ATA_ACQ":
        assert.equal(after.ata.targets.length, before.ata.targets.length + 1);
        assert.equal(after.ata.targets[0].acquisitionType, "M");
        break;
      case "MODE_CYCLE":
        assert.equal(before.settings.presentationMode, "H-UP");
        assert.equal(after.settings.presentationMode, "N-UP");
        break;
      case "SCREEN_CYCLE":
        assert.equal(before.settings.screenMode, "PPI");
        assert.equal(after.settings.screenMode, "PPI/PPI");
        break;
      case "OFF_CENTER":
        assert.equal(before.settings.offCenter, "OFF");
        assert.equal(after.settings.offCenter, "ON");
        assert.ok(Math.hypot(after.offCenterOffset.xFrac, after.offCenterOffset.yFrac) > 0);
        break;
      case "TRAIL_TOGGLE":
        assert.equal(before.settings.trailMode, "R");
        assert.equal(after.settings.trailMode, "T");
        break;
      case "FTC_STEP":
        assert.equal(before.settings.ftc, 0);
        assert.equal(after.settings.ftc, 1);
        break;
      case "IR_STEP":
        assert.equal(before.settings.ir, "OFF");
        assert.equal(after.settings.ir, "1");
        break;
      case "AIS_TOGGLE":
        assert.equal(before.settings.aisDisplay, "ON");
        assert.equal(after.settings.aisDisplay, "OFF");
        assert.equal(after.ais.enabled, false);
        break;
      case "ALARM_TOGGLE":
        assert.equal(before.settings.alarmMode, "OFF");
        assert.equal(after.settings.alarmMode, "IN");
        assert.equal(after.guardZone.alarmActive, true);
        break;
      case "COLOR_CYCLE":
        assert.equal(before.settings.colorPalette, "DAY");
        assert.equal(after.settings.colorPalette, "NIGHT");
        break;
      case "ALARM_ACK":
        assert.equal(before.alarms.audible, true);
        assert.equal(after.alarms.audible, false);
        assert.equal(after.guardZone.audible, false);
        assert.equal(after.alarms.visualActive, true);
        break;
      default:
        assert.fail(`unhandled F-key preset: ${presetId}`);
    }
  };

  for (let idx = 0; idx < MDC2060_FKEY_PRESETS.length; idx++) {
    const presetId = MDC2060_FKEY_PRESETS[idx].id;
    let s = bBootToTx();
    if (presetId === "ALARM_ACK") {
      // Trigger a live Guard Zone alarm first so ALARM_ACK visibly silences it
      s = navigateMainMenuItem(s, 3, 0); // ALARM > MODE = IN
      s = bShortPressHoldKey(s, "ent", 200);
      s = bStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
      s = bShortPressHoldKey(s, "ent", 200);
      s = bShortPressHoldKey(s, "menu", 200);
    }
    s = bStep(s, { kind: "down", control: "menu" });
    s = bStep(s, { kind: "up", control: "menu", durationMs: 1600 });
    s = bStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
    s = bStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
    s = bShortPressHoldKey(s, "ent", 200);
    for (let step = 0; step < idx; step++) {
      s = bStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
    }
    s = bShortPressHoldKey(s, "ent", 200);
    s = bShortPressHoldKey(s, "menu", 200);
    assert.equal(bState(s).settings.f1Key, presetId);
    const before = bState(s);
    s = bStep(s, { kind: "press", control: "f1" });
    assertPresetTransition(presetId, before, bState(s));
    assertNoNegativeZeroOrNonFinite(bState(s));
  }

  // Remap f2Key (System Menu > PRESET > item 1) from default ATA_ACQ -> COLOR_CYCLE and verify press("f2")
  {
    let s2 = bBootToTx();
    s2 = bStep(s2, { kind: "down", control: "menu" });
    s2 = bStep(s2, { kind: "up", control: "menu", durationMs: 1600 });
    s2 = bStep(s2, { kind: "pad", control: "cursorpad", direction: "right" });
    s2 = bStep(s2, { kind: "pad", control: "cursorpad", direction: "right" }); // PRESET
    s2 = bStep(s2, { kind: "pad", control: "cursorpad", direction: "down" });  // F2 KEY (default idx 1 = ATA_ACQ)
    s2 = bShortPressHoldKey(s2, "ent", 200);
    // Step right 9 times from ATA_ACQ (1) -> COLOR_CYCLE (10)
    for (let k = 0; k < 9; k++) {
      s2 = bStep(s2, { kind: "pad", control: "cursorpad", direction: "right" });
    }
    s2 = bShortPressHoldKey(s2, "ent", 200);
    s2 = bShortPressHoldKey(s2, "menu", 200);
    assert.equal(bState(s2).settings.f2Key, "COLOR_CYCLE");
    assert.equal(bState(s2).settings.colorPalette, "DAY");
    s2 = bStep(s2, { kind: "press", control: "f2" });
    assert.equal(bState(s2).settings.colorPalette, "NIGHT");
    assert.equal(bState(s2).ata.targets.length, 0);
  }

  // Confirm ALL RESET resets range/gain/settings while preserving txSeconds
  b = bStep(b, { kind: "press", control: "range_down" });
  b = bStep(b, { kind: "tick", steps: 10 });
  const txBeforeReset = bState(b).txSeconds;
  b = bStep(b, { kind: "down", control: "menu" });
  b = bStep(b, { kind: "up", control: "menu", durationMs: 1600 });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // confirm: true
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).rangeIndex, 10);
  assert.equal(bState(b).gain, 55);
  assert.equal(bState(b).txSeconds, txBeforeReset);
  assert.equal(bState(b).notice, "allResetDone");
});

test("Capability revocation behind power-hold cancels ATA/AIS drafts without altering power-hold or unrelated drafts", () => {
  // ATA edit behind power-hold
  let b = bBootToTx();
  b = navigateMainMenuItem(b, 4, 3); // ATA > AUTO AREA
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // draft "ON"
  b = bStep(b, { kind: "down", control: "power" });
  b = bStep(b, { kind: "ui-tick", elapsedMs: 1200 });
  assert.equal(bState(b).overlay.kind, "power-hold");
  assert.equal(bState(b).overlay.elapsedMs, 1200);
  assert.equal(bState(b).overlay.priorOverlay.editing, true);

  b = bStep(b, { kind: "training-fixture", fixture: "ataBoardOption", enabled: false });
  assert.equal(bState(b).overlay.kind, "power-hold");
  assert.equal(bState(b).overlay.elapsedMs, 1200);
  assert.equal(bState(b).overlay.remainingMs, 1800);
  assert.equal(bState(b).overlay.priorOverlay.editing, false);
  assert.equal(bState(b).overlay.priorOverlay.draftValue, null);

  // Re-enabling ATA option must NOT revive cancelled draft
  b = bStep(b, { kind: "training-fixture", fixture: "ataBoardOption", enabled: true });
  b = bStep(b, { kind: "cancel", control: "power" });
  assert.equal(bState(b).overlay.kind, "menu");
  assert.equal(bState(b).overlay.editing, false);
  assert.equal(bState(b).settings.ataAutoArea, "OFF");

  // Unrelated ECHO edit behind power-hold stays untouched when AIS option is revoked
  b = bShortPressHoldKey(b, "menu", 200);
  b = navigateMainMenuItem(b, 0, 0); // ECHO > FTC
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bStep(b, { kind: "down", control: "power" });
  b = bStep(b, { kind: "training-fixture", fixture: "aisBoardOption", enabled: false });
  assert.equal(bState(b).overlay.priorOverlay.editing, true);
  assert.equal(bState(b).overlay.priorOverlay.draftValue, 1);
});

test("Fail-closed settings codec, prototype pollution rejection & OFF-only restore-settings", () => {
  assert.equal(MDC2060_SETTINGS_STORAGE_KEY, "mophongmaytrentau.mdc2060.public-reference.settings.v1");
  assert.equal(MDC2060_SETTINGS_SCHEMA_VERSION, 1);

  const validSample = {
    ftc: 4,
    ir: "2",
    presentationMode: "N-UP",
    alarmInnerNm: 1.25,
    alarmOuterNm: 4.5,
    brgAdjDeg: -2.5,
    language: "vi",
  };
  const encoded = encodeMdc2060Settings(validSample);
  assert.deepEqual(decodeMdc2060Settings(encoded), validSample);

  // Fail-closed decoder cases (never throws, returns null)
  assert.equal(decodeMdc2060Settings(null), null);
  assert.equal(decodeMdc2060Settings(12345), null);
  assert.equal(decodeMdc2060Settings(""), null);
  assert.equal(decodeMdc2060Settings("{broken"), null);
  assert.equal(decodeMdc2060Settings(" ".repeat(12001)), null);

  // Recomputed fingerprint on wrong schemaVersion / profileRevision / profileClass MUST return null
  const parsed = JSON.parse(encoded);
  for (const tamper of [
    { schemaVersion: 2 },
    { profileRevision: "F1-mdc2060-public-ref-999" },
    { profileClass: "OEM_FIRMWARE" },
  ]) {
    const forgedBody = {
      schemaVersion: parsed.schemaVersion,
      profileClass: parsed.profileClass,
      profileRevision: parsed.profileRevision,
      settings: parsed.settings,
      ...tamper,
    };
    const forged = JSON.stringify({ ...forgedBody, contentFingerprint: fingerprint(forgedBody) });
    assert.equal(decodeMdc2060Settings(forged), null);
  }

  // Extra top-level field rejected
  assert.equal(decodeMdc2060Settings(JSON.stringify({ ...parsed, extra: true })), null);

  // Prototype pollution & disallowed keys rejected
  assert.throws(() => encodeMdc2060Settings({ ["__proto__"]: "evil" }));
  assert.throws(() => encodeMdc2060Settings({ constructor: "evil" }));
  assert.throws(() => encodeMdc2060Settings({ fastPreheat: true }));
  assert.throws(() => encodeMdc2060Settings({ ataBoardOption: true }));
  assert.throws(() => encodeMdc2060Settings({}));
  assert.throws(() => encodeMdc2060Settings({ alarmInnerNm: 4.0, alarmOuterNm: 3.0 }));
  assert.throws(() => encodeMdc2060Settings({ alarmInnerNm: 3.5 })); // violates default outer 3.0 - 0.05
  assert.throws(() => encodeMdc2060Settings({ ftc: 2.5 })); // must be int
  const getterObj = {};
  Object.defineProperty(getterObj, "ftc", { enumerable: true, get: () => 2 });
  assert.throws(() => encodeMdc2060Settings(getterObj));

  // Forged JSON with own "__proto__" key fails closed to null
  assert.equal(
    decodeMdc2060Settings('{"schemaVersion":1,"profileClass":"PUBLIC_REFERENCE","profileRevision":"F1-mdc2060-public-ref-1","settings":{"__proto__":{"p":1}},"contentFingerprint":"f0-fnv1a32-00000000"}'),
    null,
  );

  // restore-settings: OFF-only, never grants fixtures, strips disabled option features
  let b = createBridgeSession(ADAPTERS, SCENARIO);
  b = bStep(b, { kind: "training-fixture", fixture: "ataBoardOption", enabled: false });
  b = bStep(b, { kind: "training-fixture", fixture: "aisBoardOption", enabled: false });
  b = bStep(b, {
    kind: "restore-settings",
    settings: { ftc: 5, ataAutoArea: "ON", aisDisplay: "ON", aisCpaAlarm: "ON" },
  });
  assert.equal(bState(b).settings.ftc, 5);
  assert.equal(bState(b).settings.ataAutoArea, "OFF");
  assert.equal(bState(b).settings.aisDisplay, "OFF");
  assert.equal(bState(b).settings.aisCpaAlarm, "OFF");
  assert.equal(bState(b).trainingFixture.ataBoardOption, false);
  assert.equal(bState(b).powerMode, "off");

  // Throws when powered on in ALL 4 powered states (preheat / standby / transmit / sleep)
  b = bStep(b, { kind: "training-fixture", fixture: "fastPreheat", enabled: true });
  b = bShortPressHoldKey(b, "power", 200);
  assert.equal(bState(b).powerMode, "preheat");
  assert.throws(() => bStep(b, { kind: "restore-settings", settings: { ftc: 2 } }), /off/);
  b = bStep(b, { kind: "tick", steps: 5 });
  assert.equal(bState(b).powerMode, "standby");
  assert.throws(() => bStep(b, { kind: "restore-settings", settings: { ftc: 2 } }), /off/);
  b = bStep(b, { kind: "press", control: "stby_tx" });
  assert.equal(bState(b).powerMode, "transmit");
  assert.throws(() => bStep(b, { kind: "restore-settings", settings: { ftc: 2 } }), /off/);
  b = navigateMainMenuItem(b, 6, 0); // SLEEP > MODE = ON
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).powerMode, "sleep");
  assert.throws(() => bStep(b, { kind: "restore-settings", settings: { ftc: 2 } }), /off/);
});

test("Alarm acknowledgment silences audible buzzer while preserving visualActive and re-triggers after clear", () => {
  let b = bBootToTx();
  // Enable Guard Zone IN (default [1..3 NM] x [330..30 deg] immediately catches SMALL PILOT 02)
  b = navigateMainMenuItem(b, 3, 0); // ALARM > MODE = IN
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "tick", steps: 1 });

  assert.equal(bState(b).guardZone.alarmActive, true);
  assert.equal(bState(b).guardZone.audible, true);
  assert.equal(bState(b).alarms.visualActive, true);
  assert.equal(bState(b).alarms.audible, true);

  // Acknowledge via alarm_ack (works even with menu still open)
  b = bStep(b, { kind: "press", control: "alarm_ack" });
  assert.equal(bState(b).alarms.audible, false);
  assert.equal(bState(b).guardZone.audible, false);
  assert.equal(bState(b).alarms.visualActive, true);

  // Stays silent on next tick while cause remains active
  b = bStep(b, { kind: "tick", steps: 1 });
  assert.equal(bState(b).alarms.audible, false);
  assert.equal(bState(b).alarms.visualActive, true);

  // Turn ALARM OFF -> clears active & prunes acknowledged; turn back ON -> audible re-triggers!
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" }); // OFF
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).guardZone.alarmActive, false);
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // IN
  b = bShortPressHoldKey(b, "ent", 200);
  assert.equal(bState(b).guardZone.alarmActive, true);
  assert.equal(bState(b).alarms.audible, true);
});

test("Standalone createSession/dispatch/replay (maritimeBus === undefined) and bridge replay preserve exact hashes", () => {
  // Standalone session (no maritimeBus)
  let s = createSession(MDC2060_ADAPTER, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "training-fixture", fixture: "fastPreheat", enabled: true }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "down", control: "power" }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "up", control: "power", durationMs: 200 }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "tick", steps: 5 }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "press", control: "stby_tx" }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "press", control: "range_down" }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "rotate", control: "gain", steps: 4 }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "rotate", control: "stc", steps: 6 }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "press", control: "f1" }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  s = dispatch(s, MDC2060_ADAPTER, { kind: "tick", steps: 4 }, MDC2060_STORM_SCENARIO);

  assertNoNegativeZeroOrNonFinite(s.deviceState);
  const env = createReplayEnvelope(s);
  const replayed = replay(MDC2060_ADAPTER, MDC2060_STORM_SCENARIO, env);
  assert.equal(sessionHash(replayed), sessionHash(s));

  // Bridge session replay
  let b = bBootToTx();
  b = bStep(b, { kind: "press", control: "f2" }); // ATA ACQ
  b = bStep(b, { kind: "tick", steps: 6 });       // stabilize -> tracking + $RATTM
  assertNoNegativeZeroOrNonFinite(bState(b));
  assert.equal(bState(b).ata.targets.length, 1);
  assert.equal(bState(b).ata.targets[0].status, "tracking");
  assert.ok(bState(b).ata.rattmSentences[0].startsWith("$RATTM,01,"));

  const bEnv = createBridgeReplay(b);
  const bReplayed = replayBridgeSession(ADAPTERS, SCENARIO, bEnv);
  assert.equal(bridgeSessionHash(bReplayed), bridgeSessionHash(b));
});

test("Screen modes (PPI, PPI/PPI, PPI/NAV) touch geometry, 48 RPM sweep rate & C-UP HDG fault degradation", () => {
  let b = bBootToTx();
  // Default PPI center=(240,300), radius=210
  b = bStep(b, { kind: "touch", control: "ppi_cursor", x: 345, y: 300, phase: "down" });
  assert.equal(bState(b).cursor.xFrac, 0.5);
  assert.equal(bState(b).cursor.yFrac, 0);

  // Switch DISPLAY > SCREEN to PPI/PPI (upper center=(240,170), lower=(240,465), radius=135)
  b = navigateMainMenuItem(b, 1, 2);
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // PPI/PPI
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).settings.screenMode, "PPI/PPI");
  b = bStep(b, { kind: "touch", control: "ppi_cursor", x: 240, y: 170, phase: "down" });
  assert.equal(bState(b).cursor.xFrac, 0);
  assert.equal(bState(b).cursor.yFrac, 0);
  b = bStep(b, { kind: "touch", control: "ppi_cursor", x: 375, y: 465, phase: "move" });
  assert.equal(bState(b).cursor.xFrac, 1);
  assert.equal(bState(b).cursor.yFrac, 0);

  // Switch DISPLAY > SCREEN to PPI/NAV (center=(240,200), radius=165)
  b = navigateMainMenuItem(b, 1, 2);
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // PPI/NAV
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).settings.screenMode, "PPI/NAV");
  b = bStep(b, { kind: "touch", control: "ppi_cursor", x: 240, y: 35, phase: "down" });
  assert.equal(bState(b).cursor.xFrac, 0);
  assert.equal(bState(b).cursor.yFrac, -1);

  // Switch System Menu > ASSIST > MOTOR (group 0, item 2) to 48 RPM -> 288 deg/s sweep rate
  b = bStep(b, { kind: "down", control: "menu" });
  b = bStep(b, { kind: "up", control: "menu", durationMs: 1600 });
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // RANGE UNIT
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // MOTOR
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // "48"
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).settings.motorRpm, "48");
  const azBefore = bState(b).sweepAzimuthDeg;
  b = bStep(b, { kind: "tick", steps: 1 });
  assert.equal(bState(b).sweepAzimuthDeg, (azBefore + 288) % 360);

  // C-UP degrades to H-UP under headingSensor: false and recovers cleanly
  b = navigateMainMenuItem(b, 1, 0); // DISPLAY > MODE
  b = bShortPressHoldKey(b, "ent", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // N-UP
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // C-UP
  b = bShortPressHoldKey(b, "ent", 200);
  b = bShortPressHoldKey(b, "menu", 200);
  assert.equal(bState(b).settings.presentationMode, "C-UP");
  assert.equal(bState(b).effectiveModes.presentationMode, "C-UP");
  b = bStep(b, { kind: "training-fixture", fixture: "headingSensor", enabled: false });
  assert.equal(bState(b).effectiveModes.presentationMode, "H-UP");
  b = bStep(b, { kind: "training-fixture", fixture: "headingSensor", enabled: true });
  assert.equal(bState(b).effectiveModes.presentationMode, "C-UP");
});

test("Regression: True Motion 1 Hz movement at 6 NM (300x1) & tick associativity (20x1 vs 1x20 at 0.5 NM & 6 NM)", () => {
  // Enable N-UP + TM at default 6 NM (10.5 kn)
  let base = bBootToTx();
  base = navigateMainMenuItem(base, 1, 0); // DISPLAY > MODE -> N-UP
  base = bShortPressHoldKey(base, "ent", 200);
  base = bStep(base, { kind: "pad", control: "cursorpad", direction: "right" });
  base = bShortPressHoldKey(base, "ent", 200);
  base = bStep(base, { kind: "pad", control: "cursorpad", direction: "down" }); // MOTION -> TM
  base = bShortPressHoldKey(base, "ent", 200);
  base = bStep(base, { kind: "pad", control: "cursorpad", direction: "right" });
  base = bShortPressHoldKey(base, "ent", 200);
  base = bShortPressHoldKey(base, "menu", 200);

  // 300 x tick(1) at 6 NM must advance smoothly (~0.1458 frac), NEVER freeze at (0,0)
  let b300 = base;
  for (let i = 0; i < 300; i++) {
    b300 = bStep(b300, { kind: "tick", steps: 1 });
    const mag = Math.hypot(bState(b300).tmOffset.xFrac, bState(b300).tmOffset.yFrac);
    assert.ok(mag <= 0.66, `TM offset exceeded 0.66 on tick ${i}: ${mag}`);
  }
  const dist300 = Math.hypot(bState(b300).tmOffset.xFrac, bState(b300).tmOffset.yFrac);
  const expected300 = (300 * 10.5 / 3600) / 6; // 0.145833...
  assert.ok(Math.abs(dist300 - expected300) < 0.002, `expected ~${expected300}, got ${dist300}`);

  // Associativity: 20 x tick(1) vs 1 x tick(20) at 6 NM (< 1e-4 drift)
  let b6One = base;
  for (let i = 0; i < 20; i++) b6One = bStep(b6One, { kind: "tick", steps: 1 });
  const b6Batch = bStep(base, { kind: "tick", steps: 20 });
  const drift6 = Math.hypot(
    bState(b6One).tmOffset.xFrac - bState(b6Batch).tmOffset.xFrac,
    bState(b6One).tmOffset.yFrac - bState(b6Batch).tmOffset.yFrac,
  );
  assert.ok(drift6 < 1e-4, `6 NM TM drift too large: ${drift6}`);

  // Associativity: 20 x tick(1) vs 1 x tick(20) at 0.5 NM (< 1e-4 drift)
  let baseHalf = base;
  for (let i = 0; i < 7; i++) baseHalf = bStep(baseHalf, { kind: "press", control: "range_down" });
  assert.equal(probeMdc2060(bState(baseHalf)).rangeNm, 0.5);
  let bHalfOne = baseHalf;
  for (let i = 0; i < 20; i++) bHalfOne = bStep(bHalfOne, { kind: "tick", steps: 1 });
  const bHalfBatch = bStep(baseHalf, { kind: "tick", steps: 20 });
  const driftHalf = Math.hypot(
    bState(bHalfOne).tmOffset.xFrac - bState(bHalfBatch).tmOffset.xFrac,
    bState(bHalfOne).tmOffset.yFrac - bState(bHalfBatch).tmOffset.yFrac,
  );
  assert.ok(driftHalf < 1e-4, `0.5 NM TM drift too large: ${driftHalf}`);
});

test("Regression: simultaneous holds behind power-hold, Guard Zone/ATA in STANDBY & SLEEP, SLEEP invariants & long-ENT wake", () => {
  // 1. Simultaneous hold: down(ent) -> down(power) -> up(ent) -> cancel(power) clears flags cleanly
  let b = bBootToTx();
  b = bStep(b, { kind: "down", control: "ent" });
  b = bStep(b, { kind: "down", control: "power" });
  b = bStep(b, { kind: "up", control: "ent", durationMs: 200 });
  b = bStep(b, { kind: "cancel", control: "power" });
  assert.equal(bState(b).hlSuppressed, false);
  assert.equal(bState(b).entHeld, false);
  assert.equal(bState(b).entHoldElapsedMs, 0);
  assert.equal(bState(b).measureAnchor, null);
  assert.deepEqual(b.devices[DEV].heldControls, {});

  // Simultaneous hold for menu: down(menu) -> down(power) -> up(menu) -> cancel(power)
  b = bStep(b, { kind: "down", control: "menu" });
  b = bStep(b, { kind: "down", control: "power" });
  b = bStep(b, { kind: "up", control: "menu", durationMs: 200 });
  b = bStep(b, { kind: "cancel", control: "power" });
  assert.equal(bState(b).menuHeld, false);
  assert.equal(bState(b).overlay, null);
  assert.deepEqual(b.devices[DEV].heldControls, {});

  // 2. STANDBY: Guard Zone must not trigger/sound, manual ATA must not acquire, SLEEP > MODE = ON must be disallowed
  let stby = createBridgeSession(ADAPTERS, SCENARIO);
  stby = bStep(stby, { kind: "training-fixture", fixture: "fastPreheat", enabled: true });
  stby = bShortPressHoldKey(stby, "power", 200);
  stby = bStep(stby, { kind: "tick", steps: 5 });
  assert.equal(bState(stby).powerMode, "standby");

  // Disable AIS CPA alarm to isolate Guard Zone audible behavior cleanly
  stby = navigateMainMenuItem(stby, 5, 3); // AIS > CPA ALARM = OFF
  stby = bShortPressHoldKey(stby, "ent", 200);
  stby = bStep(stby, { kind: "pad", control: "cursorpad", direction: "right" });
  stby = bShortPressHoldKey(stby, "ent", 200);
  stby = bShortPressHoldKey(stby, "menu", 200);
  assert.equal(bState(stby).settings.aisCpaAlarm, "OFF");

  // Enable Guard Zone IN in STANDBY -> geometry synced, zero alarm/audible
  stby = navigateMainMenuItem(stby, 3, 0); // ALARM > MODE = IN
  stby = bShortPressHoldKey(stby, "ent", 200);
  stby = bStep(stby, { kind: "pad", control: "cursorpad", direction: "right" });
  stby = bShortPressHoldKey(stby, "ent", 200);
  stby = bShortPressHoldKey(stby, "menu", 200);
  const pStby = probeMdc2060(bState(stby));
  assert.equal(pStby.powerMode, "standby");
  assert.equal(pStby.alarmMode, "IN");
  assert.equal(pStby.guardZoneTriggered, false);
  assert.equal(pStby.guardZoneAudible, false);
  assert.equal(pStby.alarmVisualActive, false);
  assert.equal(pStby.alarmAudible, false);

  // Manual ATA ACQ in STANDBY (both F2 and MENU > ATA > ACQ) must NOT acquire radar targets
  stby = bStep(stby, { kind: "press", control: "f2" });
  assert.equal(bState(stby).ata.targets.length, 0);
  stby = navigateMainMenuItem(stby, 4, 0); // ATA > ACQ
  stby = bShortPressHoldKey(stby, "ent", 200);
  assert.equal(bState(stby).ata.targets.length, 0);
  stby = bShortPressHoldKey(stby, "menu", 200);

  // Attempting SLEEP > MODE = ON in STANDBY keeps sleepMode = "OFF"
  stby = navigateMainMenuItem(stby, 6, 0); // SLEEP > MODE
  stby = bShortPressHoldKey(stby, "ent", 200);
  stby = bStep(stby, { kind: "pad", control: "cursorpad", direction: "right" });
  stby = bShortPressHoldKey(stby, "ent", 200);
  stby = bShortPressHoldKey(stby, "menu", 200);
  assert.equal(bState(stby).powerMode, "standby");
  assert.equal(bState(stby).settings.sleepMode, "OFF");
  assert.equal(bState(stby).sleepState.phase, "inactive");

  // Pressing alarm_ack in STANDBY must NOT silently mute Guard Zone upon entering TX!
  stby = bStep(stby, { kind: "press", control: "alarm_ack" });
  let tx = bStep(stby, { kind: "press", control: "stby_tx" });
  const pTx = probeMdc2060(bState(tx));
  assert.equal(pTx.powerMode, "transmit");
  assert.equal(pTx.guardZoneTriggered, true);
  assert.equal(pTx.guardZoneAudible, true);
  assert.equal(pTx.alarmVisualActive, true);
  assert.equal(pTx.alarmAudible, true);

  // Acknowledge in TX, switch TX -> STANDBY -> TX: zero guardZone/alarms desync!
  tx = bStep(tx, { kind: "press", control: "alarm_ack" });
  assert.equal(probeMdc2060(bState(tx)).guardZoneAudible, false);
  assert.equal(probeMdc2060(bState(tx)).alarmAudible, false);
  const backStby = bStep(tx, { kind: "press", control: "stby_tx" });
  assert.equal(probeMdc2060(bState(backStby)).guardZoneTriggered, false);
  assert.equal(probeMdc2060(bState(backStby)).guardZoneAudible, false);
  assert.equal(probeMdc2060(bState(backStby)).alarmVisualActive, false);
  assert.equal(probeMdc2060(bState(backStby)).alarmAudible, false);
  const reTx = bStep(backStby, { kind: "press", control: "stby_tx" });
  assert.equal(probeMdc2060(bState(reTx)).guardZoneTriggered, true);
  assert.equal(probeMdc2060(bState(reTx)).guardZoneAudible, true);
  assert.equal(probeMdc2060(bState(reTx)).alarmAudible, true);

  // 3. SLEEP resting/burst/wake Guard Zone consistency & long-ENT wake
  let slp = navigateMainMenuItem(tx, 6, 0); // enter SLEEP from ack'd TX
  slp = bShortPressHoldKey(slp, "ent", 200);
  slp = bStep(slp, { kind: "pad", control: "cursorpad", direction: "right" });
  slp = bShortPressHoldKey(slp, "ent", 200);
  assert.equal(probeMdc2060(bState(slp)).powerMode, "sleep");
  assert.equal(probeMdc2060(bState(slp)).sleepPhase, "resting");
  assert.equal(probeMdc2060(bState(slp)).guardZoneTriggered, false);
  assert.equal(probeMdc2060(bState(slp)).guardZoneAudible, false);
  assert.equal(probeMdc2060(bState(slp)).alarmVisualActive, false);
  assert.equal(probeMdc2060(bState(slp)).alarmAudible, false);

  // Advance 300s resting -> burst -> resting on a wide 0.5-12 NM all-around Guard Zone
  // (after 5 minutes of 2D kinematics targets remain inside this sector so burst MUST fire!)
  let wide = createBridgeSession(ADAPTERS, SCENARIO);
  wide = bStep(wide, {
    kind: "restore-settings",
    settings: {
      aisCpaAlarm: "OFF",
      alarmMode: "IN",
      alarmInnerNm: 0.5,
      alarmOuterNm: 12,
      alarmStartBrgDeg: 0,
      alarmEndBrgDeg: 359,
    },
  });
  wide = bStep(wide, { kind: "training-fixture", fixture: "fastPreheat", enabled: true });
  wide = bShortPressHoldKey(wide, "power", 200);
  wide = bStep(wide, { kind: "tick", steps: 5 });
  assert.equal(probeMdc2060(bState(wide)).guardZoneTriggered, false);
  wide = bStep(wide, { kind: "press", control: "stby_tx" });
  assert.equal(probeMdc2060(bState(wide)).guardZoneTriggered, true);
  assert.equal(probeMdc2060(bState(wide)).alarmAudible, true);
  wide = navigateMainMenuItem(wide, 6, 0); // enter SLEEP resting
  wide = bShortPressHoldKey(wide, "ent", 200);
  wide = bStep(wide, { kind: "pad", control: "cursorpad", direction: "right" });
  wide = bShortPressHoldKey(wide, "ent", 200);
  assert.equal(probeMdc2060(bState(wide)).sleepPhase, "resting");
  assert.equal(probeMdc2060(bState(wide)).guardZoneTriggered, false);
  assert.equal(probeMdc2060(bState(wide)).alarmAudible, false);

  let slpBurst = wide;
  for (let i = 0; i < 15; i++) slpBurst = bStep(slpBurst, { kind: "tick", steps: 20 });
  assert.equal(probeMdc2060(bState(slpBurst)).sleepPhase, "burst");
  assert.equal(probeMdc2060(bState(slpBurst)).guardZoneTriggered, true);
  assert.equal(probeMdc2060(bState(slpBurst)).guardZoneAudible, true);
  assert.equal(probeMdc2060(bState(slpBurst)).alarmAudible, true);

  let slpBackRest = bStep(slpBurst, { kind: "tick", steps: 20 });
  slpBackRest = bStep(slpBackRest, { kind: "tick", steps: 10 });
  assert.equal(probeMdc2060(bState(slpBackRest)).sleepPhase, "resting");
  assert.equal(probeMdc2060(bState(slpBackRest)).guardZoneTriggered, false);
  assert.equal(probeMdc2060(bState(slpBackRest)).guardZoneAudible, false);
  assert.equal(probeMdc2060(bState(slpBackRest)).alarmVisualActive, false);
  assert.equal(probeMdc2060(bState(slpBackRest)).alarmAudible, false);

  // Long ENT (>1200ms) wakes SLEEP -> TRANSMIT with no short-press side effects & live Guard Zone
  let wokeEnt = bStep(slp, { kind: "down", control: "ent" });
  wokeEnt = bStep(wokeEnt, { kind: "up", control: "ent", durationMs: 1300 });
  assert.equal(bState(wokeEnt).powerMode, "transmit");
  assert.equal(bState(wokeEnt).settings.sleepMode, "OFF");
  assert.equal(bState(wokeEnt).hlSuppressed, false);
  assert.equal(bState(wokeEnt).measureAnchor, null);
  assert.equal(probeMdc2060(bState(wokeEnt)).guardZoneTriggered, true);
  assert.equal(probeMdc2060(bState(wokeEnt)).guardZoneAudible, true);
  assert.equal(probeMdc2060(bState(wokeEnt)).alarmAudible, true);

  // Short POWER wakes SLEEP -> TRANSMIT with consistent Guard Zone & alarms
  const wokePow = bShortPressHoldKey(slp, "power", 200);
  assert.equal(bState(wokePow).powerMode, "transmit");
  assert.equal(probeMdc2060(bState(wokePow)).guardZoneTriggered, true);
  assert.equal(probeMdc2060(bState(wokePow)).guardZoneAudible, true);
  assert.equal(probeMdc2060(bState(wokePow)).alarmAudible, true);
});

test("Regression: restore-settings invariants, aisBoardOption revocation, HDG-fault cursor LAT/LON, VRM 0.0625 precision & fixture validation", () => {
  // 1. Settings codec & restore-settings reject TM + offCenter ON fail-closed
  assert.throws(
    () => encodeMdc2060Settings({ motionMode: "TM", offCenter: "ON" }),
    /mutually exclusive/,
  );
  const validEncoded = JSON.parse(encodeMdc2060Settings({ motionMode: "TM" }));
  const forgedBody = {
    schemaVersion: validEncoded.schemaVersion,
    profileClass: validEncoded.profileClass,
    profileRevision: validEncoded.profileRevision,
    settings: { motionMode: "TM", offCenter: "ON" },
  };
  const forgedRaw = JSON.stringify({ ...forgedBody, contentFingerprint: fingerprint(forgedBody) });
  assert.equal(decodeMdc2060Settings(forgedRaw), null);

  let bOff = createBridgeSession(ADAPTERS, SCENARIO);
  assert.throws(
    () => bStep(bOff, { kind: "restore-settings", settings: { motionMode: "TM", offCenter: "ON" } }),
    /mutually exclusive/,
  );

  // restore-settings normalizes sleepMode="OFF" and syncs offCenterOffset & tmOffset
  bOff = bStep(bOff, { kind: "restore-settings", settings: { sleepMode: "ON", offCenter: "ON" } });
  assert.equal(bState(bOff).settings.sleepMode, "OFF");
  assert.equal(bState(bOff).settings.offCenter, "ON");
  assert.equal(bState(bOff).settings.motionMode, "RM");
  assert.deepEqual(bState(bOff).offCenterOffset, { xFrac: 0, yFrac: 0.45 });
  assert.deepEqual(bState(bOff).tmOffset, { xFrac: 0, yFrac: 0 });
  bOff = bStep(bOff, { kind: "restore-settings", settings: { motionMode: "TM" } });
  assert.equal(bState(bOff).settings.offCenter, "OFF");
  assert.deepEqual(bState(bOff).offCenterOffset, { xFrac: 0, yFrac: 0 });

  // 2. aisBoardOption: false strips settings.aisDisplay & aisCpaAlarm to "OFF"
  let b = bBootToTx();
  assert.equal(probeMdc2060(bState(b)).aisDisplay, "ON");
  b = bStep(b, { kind: "training-fixture", fixture: "aisBoardOption", enabled: false });
  assert.equal(bState(b).settings.aisDisplay, "OFF");
  assert.equal(bState(b).settings.aisCpaAlarm, "OFF");
  assert.equal(probeMdc2060(bState(b)).aisDisplay, "OFF");
  assert.equal(bState(b).ais.enabled, false);

  // 3. Off-origin cursor LAT/LON fails closed to null under HDG NO SIGNAL (while origin keeps ownship GPS)
  let bHdg = bBootToTx();
  bHdg = bStep(bHdg, { kind: "training-fixture", fixture: "headingSensor", enabled: false });
  assert.equal(bState(bHdg).cursor.lat, bState(bHdg).ownshipSnapshot.lat);
  assert.equal(bState(bHdg).cursor.lon, bState(bHdg).ownshipSnapshot.lon);
  bHdg = bStep(bHdg, { kind: "pointer", control: "ppi_cursor", dx: 105, dy: 0 });
  assert.equal(bState(bHdg).cursor.lat, null);
  assert.equal(bState(bHdg).cursor.lon, null);
  bHdg = bStep(bHdg, { kind: "training-fixture", fixture: "headingSensor", enabled: true });
  assert.ok(typeof bState(bHdg).cursor.lat === "number" && Number.isFinite(bState(bHdg).cursor.lat));
  assert.ok(typeof bState(bHdg).cursor.lon === "number" && Number.isFinite(bState(bHdg).cursor.lon));

  // 4. VRM 0.0625 NM exact 4-decimal preservation across range_down -> range_up
  let bVrm = bBootToTx();
  for (let i = 0; i < 15; i++) bVrm = bStep(bVrm, { kind: "press", control: "range_down" });
  assert.equal(bState(bVrm).vrm1Nm, 0.0625);
  assert.equal(bState(bVrm).vrm2Nm, 0.0625);
  bVrm = bStep(bVrm, { kind: "press", control: "range_up" });
  assert.equal(bState(bVrm).vrm1Nm, 0.0625);
  assert.equal(bState(bVrm).vrm2Nm, 0.0625);

  // 5. Direct reduceMdc2060 call rejects unknown fixture name with TypeError
  assert.throws(
    () => reduceMdc2060(initialMdc2060State(), {
      kind: "training-fixture",
      fixture: "unknownEvilFixture",
      enabled: true,
    }),
    TypeError,
  );
});

test("Regression (Iter 3 C1-C5): headingSensor immediate Guard Zone re-eval, powerOffState sync, ALL RESET sleepState, restore-settings cursor, direct NaN guards & AIS danger priority", () => {
  // C1: headingSensor false & recovery immediately re-evaluate guardZone in TRANSMIT (no tick needed)
  let bGz = createBridgeSession(ADAPTERS, SCENARIO);
  bGz = bStep(bGz, {
    kind: "restore-settings",
    settings: {
      aisCpaAlarm: "OFF",
      alarmMode: "IN",
      alarmInnerNm: 0.5,
      alarmOuterNm: 5.0,
      alarmStartBrgDeg: 330,
      alarmEndBrgDeg: 30,
    },
  });
  bGz = bStep(bGz, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
  bGz = bShortPressHoldKey(bGz, "power", 200);
  // In STANDBY: headingSensor toggle must NOT trigger guardZone
  bGz = bStep(bGz, { kind: "training-fixture", fixture: "headingSensor", enabled: false });
  assert.equal(bState(bGz).guardZone.alarmActive, false);
  bGz = bStep(bGz, { kind: "training-fixture", fixture: "headingSensor", enabled: true });
  // Enter TRANSMIT: True bearing mode catches SMALL PILOT 02 (tgt-574008102, true brg ~346 deg)
  bGz = bStep(bGz, { kind: "press", control: "stby_tx" });
  assert.equal(bState(bGz).effectiveModes.brgMode, "T");
  assert.deepEqual(bState(bGz).guardZone.triggeredContactIds, ["tgt-574008102"]);
  assert.equal(bState(bGz).alarms.audible, true);
  // Drop headingSensor in TRANSMIT (WITHOUT ticking!): brgMode flips to R -> catches PACIFIC STAR (tgt-574002101)
  bGz = bStep(bGz, { kind: "training-fixture", fixture: "headingSensor", enabled: false });
  assert.equal(bState(bGz).effectiveModes.brgMode, "R");
  assert.deepEqual(bState(bGz).guardZone.triggeredContactIds, ["tgt-574002101"]);
  assert.equal(bState(bGz).guardZone.alarmActive, true);
  assert.equal(bState(bGz).guardZone.audible, true);
  assert.equal(bState(bGz).alarms.visualActive, true);
  assert.equal(bState(bGz).alarms.audible, true);
  // Silence alarm, then recover headingSensor (WITHOUT ticking!) -> immediately flips back to tgt-574008102 and re-sounds
  bGz = bStep(bGz, { kind: "press", control: "alarm_ack" });
  assert.equal(bState(bGz).alarms.audible, false);
  bGz = bStep(bGz, { kind: "training-fixture", fixture: "headingSensor", enabled: true });
  assert.equal(bState(bGz).effectiveModes.brgMode, "T");
  assert.deepEqual(bState(bGz).guardZone.triggeredContactIds, ["tgt-574008102"]);
  assert.equal(bState(bGz).guardZone.audible, true);
  assert.equal(bState(bGz).alarms.audible, true);
  assertNoNegativeZeroOrNonFinite(bState(bGz));

  // C2: powerOffState preserves guardZone geometry & mode sync across OFF -> PREHEAT -> STANDBY
  let bPwr = createBridgeSession(ADAPTERS, SCENARIO);
  bPwr = bStep(bPwr, {
    kind: "restore-settings",
    settings: {
      alarmMode: "IN",
      alarmInnerNm: 0.5,
      alarmOuterNm: 4.5,
      alarmStartBrgDeg: 90,
      alarmEndBrgDeg: 180,
      alarmLevel: "HIGH",
    },
  });
  bPwr = bStep(bPwr, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
  bPwr = bShortPressHoldKey(bPwr, "power", 200);
  bPwr = bStep(bPwr, { kind: "press", control: "stby_tx" });
  assert.equal(bState(bPwr).guardZone.mode, "IN");
  // Power OFF via long hold (>3000ms)
  bPwr = bStep(bPwr, { kind: "down", control: "power" });
  bPwr = bStep(bPwr, { kind: "up", control: "power", durationMs: 3001 });
  assert.equal(bState(bPwr).powerMode, "off");
  assert.equal(bState(bPwr).guardZone.mode, "IN");
  assert.equal(bState(bPwr).guardZone.innerNm, 0.5);
  assert.equal(bState(bPwr).guardZone.outerNm, 4.5);
  assert.equal(bState(bPwr).guardZone.startBrgDeg, 90);
  assert.equal(bState(bPwr).guardZone.endBrgDeg, 180);
  assert.equal(bState(bPwr).guardZone.level, "HIGH");
  assert.equal(bState(bPwr).guardZone.alarmActive, false);
  assert.equal(bState(bPwr).guardZone.audible, false);
  assert.equal(bState(bPwr).guardZone.acknowledged, false);
  assert.deepEqual(bState(bPwr).guardZone.insideContactIds, []);
  assert.deepEqual(bState(bPwr).guardZone.capturedContactIds, []);
  assert.deepEqual(bState(bPwr).guardZone.triggeredContactIds, []);
  // Reboot to STANDBY (before any tick): guardZone remains synced with persisted settings
  bPwr = bShortPressHoldKey(bPwr, "power", 200);
  assert.equal(bState(bPwr).powerMode, "standby");
  assert.equal(bState(bPwr).guardZone.mode, "IN");
  assert.equal(bState(bPwr).guardZone.innerNm, 0.5);
  assert.equal(bState(bPwr).guardZone.outerNm, 4.5);
  assert.equal(bState(bPwr).guardZone.startBrgDeg, 90);
  assert.equal(bState(bPwr).guardZone.endBrgDeg, 180);
  assert.equal(bState(bPwr).guardZone.level, "HIGH");
  assert.equal(bState(bPwr).guardZone.alarmActive, false);
  assert.equal(bState(bPwr).guardZone.audible, false);
  // Power OFF via ui-tick(3001) also preserves guardZone sync
  bPwr = bStep(bPwr, { kind: "down", control: "power" });
  bPwr = bStep(bPwr, { kind: "ui-tick", elapsedMs: 3001 });
  assert.equal(bState(bPwr).powerMode, "off");
  assert.equal(bState(bPwr).guardZone.mode, "IN");
  assert.equal(bState(bPwr).guardZone.innerNm, 0.5);

  // C3: DEMO/ALL RESET resets sleepState.intervalSec back to 300 ("5m")
  let bReset = bBootToTx();
  bReset = navigateMainMenuItem(bReset, 6, 1); // SLEEP > INTERVAL
  bReset = bShortPressHoldKey(bReset, "ent", 200);
  bReset = bStep(bReset, { kind: "pad", control: "cursorpad", direction: "left" }); // wrap "5m" -> "30m"
  bReset = bShortPressHoldKey(bReset, "ent", 200);
  bReset = bShortPressHoldKey(bReset, "menu", 200);
  assert.equal(bState(bReset).settings.sleepIntervalMin, "30m");
  assert.equal(bState(bReset).sleepState.intervalSec, 1800);
  // Open SYSTEM MENU > PRESET > DEMO/ALL RESET and confirm
  bReset = bStep(bReset, { kind: "down", control: "menu" });
  bReset = bStep(bReset, { kind: "up", control: "menu", durationMs: 1600 });
  bReset = bStep(bReset, { kind: "pad", control: "cursorpad", direction: "right" }); // ADJUST
  bReset = bStep(bReset, { kind: "pad", control: "cursorpad", direction: "right" }); // PRESET
  bReset = bStep(bReset, { kind: "pad", control: "cursorpad", direction: "down" });  // F2 KEY
  bReset = bStep(bReset, { kind: "pad", control: "cursorpad", direction: "down" });  // DEMO/ALL RESET
  bReset = bShortPressHoldKey(bReset, "ent", 200);
  bReset = bStep(bReset, { kind: "pad", control: "cursorpad", direction: "right" }); // confirm: true
  bReset = bShortPressHoldKey(bReset, "ent", 200);
  assert.equal(bState(bReset).settings.sleepIntervalMin, "5m");
  assert.deepEqual(bState(bReset).sleepState, {
    phase: "inactive",
    remainingSec: 0,
    intervalSec: 300,
    burstSec: 30,
  });

  // C4: restore-settings recomputes cursor readout immediately while OFF
  let bCur = createBridgeSession(ADAPTERS, SCENARIO);
  bCur = bStep(bCur, { kind: "restore-settings", settings: { offCenter: "ON" } });
  assert.equal(bState(bCur).powerMode, "off");
  assert.deepEqual(bState(bCur).offCenterOffset, { xFrac: 0, yFrac: 0.45 });
  assert.equal(bState(bCur).cursor.rangeNm, 2.7);
  bCur = bStep(bCur, { kind: "restore-settings", settings: { motionMode: "TM" } });
  assert.deepEqual(bState(bCur).offCenterOffset, { xFrac: 0, yFrac: 0 });
  assert.equal(bState(bCur).cursor.rangeNm, 0);
  assertNoNegativeZeroOrNonFinite(bState(bCur));

  // C5: Direct unvalidated reduceMdc2060 rejects non-finite numbers with RangeError
  const offState = initialMdc2060State();
  const txBridge = bBootToTx();
  const txState = bState(txBridge);
  for (const badVal of [NaN, Infinity, -Infinity]) {
    assert.throws(() => reduceMdc2060(offState, { kind: "analog", control: "inst_sea_state", value: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(offState, { kind: "analog", control: "inst_rain", value: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(offState, { kind: "analog", control: "inst_ftc", value: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(offState, { kind: "ui-tick", elapsedMs: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(offState, { kind: "tick", steps: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(txState, { kind: "analog", control: "gain", value: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(txState, { kind: "analog", control: "stc", value: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(txState, { kind: "rotate", control: "gain", steps: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(txState, { kind: "rotate", control: "stc", steps: badVal }), RangeError);
    assert.throws(() => reduceMdc2060(txState, { kind: "pointer", control: "ppi_cursor", dx: badVal, dy: 1 }), RangeError);
    assert.throws(() => reduceMdc2060(txState, { kind: "touch", control: "ppi_cursor", x: badVal, y: 100, phase: "down" }), RangeError);
  }
  assert.throws(() => reduceMdc2060(offState, { kind: "ui-tick", elapsedMs: -5 }), RangeError);
  assert.throws(() => reduceMdc2060(offState, { kind: "tick", steps: 0 }), RangeError);
  assert.throws(() => reduceMdc2060(offState, { kind: "tick", steps: null }), RangeError);
  assert.throws(() => reduceMdc2060(offState, { kind: "tick", steps: 1.5 }), RangeError);

  // AIS INFO danger priority at sweep origin vs explicit cursor target selection
  let bAisOrigin = navigateMainMenuItem(txBridge, 5, 2); // AIS > INFO with cursor at (0,0)
  bAisOrigin = bShortPressHoldKey(bAisOrigin, "ent", 200);
  assert.equal(bState(bAisOrigin).overlay?.kind, "ais-info");
  assert.equal(bState(bAisOrigin).ais.selectedMmsi, "574002101"); // dangerous PACIFIC STAR
  assert.equal(bState(bAisOrigin).ais.selectedTarget?.dangerous, true);

  // Move cursor onto safe HAI AU 18 (574009330) -> MENU > AIS > INFO selects HAI AU 18
  const haiAu = txBridge.sensorBus.aisTargets.find(t => t.mmsi === "574009330");
  const hdg = txState.ownshipSnapshot.hdgDeg;
  const angRad = (((haiAu.bearingDeg - hdg) % 360 + 360) % 360) * Math.PI / 180;
  const hx = Math.round(240 + (haiAu.rangeNm / 6) * Math.sin(angRad) * 210);
  const hy = Math.round(300 - (haiAu.rangeNm / 6) * Math.cos(angRad) * 210);
  let bAisSafe = bStep(txBridge, { kind: "touch", control: "ppi_cursor", x: hx, y: hy, phase: "down" });
  bAisSafe = navigateMainMenuItem(bAisSafe, 5, 2); // AIS > INFO
  bAisSafe = bShortPressHoldKey(bAisSafe, "ent", 200);
  assert.equal(bState(bAisSafe).ais.selectedMmsi, "574009330");
  assert.equal(bState(bAisSafe).ais.selectedTarget?.dangerous, false);
});

