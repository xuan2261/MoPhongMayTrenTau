import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {
  loadAdapter,
  loadArpaAis,
  loadI18n,
  loadLessons,
  loadModel,
  loadScenarios,
  loadSignal,
  loadSpec,
} from "./helpers/module-loader.mjs";
import {
  applySettingsViaCodecRestore,
  assertValidNmeaSentence,
  createMdcBridgeDriver,
  findMenuEntry,
  getAlarmInfo,
  getBrilliance,
  getColorPalette,
  getGain,
  getGuardZoneInfo,
  getLanguage,
  getLanguageCodes,
  getMeasurementInfo,
  getMotionMode,
  getMotorRpm,
  getOffCenter,
  getPowerMode,
  getPresentationMode,
  getRangeInfo,
  getScreenMode,
  getSensorWarnings,
  getStc,
  getSweepAngle,
  getTmOffset,
  getTrailInfo,
  getTxSeconds,
  isHlSuppressed,
  operateMenuItem,
  setChoiceSetting,
  setGuardZoneSettings,
} from "./helpers/session-driver.mjs";
import {
  binForRange,
  countAbove,
  evalGridStrict,
  extractAtaState,
  extractAtaTargets,
  normalizeAtaSettings,
  sectorEnergy,
} from "./helpers/signal-oracle.mjs";

export const TIER = 3;
export const SUITE = "tier3-display-signal-measure-combos";

function assertUnvalidatedTrainingResult(res) {
  assert.equal(res.hardwareApproved, false, "hardwareApproved must be false");
  assert.equal(res.publicReleaseEligible, false, "publicReleaseEligible must be false");
  assert.equal(res.firmwareInstalled, null, "firmwareInstalled must be null");
}

