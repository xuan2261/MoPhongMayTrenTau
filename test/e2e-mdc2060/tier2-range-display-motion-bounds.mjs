import assert from "node:assert/strict";
import {loadAdapter, loadModel, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  applySettingsViaCodecRestore,
  createMdcBridgeDriver,
  getBrilliance,
  getMeasurementInfo,
  getOffCenter,
  getPresentationMode,
  getRangeInfo,
  getScreenMode,
  getSensorWarnings,
  getTmOffset,
  isMenuOpen,
  operateMenuItem,
  setChoiceSetting,
} from "./helpers/session-driver.mjs";

export const TIER = 2;
export const SUITE = "tier2-range-display-motion-bounds";

export const TESTS = [
  {
    id: "T2-021",
    name: "Range Index Lower Clamp at 0 (0.0625 NM)",
    features: [6],
    async run() {
      const {MDC2060_RANGES} = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      for (let i = 0; i < 25; i++) drv.press("range_down");
      const r = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
      assert.equal(r.rangeIndex, 0);
      assert.equal(r.rangeNm, 0.0625);
      assert.equal(r.ringNm, 0.03125);
      assert.equal(r.rings, 2);
      assert.equal(r.pw, "S1");
    },
  },
  {
    id: "T2-022",
    name: "Range Index Upper Clamp at 17 (64 NM)",
    features: [6],
    async run() {
      const {MDC2060_RANGES} = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      for (let i = 0; i < 25; i++) drv.press("range_up");
      const r = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
      assert.equal(r.rangeIndex, 17);
      assert.equal(r.rangeNm, 64);
      assert.equal(r.ringNm, 16);
      assert.equal(r.rings, 4);
      assert.equal(r.pw, "L");
    },
  },
  {
    id: "T2-023",
    name: "PPI/PPI Sub-Range Index Clamps Cleanly at 0 and 17",
    features: [6, 9],
    async run() {
      const {MDC2060_RANGES} = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.screenMode, "PPI/PPI");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getScreenMode(drv.state(), MDC2060_ADAPTER), "PPI/PPI");
      const rInit = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);

      for (let i = 0; i < 25; i++) drv.press("sub_range_down");
      const rLow = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
      assert.equal(rLow.subRangeIndex, 0);
      assert.equal(rLow.subRangeNm, 0.0625);
      assert.equal(rLow.rangeIndex, rInit.rangeIndex, "sub_range_down must not alter main rangeIndex");
      assert.equal(rLow.rangeNm, rInit.rangeNm, "sub_range_down must not alter main rangeNm");
      drv.press("sub_range_down");
      const rLowExtra = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
      assert.equal(rLowExtra.subRangeIndex, 0, "Extra sub_range_down at 0 must remain clamped at 0 (no wrap)");
      assert.equal(rLowExtra.subRangeNm, 0.0625, "Extra sub_range_down at 0 must keep subRangeNm=0.0625");
      assert.equal(rLowExtra.rangeIndex, rInit.rangeIndex, "Extra sub_range_down must not alter main rangeIndex");
      assert.equal(rLowExtra.rangeNm, rInit.rangeNm, "Extra sub_range_down must not alter main rangeNm");
      drv.assertCanonicalState();

      for (let i = 0; i < 25; i++) drv.press("sub_range_up");
      const rHigh = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
      assert.equal(rHigh.subRangeIndex, 17);
      assert.equal(rHigh.subRangeNm, 64);
      assert.equal(rHigh.rangeIndex, rInit.rangeIndex, "sub_range_up must not alter main rangeIndex");
      assert.equal(rHigh.rangeNm, rInit.rangeNm, "sub_range_up must not alter main rangeNm");
      drv.press("sub_range_up");
      const rHighExtra = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
      assert.equal(rHighExtra.subRangeIndex, 17, "Extra sub_range_up at 17 must remain clamped at 17 (no wrap)");
      assert.equal(rHighExtra.subRangeNm, 64, "Extra sub_range_up at 17 must keep subRangeNm=64");
      assert.equal(rHighExtra.rangeIndex, rInit.rangeIndex, "Extra sub_range_up must not alter main rangeIndex");
      assert.equal(rHighExtra.rangeNm, rInit.rangeNm, "Extra sub_range_up must not alter main rangeNm");
      drv.assertCanonicalState();

      drv.press("range_down");
      const rAfterMain = getRangeInfo(drv.state(), MDC2060_ADAPTER, MDC2060_RANGES);
      assert.equal(rAfterMain.rangeIndex, rInit.rangeIndex - 1, "main range_down must decrement main rangeIndex");
      assert.equal(rAfterMain.subRangeIndex, 17, "main range_down must not alter subRangeIndex");
      assert.equal(rAfterMain.subRangeNm, 64, "main range_down must not alter subRangeNm");
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
  {
    id: "T2-024",
    name: "OFF-CENTER Clamped Strictly hypot(xFrac, yFrac) <= 0.66 on Extreme Cursor Corners",
    features: [10],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.pointer(500, 500);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /OFF\s*CENT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const oc = getOffCenter(drv.state(), MDC2060_ADAPTER);
      assert.equal(oc.enabled, true);
      const r = Math.hypot(oc.xFrac, oc.yFrac);
      assert.ok(r > 0 && r <= 0.66 + 1e-6, `OFF-CENTER must clamp hypot <= 0.66, got ${r}`);
    },
  },
  {
    id: "T2-025",
    name: "OFF-CENTER Bounds Preserved Across All 4 Quadrants (+-1, +-1)",
    features: [10],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const corners = [
        {dx: 480, dy: 480},
        {dx: -480, dy: 480},
        {dx: -480, dy: -480},
        {dx: 480, dy: -480},
      ];
      for (const c of corners) {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        drv.pointer(c.dx, c.dy);
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /OFF\s*CENT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        const oc = getOffCenter(drv.state(), MDC2060_ADAPTER);
        assert.equal(oc.enabled, true);
        const r = Math.hypot(oc.xFrac, oc.yFrac);
        assert.ok(r > 0 && r <= 0.66 + 1e-6, `Corner (${c.dx},${c.dy}) off-center exceeded 0.66: ${r}`);
      }
    },
  },
  {
    id: "T2-026",
    name: "True Motion (TM) 66% Opposite-Edge Auto-Reset",
    features: [8],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.motionMode, "TM");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      // Step down to 0.125 NM (index 1) so 10.5 kn (~0.00292 NM/s) traverses 0.66*0.125 = 0.0825 NM within ~35 ticks
      for (let i = 0; i < 15; i++) drv.press("range_down");
      drv.press("range_up");
      let sawReset = false;
      let prevX = getTmOffset(drv.state(), MDC2060_ADAPTER).xFrac;
      let prevY = getTmOffset(drv.state(), MDC2060_ADAPTER).yFrac;
      let prevResetCount = getTmOffset(drv.state(), MDC2060_ADAPTER).resetCount;
      for (let step = 0; step < 60; step++) {
        drv.tick(2);
        const tm = getTmOffset(drv.state(), MDC2060_ADAPTER);
        const r = Math.hypot(tm.xFrac, tm.yFrac);
        assert.ok(r <= 0.66 + 0.05, `TM offset radius must remain bounded near 0.66, got ${r}`);
        if (tm.resetCount > prevResetCount || (Math.hypot(prevX, prevY) > 0.3 && (tm.xFrac * prevX + tm.yFrac * prevY) < 0)) {
          sawReset = true;
          break;
        }
        prevX = tm.xFrac;
        prevY = tm.yFrac;
        prevResetCount = tm.resetCount;
      }
      assert.equal(sawReset, true, "TM ownship must auto-reset to opposite 66% edge when reaching display boundary");
      drv.verifyReplay();
    },
  },
  {
    id: "T2-027",
    name: "HDG NO SIGNAL (headingSensor=false) Degrades N-UP & C-UP Fail-Closed",
    features: [7],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      for (const mode of ["N-UP", "C-UP"]) {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        applySettingsViaCodecRestore(drv, model, (s, keys) => {
          setChoiceSetting(s, keys.presentationMode, mode);
        });
        drv.powerOnToTransmit({fastPreheat: true});
        assert.equal(getSensorWarnings(drv.state(), MDC2060_ADAPTER).hdgNoSignal, false, "HDG warning must be clear prior to fault");
        assert.equal(getPresentationMode(drv.state(), MDC2060_ADAPTER), mode, `Presentation mode must start in ${mode}`);
        const pBefore = drv.probe();

        drv.fixture("headingSensor", false);
        drv.tick(2);
        const warns = getSensorWarnings(drv.state(), MDC2060_ADAPTER);
        assert.equal(warns.hdgNoSignal, true, `headingSensor=false in ${mode} must raise HDG NO SIGNAL warning`);
        const p = drv.probe();
        const st = drv.state();
        const effective = p.effectivePresentationMode ?? st?.effectivePresentationMode ?? getPresentationMode(st, MDC2060_ADAPTER);
        const degraded =
          effective === "H-UP" ||
          (pBefore.headingDeg !== undefined && p.headingDeg === null) ||
          p.headingStabilized === false ||
          p.headingValid === false ||
          st?.sensors?.headingValid === false;
        assert.equal(
          degraded,
          true,
          `headingSensor=false in ${mode} must degrade effective presentation to H-UP or invalidate heading stabilization/telemetry`,
        );
        drv.assertCanonicalState();
      }
    },
  },
  {
    id: "T2-028",
    name: "L/L NO SIGNAL (gpsSensor=false) Degrades W-UP & PPI/NAV Position Fail-Closed",
    features: [7, 9],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.presentationMode, "W-UP");
        setChoiceSetting(s, keys.screenMode, "PPI/NAV");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.pointer(40, -30);
      assert.equal(getSensorWarnings(drv.state(), MDC2060_ADAPTER).llNoSignal, false, "L/L warning must be clear before GPS fault");
      const cursorBefore = getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor;
      assert.ok(
        Number.isFinite(Number(cursorBefore?.lat)) && Number.isFinite(Number(cursorBefore?.lon)),
        "Cursor LAT/LON must be finite before GPS loss",
      );

      drv.fixture("gpsSensor", false);
      drv.tick(2);
      const warns = getSensorWarnings(drv.state(), MDC2060_ADAPTER);
      assert.equal(warns.llNoSignal, true, "gpsSensor=false must raise L/L NO SIGNAL warning");
      const cursor = getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor;
      assert.equal(cursor?.lat, null, "Cursor LAT must degrade fail-closed to null when GPS is lost");
      assert.equal(cursor?.lon, null, "Cursor LON must degrade fail-closed to null when GPS is lost");
      drv.assertCanonicalState();
    },
  },
  {
    id: "T2-029",
    name: "speedSensor=false Degrades TM & True Trail Cleanly",
    features: [8, 11],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.motionMode, "TM");
        setChoiceSetting(s, keys.trailMode, "T");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("speedSensor", false);
      drv.tick(5);
      const warns = getSensorWarnings(drv.state(), MDC2060_ADAPTER);
      assert.equal(warns.speedNoSignal, true, "speedSensor=false must raise speed sensor warning");
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
  {
    id: "T2-030",
    name: "EBL1 & EBL2 Bearing Wrap-Around Across 0 / 360 Boundary",
    features: [19],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(getPresentationMode(drv.state(), MDC2060_ADAPTER), "N-UP", "T2-030 must operate in N-UP so screen top is 000 deg True");

      for (const {menuRe, field} of [{menuRe: /^EBL1$/i, field: "ebl1"}, {menuRe: /^EBL2$/i, field: "ebl2"}]) {
        drv.touch(220, 100, "down");
        drv.touch(220, 100, "up");
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, menuRe, {adjustSteps: 1, confirm: true, closeAfter: true});
        const enabledNow = Boolean(getMeasurementInfo(drv.state(), MDC2060_ADAPTER)[field]?.enabled);
        assert.equal(enabledNow, true, `${field.toUpperCase()} must activate on single toggle`);

        let brgWest = Number(getMeasurementInfo(drv.state(), MDC2060_ADAPTER)[field]?.bearingDeg ?? getMeasurementInfo(drv.state(), MDC2060_ADAPTER)[field]?.angleDeg);
        for (let step = 0; step < 200 && !(brgWest > 180 && brgWest < 360); step++) {
          drv.pad("left");
          const cur = getMeasurementInfo(drv.state(), MDC2060_ADAPTER)[field];
          brgWest = Number(cur?.bearingDeg ?? cur?.angleDeg);
        }
        assert.ok(
          Number.isFinite(brgWest) && brgWest > 180 && brgWest < 360,
          `${field.toUpperCase()} West-of-North bearing must wrap into (180, 360), got ${brgWest}`,
        );

        drv.touch(260, 100, "down");
        drv.touch(260, 100, "up");
        let brgEast = Number(getMeasurementInfo(drv.state(), MDC2060_ADAPTER)[field]?.bearingDeg ?? getMeasurementInfo(drv.state(), MDC2060_ADAPTER)[field]?.angleDeg);
        for (let step = 0; step < 200 && !(brgEast >= 0 && brgEast < 180); step++) {
          drv.pad("right");
          const cur = getMeasurementInfo(drv.state(), MDC2060_ADAPTER)[field];
          brgEast = Number(cur?.bearingDeg ?? cur?.angleDeg);
        }
        assert.ok(
          Number.isFinite(brgEast) && brgEast >= 0 && brgEast < 180,
          `${field.toUpperCase()} East-of-North bearing must wrap into [0, 180), got ${brgEast}`,
        );
        assert.notEqual(brgEast, brgWest, `${field.toUpperCase()} bearing must change across 0/360 wrap`);
      }

      const finalM = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(finalM.ebl1?.enabled), true, "EBL1 must remain enabled");
      assert.equal(Boolean(finalM.ebl2?.enabled), true, "EBL2 must remain enabled");
      const finalB1 = Number(finalM.ebl1?.bearingDeg ?? finalM.ebl1?.angleDeg);
      const finalB2 = Number(finalM.ebl2?.bearingDeg ?? finalM.ebl2?.angleDeg);
      assert.ok(Number.isFinite(finalB1) && finalB1 >= 0 && finalB1 < 360);
      assert.ok(Number.isFinite(finalB2) && finalB2 >= 0 && finalB2 < 360);
    },
  },
  {
    id: "T2-031",
    name: "EBL1 FLOAT Origin Clamped Inside PPI Circle",
    features: [19],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.pointer(500, 500);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /EBL1\s*FLOAT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const ebl1 = getMeasurementInfo(drv.state(), MDC2060_ADAPTER).ebl1;
      assert.equal(Boolean(ebl1?.floating ?? ebl1?.floatEnabled), true, "EBL1 FLOAT must enable floating origin");
      const ox = Number(ebl1?.originX ?? ebl1?.origin?.x ?? ebl1?.floatX);
      const oy = Number(ebl1?.originY ?? ebl1?.origin?.y ?? ebl1?.floatY);
      assert.ok(
        Number.isFinite(ox) && Number.isFinite(oy) && Math.hypot(ox, oy) > 0 && Math.hypot(ox, oy) <= 1.0 + 1e-6,
        `EBL1 FLOAT origin must detach non-zero and clamp inside unit circle: (${ox}, ${oy})`,
      );
    },
  },
  {
    id: "T2-032",
    name: "VRM1 & VRM2 Clamped to [0, activeRangeNm] Including After Down-Ranging",
    features: [20],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM2$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const rangeBefore = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES).rangeNm;
      const mBefore = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(mBefore.vrm1?.enabled), true, "VRM1 must be enabled");
      assert.equal(Boolean(mBefore.vrm2?.enabled), true, "VRM2 must be enabled");
      const vrm1Before = Number(mBefore.vrm1?.rangeNm ?? mBefore.vrm1?.value);
      const vrm2Before = Number(mBefore.vrm2?.rangeNm ?? mBefore.vrm2?.value);
      assert.ok(Number.isFinite(vrm1Before) && vrm1Before > 0, `VRM1 before down-range must be > 0, got ${vrm1Before}`);
      assert.ok(Number.isFinite(vrm2Before) && vrm2Before > 0, `VRM2 before down-range must be > 0, got ${vrm2Before}`);

      for (let i = 0; i < 8; i++) drv.press("range_down");
      const activeRange = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES).rangeNm;
      assert.ok(activeRange < rangeBefore, `Down-ranging must reduce activeRange (${activeRange} < ${rangeBefore})`);
      const mAfter = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      const vrm1After = Number(mAfter.vrm1?.rangeNm ?? mAfter.vrm1?.value);
      const vrm2After = Number(mAfter.vrm2?.rangeNm ?? mAfter.vrm2?.value);
      assert.ok(Number.isFinite(vrm1After) && vrm1After >= 0 && vrm1After <= activeRange + 1e-6, `VRM1 (${vrm1After}) must clamp to [0, ${activeRange}] after down-ranging`);
      assert.ok(Number.isFinite(vrm2After) && vrm2After >= 0 && vrm2After <= activeRange + 1e-6, `VRM2 (${vrm2After}) must clamp to [0, ${activeRange}] after down-ranging`);
    },
  },
  {
    id: "T2-033",
    name: "Parallel Index (PI) Spacing Strictly > 0 & Bearing [0, 360)",
    features: [21],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /PI\s*LINE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const pi = getMeasurementInfo(drv.state(), MDC2060_ADAPTER).pi;
      assert.equal(Boolean(pi?.enabled), true, "PI LINE must be enabled");
      const spacing = Number(pi?.spacingNm);
      const brg = Number(pi?.bearingDeg);
      assert.ok(Number.isFinite(spacing) && spacing > 0, `PI spacingNm must stay strictly > 0, got ${spacing}`);
      assert.ok(Number.isFinite(brg) && brg >= 0 && brg < 360);
    },
  },
  {
    id: "T2-034",
    name: "Menus Ignored While OFF or PREHEAT",
    features: [26, 27],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.holdPress("menu", 200);
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false);
      drv.holdPress("menu", 1600);
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false);

      drv.holdPress("power", 200);
      drv.holdPress("menu", 200);
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false, "Short MENU must not open while in PREHEAT");
      drv.holdPress("menu", 1600);
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false, "Long MENU must not open while in PREHEAT");
    },
  },
  {
    id: "T2-035",
    name: "Closing Menu Without Confirming Preserves Valid State & Cursor Pad Returns to PPI",
    features: [26],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.holdPress("menu", 200);
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, true);
      drv.pad("down");
      drv.pad("down");
      drv.holdPress("menu", 200);
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false);

      const cursorBefore = structuredClone(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor);
      drv.pad("up");
      drv.pad("right");
      const cursorAfter = getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor;
      assert.notDeepEqual(cursorAfter, cursorBefore, "After closing menu, cursorpad must resume moving PPI crosshair");
    },
  },
  {
    id: "T2-036",
    name: "BRILL Level Clamped at Min & Max Bounds",
    features: [3],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.holdPress("power", 250);
      for (let i = 0; i < 20; i++) drv.pad("left");
      const minB = getBrilliance(drv.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(minB) && minB >= 1, `Minimum brilliance must clamp >= 1 (never 0/negative), got ${minB}`);
      for (let i = 0; i < 20; i++) drv.pad("right");
      const maxB = getBrilliance(drv.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(maxB) && maxB > minB, `Maximum brilliance (${maxB}) must exceed min (${minB})`);
      drv.pad("right");
      assert.equal(getBrilliance(drv.state(), MDC2060_ADAPTER), maxB, "Brilliance must clamp cleanly at upper bound");
    },
  },
];
