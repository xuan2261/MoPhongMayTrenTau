import test from "node:test";
import assert from "node:assert/strict";
import { createSession, dispatch, sessionHash } from "../src/core/session.mjs";
import {
  createBridgeSession,
  dispatchBridgeInput,
  bridgeSessionHash,
} from "../src/core/device-runtime.mjs";
import { FCV588_ADAPTER } from "../src/devices/fcv588/adapter.mjs";
import { MDC2060_ADAPTER } from "../src/devices/mdc2060/adapter.mjs";
import {
  MDC2060_COASTAL_SCENARIO,
  MDC2060_STORM_SCENARIO,
  MDC2060_BRIDGE_SYNC_SCENARIO,
  createCustomOwnshipScenario,
} from "../src/devices/mdc2060/scenarios.mjs";
import {
  MDC2060_LESSONS,
  getMdc2060Lesson,
  assessMdc2060Lesson,
} from "../src/devices/mdc2060/lessons.mjs";

const ADAPTERS = [MDC2060_ADAPTER];
const DEV = MDC2060_ADAPTER.id;

function bStep(bridge, input, scenario = MDC2060_COASTAL_SCENARIO, adapters = ADAPTERS) {
  const target = input.kind === "tick" ? "bridge" : DEV;
  return dispatchBridgeInput(bridge, adapters, target, input, scenario);
}

function bTapHold(bridge, control, durationMs = 200, scenario = MDC2060_COASTAL_SCENARIO, adapters = ADAPTERS) {
  let b = bStep(bridge, { kind: "down", control }, scenario, adapters);
  b = bStep(b, { kind: "up", control, durationMs }, scenario, adapters);
  return b;
}

function bBootToTx(scenario = MDC2060_COASTAL_SCENARIO, adapters = ADAPTERS) {
  let b = createBridgeSession(adapters, scenario);
  b = bStep(b, { kind: "training-fixture", fixture: "fastPreheat", enabled: true }, scenario, adapters);
  b = bTapHold(b, "power", 200, scenario, adapters);
  b = bStep(b, { kind: "tick", steps: 5 }, scenario, adapters);
  b = bStep(b, { kind: "press", control: "stby_tx" }, scenario, adapters);
  return b;
}

function sStep(session, input, scenario = MDC2060_COASTAL_SCENARIO) {
  return dispatch(session, MDC2060_ADAPTER, input, scenario);
}

function sTapHold(session, control, durationMs = 200, scenario = MDC2060_COASTAL_SCENARIO) {
  let s = sStep(session, { kind: "down", control }, scenario);
  s = sStep(s, { kind: "up", control, durationMs }, scenario);
  return s;
}

function sBootToTx(scenario = MDC2060_COASTAL_SCENARIO) {
  let s = createSession(MDC2060_ADAPTER, scenario);
  s = sStep(s, { kind: "training-fixture", fixture: "fastPreheat", enabled: true }, scenario);
  s = sTapHold(s, "power", 200, scenario);
  s = sStep(s, { kind: "tick", steps: 5 }, scenario);
  s = sStep(s, { kind: "press", control: "stby_tx" }, scenario);
  return s;
}

function assertDisclaimers(result) {
  assert.equal(result.sourceClass, "INSTRUCTOR_PLATFORM");
  assert.equal(result.hardwareApproved, false);
  assert.equal(result.firmwareInstalled, null);
  assert.equal(result.antiCheatAuthenticated, false);
  assert.equal(result.publicReleaseEligible, false);
  assert.equal(result.note, "TRAINING FEEDBACK ONLY - NOT AN OEM CERTIFICATE");
  assert.equal(result.score, result.passed ? 1 : 0);
}

test("MDC2060_LESSONS exposes 7 deeply frozen lessons with mandatory disclaimers", () => {
  assert.ok(Object.isFrozen(MDC2060_LESSONS));
  assert.equal(MDC2060_LESSONS.length, 7);
  for (let i = 1; i <= 7; i++) {
    const id = `MDC2060-LEARN-0${i}`;
    const lesson = getMdc2060Lesson(id);
    assert.ok(lesson, `missing ${id}`);
    assert.ok(Object.isFrozen(lesson));
    assert.equal(lesson.hardwareValidated, false);
    assert.equal(lesson.releaseApproved, false);
    assert.equal(lesson.profileId, MDC2060_ADAPTER.id);
  }
  assert.equal(getMdc2060Lesson("NON_EXISTENT"), null);
});

test("MDC2060-LEARN-01: positive (bridge & standalone) and negative (off/preheat stby_tx, long power, cancel)", () => {
  // Positive bridge
  const bPass = bBootToTx();
  const rPass = assessMdc2060Lesson(bPass, "MDC2060-LEARN-01");
  assertDisclaimers(rPass);
  assert.equal(rPass.passed, true);
  assert.equal(rPass.replayVerified, true);

  // Positive standalone
  const sPass = sBootToTx();
  const rsPass = assessMdc2060Lesson(sPass, "MDC2060-LEARN-01");
  assertDisclaimers(rsPass);
  assert.equal(rsPass.passed, true);
  assert.equal(rsPass.replayVerified, true);

  // Negative 1: press stby_tx during preheat (not yet standby)
  let bPre = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
  bPre = bTapHold(bPre, "power", 200);
  bPre = bStep(bPre, { kind: "press", control: "stby_tx" });
  const rPre = assessMdc2060Lesson(bPre, "MDC2060-LEARN-01");
  assertDisclaimers(rPre);
  assert.equal(rPre.passed, false);
  assert.ok(rPre.reasons.includes("ACTION_WHILE_POWERED_OFF"));
  assert.ok(rPre.reasons.includes("WRONG_PROBE_powerMode"));

  // Negative 2: long power (>3000ms) never boots
  let bLong = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
  bLong = bTapHold(bLong, "power", 3500);
  const rLong = assessMdc2060Lesson(bLong, "MDC2060-LEARN-01");
  assert.equal(rLong.passed, false);
  assert.ok(rLong.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));

  // Negative 3: cancel power
  let bCancel = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
  bCancel = bStep(bCancel, { kind: "down", control: "power" });
  bCancel = bStep(bCancel, { kind: "cancel", control: "power" });
  const rCancel = assessMdc2060Lesson(bCancel, "MDC2060-LEARN-01");
  assert.equal(rCancel.passed, false);
});

test("MDC2060-LEARN-02: positive (bridge & standalone) and negative (wrong range, zero STC, stray key)", () => {
  // Positive bridge
  let b = bBootToTx();
  b = bStep(b, { kind: "press", control: "range_down" });
  b = bStep(b, { kind: "press", control: "range_down" });
  b = bStep(b, { kind: "rotate", control: "gain", steps: 4 });
  b = bStep(b, { kind: "rotate", control: "stc", steps: 10 });
  const rPass = assessMdc2060Lesson(b, "MDC2060-LEARN-02");
  assertDisclaimers(rPass);
  assert.equal(rPass.passed, true);

  // Positive standalone (using analog gestures)
  let s = sBootToTx();
  s = sStep(s, { kind: "press", control: "range_down" });
  s = sStep(s, { kind: "press", control: "range_down" });
  s = sStep(s, { kind: "analog", control: "gain", value: 62 });
  s = sStep(s, { kind: "analog", control: "stc", value: 25 });
  assert.equal(assessMdc2060Lesson(s, "MDC2060-LEARN-02").passed, true);

  // Negative 1: only 1 range_down (4 NM)
  let bShort = bBootToTx();
  bShort = bStep(bShort, { kind: "press", control: "range_down" });
  bShort = bStep(bShort, { kind: "rotate", control: "gain", steps: 3 });
  bShort = bStep(bShort, { kind: "rotate", control: "stc", steps: 6 });
  const rShort = assessMdc2060Lesson(bShort, "MDC2060-LEARN-02");
  assert.equal(rShort.passed, false);
  assert.ok(rShort.reasons.includes("WRONG_PROBE_rangeIndex"));

  // Negative 2: zero STC (analog stc = 0)
  let bZeroStc = bBootToTx();
  bZeroStc = bStep(bZeroStc, { kind: "press", control: "range_down" });
  bZeroStc = bStep(bZeroStc, { kind: "press", control: "range_down" });
  bZeroStc = bStep(bZeroStc, { kind: "rotate", control: "gain", steps: 3 });
  bZeroStc = bStep(bZeroStc, { kind: "analog", control: "stc", value: 0 });
  const rZeroStc = assessMdc2060Lesson(bZeroStc, "MDC2060-LEARN-02");
  assert.equal(rZeroStc.passed, false);
  assert.ok(rZeroStc.reasons.includes("WRONG_PROBE_stcMin"));

  // Negative 3: stray unexpected control (f1)
  let bStray = bStep(b, { kind: "press", control: "f1" });
  const rStray = assessMdc2060Lesson(bStray, "MDC2060-LEARN-02");
  assert.equal(rStray.passed, false);
  assert.ok(rStray.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));
});

test("MDC2060-LEARN-03: positive (F1 shortcut, Menu path & standalone) and negative (canceled edit, no cursor move, toggled off)", () => {
  // Positive Path A (F1 + cursor)
  let bA = bBootToTx();
  bA = bStep(bA, { kind: "press", control: "f1" });
  bA = bStep(bA, { kind: "pad", control: "cursorpad", direction: "right" });
  assert.equal(assessMdc2060Lesson(bA, "MDC2060-LEARN-03").passed, true);

  // Positive Path B (MENU > EBL/VRM > EBL1 ON, VRM1 ON + cursor) & standalone
  let sB = sBootToTx();
  sB = sTapHold(sB, "menu", 200);
  sB = sStep(sB, { kind: "pad", control: "cursorpad", direction: "right" }); // DISPLAY
  sB = sStep(sB, { kind: "pad", control: "cursorpad", direction: "right" }); // EBL/VRM
  sB = sTapHold(sB, "ent", 200);
  sB = sStep(sB, { kind: "pad", control: "cursorpad", direction: "right" }); // EBL1 ON
  sB = sTapHold(sB, "ent", 200);
  sB = sStep(sB, { kind: "pad", control: "cursorpad", direction: "down" }); // EBL2
  sB = sStep(sB, { kind: "pad", control: "cursorpad", direction: "down" }); // VRM1
  sB = sTapHold(sB, "ent", 200);
  sB = sStep(sB, { kind: "pad", control: "cursorpad", direction: "right" }); // VRM1 ON
  sB = sTapHold(sB, "ent", 200);
  sB = sTapHold(sB, "menu", 200); // close menu
  sB = sStep(sB, { kind: "pointer", control: "ppi_cursor", dx: 40, dy: -30 });
  assert.equal(assessMdc2060Lesson(sB, "MDC2060-LEARN-03").passed, true);

  // Negative 1: F1 pressed without moving cursor
  let bNoMove = bBootToTx();
  bNoMove = bStep(bNoMove, { kind: "press", control: "f1" });
  const rNoMove = assessMdc2060Lesson(bNoMove, "MDC2060-LEARN-03");
  assert.equal(rNoMove.passed, false);
  assert.ok(rNoMove.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));
  assert.ok(rNoMove.reasons.includes("WRONG_PROBE_cursorMoved"));

  // Negative 2: Menu edit canceled via MENU before ENT
  let bCancel = bBootToTx();
  bCancel = bTapHold(bCancel, "menu", 200);
  bCancel = bStep(bCancel, { kind: "pad", control: "cursorpad", direction: "right" });
  bCancel = bStep(bCancel, { kind: "pad", control: "cursorpad", direction: "right" });
  bCancel = bTapHold(bCancel, "ent", 200);
  bCancel = bStep(bCancel, { kind: "pad", control: "cursorpad", direction: "right" });
  bCancel = bTapHold(bCancel, "menu", 200); // cancel edit
  bCancel = bTapHold(bCancel, "menu", 200); // close menu
  bCancel = bStep(bCancel, { kind: "pad", control: "cursorpad", direction: "right" });
  const rCancel = assessMdc2060Lesson(bCancel, "MDC2060-LEARN-03");
  assert.equal(rCancel.passed, false);
  assert.ok(rCancel.reasons.includes("WRONG_PROBE_ebl1On"));

  // Negative 3: toggled OFF via double F1 after moving cursor
  let bToggleOff = bStep(bA, { kind: "press", control: "f1" });
  const rToggleOff = assessMdc2060Lesson(bToggleOff, "MDC2060-LEARN-03");
  assert.equal(rToggleOff.passed, false);
  assert.ok(rToggleOff.reasons.includes("WRONG_PROBE_ebl1On"));
  assert.ok(rToggleOff.reasons.includes("WRONG_PROBE_vrm1On"));

  // Negative 4 (Regression): cursor pre-move + F1 + touch(phase='cancel') MUST NOT bypass LEARN-03
  let bCancelTouch = bBootToTx();
  bCancelTouch = bStep(bCancelTouch, { kind: "pad", control: "cursorpad", direction: "right" });
  bCancelTouch = bStep(bCancelTouch, { kind: "press", control: "f1" });
  bCancelTouch = bStep(bCancelTouch, { kind: "touch", control: "ppi_cursor", x: 100, y: 100, phase: "cancel" });
  const rCancelTouch = assessMdc2060Lesson(bCancelTouch, "MDC2060-LEARN-03");
  assert.equal(rCancelTouch.passed, false);
  assert.ok(rCancelTouch.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));
  assert.ok(rCancelTouch.reasons.includes("WRONG_PROBE_cursorMoved"));
});

