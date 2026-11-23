import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {createSession, dispatch, createReplayEnvelope, sessionHash} from "../src/core/session.mjs";
import {
  TRAINING_SCENARIO, observeSounder, observeTrainingStatus, effectiveGain,
  sounderSourceRowForDepth, makeEchoFrame, advanceWorld, initialWorldState,
  projectSyntheticSeabedProvenance, projectSyntheticSounderSourceIdentity,
} from "../src/core/scenario.mjs";
import {FCV588_TRAINING_LESSONS, assessFcvLesson} from "../src/core/lessons.mjs";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {getFcvReplayAdapter, replayFcv588Envelope} from "../src/devices/fcv588/replay-compat.mjs";
import {
  encodeFcvSettings, decodeFcvSettings, decodeFcvProfile20Settings,
  decodeFcvProfile22Settings, decodeFcvProfile23Settings,
} from "../src/devices/fcv588/settings.mjs";
import {fingerprint} from "../src/core/protocol.mjs";
import {projectFcvEcho, projectFcvZoom, advanceFcvPictureHistory} from "../src/devices/fcv588/echo-projection.mjs";
import {projectFcvManualNavBoxes} from "../src/devices/fcv588/navigation.mjs";
import {projectFcvTrainingReceiver} from "../src/devices/fcv588/receiver-status.mjs";

const bootSession = (initialSettings = null) => {
  let s = createSession(FCV588_ADAPTER, TRAINING_SCENARIO);
  if (initialSettings) {
    s = dispatch(s, FCV588_ADAPTER, {kind: "restore-settings", settings: initialSettings}, TRAINING_SCENARIO);
  }
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "up", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "tick", steps: 4}, TRAINING_SCENARIO);
  return s;
};

test("BUG-01: autoGainOffset (-5..+5) visibly scales effectiveGain and sonar echo pixels", () => {
  const base = initialFcv588State();
  const low = {...base, power: "on", gainMode: "fishing", autoGainOffset: -5};
  const mid = {...base, power: "on", gainMode: "fishing", autoGainOffset: 0};
  const high = {...base, power: "on", gainMode: "fishing", autoGainOffset: 5};
  assert.ok(effectiveGain(low) < effectiveGain(mid));
  assert.equal(effectiveGain(mid), 6.5);
  assert.ok(effectiveGain(high) > effectiveGain(mid));
  const obs = observeSounder(TRAINING_SCENARIO, initialWorldState(TRAINING_SCENARIO), {columns: 32, rows: 121});
  const lowFrame = makeEchoFrame(obs, low, {rows: 60, frequencyKhz: 50});
  const highFrame = makeEchoFrame(obs, high, {rows: 60, frequencyKhz: 50});
  assert.notDeepEqual(lowFrame.pixels, highFrame.pixels);
});

test("BUG-03: columnSeconds=1 aligns live 1x scroll history with projection reset (zero target jump)", () => {
  const state = {
    ...initialFcv588State(),
    power: "on",
    trainingFixture: {virtualMounting: true, navigation: true, tankenmaruOption: false, lowBattery: false, systemError: false},
    syntheticConditions: {depthM: 49.6, speedKn: 7, bottomClassification: null, mountCompatible: true, mountAligned: true},
    settings: {...initialFcv588State().settings, transducer: "525STID-PWD", accuFish: "On"},
  };
  let world = initialWorldState(TRAINING_SCENARIO);
  let history = null;
  for (let t = 0; t <= 60; t++) {
    if (t > 0) world = advanceWorld(TRAINING_SCENARIO, world, 1);
    const obs = observeSounder(TRAINING_SCENARIO, world, {columns: 160, rows: 301, columnSeconds: 1});
    const frame = projectFcvEcho(obs, state, {frequencyKhz: 50, rows: 120});
    history = advanceFcvPictureHistory(history, frame, state, t);
  }
  const beforeResetX = history.syntheticFish.find(f => f.sizeCm === 31)?.xFraction;
  assert.ok(Number.isFinite(beforeResetX), "31 cm target visible before setting change");
  // Change autoGainOffset to trigger projectionKey reset
  const changedState = {...state, autoGainOffset: 1};
  const obsReset = observeSounder(TRAINING_SCENARIO, world, {columns: 160, rows: 301, columnSeconds: 1});
  const frameReset = projectFcvEcho(obsReset, changedState, {frequencyKhz: 50, rows: 120});
  const afterReset = advanceFcvPictureHistory(history, frameReset, changedState, 60);
  const afterResetX = afterReset.syntheticFish.find(f => f.sizeCm === 31)?.xFraction;
  assert.ok(Math.abs(afterResetX - beforeResetX) < 1e-9,
    `target X must not jump on projectionKey reset (before=${beforeResetX}, after=${afterResetX})`);
});