export const TESTS = [
  {
    id: "T3-001",
    name: "North-Up + True Trail (T) + Off-Center Lookahead Combination",
    features: [7, 10, 11],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.presentationMode, "N-UP");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 3 : "3m");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.pointer(90, -110);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /OFF\s*CENT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      drv.tick(20);
      assert.equal(getPresentationMode(drv.state(), MDC2060_ADAPTER), "N-UP");
      assert.match(String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode), /^T|TRUE$/i);
      const oc = getOffCenter(drv.state(), MDC2060_ADAPTER);
      assert.equal(oc.enabled, true);
      assert.ok(Math.hypot(oc.xFrac, oc.yFrac) <= 0.66 + 1e-6);
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
  {
    id: "T3-002",
    name: "Dual-Range PPI/PPI Independent Grids + Active EBL1/VRM1",
    features: [6, 9, 19, 20, 29],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {evaluatePolarEchoGrid} = await loadSignal();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.screenMode, "PPI/PPI");
        if (keys.rangeIndex) setChoiceSetting(s, keys.rangeIndex, 10); // 6 NM
        if (keys.subRangeIndex) setChoiceSetting(s, keys.subRangeIndex, 6); // 1.5 NM
      });
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});

      const r = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES);
      const mainGrid = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {rangeNm: r.rangeNm, gain: 60});
      const subGrid = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {rangeNm: r.subRangeNm, gain: 60});
      assert.notEqual(r.rangeNm, r.subRangeNm);
      assert.notEqual(Buffer.compare(Buffer.from(mainGrid.grid), Buffer.from(subGrid.grid)), 0);
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl1?.enabled), true);
      assert.equal(Boolean(m.vrm1?.enabled), true);
    },
  },
  {
    id: "T3-003",
    name: "Storm Clutter Multi-Filter Extraction + ATA Tracking Through Rain",
    features: [16, 17, 18, 23],
    async run() {
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const {evaluatePolarEchoGrid} = await loadSignal();
      const arpa = await loadArpaAis();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_STORM_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("interferenceSource", true);
      drv.tick(1);
      const bus = drv.bus();
      const raw = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {
        rangeNm: 6,
        gain: 65,
        stc: 0,
        ftc: 0,
        ir: "OFF",
        interferenceSource: true,
      });
      const filtered = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {
        rangeNm: 6,
        gain: 65,
        stc: 40,
        ftc: 5,
        ir: 2,
        interferenceSource: true,
      });
      const rawTotal = sectorEnergy(raw.grid, 0, 359, 2, 155).sum;
      const filtTotal = sectorEnergy(filtered.grid, 0, 359, 2, 155).sum;
      assert.ok(filtTotal < rawTotal * 0.75, `Multi-filter must cut storm clutter sharply: filt=${filtTotal} vs raw=${rawTotal}`);

      const ship = bus.radarContacts.reduce((best, c) =>
        Math.abs(c.rangeNm - 3.2) < Math.abs((best?.rangeNm ?? 999) - 3.2) ? c : best,
      null);
      assert.ok(ship);
      const bin = binForRange(ship.rangeNm, 6);
      assert.ok(sectorEnergy(filtered.grid, Math.round(ship.bearingDeg) - 3, Math.round(ship.bearingDeg) + 3, bin - 4, bin + 4).peak >= 4);

      let ataSt = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), ship, 1, bus));
      for (let t = 2; t <= 7; t++) {
        drv.tick(1);
        ataSt = extractAtaState(arpa.stepAtaTracking(ataSt, drv.bus(), normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15}), t));
      }
      const tgt = extractAtaTargets(ataSt)[0];
      assert.equal(String(tgt.status).toLowerCase(), "tracking");
      assertValidNmeaSentence(arpa.formatRattmSentence(tgt, drv.bus().ownship, 7), "RATTM");
    },
  },
  {
    id: "T3-004",
    name: "Floating EBL1 + 2-Point Cursor Measure + Long-ENT HL OFF",
    features: [19, 22],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.touch(160, 180, "down");
      drv.touch(160, 180, "up");
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /EBL1\s*FLOAT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const eblFloatOrigin = structuredClone(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).ebl1);
      assert.equal(eblFloatOrigin.enabled, true, "EBL1 must be enabled");
      assert.equal(eblFloatOrigin.floating, true, "EBL1 FLOAT must be enabled");
      assert.ok(
        eblFloatOrigin.originX !== 0 || eblFloatOrigin.originY !== 0,
        "EBL1 FLOAT must detach origin from center",
      );

      // Anchor 2-point in open water (150, 260 avoids AIS target 574009330 at (277.1, 268.1))
      drv.touch(150, 260, "down");
      drv.touch(150, 260, "up");
      drv.holdPress("ent", 200);
      drv.touch(340, 310, "down");
      drv.touch(340, 310, "up");
      const preHl = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      const eblBefore = structuredClone(preHl.ebl1);
      const tpBefore = structuredClone(preHl.twoPoint);
      assert.equal(eblBefore.originX, eblFloatOrigin.originX, "2-point cursor touches must preserve detached EBL1 originX");
      assert.equal(eblBefore.originY, eblFloatOrigin.originY, "2-point cursor touches must preserve detached EBL1 originY");
      assert.ok(
        tpBefore !== null && tpBefore.active === true && tpBefore.anchor !== null && tpBefore.rangeNm > 0,
        "Short ENT in open water must create a genuine active 2-point anchor",
      );

      // Long-ENT HL OFF must not corrupt floating EBL1 or active 2-point anchor
      drv.down("ent");
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), true);
      drv.up("ent", 1400);
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), false);
      assert.deepEqual(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).ebl1, eblBefore);
      assert.deepEqual(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).twoPoint, tpBefore);
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
  {
    id: "T3-005",
    name: "True Motion Edge Auto-Reset Preserves True Trail Coherence",
    features: [8, 11],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.motionMode, "TM");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 3 : "3m");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      for (let i = 0; i < 15; i++) drv.press("range_down");
      drv.press("range_up"); // 0.125 NM
      drv.tick(80);
      const tm = getTmOffset(drv.state(), MDC2060_ADAPTER);
      assert.ok(Math.hypot(tm.xFrac, tm.yFrac) <= 0.66 + 0.05);
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
  {
    id: "T3-006",
    name: "Radar Shadow Behind Island Combined with Guard Zone Across Range Changes",
    features: [6, 14, 25],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {evaluatePolarEchoGrid} = await loadSignal();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setGuardZoneSettings(s, keys, {mode: "IN", innerNm: 0.5, outerNm: 5.0, startBrgDeg: 0, endBrgDeg: 359});
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.tick(2);
      const gzBefore = getGuardZoneInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(gzBefore.mode, "IN", "Restored Guard Zone mode must be IN");
      assert.equal(gzBefore.triggered, true, "Guard Zone IN [0.5..5.0 NM] must trigger on coastal traffic");
      for (const targetRangeNm of [6, 3, 12]) {
        const res = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {rangeNm: targetRangeNm, gain: 60});
        assert.equal(res.rangeNm, targetRangeNm);
        assert.ok(countAbove(res.shadowMask, 0) > 0, `Radar shadowMask behind coastal islands must be non-empty at ${targetRangeNm} NM`);
      }
      drv.press("range_down");
      drv.press("range_up");
      const gzAfter = getGuardZoneInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(gzAfter.mode, "IN");
      assert.equal(gzAfter.innerNm, gzBefore.innerNm);
      assert.equal(gzAfter.outerNm, gzBefore.outerNm);
      assert.equal(gzAfter.triggered, gzBefore.triggered);
    },
  },
  {
    id: "T3-007",
    name: "PPI/NAV Mode Displays Bridge Depth Consistently Across All 4 Palettes",
    features: [9, 12, 29, 31],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.screenMode, "PPI/NAV");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.tick(2);
      const expectedDepth = drv.bus().depthM;
      assert.ok(Number.isFinite(expectedDepth) && expectedDepth > 0);
      const seenPalettes = new Set();
      for (let i = 0; i < 4; i++) {
        assert.equal(getScreenMode(drv.state(), MDC2060_ADAPTER), "PPI/NAV");
        assert.equal(drv.bus().depthM, expectedDepth);
        seenPalettes.add(getColorPalette(drv.state(), MDC2060_ADAPTER));
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^COLOR$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      }
      assert.equal(seenPalettes.size, 4);
    },
  },
  {
    id: "T3-008",
    name: "High-Speed Sweep (48 RPM) + Signal Processing Combination Performance & Determinism",
    features: [5, 13, 15, 18],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {evaluatePolarEchoGrid} = await loadSignal();
      const procOpts = findMenuEntry(spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^PROCESS$/i)?.item?.raw?.options ?? [];
      const nonOffProcess = procOpts.find(o => !/^OFF$/i.test(String(o))) ?? "AVG1";

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.motorRpm, 48);
        setChoiceSetting(s, keys.exp, true, {stringOn: "1", stringOff: "OFF"});
        setChoiceSetting(s, keys.pw, "L");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getMotorRpm(drv.state(), MDC2060_ADAPTER), 48);
      const a0 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      drv.tick(1);
      const a1 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      assert.ok(Math.abs((((a1 - a0) % 360) + 360) % 360 - 288) < 1e-6);

      const gA = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {
        rangeNm: 6,
        gain: 65,
        pw: "L",
        exp: true,
        subGain: 10,
        process: nonOffProcess,
      });
      const gB = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {
        rangeNm: 6,
        gain: 65,
        pw: "L",
        exp: true,
        subGain: 10,
        process: nonOffProcess,
      });
      assert.equal(Buffer.compare(Buffer.from(gA.grid), Buffer.from(gB.grid)), 0);
      // Warm up JIT (matching T1-027) before timing the 40-frame < 1.5 ms/frame budget
      for (let w = 0; w < 10; w++) {
        evaluatePolarEchoGrid({
          scenario: MDC2060_COASTAL_SCENARIO,
          maritimeBus: drv.bus(),
          simTick: w,
          rangeNm: 6,
          gain: 65,
          pw: "L",
          exp: true,
          subGain: 10,
          process: nonOffProcess,
          settings: {rangeNm: 6, gain: 65, pw: "L", exp: true, subGain: 10, process: nonOffProcess},
        });
      }
      const t0 = performance.now();
      for (let i = 0; i < 40; i++) {
        evaluatePolarEchoGrid({
          scenario: MDC2060_COASTAL_SCENARIO,
          maritimeBus: drv.bus(),
          simTick: i,
          rangeNm: 6,
          gain: 65,
          pw: "L",
          exp: true,
          subGain: 10,
          process: nonOffProcess,
          settings: {rangeNm: 6, gain: 65, pw: "L", exp: true, subGain: 10, process: nonOffProcess},
        });
      }
      assert.ok((performance.now() - t0) / 40 < 1.5);
    },
  },
  {
    id: "T3-009",
    name: "Switching Range Unit (NM/km/sm) Converts All Distance Displays Without Altering NM Physics",
    features: [6, 20, 21, 25],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setGuardZoneSettings(s, keys, {mode: "IN", innerNm: 0.5, outerNm: 5.0, startBrgDeg: 0, endBrgDeg: 359});
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.tick(2);
      const gzNm = getGuardZoneInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(gzNm.mode, "IN", "Restored Guard Zone mode must be IN");
      assert.match(String(spec.formatRangeValue(2, "km")), /3\.7/);
      assert.match(String(spec.formatRangeValue(2, "sm")), /2\.3/);
      for (let i = 0; i < 3; i++) {
        operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /RANGE\s*UNIT/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
        const gzCur = getGuardZoneInfo(drv.state(), MDC2060_ADAPTER);
        assert.equal(gzCur.innerNm, gzNm.innerNm);
        assert.equal(gzCur.outerNm, gzNm.outerNm);
        assert.equal(gzCur.triggered, gzNm.triggered);
      }
    },
  },
  {
    id: "T3-010",
    name: "Course-Up Relative-Frame Consistency Combination (C-UP + Relative Trail + EBL2 Rel + Cursor)",
    features: [7, 11, 19, 22],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.presentationMode, "C-UP");
        setChoiceSetting(s, keys.trailMode, "R");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 3 : "3m");
        setChoiceSetting(s, keys.brgMode, "R");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL2$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      drv.pointer(45, -35);
      drv.tick(15);
      assert.equal(getPresentationMode(drv.state(), MDC2060_ADAPTER), "C-UP");
      assert.match(String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode), /^R|REL/i);
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl2?.enabled), true);
      assert.ok(Number(m.ebl2?.bearingDeg) >= 0 && Number(m.ebl2?.bearingDeg) < 360);
      drv.assertCanonicalState();
    },
  },
  {
    id: "T3-011",
    name: "Comparing All 3 Preheat Paths (120s Authentic, 5s fastPreheat, skipPreheat) + TX Hours & Replay",
    features: [2, 27, 31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();

      const dAuth = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      dAuth.powerOnToTransmit({fastPreheat: false, skipPreheat: false});
      dAuth.tick(10);

      const dFast = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      dFast.powerOnToTransmit({fastPreheat: true, skipPreheat: false});
      dFast.tick(10);

      const dSkip = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      dSkip.powerOnToTransmit({fastPreheat: false, skipPreheat: true});
      dSkip.tick(10);

      assert.equal(getTxSeconds(dAuth.state(), MDC2060_ADAPTER), 10);
      assert.equal(getTxSeconds(dFast.state(), MDC2060_ADAPTER), 10);
      assert.equal(getTxSeconds(dSkip.state(), MDC2060_ADAPTER), 10);

      const rAuth = dAuth.verifyReplay();
      const rFast = dFast.verifyReplay();
      const rSkip = dSkip.verifyReplay();
      assert.ok(rFast.envelope.history.some(e => e.input?.kind === "training-fixture" && e.input?.fixture === "fastPreheat"));
      assert.ok(rSkip.envelope.history.some(e => e.input?.kind === "training-fixture" && e.input?.fixture === "skipPreheat"));
      assert.ok(!rAuth.envelope.history.some(e => e.input?.kind === "training-fixture"));
    },
  },
  {
    id: "T3-012",
    name: "Brilliance Dialog Interaction While Transmitting & Adjusting GAIN/STC Knobs",
    features: [2, 3, 16, 18],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const g0 = getGain(drv.state(), MDC2060_ADAPTER);
      const s0 = getStc(drv.state(), MDC2060_ADAPTER);
      const b0 = getBrilliance(drv.state(), MDC2060_ADAPTER);
      drv.holdPress("power", 250);
      drv.pad(b0 <= 1 ? "right" : "left");
      drv.rotate("gain", 5);
      drv.rotate("stc", 5);
      drv.tick(2);
      drv.holdPress("ent", 150);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      assert.notEqual(getGain(drv.state(), MDC2060_ADAPTER), g0);
      assert.notEqual(getStc(drv.state(), MDC2060_ADAPTER), s0);
      const bAfter = getBrilliance(drv.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(bAfter) && bAfter !== b0, "Brilliance dialog must change brilliance level");
    },
  },
  {
    id: "T3-013",
    name: "Economy SLEEP Wakes Cleanly & Cooperates with Guard Zone Alarm Ack",
    features: [4, 25],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setGuardZoneSettings(s, keys, {mode: "IN", innerNm: 0.2, outerNm: 6.0, startBrgDeg: 0, endBrgDeg: 359});
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).mode, "IN", "Restored Guard Zone mode must be IN");
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SLEEP$/i, /MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "sleep");
      drv.tick(5);
      drv.press("range_up");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      drv.tick(2);
      drv.press("alarm_ack");
      assert.equal(getAlarmInfo(drv.state(), MDC2060_ADAPTER).audible, false);
      drv.verifyReplay();
    },
  },
  {
    id: "T3-014",
    name: "Sensor Failure Degradation & Full Post-Recovery Restoration (HDG + GPS)",
    features: [7, 8, 11, 32],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.presentationMode, "N-UP");
        setChoiceSetting(s, keys.motionMode, "TM");
        setChoiceSetting(s, keys.trailMode, "T");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("headingSensor", false);
      drv.fixture("gpsSensor", false);
      drv.tick(4);
      const wFault = getSensorWarnings(drv.state(), MDC2060_ADAPTER);
      assert.equal(wFault.hdgNoSignal, true);
      assert.equal(wFault.llNoSignal, true);

      drv.fixture("headingSensor", true);
      drv.fixture("gpsSensor", true);
      drv.tick(4);
      const wRecover = getSensorWarnings(drv.state(), MDC2060_ADAPTER);
      assert.equal(wRecover.hdgNoSignal, false);
      assert.equal(wRecover.llNoSignal, false);
      assert.equal(getMotionMode(drv.state(), MDC2060_ADAPTER), "TM");
      drv.verifyReplay();
    },
  },
  {
    id: "T3-015",
    name: "ALL RESET Cleanly Resets All Active Subsystems & Replays Deterministically",
    features: [19, 20, 23, 25, 27],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const defaults = model.initialMdc2060State();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^COLOR$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^PRESET$/i, /RESET/i, {system: true, adjustSteps: 0, confirm: true, closeAfter: true});
      assert.equal(getColorPalette(drv.state(), MDC2060_ADAPTER), getColorPalette(defaults, MDC2060_ADAPTER));
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).mode, "OFF");
      drv.verifyReplay();
    },
  },
  {
    id: "T3-016",
    name: "Language Switch Mid-Session Does Not Break Menu Navigation or Lesson Grading",
    features: [26, 27, 32, 33],
    async run() {
      const spec = await loadSpec();
      const i18n = await loadI18n();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const {en, vi} = getLanguageCodes(i18n.MDC2060_LANGUAGES);
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      // 1. Switch LCD language EN -> VI via System Menu (Features #27, #32)
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /LANG/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(String(getLanguage(drv.state(), MDC2060_ADAPTER)).toLowerCase(), String(vi).toLowerCase());

      // 2. Verify Main Menu navigation operates cleanly under VI (Feature #26)
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^COLOR$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assert.notEqual(getColorPalette(drv.state(), MDC2060_ADAPTER), "DAY");

      // 3. Power OFF (language="vi" persists) and grade MDC2060-LEARN-01 cleanly under VI (Feature #33)
      drv.holdPress("power", 3100);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      assert.equal(String(getLanguage(drv.state(), MDC2060_ADAPTER)).toLowerCase(), String(vi).toLowerCase());

      const startSeq = drv.bridge.history.length;
      const startSessionHash = drv.hash();
      drv.powerOnToTransmit({fastPreheat: true});
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {
        scenario: MDC2060_COASTAL_SCENARIO,
        startSeq,
        startSessionHash,
      });
      assert.equal(res.passed, true, `LEARN-01 under VI failed: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.equal(res.reasons.length, 0);
      assertUnvalidatedTrainingResult(res);

      // 4. Switch language VI -> EN via System Menu and verify deterministic replay
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /LANG/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(String(getLanguage(drv.state(), MDC2060_ADAPTER)).toLowerCase(), String(en).toLowerCase());
      drv.verifyReplay();
    },
  },
];