test("MDC2060-LEARN-04: positive (storm bridge & standalone) and negative (canceled FTC, FTC < 3, IR OFF)", () => {
  // Positive bridge on storm scenario
  let b = bBootToTx(MDC2060_STORM_SCENARIO);
  b = bTapHold(b, "menu", 200, MDC2060_STORM_SCENARIO);
  b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO); // edit FTC
  for (let i = 0; i < 4; i++) {
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  }
  b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO); // commit FTC=4
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO); // IR
  b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO); // IR="1"
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO); // IR="2"
  b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO); // commit IR="2"
  const rPass = assessMdc2060Lesson(b, "MDC2060-LEARN-04");
  assertDisclaimers(rPass);
  assert.equal(rPass.passed, true);

  // Positive standalone
  let s = sBootToTx(MDC2060_STORM_SCENARIO);
  s = sTapHold(s, "menu", 200, MDC2060_STORM_SCENARIO);
  s = sTapHold(s, "ent", 200, MDC2060_STORM_SCENARIO);
  for (let i = 0; i < 3; i++) {
    s = sStep(s, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  }
  s = sTapHold(s, "ent", 200, MDC2060_STORM_SCENARIO);
  s = sStep(s, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO);
  s = sTapHold(s, "ent", 200, MDC2060_STORM_SCENARIO);
  s = sStep(s, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  s = sTapHold(s, "ent", 200, MDC2060_STORM_SCENARIO);
  assert.equal(assessMdc2060Lesson(s, "MDC2060-LEARN-04").passed, true);

  // Negative: cancel FTC edit with MENU before ENT
  let bCancel = bBootToTx(MDC2060_STORM_SCENARIO);
  bCancel = bTapHold(bCancel, "menu", 200, MDC2060_STORM_SCENARIO);
  bCancel = bTapHold(bCancel, "ent", 200, MDC2060_STORM_SCENARIO);
  for (let i = 0; i < 4; i++) {
    bCancel = bStep(bCancel, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  }
  bCancel = bTapHold(bCancel, "menu", 200, MDC2060_STORM_SCENARIO); // cancel!
  bCancel = bStep(bCancel, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO);
  bCancel = bTapHold(bCancel, "ent", 200, MDC2060_STORM_SCENARIO);
  bCancel = bStep(bCancel, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  bCancel = bTapHold(bCancel, "ent", 200, MDC2060_STORM_SCENARIO);
  const rCancel = assessMdc2060Lesson(bCancel, "MDC2060-LEARN-04");
  assert.equal(rCancel.passed, false);
  assert.ok(rCancel.reasons.includes("WRONG_PROBE_ftcMin"));

  // Negative 2: FTC < 3 (FTC = 2, IR = "1")
  let bLowFtc = bBootToTx(MDC2060_STORM_SCENARIO);
  bLowFtc = bTapHold(bLowFtc, "menu", 200, MDC2060_STORM_SCENARIO);
  bLowFtc = bTapHold(bLowFtc, "ent", 200, MDC2060_STORM_SCENARIO);
  bLowFtc = bStep(bLowFtc, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  bLowFtc = bStep(bLowFtc, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  bLowFtc = bTapHold(bLowFtc, "ent", 200, MDC2060_STORM_SCENARIO); // FTC=2
  bLowFtc = bStep(bLowFtc, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO);
  bLowFtc = bTapHold(bLowFtc, "ent", 200, MDC2060_STORM_SCENARIO);
  bLowFtc = bStep(bLowFtc, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO); // IR="1"
  bLowFtc = bTapHold(bLowFtc, "ent", 200, MDC2060_STORM_SCENARIO);
  const rLowFtc = assessMdc2060Lesson(bLowFtc, "MDC2060-LEARN-04");
  assert.equal(rLowFtc.passed, false);
  assert.ok(rLowFtc.reasons.includes("WRONG_PROBE_ftcMin"));

  // Negative 3: FTC = 4, IR left OFF (cycled right then left back to OFF)
  let bIrOff = bBootToTx(MDC2060_STORM_SCENARIO);
  bIrOff = bTapHold(bIrOff, "menu", 200, MDC2060_STORM_SCENARIO);
  bIrOff = bTapHold(bIrOff, "ent", 200, MDC2060_STORM_SCENARIO);
  for (let i = 0; i < 4; i++) {
    bIrOff = bStep(bIrOff, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
  }
  bIrOff = bTapHold(bIrOff, "ent", 200, MDC2060_STORM_SCENARIO); // FTC=4
  bIrOff = bStep(bIrOff, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO);
  bIrOff = bTapHold(bIrOff, "ent", 200, MDC2060_STORM_SCENARIO);
  bIrOff = bStep(bIrOff, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO); // IR="1"
  bIrOff = bStep(bIrOff, { kind: "pad", control: "cursorpad", direction: "left" }, MDC2060_STORM_SCENARIO); // back to OFF
  bIrOff = bTapHold(bIrOff, "ent", 200, MDC2060_STORM_SCENARIO);
  const rIrOff = assessMdc2060Lesson(bIrOff, "MDC2060-LEARN-04");
  assert.equal(rIrOff.passed, false);
  assert.ok(rIrOff.reasons.includes("WRONG_PROBE_irEnabled"));
});

test("MDC2060-LEARN-05: positive (bridge & standalone) and negative (HDG sensor fault & transient toggle)", () => {
  function runDisplayConfig(stepFn, tapFn, session) {
    let cur = tapFn(session, "menu", 200);
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "right" }); // DISPLAY
    cur = tapFn(cur, "ent", 200); // MODE
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "right" }); // N-UP
    cur = tapFn(cur, "ent", 200);
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "down" }); // MOTION
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "down" }); // SCREEN
    cur = tapFn(cur, "ent", 200);
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "right" }); // PPI/PPI
    cur = tapFn(cur, "ent", 200);
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "down" }); // OFF CENT
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "down" }); // TRAIL MODE
    cur = tapFn(cur, "ent", 200);
    cur = stepFn(cur, { kind: "pad", control: "cursorpad", direction: "right" }); // T
    cur = tapFn(cur, "ent", 200);
    return cur;
  }

  // Positive bridge & standalone
  const bPass = runDisplayConfig(bStep, bTapHold, bBootToTx());
  assert.equal(assessMdc2060Lesson(bPass, "MDC2060-LEARN-05").passed, true);
  const sPass = runDisplayConfig(sStep, sTapHold, sBootToTx());
  assert.equal(assessMdc2060Lesson(sPass, "MDC2060-LEARN-05").passed, true);

  // Negative 1: HDG sensor dropped permanently
  let bNoHdg = bStep(bPass, { kind: "training-fixture", fixture: "headingSensor", enabled: false });
  const rNoHdg = assessMdc2060Lesson(bNoHdg, "MDC2060-LEARN-05");
  assert.equal(rNoHdg.passed, false);
  assert.ok(rNoHdg.reasons.includes("WRONG_TRAINING_CONTEXT"));
  assert.ok(rNoHdg.reasons.includes("WRONG_PROBE_effectivePresentationMode"));

  // Negative 2: transient HDG toggle OFF then back ON during attempt MUST still fail!
  let bToggle = bStep(bNoHdg, { kind: "training-fixture", fixture: "headingSensor", enabled: true });
  const rToggle = assessMdc2060Lesson(bToggle, "MDC2060-LEARN-05");
  assert.equal(rToggle.passed, false);
  assert.ok(rToggle.reasons.includes("WRONG_TRAINING_CONTEXT"));
});

test("MDC2060-LEARN-06: positive (bridge Guard Zone IN + ACK) and negative (no ACK, standalone fail-closed)", () => {
  let b = bBootToTx();
  b = bTapHold(b, "menu", 200);
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // DISPLAY
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // EBL/VRM
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // ALARM
  b = bTapHold(b, "ent", 200); // edit MODE
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // IN
  b = bTapHold(b, "ent", 200); // commit MODE = IN (catches SMALL PILOT 02!)
  b = bStep(b, { kind: "tick", steps: 1 });

  // Negative before alarm_ack: audible still true
  const rUnack = assessMdc2060Lesson(b, "MDC2060-LEARN-06");
  assert.equal(rUnack.passed, false);
  assert.ok(rUnack.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));
  assert.ok(rUnack.reasons.includes("WRONG_PROBE_alarmAudible"));

  // Positive after alarm_ack
  const bAck = bStep(b, { kind: "press", control: "alarm_ack" });
  const rPass = assessMdc2060Lesson(bAck, "MDC2060-LEARN-06");
  assertDisclaimers(rPass);
  assert.equal(rPass.passed, true);

  // Negative standalone session (no 2D bridge contacts -> fails closed)
  let s = sBootToTx();
  s = sTapHold(s, "menu", 200);
  s = sStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
  s = sStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
  s = sStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
  s = sTapHold(s, "ent", 200);
  s = sStep(s, { kind: "pad", control: "cursorpad", direction: "right" });
  s = sTapHold(s, "ent", 200);
  s = sStep(s, { kind: "press", control: "alarm_ack" });
  const rStandalone = assessMdc2060Lesson(s, "MDC2060-LEARN-06");
  assert.equal(rStandalone.passed, false);
  assert.ok(rStandalone.reasons.includes("REQUIRES_BRIDGE_SESSION"));
});