test("BUG-04, BUG-10, BUG-11: modal overlays isolate stray hardware keys and Auto Gain rotate updates dialog draft", () => {
  let s = bootSession();
  s = dispatch(s, FCV588_ADAPTER, {kind: "press", control: "menu"}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.overlay?.kind, "menu");
  for (const stray of [
    {kind: "press", control: "range"},
    {kind: "push", control: "gain"},
    {kind: "rotate", control: "gain", steps: 2},
    {kind: "rotate", control: "mode", steps: 1},
  ]) {
    s = dispatch(s, FCV588_ADAPTER, stray, TRAINING_SCENARIO);
    assert.equal(s.deviceState.overlay?.kind, "menu");
    assert.equal(s.deviceState.autoGainOffset, 0);
  }
  s = dispatch(s, FCV588_ADAPTER, {kind: "press", control: "menu"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "push", control: "gain"}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.overlay?.kind, "gain");
  s = dispatch(s, FCV588_ADAPTER, {kind: "rotate", control: "gain", steps: 3}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.overlay?.offset, 3);
  s = dispatch(s, FCV588_ADAPTER, {kind: "press", control: "enter"}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.autoGainOffset, 3);

  s = dispatch(s, FCV588_ADAPTER, {kind: "press", control: "menu"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.overlay?.kind, "power-hold");
  s = dispatch(s, FCV588_ADAPTER, {kind: "press", control: "range"}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.overlay?.kind, "power-hold");
  assert.equal(s.deviceState.overlay?.priorOverlay?.kind, "menu");
  s = dispatch(s, FCV588_ADAPTER, {kind: "ui-tick", elapsedMs: 3250}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.power, "off");
});

test("BUG-05, BUG-12, BUG-13, BUG-15: calibration, periodic fish, dynamic bottomType, P23 zoom resolution, and row clamp", () => {
  const obs = observeSounder(TRAINING_SCENARIO, initialWorldState(TRAINING_SCENARIO), {columns: 16, rows: 301});
  assert.equal(sounderSourceRowForDepth(obs, -5), 0);

  const w68 = advanceWorld(TRAINING_SCENARIO, initialWorldState(TRAINING_SCENARIO), 68);
  const status68 = observeTrainingStatus(TRAINING_SCENARIO, w68);
  assert.equal(status68.fishPresent, true, "fish school recurs at t=68 (8 + 60s cycle)");

  const mudScenario = {
    ...TRAINING_SCENARIO,
    bottomClassification: Object.freeze({
      sourceClass: "SYNTHETIC_FIXTURE",
      classes: Object.freeze({Mud: 0.8, Sand: 0.1, Gravel: 0.05, Rock: 0.05}),
    }),
  };
  assert.equal(observeTrainingStatus(mudScenario, initialWorldState(mudScenario)).bottomType, "Mud");

  let s = bootSession({draft: "5", tempAdjust: "2", speedAdjust: "10", speedUnit: "km/h"});
  s = dispatch(s, FCV588_ADAPTER, {kind: "training-fixture", fixture: "navigation", enabled: true}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "tick", steps: 1}, TRAINING_SCENARIO);
  const nav2 = projectFcvManualNavBoxes({
    mode: "NAV2",
    simTick: s.worldState.simTick,
    sample: s.deviceState.navigationObservation,
    navState: s.deviceState.navigation,
    settings: s.deviceState.settings,
    sonarDepthM: s.worldState.bottomDepthM,
  });
  const tempBox = nav2.boxes.find(b => /Temp/i.test(b.label));
  assert.match(tempBox?.value ?? "", /20\.0/);
  const depthBox = nav2.boxes.find(b => /Depth/i.test(b.label));
  assert.ok((depthBox?.value ?? "").includes((s.worldState.bottomDepthM + 5).toFixed(1)));
  const rx = projectFcvTrainingReceiver(s.deviceState, s.worldState.simTick);
  assert.match(JSON.stringify(rx), /km\/h/);

  const w24 = advanceWorld(TRAINING_SCENARIO, initialWorldState(TRAINING_SCENARIO), 24);
  const obs24 = observeSounder(TRAINING_SCENARIO, w24, {columns: 48, rows: 301});
  const prov24 = projectSyntheticSeabedProvenance(TRAINING_SCENARIO, w24, {columns: 48});
  const id24 = projectSyntheticSounderSourceIdentity(TRAINING_SCENARIO, w24, {columns: 48});
  const fishState = {
    ...s.deviceState,
    trainingFixture: {virtualMounting: true, navigation: true, tankenmaruOption: false, lowBattery: false, systemError: false},
    syntheticConditions: {...s.deviceState.syntheticConditions, mountCompatible: true, mountAligned: true},
    settings: {...s.deviceState.settings, transducer: "525STID-PWD", accuFish: "On", zoomMode: "Marker Zoom", zoomRange: "20", fishSizeAdjust: "50"},
    vrmDepthM: 29,
  };
  const zoomP23 = projectFcvZoom(obs24, fishState, {
    frequencyKhz: 50, rows: 120, seabedProvenance: prov24, seabedSourceIdentity: id24, displayContract: "P23_LOWER_BOTTOM",
  });
  assert.ok(zoomP23.syntheticFish.some(f => f.sizeCm === 65), "fishSizeAdjust +50% scales 43 cm target to 65 cm in Zoom");
});

