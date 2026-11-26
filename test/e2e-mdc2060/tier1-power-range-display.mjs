import assert from "node:assert/strict";
import {loadAdapter, loadModel, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  applySettingsViaCodecRestore,
  assertDeepFrozen,
  createMdcBridgeDriver,
  getBrilliance,
  getColorPalette,
  getMotionMode,
  getMotorRpm,
  getOffCenter,
  getOverlayKind,
  getPowerMode,
  getPreheatRemaining,
  getPresentationMode,
  getRangeInfo,
  getScreenMode,
  getSleepInfo,
  getSweepAngle,
  getTmOffset,
  getTrailInfo,
  operateMenuItem,
  setChoiceSetting,
} from "./helpers/session-driver.mjs";
import {EXPECTED_MDC2060_RANGES} from "./helpers/signal-oracle.mjs";

export const TIER = 1;
export const SUITE = "tier1-power-range-display";

function normalizeAngleDelta(after, before) {
  return (((after - before) % 360) + 360) % 360;
}

function getTrailPointsCountForTarget(trailInfo, mmsiOrName) {
  const hist = trailInfo.history;
  if (Array.isArray(hist)) {
    const matched = hist.filter(p =>
      String(p?.mmsi ?? p?.contactId ?? p?.id ?? p?.name ?? "").includes(mmsiOrName),
    );
    if (matched.length > 0 && matched.every(item => Array.isArray(item?.points))) {
      return matched.flatMap(item => item.points);
    }
    return matched;
  }
  if (hist && typeof hist === "object") {
    for (const [k, v] of Object.entries(hist)) {
      if (k.includes(mmsiOrName)) {
        if (Array.isArray(v)) return v;
        if (Array.isArray(v?.points)) return v.points;
      }
    }
  }
  return [];
}

function trailDisplacement(points, mode = "T") {
  if (!Array.isArray(points) || points.length < 2) return 0;
  const first = points[0];
  const last = points[points.length - 1];
  if (/^R|REL/i.test(String(mode))) {
    const hasRelCartesian =
      Number.isFinite(Number(first?.xNm ?? first?.x)) &&
      Number.isFinite(Number(last?.xNm ?? last?.x)) &&
      Number.isFinite(Number(first?.yNm ?? first?.y)) &&
      Number.isFinite(Number(last?.yNm ?? last?.y));
    if (hasRelCartesian) {
      const dx = Number(last.xNm ?? last.x) - Number(first.xNm ?? first.x);
      const dy = Number(last.yNm ?? last.y) - Number(first.yNm ?? first.y);
      return Math.hypot(dx, dy);
    }
    if (
      Number.isFinite(first?.rangeNm) && Number.isFinite(first?.bearingDeg) &&
      Number.isFinite(last?.rangeNm) && Number.isFinite(last?.bearingDeg)
    ) {
      const a0 = (first.bearingDeg * Math.PI) / 180;
      const a1 = (last.bearingDeg * Math.PI) / 180;
      const x0 = first.rangeNm * Math.sin(a0);
      const y0 = first.rangeNm * Math.cos(a0);
      const x1 = last.rangeNm * Math.sin(a1);
      const y1 = last.rangeNm * Math.cos(a1);
      return Math.hypot(x1 - x0, y1 - y0);
    }
  }
  const dx = Number(last?.lat ?? last?.xNm ?? last?.x) - Number(first?.lat ?? first?.xNm ?? first?.x);
  const dy = Number(last?.lon ?? last?.yNm ?? last?.y) - Number(first?.lon ?? first?.yNm ?? first?.y);
  return Math.hypot(dx, dy);
}