test("MDC2060-LEARN-07: positive (F2 + AIS INFO & multi-device Bridge Sync isolation) and negative (board missing, ATA-only)", () => {
  // Positive Path A (F2 + MENU > AIS > INFO)
  let b = bBootToTx();
  b = bStep(b, { kind: "press", control: "f2" }); // acquires PACIFIC STAR
  // Negative ATA-only (missing AIS info)
  const rAtaOnly = assessMdc2060Lesson(b, "MDC2060-LEARN-07");
  assert.equal(rAtaOnly.passed, false);
  assert.ok(rAtaOnly.reasons.includes("WRONG_PROBE_aisSelected"));

  b = bTapHold(b, "menu", 200);
  for (let i = 0; i < 5; i++) b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }); // AIS
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // FILTER RNG
  b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }); // INFO
  b = bTapHold(b, "ent", 200); // opens ais-info on dangerous PACIFIC STAR
  const rPass = assessMdc2060Lesson(b, "MDC2060-LEARN-07");
  assertDisclaimers(rPass);
  assert.equal(rPass.passed, true);

  // Negative: ataBoardOption disabled -> WRONG_TRAINING_CONTEXT
  let bNoAta = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
  bNoAta = bStep(bNoAta, { kind: "training-fixture", fixture: "ataBoardOption", enabled: false });
  bNoAta = bStep(bNoAta, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
  bNoAta = bTapHold(bNoAta, "power", 200);
  bNoAta = bStep(bNoAta, { kind: "press", control: "stby_tx" });
  bNoAta = bStep(bNoAta, { kind: "press", control: "f2" });
  const rNoAta = assessMdc2060Lesson(bNoAta, "MDC2060-LEARN-07");
  assert.equal(rNoAta.passed, false);
  assert.ok(rNoAta.reasons.includes("WRONG_TRAINING_CONTEXT"));
  assert.ok(rNoAta.reasons.includes("WRONG_PROBE_minimumAtaTargets"));

  // Negative: aisBoardOption disabled -> WRONG_TRAINING_CONTEXT
  let bNoAis = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
  bNoAis = bStep(bNoAis, { kind: "training-fixture", fixture: "aisBoardOption", enabled: false });
  bNoAis = bStep(bNoAis, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
  bNoAis = bTapHold(bNoAis, "power", 200);
  bNoAis = bStep(bNoAis, { kind: "press", control: "stby_tx" });
  bNoAis = bStep(bNoAis, { kind: "press", control: "f2" });
  const rNoAis = assessMdc2060Lesson(bNoAis, "MDC2060-LEARN-07");
  assert.equal(rNoAis.passed, false);
  assert.ok(rNoAis.reasons.includes("WRONG_TRAINING_CONTEXT"));
  assert.ok(rNoAis.reasons.includes("WRONG_PROBE_aisSelected"));

  // Positive Path B (both ATA ACQ and AIS INFO via Main Menu)
  let bMenu = bBootToTx();
  bMenu = bTapHold(bMenu, "menu", 200);
  for (let i = 0; i < 4; i++) bMenu = bStep(bMenu, { kind: "pad", control: "cursorpad", direction: "right" }); // ATA
  bMenu = bTapHold(bMenu, "ent", 200); // ACQ (closes menu)
  bMenu = bTapHold(bMenu, "menu", 200);
  for (let i = 0; i < 5; i++) bMenu = bStep(bMenu, { kind: "pad", control: "cursorpad", direction: "right" }); // AIS
  bMenu = bStep(bMenu, { kind: "pad", control: "cursorpad", direction: "down" });
  bMenu = bStep(bMenu, { kind: "pad", control: "cursorpad", direction: "down" }); // INFO
  bMenu = bTapHold(bMenu, "ent", 200);
  assert.equal(assessMdc2060Lesson(bMenu, "MDC2060-LEARN-07").passed, true);

  // Positive inside multi-device Bridge Sync [FCV588_ADAPTER, MDC2060_ADAPTER]:
  // foreign FCV-588 inputs MUST NOT trigger UNEXPECTED_OPERATOR_ACTIONS!
  const dualAdapters = [FCV588_ADAPTER, MDC2060_ADAPTER];
  let dual = bBootToTx(MDC2060_BRIDGE_SYNC_SCENARIO, dualAdapters);
  dual = dispatchBridgeInput(dual, dualAdapters, FCV588_ADAPTER.id, { kind: "down", control: "power" }, MDC2060_BRIDGE_SYNC_SCENARIO);
  dual = dispatchBridgeInput(dual, dualAdapters, FCV588_ADAPTER.id, { kind: "up", control: "power", durationMs: 200 }, MDC2060_BRIDGE_SYNC_SCENARIO);
  dual = bStep(dual, { kind: "press", control: "f2" }, MDC2060_BRIDGE_SYNC_SCENARIO, dualAdapters);
  dual = bTapHold(dual, "menu", 200, MDC2060_BRIDGE_SYNC_SCENARIO, dualAdapters);
  for (let i = 0; i < 5; i++) {
    dual = bStep(dual, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_BRIDGE_SYNC_SCENARIO, dualAdapters);
  }
  dual = bStep(dual, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_BRIDGE_SYNC_SCENARIO, dualAdapters);
  dual = bStep(dual, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_BRIDGE_SYNC_SCENARIO, dualAdapters);
  dual = bTapHold(dual, "ent", 200, MDC2060_BRIDGE_SYNC_SCENARIO, dualAdapters);
  const rDual = assessMdc2060Lesson(dual, "MDC2060-LEARN-07", { adapters: dualAdapters });
  assert.equal(rDual.passed, true);
  assert.equal(rDual.replayVerified, true);

  // Positive Path C: F2 manual ATA + move cursor directly onto AIS target PACIFIC STAR + short ENT
  let bPathC = bBootToTx();
  bPathC = bStep(bPathC, { kind: "press", control: "f2" });
  const star = bPathC.sensorBus.aisTargets.find(t => t.mmsi === "574002101");
  const ownHdg = bPathC.devices[DEV].deviceState.ownshipSnapshot.hdgDeg;
  const relAngRad = (((star.bearingDeg - ownHdg) % 360 + 360) % 360) * Math.PI / 180;
  const rNorm = star.rangeNm / 6;
  const touchX = Math.round(240 + rNorm * Math.sin(relAngRad) * 210);
  const touchY = Math.round(300 - rNorm * Math.cos(relAngRad) * 210);
  bPathC = bStep(bPathC, { kind: "touch", control: "ppi_cursor", x: touchX, y: touchY, phase: "down" });
  bPathC = bTapHold(bPathC, "ent", 200);
  assert.equal(bPathC.devices[DEV].deviceState.overlay?.kind, "ais-info");
  assert.equal(bPathC.devices[DEV].deviceState.ais.selectedMmsi, "574002101");
  const rPathC = assessMdc2060Lesson(bPathC, "MDC2060-LEARN-07");
  assertDisclaimers(rPathC);
  assert.equal(rPathC.passed, true);
  assert.equal(rPathC.replayVerified, true);

  // Negative: AIS-only (inspected AIS INFO without acquiring any ATA target)
  let bAisOnly = bBootToTx();
  bAisOnly = bTapHold(bAisOnly, "menu", 200);
  for (let i = 0; i < 5; i++) bAisOnly = bStep(bAisOnly, { kind: "pad", control: "cursorpad", direction: "right" });
  bAisOnly = bStep(bAisOnly, { kind: "pad", control: "cursorpad", direction: "down" });
  bAisOnly = bStep(bAisOnly, { kind: "pad", control: "cursorpad", direction: "down" });
  bAisOnly = bTapHold(bAisOnly, "ent", 200);
  const rAisOnly = assessMdc2060Lesson(bAisOnly, "MDC2060-LEARN-07");
  assert.equal(rAisOnly.passed, false);
  assert.ok(rAisOnly.reasons.includes("WRONG_PROBE_minimumAtaTargets"));

  // Negative (Regression): AUTO AREA acquisition (acquisitionType="A") MUST NOT satisfy manual ATA requirement!
  let bAutoSetup = bBootToTx();
  bAutoSetup = bTapHold(bAutoSetup, "menu", 200);
  for (let i = 0; i < 4; i++) bAutoSetup = bStep(bAutoSetup, { kind: "pad", control: "cursorpad", direction: "right" }); // ATA
  for (let i = 0; i < 3; i++) bAutoSetup = bStep(bAutoSetup, { kind: "pad", control: "cursorpad", direction: "down" }); // AUTO AREA
  bAutoSetup = bTapHold(bAutoSetup, "ent", 200);
  bAutoSetup = bStep(bAutoSetup, { kind: "pad", control: "cursorpad", direction: "right" }); // ON (does not tick yet)
  bAutoSetup = bTapHold(bAutoSetup, "ent", 200);
  bAutoSetup = bTapHold(bAutoSetup, "menu", 200);
  // Start lesson with 0 targets at startSeq, then tick -> auto-area acquires target(s) with acquisitionType "A"
  const autoStartSeq = bAutoSetup.history.length;
  const autoStartHash = bridgeSessionHash(bAutoSetup);
  let bAutoTry = bStep(bAutoSetup, { kind: "tick", steps: 1 });
  assert.ok(bAutoTry.devices[DEV].deviceState.ata.targets.some(t => t.acquisitionType === "A"));
  bAutoTry = bTapHold(bAutoTry, "menu", 200);
  for (let i = 0; i < 5; i++) bAutoTry = bStep(bAutoTry, { kind: "pad", control: "cursorpad", direction: "right" }); // AIS
  bAutoTry = bStep(bAutoTry, { kind: "pad", control: "cursorpad", direction: "down" });
  bAutoTry = bStep(bAutoTry, { kind: "pad", control: "cursorpad", direction: "down" }); // INFO
  bAutoTry = bTapHold(bAutoTry, "ent", 200); // open ais-info
  bAutoTry = bTapHold(bAutoTry, "ent", 200); // close ais-info
  const rAutoOnly = assessMdc2060Lesson(bAutoTry, "MDC2060-LEARN-07", {
    startSeq: autoStartSeq,
    startSessionHash: autoStartHash,
  });
  assert.equal(rAutoOnly.passed, false);
  assert.ok(rAutoOnly.reasons.includes("WRONG_PROBE_minimumAtaTargets"));

  // Negative (Regression): pre-selected AIS prior to startSeq + pressing ENT on empty water MUST NOT pass LEARN-07!
  let bPreAis = bBootToTx();
  bPreAis = bTapHold(bPreAis, "menu", 200);
  for (let i = 0; i < 5; i++) bPreAis = bStep(bPreAis, { kind: "pad", control: "cursorpad", direction: "right" });
  bPreAis = bStep(bPreAis, { kind: "pad", control: "cursorpad", direction: "down" });
  bPreAis = bStep(bPreAis, { kind: "pad", control: "cursorpad", direction: "down" });
  bPreAis = bTapHold(bPreAis, "ent", 200); // open ais-info before lesson start
  bPreAis = bTapHold(bPreAis, "ent", 200); // close ais-info (selectedMmsi remains populated!)
  const preAisSeq = bPreAis.history.length;
  const preAisHash = bridgeSessionHash(bPreAis);
  let bEmptyEnt = bStep(bPreAis, { kind: "press", control: "f2" });
  bEmptyEnt = bStep(bEmptyEnt, { kind: "pad", control: "cursorpad", direction: "left" }); // empty water
  bEmptyEnt = bTapHold(bEmptyEnt, "ent", 200); // starts 2-point measure, NOT ais-info!
  assert.equal(bEmptyEnt.devices[DEV].deviceState.overlay, null);
  assert.ok(bEmptyEnt.devices[DEV].deviceState.measureAnchor !== null);
  const rPreAisBypass = assessMdc2060Lesson(bEmptyEnt, "MDC2060-LEARN-07", {
    startSeq: preAisSeq,
    startSessionHash: preAisHash,
  });
  assert.equal(rPreAisBypass.passed, false);
  assert.ok(rPreAisBypass.reasons.includes("WRONG_PROBE_aisSelected"));
});