test("BUG-09 & BUG-20: LEARN-07 passes from powered-off start and settings codec imports profile20 & profile22", () => {
  const learn07 = FCV588_TRAINING_LESSONS.find(l => l.id === "FCV588-LEARN-07");
  assert.ok(learn07);
  let s = createSession(FCV588_ADAPTER, TRAINING_SCENARIO);
  const startSeq = s.events.length;
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "cancel", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "up", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "tick", steps: 4}, TRAINING_SCENARIO);
  // First short POWER press opens BRILL (9), second short POWER press steps 9 -> 8, ENTER saves
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "up", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "up", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "press", control: "enter"}, TRAINING_SCENARIO);
  assert.equal(s.deviceState.brightness, 8);
  const grade = assessFcvLesson(s, learn07.id, {startSeq});
  assert.equal(grade.passed, true, `LEARN-07 must pass from powered-off start, got: ${JSON.stringify(grade)}`);

  for (const [rev, decoder] of [
    ["F1-public-reference-20", decodeFcvProfile20Settings],
    ["F1-public-reference-22", decodeFcvProfile22Settings],
    ["F1-public-reference-23", decodeFcvProfile23Settings],
  ]) {
    const body = {schemaVersion: 18, profileClass: "PUBLIC_REFERENCE", profileRevision: rev, settings: {palette: "White"}};
    const raw = JSON.stringify({...body, contentFingerprint: fingerprint(body)});
    assert.equal(decodeFcvSettings(raw), null);
    assert.deepEqual(decoder(raw), {palette: "White"});
  }
  assert.ok(encodeFcvSettings({palette: "White"}).includes("F1-public-reference-24"));
});

test("P2 Perf: WeakMap memoized dispatch and single-pass assessFcvLesson scale cleanly at 3600 events", () => {
  let s = bootSession();
  const t0 = performance.now();
  for (let i = 0; i < 3590; i++) {
    s = dispatch(s, FCV588_ADAPTER, {kind: "tick", steps: 1}, TRAINING_SCENARIO);
  }
  const startSeq = s.events.length;
  const startSessionHash = sessionHash(s);
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "up", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "down", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "up", control: "power"}, TRAINING_SCENARIO);
  s = dispatch(s, FCV588_ADAPTER, {kind: "press", control: "enter"}, TRAINING_SCENARIO);
  const dispatchMs = performance.now() - t0;

  const tGrade0 = performance.now();
  const grade = assessFcvLesson(s, "FCV588-LEARN-07", {startSeq, startSessionHash});
  const gradeMs = performance.now() - tGrade0;

  assert.equal(grade.passed, true, `expected LEARN-07 pass at 3600 events, got ${JSON.stringify(grade)}`);
  const env = createReplayEnvelope(s);
  assert.equal(sessionHash(replayFcv588Envelope(TRAINING_SCENARIO, env)), sessionHash(s));
  assert.ok(dispatchMs < 800, `3600 dispatches took ${dispatchMs.toFixed(1)} ms`);
  assert.ok(gradeMs < 600, `assessFcvLesson at 3600 events took ${gradeMs.toFixed(1)} ms`);
  assert.ok(getFcvReplayAdapter("F1-public-reference-21"));
  assert.ok(getFcvReplayAdapter("F1-public-reference-22"));
  assert.ok(getFcvReplayAdapter("F1-public-reference-23"));
  assert.ok(getFcvReplayAdapter("F1-public-reference-24"));
});