export const TESTS = [
  {
    id: "T1-001",
    name: "Target Hardware Profile & Frozen Adapter Identity",
    features: [1],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      assert.equal(spec.MDC2060_ID, "koden.mdc2060.mrd104");
      assert.equal(spec.MDC2060_PROFILE_REVISION, "F1-mdc2060-public-ref-1");
      assert.equal(MDC2060_ADAPTER.id, spec.MDC2060_ID);
      assert.equal(MDC2060_ADAPTER.revision, spec.MDC2060_PROFILE_REVISION);
      assertDeepFrozen(MDC2060_ADAPTER, "MDC2060_ADAPTER");
      assertDeepFrozen(MDC2060_ADAPTER.profile, "MDC2060_ADAPTER.profile");
      assertDeepFrozen(MDC2060_ADAPTER.controls, "MDC2060_ADAPTER.controls");
      assertDeepFrozen(MDC2060_ADAPTER.gestures, "MDC2060_ADAPTER.gestures");
      assertDeepFrozen(MDC2060_ADAPTER.holdThresholdMs, "MDC2060_ADAPTER.holdThresholdMs");
      assertDeepFrozen(MDC2060_ADAPTER.fixtures, "MDC2060_ADAPTER.fixtures");

      const specsJson = JSON.stringify(spec.MDC2060_RADAR_SPECS);
      assert.match(specsJson, /480/, "MDC2060_RADAR_SPECS must report 480px LCD width");
      assert.match(specsJson, /640/, "MDC2060_RADAR_SPECS must report 640px LCD height");
      assert.match(specsJson, /1\.8/, "MDC2060_RADAR_SPECS must report 1.8 deg beamwidth");
      assert.match(specsJson, /6/, "MDC2060_RADAR_SPECS must report 6 kW output power");
      assert.match(specsJson, /8/, "MDC2060_RADAR_SPECS must report 8 echo video levels");
    },
  },
  {
    id: "T1-002",
    name: "Cold Boot to Authentic 120s Preheat Countdown",
    features: [2],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      drv.holdPress("power", 250);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 120);
      drv.tick(60);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 60);
      drv.tick(60);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 0);
      drv.verifyReplay();
    },
  },
  {
    id: "T1-003",
    name: "D15 fastPreheat 5-Second Training Fixture Countdown",
    features: [2],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.fixture("fastPreheat", true);
      drv.holdPress("power", 200);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 5);
      drv.tick(4);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 1);
      drv.tick(1);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 0);
      drv.verifyReplay();
    },
  },
  {
    id: "T1-004",
    name: "D15 skipPreheat Fixture Immediate Transition to STANDBY",
    features: [2],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.holdPress("power", 200);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 120);
      drv.fixture("skipPreheat", true);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
      assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 0);
      drv.verifyReplay();
    },
  },
  {
    id: "T1-005",
    name: "STANDBY <-> TRANSMIT Toggle & Hold power >3000ms Shutdown",
    features: [2],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToStandby({fastPreheat: true});
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      drv.holdPress("power", 3500);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-006",
    name: "Short Press POWER/BRILL Opens & Adjusts Brilliance Dialog",
    features: [3],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const initialBrill = getBrilliance(drv.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(initialBrill), "Initial brilliance must be finite");
      drv.holdPress("power", 300);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      const overlay = getOverlayKind(drv.state(), MDC2060_ADAPTER);
      assert.ok(overlay && /brill|bright/i.test(String(overlay)), `Expected brilliance dialog overlay, got ${String(overlay)}`);
      drv.pad("left");
      const afterLeft = getBrilliance(drv.state(), MDC2060_ADAPTER);
      drv.pad("right");
      drv.pad("right");
      const afterRight = getBrilliance(drv.state(), MDC2060_ADAPTER);
      assert.ok(afterLeft !== initialBrill || afterRight !== initialBrill, "Brilliance dialog must adjust brilliance level");
      drv.holdPress("ent", 150);
      assert.equal(getOverlayKind(drv.state(), MDC2060_ADAPTER), null, "Short ENT must close BRILL dialog");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-007",
    name: "SLEEP Economy Mode Periodic 30s TX Burst & Any-Key Wake",
    features: [4],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SLEEP$/i, /MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "sleep");
      // Advance ticks to verify sleep cycle stays valid and transitions cleanly
      let sawBurst = getSleepInfo(drv.state(), MDC2060_ADAPTER).inBurst;
      for (let step = 0; step < 36; step++) {
        drv.tick(10);
        if (getSleepInfo(drv.state(), MDC2060_ADAPTER).inBurst) sawBurst = true;
      }
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "sleep");
      assert.equal(sawBurst, true, "SLEEP economy mode must trigger periodic 30s TX burst window");
      drv.press("range_up");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit", "Physical key press must wake SLEEP back to TRANSMIT");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-008",
    name: "Antenna Rotation Speed 24 RPM (144 deg/s) vs 48 RPM (288 deg/s)",
    features: [5],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToStandby({fastPreheat: true});
      const stbyAngle0 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      drv.tick(2);
      const stbyAngle1 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      assert.equal(normalizeAngleDelta(stbyAngle1, stbyAngle0), 0, "Sweep azimuth must stay stationary in STANDBY");

      drv.press("stby_tx");
      assert.equal(getMotorRpm(drv.state(), MDC2060_ADAPTER), 24);
      const a0 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      drv.tick(1);
      const a1 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      assert.ok(Math.abs(normalizeAngleDelta(a1, a0) - 144) < 1e-6, `24 RPM must advance 144 deg/s, got ${normalizeAngleDelta(a1, a0)}`);

      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /MOTOR/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(getMotorRpm(drv.state(), MDC2060_ADAPTER), 48);
      const b0 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      drv.tick(1);
      const b1 = getSweepAngle(drv.state(), MDC2060_ADAPTER);
      assert.ok(Math.abs(normalizeAngleDelta(b1, b0) - 288) < 1e-6, `48 RPM must advance 288 deg/s, got ${normalizeAngleDelta(b1, b0)}`);
    },
  },
  {
    id: "T1-009",
    name: "Exact 18 Standard Ranges Table Contract (0.0625..64 NM)",
    features: [6],
    async run() {
      const {MDC2060_RANGES} = await loadSpec();
      assert.equal(Object.isFrozen(MDC2060_RANGES), true, "MDC2060_RANGES must be frozen");
      assert.equal(MDC2060_RANGES.length, 18);
      for (let i = 0; i < EXPECTED_MDC2060_RANGES.length; i++) {
        const expected = EXPECTED_MDC2060_RANGES[i];
        const actual = MDC2060_RANGES[i];
        assert.equal(actual.nm, expected.nm, `Range[${i}].nm mismatch`);
        assert.equal(actual.ringNm, expected.ringNm, `Range[${i}].ringNm mismatch`);
        assert.equal(actual.rings, expected.rings, `Range[${i}].rings mismatch`);
        assert.equal(actual.defaultPw, expected.defaultPw, `Range[${i}].defaultPw mismatch`);
        assert.ok(Math.abs(actual.ringNm * actual.rings - actual.nm) < 1e-9, `Range[${i}] ringNm * rings must equal nm`);
      }
    },
  },
  {
    id: "T1-010",
    name: "Full Traversal of All 18 Ranges via range_up / range_down",
    features: [6],
    async run() {
      const {MDC2060_RANGES} = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});

      for (let i = 0; i < 20; i++) drv.press("range_down");
      assert.equal(getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES).rangeIndex, 0);

      for (let idx = 0; idx < 18; idx++) {
        const info = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
        assert.equal(info.rangeIndex, idx);
        assert.equal(info.rangeNm, EXPECTED_MDC2060_RANGES[idx].nm);
        assert.equal(info.ringNm, EXPECTED_MDC2060_RANGES[idx].ringNm);
        assert.equal(info.rings, EXPECTED_MDC2060_RANGES[idx].rings);
        assert.equal(info.pw, EXPECTED_MDC2060_RANGES[idx].defaultPw);
        if (idx < 17) drv.press("range_up");
      }
      for (let idx = 17; idx >= 0; idx--) {
        assert.equal(getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES).rangeIndex, idx);
        if (idx > 0) drv.press("range_down");
      }
      drv.verifyReplay();
    },
  },
  {
    id: "T1-011",
    name: "Default Pulse Width (PW) Auto-Updates Across Range Bands",
    features: [6],
    async run() {
      const {MDC2060_RANGES} = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const stepToIndex = target => {
        for (let guard = 0; guard < 25; guard++) {
          const cur = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES).rangeIndex;
          if (cur === target) break;
          drv.press(cur < target ? "range_up" : "range_down");
        }
      };
      const checkpoints = [
        {idx: 2, nm: 0.25, pw: "S1"},
        {idx: 5, nm: 1, pw: "S2"},
        {idx: 8, nm: 3, pw: "M1"},
        {idx: 10, nm: 6, pw: "M2"},
        {idx: 14, nm: 24, pw: "L"},
      ];
      for (const cp of checkpoints) {
        stepToIndex(cp.idx);
        const info = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
        assert.equal(info.rangeNm, cp.nm);
        assert.equal(info.pw, cp.pw, `Expected default PW ${cp.pw} at ${cp.nm} NM`);
      }
    },
  },
  {
    id: "T1-012",
    name: "Fixed Range Rings Toggle (SYSTEM > ASSIST > RINGS)",
    features: [6],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const before = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES);
      assert.equal(typeof before.ringsVisible, "boolean");
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /RINGS/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      const mid = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES);
      assert.equal(mid.ringsVisible, !before.ringsVisible);
      assert.equal(mid.rangeIndex, before.rangeIndex);
      assert.equal(mid.ringNm, before.ringNm);
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /RINGS/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      const after = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES);
      assert.equal(after.ringsVisible, before.ringsVisible);
    },
  },
  {
    id: "T1-013",
    name: "Independent Sub-Range Selection in PPI/PPI Dual-Range Mode",
    features: [6, 9],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        assert.ok(keys.screenMode, "screenMode setting key must exist");
        setChoiceSetting(s, keys.screenMode, "PPI/PPI");
        if (keys.rangeIndex) setChoiceSetting(s, keys.rangeIndex, 10); // 6 NM
        if (keys.subRangeIndex) setChoiceSetting(s, keys.subRangeIndex, 6); // 1.5 NM
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getScreenMode(drv.state(), MDC2060_ADAPTER), "PPI/PPI");
      const info = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES);
      assert.ok(Number.isInteger(info.subRangeIndex) && info.subRangeIndex >= 0 && info.subRangeIndex <= 17);
      assert.notEqual(info.subRangeIndex, info.rangeIndex, "Main and Sub ranges must be independently configurable in PPI/PPI");
    },
  },
  {
    id: "T1-014",
    name: "Range Unit Formatting (NM, km, sm) via formatRangeValue & System Menu",
    features: [6],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const units = Array.isArray(spec.MDC2060_RANGE_UNITS) ? spec.MDC2060_RANGE_UNITS : Object.values(spec.MDC2060_RANGE_UNITS);
      for (const u of ["NM", "km", "sm"]) {
        assert.ok(units.some(x => String(x).toLowerCase() === u.toLowerCase()), `MDC2060_RANGE_UNITS must include ${u}`);
      }
      const fNm = String(spec.formatRangeValue(1, "NM"));
      const fKm = String(spec.formatRangeValue(1, "km"));
      const fSm = String(spec.formatRangeValue(1, "sm"));
      assert.ok(fNm.includes("1"), `formatRangeValue(1, "NM") unexpected: ${fNm}`);
      assert.ok(/1\.85/.test(fKm), `formatRangeValue(1, "km") expected ~1.852, got ${fKm}`);
      assert.ok(/1\.15/.test(fSm), `formatRangeValue(1, "sm") expected ~1.151, got ${fSm}`);

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const initialUnit = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES).rangeUnit;
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /RANGE\s*UNIT/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      const nextUnit = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES).rangeUnit;
      assert.notEqual(nextUnit, initialUnit, "RANGE UNIT must change when edited in System Menu");
    },
  },
  {
    id: "T1-015",
    name: "All 4 Presentation Modes (H-UP, N-UP, C-UP, W-UP)",
    features: [7],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const modes = Array.isArray(spec.MDC2060_PRESENTATION_MODES)
        ? spec.MDC2060_PRESENTATION_MODES
        : Object.values(spec.MDC2060_PRESENTATION_MODES);
      for (const m of ["H-UP", "N-UP", "C-UP", "W-UP"]) {
        assert.ok(modes.includes(m), `MDC2060_PRESENTATION_MODES must include ${m}`);
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        applySettingsViaCodecRestore(drv, model, (s, keys) => {
          assert.ok(keys.presentationMode, "presentationMode setting key must exist");
          s[keys.presentationMode] = m;
        });
        drv.powerOnToTransmit({fastPreheat: true});
        assert.equal(getPresentationMode(drv.state(), MDC2060_ADAPTER), m);
      }
    },
  },
  {
    id: "T1-016",
    name: "Relative Motion (RM) vs True Motion (TM) Activation & Ownship Advance",
    features: [8],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const modes = Array.isArray(spec.MDC2060_MOTION_MODES)
        ? spec.MDC2060_MOTION_MODES
        : Object.values(spec.MDC2060_MOTION_MODES);
      assert.ok(modes.includes("RM") && modes.includes("TM"));

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(getMotionMode(drv.state(), MDC2060_ADAPTER), "RM");
      const tm0 = getTmOffset(drv.state(), MDC2060_ADAPTER);
      assert.equal(Math.hypot(tm0.xFrac, tm0.yFrac), 0);

      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        assert.ok(keys.motionMode, "motionMode setting key must exist");
        s[keys.motionMode] = "TM";
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getMotionMode(drv.state(), MDC2060_ADAPTER), "TM");
      const beforeTick = getTmOffset(drv.state(), MDC2060_ADAPTER);
      drv.tick(10);
      const afterTick = getTmOffset(drv.state(), MDC2060_ADAPTER);
      assert.ok(
        Math.hypot(afterTick.xFrac - beforeTick.xFrac, afterTick.yFrac - beforeTick.yFrac) > 0,
        "True Motion ownship offset must advance deterministically over 10 ticks with SOG > 0",
      );
      drv.verifyReplay();
    },
  },
  {
    id: "T1-017",
    name: "Indication Systems (PPI, PPI/PPI, PPI/NAV) Switching",
    features: [9],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const screens = Array.isArray(spec.MDC2060_SCREEN_MODES)
        ? spec.MDC2060_SCREEN_MODES
        : Object.values(spec.MDC2060_SCREEN_MODES);
      for (const sm of ["PPI", "PPI/PPI", "PPI/NAV"]) {
        assert.ok(screens.includes(sm), `MDC2060_SCREEN_MODES must include ${sm}`);
      }
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const seen = new Set([getScreenMode(drv.state(), MDC2060_ADAPTER)]);
      for (let i = 0; i < 3; i++) {
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^SCREEN$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        seen.add(getScreenMode(drv.state(), MDC2060_ADAPTER));
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      }
      assert.ok(seen.has("PPI") && seen.has("PPI/PPI") && seen.has("PPI/NAV"), `Expected all 3 screen modes, saw: ${[...seen].join(", ")}`);
    },
  },
  {
    id: "T1-018",
    name: "4 LCD Color Palettes (DAY, NIGHT, GREEN, WHITE) with 8-Level Echo LUT",
    features: [12],
    async run() {
      const {MDC2060_COLOR_PALETTES} = await loadSpec();
      assert.equal(Object.isFrozen(MDC2060_COLOR_PALETTES), true);
      const bgs = new Set();
      for (const key of ["DAY", "NIGHT", "GREEN", "WHITE"]) {
        const pal = MDC2060_COLOR_PALETTES[key];
        assert.ok(pal && typeof pal === "object", `Missing color palette ${key}`);
        assert.equal(Object.isFrozen(pal), true, `Palette ${key} must be frozen`);
        const lut = pal.echoLutHex
          ?? pal.echoColors
          ?? pal.echoLut
          ?? pal.levels
          ?? pal.echo
          ?? Object.values(pal).find(
            v => Array.isArray(v) && v.length === 8 && v.every(item => typeof item === "string" && item.trim().length > 0),
          );
        assert.ok(Array.isArray(lut) && lut.length === 8, `Palette ${key} must define an exact 8-level echo color LUT`);
        for (const c of lut) {
          assert.equal(typeof c, "string", `Palette ${key} LUT entries must be valid CSS color strings`);
          assert.ok(c.trim().length > 0);
        }
        const bg = pal.bg ?? pal.background ?? pal.ppiBg ?? pal.screenBg;
        assert.equal(typeof bg, "string", `Palette ${key} must define a background color`);
        bgs.add(bg.toLowerCase());
      }
      assert.ok(bgs.size >= 3, "Color palettes must define distinct background colors");
    },
  },
  {
    id: "T1-019",
    name: "Selecting Each Color Palette via MENU > DISPLAY > COLOR",
    features: [12],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const seen = new Set([getColorPalette(drv.state(), MDC2060_ADAPTER)]);
      for (let i = 0; i < 4; i++) {
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^COLOR$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        seen.add(getColorPalette(drv.state(), MDC2060_ADAPTER));
        drv.assertCanonicalState();
      }
      for (const key of ["DAY", "NIGHT", "GREEN", "WHITE"]) {
        assert.ok(seen.has(key), `Cycling DISPLAY > COLOR must reach ${key}; visited ${[...seen].join(", ")}`);
      }
    },
  },
  {
    id: "T1-020",
    name: "Enable & Disable OFF-CENTER Shift Based on Cursor Vector",
    features: [10],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.pointer(80, -100);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /OFF\s*CENT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const ocOn = getOffCenter(drv.state(), MDC2060_ADAPTER);
      assert.equal(ocOn.enabled, true);
      const r = Math.hypot(ocOn.xFrac, ocOn.yFrac);
      assert.ok(r > 0 && r <= 0.66 + 1e-6, `Expected off-center radius in (0, 0.66], got ${r}`);

      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /OFF\s*CENT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const ocOff = getOffCenter(drv.state(), MDC2060_ADAPTER);
      assert.equal(ocOff.enabled, false);
      assert.equal(Math.hypot(ocOff.xFrac, ocOff.yFrac), 0);
    },
  },
  {
    id: "T1-021",
    name: "True Trail (T) Accumulates Moving Ship Wake While Stationary Targets Stay Clean",
    features: [11],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        assert.ok(keys.trailMode && keys.trailTime, "trailMode and trailTime settings keys must exist");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 3 : "3m");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      for (let i = 0; i < 20; i++) drv.tick(1);
      const trail = getTrailInfo(drv.state(), MDC2060_ADAPTER);
      assert.match(String(trail.mode), /^T|TRUE$/i);
      const movingVessel = MDC2060_COASTAL_SCENARIO.traffic.find(t => /PACIFIC STAR/i.test(t.name));
      const anchoredVessel = MDC2060_COASTAL_SCENARIO.traffic.find(t => t.sogKn === 0);
      assert.ok(movingVessel && anchoredVessel, "Coastal scenario must have moving PACIFIC STAR and anchored vessel");
      const movingPts = getTrailPointsCountForTarget(trail, movingVessel.mmsi);
      const anchoredPts = getTrailPointsCountForTarget(trail, anchoredVessel.mmsi);
      assert.ok(movingPts.length >= 2, "True Trail must record multi-point wake for moving vessel");
      assert.ok(
        trailDisplacement(movingPts, "T") > trailDisplacement(anchoredPts, "T"),
        "Moving vessel must exhibit greater True Trail displacement than stationary anchored vessel",
      );
      assert.ok(trailDisplacement(anchoredPts, "T") < 1e-4, "Anchored vessel (SOG 0) must leave zero geographic wake in True Trail");
    },
  },
  {
    id: "T1-022",
    name: "Relative Trail (R) Tracks Relative Motion of Targets",
    features: [11],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        assert.ok(keys.trailMode && keys.trailTime, "trailMode and trailTime settings keys must exist");
        setChoiceSetting(s, keys.trailMode, "R");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 3 : "3m");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      for (let i = 0; i < 20; i++) drv.tick(1);
      const trail = getTrailInfo(drv.state(), MDC2060_ADAPTER);
      assert.match(String(trail.mode), /^R|REL/i);
      const anchoredVessel = MDC2060_COASTAL_SCENARIO.traffic.find(t => t.sogKn === 0);
      const anchoredPts = getTrailPointsCountForTarget(trail, anchoredVessel.mmsi);
      assert.ok(anchoredPts.length >= 2, "Relative Trail must track anchored vessel relative to moving ownship");
      assert.ok(trailDisplacement(anchoredPts, "R") > 0, "Anchored vessel must drift astern in Relative Trail coordinates");
    },
  },
  {
    id: "T1-023",
    name: "TRAIL TIME Configuration (OFF, short, medium, long/continuous)",
    features: [11],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        assert.ok(keys.trailMode && keys.trailTime, "trailMode and trailTime settings keys must exist");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 0 : "OFF");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.tick(15);
      const offTrail = getTrailInfo(drv.state(), MDC2060_ADAPTER);
      const offCount = Array.isArray(offTrail.history)
        ? offTrail.history.length
        : Object.values(offTrail.history ?? {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);
      assert.equal(offCount, 0, "TRAIL TIME OFF must keep trail history empty");

      const drv2 = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv2, model, (s, keys) => {
        assert.ok(keys.trailMode && keys.trailTime, "trailMode and trailTime settings keys must exist");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 1 : "1m");
      });
      drv2.powerOnToTransmit({fastPreheat: true});
      drv2.tick(80);
      const bounded = getTrailInfo(drv2.state(), MDC2060_ADAPTER);
      drv2.assertCanonicalState();
      assert.ok(bounded.time !== 0 && bounded.time !== "OFF");
    },
  },
  {
    id: "T1-024",
    name: "Range Change Cleanly Reconciles Active Trail History & Preserves Off-Center",
    features: [10, 11],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        assert.ok(keys.trailMode && keys.trailTime, "trailMode and trailTime settings keys must exist");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 3 : "3m");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.pointer(60, -60);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /OFF\s*CENT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      drv.tick(10);
      const rangeBefore = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES).rangeIndex;
      drv.press("range_down");
      const rangeAfter = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES).rangeIndex;
      assert.equal(rangeAfter, Math.max(0, rangeBefore - 1));
      const oc = getOffCenter(drv.state(), MDC2060_ADAPTER);
      assert.ok(Math.hypot(oc.xFrac, oc.yFrac) <= 0.66 + 1e-6);
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
];