test("Lesson security boundaries: tamper detection, startSeq/startSessionHash, baselineAtaCount & custom scenarios", () => {
  // Unknown lesson & invalid session
  const rUnk = assessMdc2060Lesson({}, "NOPE");
  assertDisclaimers(rUnk);
  assert.deepEqual(rUnk.reasons, ["UNKNOWN_LESSON"]);
  const rInv = assessMdc2060Lesson(null, "MDC2060-LEARN-01");
  assertDisclaimers(rInv);
  assert.deepEqual(rInv.reasons, ["INVALID_SESSION"]);

  // Valid startSeq > 0 boundary with matching startSessionHash
  const booted = bBootToTx();
  const startSeq = booted.history.length;
  const startHash = bridgeSessionHash(booted);
  let after = bStep(booted, { kind: "press", control: "f1" });
  after = bStep(after, { kind: "pad", control: "cursorpad", direction: "right" });

  assert.equal(
    assessMdc2060Lesson(after, "MDC2060-LEARN-03", { startSeq, startSessionHash: startHash }).passed,
    true,
  );
  // Missing startSessionHash when startSeq > 0 -> INVALID_LESSON_BOUNDARY
  assert.ok(
    assessMdc2060Lesson(after, "MDC2060-LEARN-03", { startSeq }).reasons.includes("INVALID_LESSON_BOUNDARY"),
  );
  // Cross-session wrong startSessionHash -> LESSON_BOUNDARY_MISMATCH
  assert.ok(
    assessMdc2060Lesson(after, "MDC2060-LEARN-03", { startSeq, startSessionHash: "f0-fnv1a32-deadbeef" })
      .reasons.includes("LESSON_BOUNDARY_MISMATCH"),
  );
  // Mismatched baselineAtaCount -> LESSON_ATA_BASELINE_MISMATCH
  assert.ok(
    assessMdc2060Lesson(after, "MDC2060-LEARN-07", { startSeq, startSessionHash: startHash, baselineAtaCount: 3 })
      .reasons.includes("LESSON_ATA_BASELINE_MISMATCH"),
  );

  // Tampered deviceState -> REPLAY_STATE_MISMATCH
  const tampered = {
    ...after,
    devices: {
      ...after.devices,
      [DEV]: {
        ...after.devices[DEV],
        deviceState: { ...after.devices[DEV].deviceState, gain: 99 },
      },
    },
  };
  const rTamper = assessMdc2060Lesson(tampered, "MDC2060-LEARN-03");
  assert.equal(rTamper.passed, false);
  assert.equal(rTamper.replayVerified, false);
  assert.ok(rTamper.reasons.includes("REPLAY_STATE_MISMATCH"));

  // Custom ownship derived scenario works seamlessly via options.scenario
  const custom = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, { hdgDeg: 115, sogKn: 12 });
  const bCustom = bBootToTx(custom);
  const rCustom = assessMdc2060Lesson(bCustom, "MDC2060-LEARN-01", { scenario: custom });
  assert.equal(rCustom.passed, true);
  assert.equal(rCustom.replayVerified, true);

  // Standalone startSeq + startSessionHash verification
  const sBoot = sBootToTx();
  const sSeq = sBoot.events.length;
  const sHash = sessionHash(sBoot);
  let sDone = sStep(sBoot, { kind: "press", control: "f1" });
  sDone = sStep(sDone, { kind: "pad", control: "cursorpad", direction: "up" });
  assert.equal(
    assessMdc2060Lesson(sDone, "MDC2060-LEARN-03", { startSeq: sSeq, startSessionHash: sHash }).passed,
    true,
  );
});

test("Regression: startSeq > 0 startup prerequisites (after fastPreheat from OFF and from STANDBY) remain fail-closed", () => {
  // 1. fastPreheat at seq=1 (radar still OFF), lesson starts at startSeq=1 -> boot + LEARN-02 passes!
  let b1 = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
  b1 = bStep(b1, { kind: "training-fixture", fixture: "fastPreheat", enabled: true });
  const seqOff = b1.history.length;
  const hashOff = bridgeSessionHash(b1);
  assert.equal(seqOff, 1);

  let bFromOff = bTapHold(b1, "power", 200);
  bFromOff = bStep(bFromOff, { kind: "tick", steps: 5 });
  bFromOff = bStep(bFromOff, { kind: "press", control: "stby_tx" });
  bFromOff = bStep(bFromOff, { kind: "press", control: "range_down" });
  bFromOff = bStep(bFromOff, { kind: "press", control: "range_down" });
  bFromOff = bStep(bFromOff, { kind: "rotate", control: "gain", steps: 4 });
  bFromOff = bStep(bFromOff, { kind: "rotate", control: "stc", steps: 8 });
  const rFromOff = assessMdc2060Lesson(bFromOff, "MDC2060-LEARN-02", {
    startSeq: seqOff,
    startSessionHash: hashOff,
  });
  assertDisclaimers(rFromOff);
  assert.equal(rFromOff.passed, true);
  assert.equal(rFromOff.replayVerified, true);
  assert.equal(rFromOff.startSeq, 1);

  // 2. Lesson starts in STANDBY at startSeq=4 -> stby_tx + LEARN-02 passes!
  let bStby = bTapHold(b1, "power", 200);
  bStby = bStep(bStby, { kind: "tick", steps: 5 });
  const seqStby = bStby.history.length;
  const hashStby = bridgeSessionHash(bStby);
  assert.equal(bStby.devices[DEV].deviceState.powerMode, "standby");
  let bFromStby = bStep(bStby, { kind: "press", control: "stby_tx" });
  bFromStby = bStep(bFromStby, { kind: "press", control: "range_down" });
  bFromStby = bStep(bFromStby, { kind: "press", control: "range_down" });
  bFromStby = bStep(bFromStby, { kind: "rotate", control: "gain", steps: 4 });
  bFromStby = bStep(bFromStby, { kind: "rotate", control: "stc", steps: 8 });
  const rFromStby = assessMdc2060Lesson(bFromStby, "MDC2060-LEARN-02", {
    startSeq: seqStby,
    startSessionHash: hashStby,
  });
  assert.equal(rFromStby.passed, true);
  assert.equal(rFromStby.replayVerified, true);

  // 3. Negative: already in TRANSMIT at startSeq > 0, pressing stby_tx or power MUST still fail closed!
  const bTx = bBootToTx();
  const seqTx = bTx.history.length;
  const hashTx = bridgeSessionHash(bTx);
  let bBadTx = bStep(bTx, { kind: "press", control: "stby_tx" }); // TX -> STANDBY (unexpected!)
  bBadTx = bStep(bBadTx, { kind: "press", control: "stby_tx" });
  bBadTx = bStep(bBadTx, { kind: "press", control: "range_down" });
  bBadTx = bStep(bBadTx, { kind: "press", control: "range_down" });
  bBadTx = bStep(bBadTx, { kind: "rotate", control: "gain", steps: 4 });
  bBadTx = bStep(bBadTx, { kind: "rotate", control: "stc", steps: 8 });
  const rBadTx = assessMdc2060Lesson(bBadTx, "MDC2060-LEARN-02", {
    startSeq: seqTx,
    startSessionHash: hashTx,
  });
  assert.equal(rBadTx.passed, false);
  assert.ok(rBadTx.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));

  // 4. Negative: long power (>3000ms) while OFF at startSeq=1 MUST still fail!
  let bLongPow = bTapHold(b1, "power", 3500);
  const rLongPow = assessMdc2060Lesson(bLongPow, "MDC2060-LEARN-02", {
    startSeq: seqOff,
    startSessionHash: hashOff,
  });
  assert.equal(rLongPow.passed, false);
  assert.ok(rLongPow.reasons.includes("ACTION_WHILE_POWERED_OFF"));
  assert.ok(rLongPow.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));

  // 5. Negative: stby_tx while PREHEAT at startSeq > 0 MUST still fail!
  let bPreheat = bTapHold(b1, "power", 200);
  const seqPre = bPreheat.history.length;
  const hashPre = bridgeSessionHash(bPreheat);
  bPreheat = bStep(bPreheat, { kind: "press", control: "stby_tx" });
  const rPreStby = assessMdc2060Lesson(bPreheat, "MDC2060-LEARN-02", {
    startSeq: seqPre,
    startSessionHash: hashPre,
  });
  assert.equal(rPreStby.passed, false);
  assert.ok(rPreStby.reasons.includes("ACTION_WHILE_POWERED_OFF"));
});

test("Regression: fail-closed malformed sessions, options=null, throwing Proxies & restore-settings anti-tamper (LEARN-03..07)", () => {
  const validBridge = bBootToTx();

  // 1. Malformed standalone & bridge objects with empty/null deviceState MUST fail closed without throwing TypeError
  const rMalStandalone = assessMdc2060Lesson({ events: [], deviceState: {} }, "MDC2060-LEARN-01");
  assertDisclaimers(rMalStandalone);
  assert.equal(rMalStandalone.passed, false);
  assert.equal(rMalStandalone.replayVerified, false);
  assert.ok(rMalStandalone.reasons.includes("REPLAY_STATE_MISMATCH"));

  const rMalBridge = assessMdc2060Lesson(
    {
      bridgeVersion: 1,
      history: [],
      deviceOrder: [DEV],
      devices: { [DEV]: { deviceState: {} } },
    },
    "MDC2060-LEARN-01",
  );
  assertDisclaimers(rMalBridge);
  assert.equal(rMalBridge.passed, false);
  assert.equal(rMalBridge.replayVerified, false);
  assert.ok(rMalBridge.reasons.includes("REPLAY_STATE_MISMATCH"));

  // Corrupted real bridge session (seq=999 + settings=null) MUST NOT throw
  const corruptedBridge = {
    ...validBridge,
    history: [{ ...validBridge.history[0], seq: 999 }, ...validBridge.history.slice(1)],
    devices: {
      ...validBridge.devices,
      [DEV]: {
        ...validBridge.devices[DEV],
        deviceState: { ...validBridge.devices[DEV].deviceState, settings: null },
      },
    },
  };
  const rCorrupt = assessMdc2060Lesson(corruptedBridge, "MDC2060-LEARN-01");
  assertDisclaimers(rCorrupt);
  assert.equal(rCorrupt.passed, false);
  assert.equal(rCorrupt.replayVerified, false);
  assert.ok(rCorrupt.reasons.includes("REPLAY_STATE_MISMATCH"));

  // 2. Hostile rawOptions (null, array, primitive, throwing Proxy) & hostile session Proxy MUST NOT throw
  for (const badOpts of [null, [], 42, "bad"]) {
    const rBadOpts = assessMdc2060Lesson(validBridge, "MDC2060-LEARN-01", badOpts);
    assertDisclaimers(rBadOpts);
    assert.equal(rBadOpts.passed, false);
    assert.deepEqual(rBadOpts.reasons, ["INVALID_LESSON_BOUNDARY"]);
  }

  const throwingProxy = new Proxy({}, {
    get() {
      throw new Error("hostile getter");
    },
  });
  const rProxyOpts = assessMdc2060Lesson(validBridge, "MDC2060-LEARN-01", throwingProxy);
  assertDisclaimers(rProxyOpts);
  assert.equal(rProxyOpts.passed, false);
  assert.deepEqual(rProxyOpts.reasons, ["INVALID_LESSON_BOUNDARY"]);

  const rProxySession = assessMdc2060Lesson(throwingProxy, "MDC2060-LEARN-01");
  assertDisclaimers(rProxySession);
  assert.equal(rProxySession.passed, false);
  assert.deepEqual(rProxySession.reasons, ["INVALID_SESSION"]);

  const rBadLessonId = assessMdc2060Lesson(validBridge, { toString() { throw new Error("boom"); } });
  assertDisclaimers(rBadLessonId);
  assert.equal(rBadLessonId.passed, false);
  assert.deepEqual(rBadLessonId.reasons, ["UNKNOWN_LESSON"]);

  // 3. restore-settings inside graded window MUST be rejected across LEARN-03, 04, 05, 06, 07!
  // LEARN-03 bypass attempt via restore-settings
  {
    let b = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    b = bStep(b, { kind: "restore-settings", settings: { ebl1: "ON", vrm1: "ON" } });
    b = bStep(b, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    b = bTapHold(b, "power", 200);
    b = bStep(b, { kind: "press", control: "stby_tx" });
    b = bTapHold(b, "menu", 200);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
    b = bTapHold(b, "ent", 200);
    b = bTapHold(b, "menu", 200);
    b = bTapHold(b, "menu", 200);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
    const r = assessMdc2060Lesson(b, "MDC2060-LEARN-03");
    assert.equal(r.passed, false);
    assert.ok(r.reasons.includes("WRONG_TRAINING_CONTEXT"));
  }

  // LEARN-04 bypass attempt via restore-settings
  {
    let b = createBridgeSession(ADAPTERS, MDC2060_STORM_SCENARIO);
    b = bStep(b, { kind: "restore-settings", settings: { ftc: 5, ir: "2" } }, MDC2060_STORM_SCENARIO);
    b = bStep(b, { kind: "training-fixture", fixture: "skipPreheat", enabled: true }, MDC2060_STORM_SCENARIO);
    b = bTapHold(b, "power", 200, MDC2060_STORM_SCENARIO);
    b = bStep(b, { kind: "press", control: "stby_tx" }, MDC2060_STORM_SCENARIO);
    b = bTapHold(b, "menu", 200, MDC2060_STORM_SCENARIO);
    b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
    b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO);
    b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
    b = bTapHold(b, "ent", 200, MDC2060_STORM_SCENARIO);
    const r = assessMdc2060Lesson(b, "MDC2060-LEARN-04");
    assert.equal(r.passed, false);
    assert.ok(r.reasons.includes("WRONG_TRAINING_CONTEXT"));
  }

  // LEARN-05 bypass attempt via restore-settings
  {
    let b = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    b = bStep(b, {
      kind: "restore-settings",
      settings: { presentationMode: "N-UP", screenMode: "PPI/PPI", trailMode: "T" },
    });
    b = bStep(b, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    b = bTapHold(b, "power", 200);
    b = bStep(b, { kind: "press", control: "stby_tx" });
    b = bTapHold(b, "menu", 200);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
    b = bTapHold(b, "ent", 200);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" });
    b = bTapHold(b, "ent", 200);
    const r = assessMdc2060Lesson(b, "MDC2060-LEARN-05");
    assert.equal(r.passed, false);
    assert.ok(r.reasons.includes("WRONG_TRAINING_CONTEXT"));
  }

  // LEARN-06 bypass attempt via restore-settings
  {
    let b = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    b = bStep(b, { kind: "restore-settings", settings: { alarmMode: "IN" } });
    b = bStep(b, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    b = bTapHold(b, "power", 200);
    b = bStep(b, { kind: "press", control: "stby_tx" });
    b = bStep(b, { kind: "tick", steps: 1 });
    b = bTapHold(b, "menu", 200);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
    b = bTapHold(b, "ent", 200);
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "left" });
    b = bTapHold(b, "ent", 200);
    b = bStep(b, { kind: "press", control: "alarm_ack" });
    const r = assessMdc2060Lesson(b, "MDC2060-LEARN-06");
    assert.equal(r.passed, false);
    assert.ok(r.reasons.includes("WRONG_TRAINING_CONTEXT"));
  }

  // LEARN-07 bypass attempt via restore-settings(ataAutoArea="ON")
  {
    let b = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    b = bStep(b, { kind: "restore-settings", settings: { ataAutoArea: "ON" } });
    b = bStep(b, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    b = bTapHold(b, "power", 200);
    b = bStep(b, { kind: "press", control: "stby_tx" });
    b = bStep(b, { kind: "tick", steps: 1 });
    b = bTapHold(b, "menu", 200);
    for (let i = 0; i < 5; i++) b = bStep(b, { kind: "pad", control: "cursorpad", direction: "right" });
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
    b = bStep(b, { kind: "pad", control: "cursorpad", direction: "down" });
    b = bTapHold(b, "ent", 200);
    b = bTapHold(b, "ent", 200);
    const r = assessMdc2060Lesson(b, "MDC2060-LEARN-07");
    assert.equal(r.passed, false);
    assert.ok(r.reasons.includes("WRONG_TRAINING_CONTEXT"));
    assert.ok(r.reasons.includes("WRONG_PROBE_minimumAtaTargets"));
  }
});

test("Regression (Iter 3 C2#1-C2#4): revoked Proxy options, LEARN-07 danger AIS check, LEARN-03..06 startSeq carryover anti-tamper & LEARN-01 BRILL dialog", () => {
  const validBridge = bBootToTx();

  // Helper to project an AIS target onto H-UP 6 NM PPI touch coordinates
  function targetTouchCoords(bridge, mmsi) {
    const tgt = bridge.sensorBus.aisTargets.find(t => t.mmsi === mmsi);
    assert.ok(tgt, `missing AIS target ${mmsi}`);
    const hdg = bridge.devices[DEV].deviceState.ownshipSnapshot.hdgDeg;
    const relRad = (((tgt.bearingDeg - hdg) % 360 + 360) % 360) * Math.PI / 180;
    const rNorm = tgt.rangeNm / 6;
    return {
      x: Math.round(240 + rNorm * Math.sin(relRad) * 210),
      y: Math.round(300 - rNorm * Math.cos(relRad) * 210),
    };
  }

  // C2#1: Revoked Proxy passed as rawOptions, sessionOrBridge, lessonId, or options.adapters fails closed with disclaimers
  {
    const { proxy: revokedOpts, revoke: revokeOpts } = Proxy.revocable({}, {});
    revokeOpts();
    const rRevOpts = assessMdc2060Lesson(validBridge, "MDC2060-LEARN-01", revokedOpts);
    assertDisclaimers(rRevOpts);
    assert.equal(rRevOpts.passed, false);
    assert.equal(rRevOpts.replayVerified, false);
    assert.deepEqual(rRevOpts.reasons, ["INVALID_LESSON_BOUNDARY"]);

    const { proxy: revokedSession, revoke: revokeSession } = Proxy.revocable({}, {});
    revokeSession();
    const rRevSess = assessMdc2060Lesson(revokedSession, "MDC2060-LEARN-01");
    assertDisclaimers(rRevSess);
    assert.equal(rRevSess.passed, false);
    assert.deepEqual(rRevSess.reasons, ["INVALID_SESSION"]);

    const { proxy: revokedLessonId, revoke: revokeLessonId } = Proxy.revocable({}, {});
    revokeLessonId();
    const rRevId = assessMdc2060Lesson(validBridge, revokedLessonId);
    assertDisclaimers(rRevId);
    assert.equal(rRevId.passed, false);
    assert.deepEqual(rRevId.reasons, ["UNKNOWN_LESSON"]);

    const { proxy: revokedAdapters, revoke: revokeAdapters } = Proxy.revocable([], {});
    revokeAdapters();
    const rRevAdapters = assessMdc2060Lesson(validBridge, "MDC2060-LEARN-01", { adapters: revokedAdapters });
    assertDisclaimers(rRevAdapters);
    assert.equal(rRevAdapters.passed, false);
    assert.ok(rRevAdapters.reasons.includes("REPLAY_STATE_MISMATCH"));
  }

  // C2#2: LEARN-07 fails closed when inspecting safe HAI AU 18 or anchored VIETNAM TANKER 09 while dangerous PACIFIC STAR is active
  {
    // Safe HAI AU 18 (574009330, dangerous: false) via touch + short ENT
    let bSafe = bStep(validBridge, { kind: "press", control: "f2" });
    const haiPos = targetTouchCoords(bSafe, "574009330");
    bSafe = bStep(bSafe, { kind: "touch", control: "ppi_cursor", x: haiPos.x, y: haiPos.y, phase: "down" });
    bSafe = bTapHold(bSafe, "ent", 200);
    assert.equal(bSafe.devices[DEV].deviceState.overlay?.kind, "ais-info");
    assert.equal(bSafe.devices[DEV].deviceState.ais.selectedMmsi, "574009330");
    assert.equal(bSafe.devices[DEV].deviceState.ais.selectedTarget?.dangerous, false);
    const rSafe = assessMdc2060Lesson(bSafe, "MDC2060-LEARN-07");
    assertDisclaimers(rSafe);
    assert.equal(rSafe.passed, false);
    assert.ok(rSafe.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rSafe.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Anchored VIETNAM TANKER 09 (574007009, sogKn: 0, dangerous: false) via touch + short ENT
    let bAnchored = bStep(validBridge, { kind: "press", control: "f2" });
    const tankPos = targetTouchCoords(bAnchored, "574007009");
    bAnchored = bStep(bAnchored, { kind: "touch", control: "ppi_cursor", x: tankPos.x, y: tankPos.y, phase: "down" });
    bAnchored = bTapHold(bAnchored, "ent", 200);
    assert.equal(bAnchored.devices[DEV].deviceState.overlay?.kind, "ais-info");
    assert.equal(bAnchored.devices[DEV].deviceState.ais.selectedMmsi, "574007009");
    assert.equal(bAnchored.devices[DEV].deviceState.ais.selectedTarget?.dangerous, false);
    const rAnchored = assessMdc2060Lesson(bAnchored, "MDC2060-LEARN-07");
    assertDisclaimers(rAnchored);
    assert.equal(rAnchored.passed, false);
    assert.ok(rAnchored.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rAnchored.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Inspecting dangerous PACIFIC STAR, closing, then switching selection to safe HAI AU 18 fails WRONG_PROBE_aisDangerTarget
    let bSwitch = bStep(validBridge, { kind: "press", control: "f2" });
    const starPos = targetTouchCoords(bSwitch, "574002101");
    bSwitch = bStep(bSwitch, { kind: "touch", control: "ppi_cursor", x: starPos.x, y: starPos.y, phase: "down" });
    bSwitch = bTapHold(bSwitch, "ent", 200); // opens PACIFIC STAR
    bSwitch = bTapHold(bSwitch, "ent", 200); // closes ais-info
    bSwitch = bStep(bSwitch, { kind: "touch", control: "ppi_cursor", x: haiPos.x, y: haiPos.y, phase: "down" });
    bSwitch = bTapHold(bSwitch, "ent", 200); // opens HAI AU 18
    const rSwitch = assessMdc2060Lesson(bSwitch, "MDC2060-LEARN-07");
    assert.equal(rSwitch.passed, false);
    assert.ok(rSwitch.reasons.includes("WRONG_PROBE_aisDangerTarget"));
  }

  // C2#3: Close same-session startSeq > 0 & pre-startSeq carryover bypasses on LEARN-03, 04, 05, 06
  // 1) LEARN-03 same-session carryover: EBL1/VRM1 already ON before startSeq; cancelling IR edit + moving cursor MUST fail
  {
    let bSetup = bStep(validBridge, { kind: "press", control: "f1" });
    bSetup = bStep(bSetup, { kind: "pad", control: "cursorpad", direction: "right" });
    assert.equal(assessMdc2060Lesson(bSetup, "MDC2060-LEARN-03").passed, true);

    const seq = bSetup.history.length;
    const hash = bridgeSessionHash(bSetup);

    // Attack 4A: cancel unrelated IR edit + move cursor (never commits EBL1 or VRM1)
    let bCheat = bTapHold(bSetup, "menu", 200);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "down" }); // IR
    bCheat = bTapHold(bCheat, "ent", 200); // enter edit IR
    bCheat = bTapHold(bCheat, "menu", 200); // cancel edit
    bCheat = bTapHold(bCheat, "menu", 200); // close menu
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "down" });
    const rCheat = assessMdc2060Lesson(bCheat, "MDC2060-LEARN-03", { startSeq: seq, startSessionHash: hash });
    assert.equal(rCheat.passed, false);
    assert.ok(rCheat.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_ebl1On"));
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_vrm1On"));

    // Attack 4A-2: commit unrelated EXP item (2 ent presses) + move cursor MUST still fail!
    let bUnrel = bTapHold(bSetup, "menu", 200);
    bUnrel = bStep(bUnrel, { kind: "pad", control: "cursorpad", direction: "down" }); // IR
    bUnrel = bStep(bUnrel, { kind: "pad", control: "cursorpad", direction: "down" }); // EXP
    bUnrel = bTapHold(bUnrel, "ent", 200);
    bUnrel = bStep(bUnrel, { kind: "pad", control: "cursorpad", direction: "right" }); // EXP = "1"
    bUnrel = bTapHold(bUnrel, "ent", 200);
    bUnrel = bTapHold(bUnrel, "menu", 200);
    bUnrel = bStep(bUnrel, { kind: "pad", control: "cursorpad", direction: "down" });
    const rUnrel = assessMdc2060Lesson(bUnrel, "MDC2060-LEARN-03", { startSeq: seq, startSessionHash: hash });
    assert.equal(rUnrel.passed, false);
    assert.ok(rUnrel.reasons.includes("WRONG_PROBE_ebl1On"));
    assert.ok(rUnrel.reasons.includes("WRONG_PROBE_vrm1On"));

    // Genuine repeat attempt: toggle F1 OFF then ON + move cursor -> PASSES!
    let bRepeat = bStep(bSetup, { kind: "press", control: "f1" }); // OFF
    bRepeat = bStep(bRepeat, { kind: "press", control: "f1" });    // ON
    bRepeat = bStep(bRepeat, { kind: "pad", control: "cursorpad", direction: "down" });
    assert.equal(
      assessMdc2060Lesson(bRepeat, "MDC2060-LEARN-03", { startSeq: seq, startSessionHash: hash }).passed,
      true,
    );
  }

  // 2) LEARN-04 same-session carryover: FTC=4, IR="2" already set before startSeq; editing EXP/PROCESS MUST fail
  {
    let bSetup = bBootToTx(MDC2060_STORM_SCENARIO);
    bSetup = bTapHold(bSetup, "menu", 200, MDC2060_STORM_SCENARIO);
    bSetup = bTapHold(bSetup, "ent", 200, MDC2060_STORM_SCENARIO);
    for (let i = 0; i < 4; i++) {
      bSetup = bStep(bSetup, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
    }
    bSetup = bTapHold(bSetup, "ent", 200, MDC2060_STORM_SCENARIO); // FTC=4
    bSetup = bStep(bSetup, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO);
    bSetup = bTapHold(bSetup, "ent", 200, MDC2060_STORM_SCENARIO);
    bSetup = bStep(bSetup, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
    bSetup = bTapHold(bSetup, "ent", 200, MDC2060_STORM_SCENARIO); // IR="1"
    bSetup = bTapHold(bSetup, "menu", 200, MDC2060_STORM_SCENARIO);
    assert.equal(assessMdc2060Lesson(bSetup, "MDC2060-LEARN-04").passed, true);

    const seq = bSetup.history.length;
    const hash = bridgeSessionHash(bSetup);

    // Attack 4B: edit EXP & PROCESS (never touching FTC or IR)
    let bCheat = bTapHold(bSetup, "menu", 200, MDC2060_STORM_SCENARIO);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO); // IR
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO); // EXP
    bCheat = bTapHold(bCheat, "ent", 200, MDC2060_STORM_SCENARIO);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
    bCheat = bTapHold(bCheat, "ent", 200, MDC2060_STORM_SCENARIO); // commit EXP
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_STORM_SCENARIO); // PROCESS
    bCheat = bTapHold(bCheat, "ent", 200, MDC2060_STORM_SCENARIO);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_STORM_SCENARIO);
    bCheat = bTapHold(bCheat, "ent", 200, MDC2060_STORM_SCENARIO); // commit PROCESS
    const rCheat = assessMdc2060Lesson(bCheat, "MDC2060-LEARN-04", { startSeq: seq, startSessionHash: hash });
    assert.equal(rCheat.passed, false);
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_ftcMin"));
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_irEnabled"));
  }

  // 3) LEARN-05 pre-startSeq restore carryover: never committing MODE / SCREEN / TRAIL MUST fail
  {
    let bSetup = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    bSetup = bStep(bSetup, {
      kind: "restore-settings",
      settings: { presentationMode: "N-UP", screenMode: "PPI/PPI", trailMode: "T" },
    });
    bSetup = bStep(bSetup, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    bSetup = bTapHold(bSetup, "power", 200);
    bSetup = bStep(bSetup, { kind: "press", control: "stby_tx" });
    const seq = bSetup.history.length;
    const hash = bridgeSessionHash(bSetup);

    // Attack 4C: edit unrelated DISPLAY > COLOR (never commits MODE, SCREEN, or TRAIL MODE)
    let bCheat = bTapHold(bSetup, "menu", 200);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "right" }); // DISPLAY
    for (let i = 0; i < 6; i++) bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "down" }); // COLOR
    bCheat = bTapHold(bCheat, "ent", 200);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "right" }); // NIGHT
    bCheat = bTapHold(bCheat, "ent", 200);
    const rCheat = assessMdc2060Lesson(bCheat, "MDC2060-LEARN-05", { startSeq: seq, startSessionHash: hash });
    assert.equal(rCheat.passed, false);
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_presentationMode"));
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_trailMode"));
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_screenMode"));

    // Partial bypass: only commits MODE=N-UP, never commits SCREEN or TRAIL MODE
    let bPartial = bTapHold(bSetup, "menu", 200);
    bPartial = bStep(bPartial, { kind: "pad", control: "cursorpad", direction: "right" }); // DISPLAY
    bPartial = bTapHold(bPartial, "ent", 200);
    bPartial = bStep(bPartial, { kind: "pad", control: "cursorpad", direction: "right" });
    bPartial = bStep(bPartial, { kind: "pad", control: "cursorpad", direction: "left" }); // back to N-UP
    bPartial = bTapHold(bPartial, "ent", 200);
    const rPartial = assessMdc2060Lesson(bPartial, "MDC2060-LEARN-05", { startSeq: seq, startSessionHash: hash });
    assert.equal(rPartial.passed, false);
    assert.ok(rPartial.reasons.includes("WRONG_PROBE_trailMode"));
    assert.ok(rPartial.reasons.includes("WRONG_PROBE_screenMode"));
  }

  // 4) LEARN-06 pre-startSeq restore carryover & already-acknowledged repeat MUST fail without configuring ALARM & silencing audible alarm
  {
    let bSetup = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    bSetup = bStep(bSetup, { kind: "restore-settings", settings: { alarmMode: "IN" } });
    bSetup = bStep(bSetup, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    bSetup = bTapHold(bSetup, "power", 200);
    bSetup = bStep(bSetup, { kind: "press", control: "stby_tx" });
    const seq = bSetup.history.length;
    const hash = bridgeSessionHash(bSetup);

    // Attack 4D: never opens ALARM menu; edits unrelated DISPLAY > COLOR and presses alarm_ack
    let bCheat = bTapHold(bSetup, "menu", 200);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "right" }); // DISPLAY
    bCheat = bTapHold(bCheat, "ent", 200);
    bCheat = bStep(bCheat, { kind: "pad", control: "cursorpad", direction: "right" });
    bCheat = bTapHold(bCheat, "ent", 200);
    bCheat = bStep(bCheat, { kind: "press", control: "alarm_ack" });
    const rCheat = assessMdc2060Lesson(bCheat, "MDC2060-LEARN-06", { startSeq: seq, startSessionHash: hash });
    assert.equal(rCheat.passed, false);
    assert.ok(rCheat.reasons.includes("WRONG_PROBE_alarmMode"));

    // Attack 4D-2: alarm already acknowledged BEFORE startSeq -> re-committing ALARM=IN without triggering audible alarm + alarm_ack MUST fail!
    const bAckedBefore = bStep(bSetup, { kind: "press", control: "alarm_ack" });
    const seqAcked = bAckedBefore.history.length;
    const hashAcked = bridgeSessionHash(bAckedBefore);
    let bNoSound = bTapHold(bAckedBefore, "menu", 200);
    for (let i = 0; i < 3; i++) bNoSound = bStep(bNoSound, { kind: "pad", control: "cursorpad", direction: "right" }); // ALARM
    bNoSound = bTapHold(bNoSound, "ent", 200);
    bNoSound = bStep(bNoSound, { kind: "pad", control: "cursorpad", direction: "right" }); // OUT
    bNoSound = bStep(bNoSound, { kind: "pad", control: "cursorpad", direction: "left" });  // back to IN
    bNoSound = bTapHold(bNoSound, "ent", 200); // stays acknowledged -> audible=false!
    bNoSound = bStep(bNoSound, { kind: "press", control: "alarm_ack" });
    const rNoSound = assessMdc2060Lesson(bNoSound, "MDC2060-LEARN-06", {
      startSeq: seqAcked,
      startSessionHash: hashAcked,
    });
    assert.equal(rNoSound.passed, false);
    assert.ok(rNoSound.reasons.includes("WRONG_PROBE_alarmAudible"));

    // Genuine repeat: toggle ALARM OFF then IN (re-triggers audible) then alarm_ack -> PASSES!
    let bLegitRepeat = bTapHold(bAckedBefore, "menu", 200);
    for (let i = 0; i < 3; i++) bLegitRepeat = bStep(bLegitRepeat, { kind: "pad", control: "cursorpad", direction: "right" }); // ALARM
    bLegitRepeat = bTapHold(bLegitRepeat, "ent", 200);
    bLegitRepeat = bStep(bLegitRepeat, { kind: "pad", control: "cursorpad", direction: "left" }); // OFF
    bLegitRepeat = bTapHold(bLegitRepeat, "ent", 200);
    bLegitRepeat = bTapHold(bLegitRepeat, "ent", 200);
    bLegitRepeat = bStep(bLegitRepeat, { kind: "pad", control: "cursorpad", direction: "right" }); // IN (audible=true!)
    bLegitRepeat = bTapHold(bLegitRepeat, "ent", 200);
    bLegitRepeat = bStep(bLegitRepeat, { kind: "press", control: "alarm_ack" });
    assert.equal(
      assessMdc2060Lesson(bLegitRepeat, "MDC2060-LEARN-06", {
        startSeq: seqAcked,
        startSessionHash: hashAcked,
      }).passed,
      true,
    );
  }

  // C2#4: LEARN-01 rejects leaving BRILL dialog open after booting to TX
  {
    const bBrillOpen = bTapHold(validBridge, "power", 200);
    assert.equal(bBrillOpen.devices[DEV].deviceState.overlay?.kind, "brill");
    const rOpen = assessMdc2060Lesson(bBrillOpen, "MDC2060-LEARN-01");
    assertDisclaimers(rOpen);
    assert.equal(rOpen.passed, false);
    assert.ok(rOpen.reasons.includes("WRONG_PROBE_dialog"));

    // Closing BRILL dialog via short power restores dialog=null and passes
    const bBrillClosed = bTapHold(bBrillOpen, "power", 200);
    assert.equal(bBrillClosed.devices[DEV].deviceState.overlay, null);
    const rClosed = assessMdc2060Lesson(bBrillClosed, "MDC2060-LEARN-01");
    assert.equal(rClosed.passed, true);
  }
});

test("Regression (Iter 4): LEARN-06 cross-alarm spoof, LEARN-07 threshold-lowering bypasses, LEARN-01 BRILL ent/menu dismiss & startSeq -0", () => {
  const validBridge = bBootToTx();

  // 1) LEARN-06 (R2-1 & C2#2): Unrelated AIS_CPA_DANGER or ATA_CPA_DANGER buzzers MUST NOT spoof Guard Zone silencing
  {
    let bSetup = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    bSetup = bStep(bSetup, { kind: "restore-settings", settings: { alarmMode: "IN" } });
    bSetup = bStep(bSetup, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    bSetup = bTapHold(bSetup, "power", 200);
    bSetup = bStep(bSetup, { kind: "press", control: "stby_tx" });
    bSetup = bStep(bSetup, { kind: "press", control: "alarm_ack" }); // guardZone.audible=false before startSeq
    assert.equal(bSetup.devices[DEV].deviceState.guardZone.audible, false);
    assert.equal(bSetup.devices[DEV].deviceState.alarms.audible, false);
    const seqAcked = bSetup.history.length;
    const hashAcked = bridgeSessionHash(bSetup);

    // Variant A: spoof via MENU > AIS > CPA ALARM (OFF -> ON raises AIS_CPA_DANGER) + no-op ALARM > MODE = IN + alarm_ack
    let bAisSpoof = bTapHold(bSetup, "menu", 200);
    for (let i = 0; i < 5; i++) bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "right" }); // AIS
    for (let i = 0; i < 3; i++) bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "down" }); // CPA ALARM
    bAisSpoof = bTapHold(bAisSpoof, "ent", 200);
    bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "left" }); // OFF
    bAisSpoof = bTapHold(bAisSpoof, "ent", 200);
    bAisSpoof = bTapHold(bAisSpoof, "ent", 200);
    bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "right" }); // ON -> raises AIS_CPA_DANGER!
    bAisSpoof = bTapHold(bAisSpoof, "ent", 200);
    assert.ok(bAisSpoof.devices[DEV].deviceState.alarms.activeIds.includes("AIS_CPA_DANGER"));
    assert.equal(bAisSpoof.devices[DEV].deviceState.alarms.audible, true);
    assert.equal(bAisSpoof.devices[DEV].deviceState.guardZone.audible, false);
    // Navigate left 2 groups to ALARM > MODE and re-commit IN (no-op; guardZone.audible stays false)
    bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "left" }); // ATA
    bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "left" }); // ALARM (item 0: MODE)
    bAisSpoof = bTapHold(bAisSpoof, "ent", 200);
    bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "right" }); // OUT
    bAisSpoof = bStep(bAisSpoof, { kind: "pad", control: "cursorpad", direction: "left" }); // IN
    bAisSpoof = bTapHold(bAisSpoof, "ent", 200);
    assert.equal(bAisSpoof.devices[DEV].deviceState.guardZone.audible, false);
    assert.equal(bAisSpoof.devices[DEV].deviceState.alarms.audible, true);
    bAisSpoof = bStep(bAisSpoof, { kind: "press", control: "alarm_ack" });
    assert.equal(bAisSpoof.devices[DEV].deviceState.alarms.audible, false);
    const rAisSpoof = assessMdc2060Lesson(bAisSpoof, "MDC2060-LEARN-06", {
      startSeq: seqAcked,
      startSessionHash: hashAcked,
    });
    assertDisclaimers(rAisSpoof);
    assert.equal(rAisSpoof.passed, false);
    assert.ok(rAisSpoof.reasons.includes("WRONG_PROBE_guardZoneAudible"));
    assert.ok(rAisSpoof.reasons.includes("WRONG_PROBE_alarmAudible"));

    // Variant B: spoof via MENU > ATA > ACQ + 6 ticks (raises ATA_CPA_DANGER) + no-op ALARM > MODE = IN + alarm_ack
    let bAtaSpoof = bTapHold(bSetup, "menu", 200);
    for (let i = 0; i < 4; i++) bAtaSpoof = bStep(bAtaSpoof, { kind: "pad", control: "cursorpad", direction: "right" }); // ATA
    bAtaSpoof = bTapHold(bAtaSpoof, "ent", 200); // ACQ PACIFIC STAR (closes menu)
    bAtaSpoof = bStep(bAtaSpoof, { kind: "tick", steps: 6 }); // stabilizes -> ATA_CPA_DANGER audible=true
    assert.ok(bAtaSpoof.devices[DEV].deviceState.alarms.activeIds.includes("ATA_CPA_DANGER"));
    assert.equal(bAtaSpoof.devices[DEV].deviceState.alarms.audible, true);
    assert.equal(bAtaSpoof.devices[DEV].deviceState.guardZone.audible, false);
    bAtaSpoof = bTapHold(bAtaSpoof, "menu", 200);
    for (let i = 0; i < 3; i++) bAtaSpoof = bStep(bAtaSpoof, { kind: "pad", control: "cursorpad", direction: "right" }); // ALARM
    bAtaSpoof = bTapHold(bAtaSpoof, "ent", 200);
    bAtaSpoof = bStep(bAtaSpoof, { kind: "pad", control: "cursorpad", direction: "right" }); // OUT
    bAtaSpoof = bStep(bAtaSpoof, { kind: "pad", control: "cursorpad", direction: "left" }); // IN
    bAtaSpoof = bTapHold(bAtaSpoof, "ent", 200);
    bAtaSpoof = bStep(bAtaSpoof, { kind: "press", control: "alarm_ack" });
    const rAtaSpoof = assessMdc2060Lesson(bAtaSpoof, "MDC2060-LEARN-06", {
      startSeq: seqAcked,
      startSessionHash: hashAcked,
    });
    assertDisclaimers(rAtaSpoof);
    assert.equal(rAtaSpoof.passed, false);
    assert.ok(rAtaSpoof.reasons.includes("WRONG_PROBE_guardZoneAudible"));
    assert.ok(rAtaSpoof.reasons.includes("WRONG_PROBE_alarmAudible"));
  }

  // 2) LEARN-07 (C2#1): Lowering CPA LIMIT / TCPA LIMIT / AIS FILTER RNG to erase PACIFIC STAR MUST fail closed
  {
    function openAisInfoViaMenu(bridge) {
      let cur = bTapHold(bridge, "menu", 200);
      for (let i = 0; i < 5; i++) cur = bStep(cur, { kind: "pad", control: "cursorpad", direction: "right" }); // AIS
      cur = bStep(cur, { kind: "pad", control: "cursorpad", direction: "down" }); // FILTER RNG
      cur = bStep(cur, { kind: "pad", control: "cursorpad", direction: "down" }); // INFO
      cur = bTapHold(cur, "ent", 200);
      return cur;
    }

    function lowerCpaLimitTo01(bridge) {
      let cur = bTapHold(bridge, "menu", 200);
      for (let i = 0; i < 4; i++) cur = bStep(cur, { kind: "pad", control: "cursorpad", direction: "right" }); // ATA
      for (let i = 0; i < 4; i++) cur = bStep(cur, { kind: "pad", control: "cursorpad", direction: "down" }); // CPA LIMIT
      cur = bTapHold(cur, "ent", 200);
      for (let i = 0; i < 4; i++) cur = bStep(cur, { kind: "pad", control: "cursorpad", direction: "left" }); // 0.5 -> 0.1 NM
      cur = bTapHold(cur, "ent", 200);
      cur = bTapHold(cur, "menu", 200);
      return cur;
    }

    // Attack 2X-A: Lower ATA > CPA LIMIT (0.5 -> 0.1 NM) in TX from startSeq=0, inspect HAI AU 18
    let bCpaTx = lowerCpaLimitTo01(validBridge);
    assert.equal(bCpaTx.devices[DEV].deviceState.settings.ataCpaLimitNm, 0.1);
    assert.deepEqual(bCpaTx.devices[DEV].deviceState.ais.dangerousMmsis, []);
    bCpaTx = bStep(bCpaTx, { kind: "press", control: "f2" });
    bCpaTx = openAisInfoViaMenu(bCpaTx);
    assert.equal(bCpaTx.devices[DEV].deviceState.ais.selectedMmsi, "574009330"); // HAI AU 18
    const rCpaTx = assessMdc2060Lesson(bCpaTx, "MDC2060-LEARN-07");
    assertDisclaimers(rCpaTx);
    assert.equal(rCpaTx.passed, false);
    assert.ok(rCpaTx.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rCpaTx.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Attack 2X-A2: Lower ATA > CPA LIMIT (0.5 -> 0.1 NM) in STANDBY before stby_tx, then F2 + AIS INFO
    let bStby = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    bStby = bStep(bStby, { kind: "training-fixture", fixture: "fastPreheat", enabled: true });
    bStby = bTapHold(bStby, "power", 200);
    bStby = bStep(bStby, { kind: "tick", steps: 5 });
    assert.equal(bStby.devices[DEV].deviceState.powerMode, "standby");
    bStby = lowerCpaLimitTo01(bStby);
    bStby = bStep(bStby, { kind: "press", control: "stby_tx" });
    bStby = bStep(bStby, { kind: "press", control: "f2" });
    bStby = openAisInfoViaMenu(bStby);
    assert.equal(bStby.devices[DEV].deviceState.ais.selectedMmsi, "574009330");
    const rCpaStby = assessMdc2060Lesson(bStby, "MDC2060-LEARN-07");
    assertDisclaimers(rCpaStby);
    assert.equal(rCpaStby.passed, false);
    assert.ok(rCpaStby.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rCpaStby.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Attack 2X-B: Lower AIS > FILTER RNG (12 -> 2 NM) to hide PACIFIC STAR (4.05 NM)
    let bFilter = bTapHold(validBridge, "menu", 200);
    for (let i = 0; i < 5; i++) bFilter = bStep(bFilter, { kind: "pad", control: "cursorpad", direction: "right" }); // AIS
    bFilter = bStep(bFilter, { kind: "pad", control: "cursorpad", direction: "down" }); // FILTER RNG
    bFilter = bTapHold(bFilter, "ent", 200);
    for (let i = 0; i < 10; i++) bFilter = bStep(bFilter, { kind: "pad", control: "cursorpad", direction: "left" }); // 12 -> 2 NM
    bFilter = bTapHold(bFilter, "ent", 200);
    bFilter = bTapHold(bFilter, "menu", 200);
    assert.equal(bFilter.devices[DEV].deviceState.settings.aisFilterRangeNm, 2);
    assert.deepEqual(bFilter.devices[DEV].deviceState.ais.dangerousMmsis, []);
    bFilter = bStep(bFilter, { kind: "press", control: "f2" });
    bFilter = openAisInfoViaMenu(bFilter);
    assert.equal(bFilter.devices[DEV].deviceState.ais.selectedMmsi, "574009330");
    const rFilter = assessMdc2060Lesson(bFilter, "MDC2060-LEARN-07");
    assertDisclaimers(rFilter);
    assert.equal(rFilter.passed, false);
    assert.ok(rFilter.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rFilter.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Attack 2X-C: Lower ATA > TCPA LIMIT (15 -> 5 min) so PACIFIC STAR (tcpa ~10.9m) drops out of dangerousMmsis
    let bTcpa = bTapHold(validBridge, "menu", 200);
    for (let i = 0; i < 4; i++) bTcpa = bStep(bTcpa, { kind: "pad", control: "cursorpad", direction: "right" }); // ATA
    for (let i = 0; i < 5; i++) bTcpa = bStep(bTcpa, { kind: "pad", control: "cursorpad", direction: "down" }); // TCPA LIMIT
    bTcpa = bTapHold(bTcpa, "ent", 200);
    for (let i = 0; i < 10; i++) bTcpa = bStep(bTcpa, { kind: "pad", control: "cursorpad", direction: "left" }); // 15 -> 5 min
    bTcpa = bTapHold(bTcpa, "ent", 200);
    bTcpa = bTapHold(bTcpa, "menu", 200);
    assert.equal(bTcpa.devices[DEV].deviceState.settings.ataTcpaLimitMin, 5);
    assert.deepEqual(bTcpa.devices[DEV].deviceState.ais.dangerousMmsis, []);
    bTcpa = bStep(bTcpa, { kind: "press", control: "f2" });
    bTcpa = openAisInfoViaMenu(bTcpa);
    assert.equal(bTcpa.devices[DEV].deviceState.ais.selectedMmsi, "574009330");
    const rTcpa = assessMdc2060Lesson(bTcpa, "MDC2060-LEARN-07");
    assertDisclaimers(rTcpa);
    assert.equal(rTcpa.passed, false);
    assert.ok(rTcpa.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rTcpa.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Attack 2X-D: Lower CPA LIMIT -> inspect HAI AU 18 -> restore CPA LIMIT (0.1 -> 0.5 NM) MUST still fail
    let bRestore = bTapHold(bCpaTx, "ent", 200); // close ais-info
    bRestore = bTapHold(bRestore, "menu", 200);
    for (let i = 0; i < 4; i++) bRestore = bStep(bRestore, { kind: "pad", control: "cursorpad", direction: "right" });
    for (let i = 0; i < 4; i++) bRestore = bStep(bRestore, { kind: "pad", control: "cursorpad", direction: "down" });
    bRestore = bTapHold(bRestore, "ent", 200);
    for (let i = 0; i < 4; i++) bRestore = bStep(bRestore, { kind: "pad", control: "cursorpad", direction: "right" }); // back to 0.5 NM
    bRestore = bTapHold(bRestore, "ent", 200);
    bRestore = bTapHold(bRestore, "menu", 200);
    assert.equal(bRestore.devices[DEV].deviceState.settings.ataCpaLimitNm, 0.5);
    const rRestore = assessMdc2060Lesson(bRestore, "MDC2060-LEARN-07");
    assert.equal(rRestore.passed, false);
    assert.ok(rRestore.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rRestore.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Attack 2X-E: Pre-startSeq lowered CPA LIMIT (0.1 NM) MUST still enforce baseline floor (0.5 NM)
    let bPreLower = createBridgeSession(ADAPTERS, MDC2060_COASTAL_SCENARIO);
    bPreLower = bStep(bPreLower, { kind: "restore-settings", settings: { ataCpaLimitNm: 0.1 } });
    bPreLower = bStep(bPreLower, { kind: "training-fixture", fixture: "skipPreheat", enabled: true });
    bPreLower = bTapHold(bPreLower, "power", 200);
    bPreLower = bStep(bPreLower, { kind: "press", control: "stby_tx" });
    const preLowerSeq = bPreLower.history.length;
    const preLowerHash = bridgeSessionHash(bPreLower);
    let bPreTry = bStep(bPreLower, { kind: "press", control: "f2" });
    bPreTry = openAisInfoViaMenu(bPreTry);
    assert.equal(bPreTry.devices[DEV].deviceState.ais.selectedMmsi, "574009330");
    const rPreLower = assessMdc2060Lesson(bPreTry, "MDC2060-LEARN-07", {
      startSeq: preLowerSeq,
      startSessionHash: preLowerHash,
    });
    assert.equal(rPreLower.passed, false);
    assert.ok(rPreLower.reasons.includes("WRONG_PROBE_aisSelected"));
    assert.ok(rPreLower.reasons.includes("WRONG_PROBE_aisDangerTarget"));

    // Legitimate coastal PACIFIC STAR & DEFAULT_BRIDGE_WORLD_SCENARIO (dangerousMmsis: []) still PASS
    let bCoastalOk = bStep(validBridge, { kind: "press", control: "f2" });
    bCoastalOk = openAisInfoViaMenu(bCoastalOk);
    assert.equal(bCoastalOk.devices[DEV].deviceState.ais.selectedMmsi, "574002101");
    assert.equal(assessMdc2060Lesson(bCoastalOk, "MDC2060-LEARN-07").passed, true);

    let bDefaultOk = bBootToTx(MDC2060_BRIDGE_SYNC_SCENARIO);
    assert.deepEqual(bDefaultOk.devices[DEV].deviceState.ais.dangerousMmsis, []);
    bDefaultOk = bStep(bDefaultOk, { kind: "press", control: "f2" }, MDC2060_BRIDGE_SYNC_SCENARIO);
    bDefaultOk = bTapHold(bDefaultOk, "menu", 200, MDC2060_BRIDGE_SYNC_SCENARIO);
    for (let i = 0; i < 5; i++) {
      bDefaultOk = bStep(bDefaultOk, { kind: "pad", control: "cursorpad", direction: "right" }, MDC2060_BRIDGE_SYNC_SCENARIO);
    }
    bDefaultOk = bStep(bDefaultOk, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_BRIDGE_SYNC_SCENARIO);
    bDefaultOk = bStep(bDefaultOk, { kind: "pad", control: "cursorpad", direction: "down" }, MDC2060_BRIDGE_SYNC_SCENARIO);
    bDefaultOk = bTapHold(bDefaultOk, "ent", 200, MDC2060_BRIDGE_SYNC_SCENARIO);
    assert.equal(assessMdc2060Lesson(bDefaultOk, "MDC2060-LEARN-07").passed, true);
  }

  // 3) LEARN-01 (C2#3): Closing open BRILL via short ent or short menu PASSES, while stray/long ent/menu FAILS
  {
    const bBrillOpen = bTapHold(validBridge, "power", 200);
    assert.equal(bBrillOpen.devices[DEV].deviceState.overlay?.kind, "brill");

    // Short ent closes BRILL -> PASSES
    const bEntClose = bTapHold(bBrillOpen, "ent", 200);
    assert.equal(bEntClose.devices[DEV].deviceState.overlay, null);
    const rEntClose = assessMdc2060Lesson(bEntClose, "MDC2060-LEARN-01");
    assertDisclaimers(rEntClose);
    assert.equal(rEntClose.passed, true);

    // Short menu closes BRILL -> PASSES
    const bMenuClose = bTapHold(bBrillOpen, "menu", 200);
    assert.equal(bMenuClose.devices[DEV].deviceState.overlay, null);
    const rMenuClose = assessMdc2060Lesson(bMenuClose, "MDC2060-LEARN-01");
    assertDisclaimers(rMenuClose);
    assert.equal(rMenuClose.passed, true);

    // ui-tick(6000) auto-closes BRILL -> PASSES
    const bTimeoutClose = bStep(bBrillOpen, { kind: "ui-tick", elapsedMs: 6000 });
    assert.equal(bTimeoutClose.devices[DEV].deviceState.overlay, null);
    assert.equal(assessMdc2060Lesson(bTimeoutClose, "MDC2060-LEARN-01").passed, true);

    // Long ent (>1200ms) while BRILL open -> FAILS UNEXPECTED_OPERATOR_ACTIONS + WRONG_PROBE_dialog
    const bLongEnt = bTapHold(bBrillOpen, "ent", 1500);
    const rLongEnt = assessMdc2060Lesson(bLongEnt, "MDC2060-LEARN-01");
    assert.equal(rLongEnt.passed, false);
    assert.ok(rLongEnt.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));
    assert.ok(rLongEnt.reasons.includes("WRONG_PROBE_dialog"));

    // Long menu (>1500ms) while BRILL open -> FAILS UNEXPECTED_OPERATOR_ACTIONS + WRONG_PROBE_dialog
    const bLongMenu = bTapHold(bBrillOpen, "menu", 1800);
    const rLongMenu = assessMdc2060Lesson(bLongMenu, "MDC2060-LEARN-01");
    assert.equal(rLongMenu.passed, false);
    assert.ok(rLongMenu.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));
    assert.ok(rLongMenu.reasons.includes("WRONG_PROBE_dialog"));

    // Stray short ent when overlay === null -> FAILS UNEXPECTED_OPERATOR_ACTIONS
    const bStrayEnt = bTapHold(validBridge, "ent", 200);
    const rStrayEnt = assessMdc2060Lesson(bStrayEnt, "MDC2060-LEARN-01");
    assert.equal(rStrayEnt.passed, false);
    assert.ok(rStrayEnt.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));

    // Stray short menu when overlay === null -> FAILS UNEXPECTED_OPERATOR_ACTIONS
    const bStrayMenu = bTapHold(validBridge, "menu", 200);
    const rStrayMenu = assessMdc2060Lesson(bStrayMenu, "MDC2060-LEARN-01");
    assert.equal(rStrayMenu.passed, false);
    assert.ok(rStrayMenu.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));
  }

  // 4) startSeq: -0 normalization (C2#4): Object.is(res.startSeq, 0) === true, never -0
  {
    const rNegZero = assessMdc2060Lesson(validBridge, "MDC2060-LEARN-01", { startSeq: -0 });
    assertDisclaimers(rNegZero);
    assert.equal(rNegZero.passed, true);
    assert.equal(Object.is(rNegZero.startSeq, 0), true);
    assert.equal(Object.is(rNegZero.startSeq, -0), false);

    const rNegZeroFail = assessMdc2060Lesson(validBridge, "MDC2060-LEARN-07", {
      startSeq: -0,
      baselineAtaCount: 999,
    });
    assertDisclaimers(rNegZeroFail);
    assert.equal(rNegZeroFail.passed, false);
    assert.equal(Object.is(rNegZeroFail.startSeq, 0), true);
    assert.equal(Object.is(rNegZeroFail.startSeq, -0), false);
  }
});
