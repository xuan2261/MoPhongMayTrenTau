import assert from "node:assert/strict";
import {loadAdapter, loadLessons, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  bridgeSessionHash,
  createMdcBridgeDriver,
  getMeasurementInfo,
  getPresentationMode,
  getScreenMode,
  getTrailInfo,
  operateMenuItem,
} from "./helpers/session-driver.mjs";

export const TIER = 4;
export const SUITE = "tier4-all-seven-lessons-e2e";

function assertTrainingCompliance(res, lessonId) {
  assert.equal(res.hardwareApproved, false, `${lessonId}: hardwareApproved must be false`);
  assert.equal(res.publicReleaseEligible, false, `${lessonId}: publicReleaseEligible must be false`);
  assert.equal(res.firmwareInstalled, null, `${lessonId}: firmwareInstalled must be null`);
}

export const TESTS = [
  {
    id: "T4-009",
    name: "Full Positive End-to-End Walkthrough of MDC2060-LEARN-01..04",
    features: [2, 6, 16, 17, 18, 19, 20, 33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO, MDC2060_STORM_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();

      // LEARN-01: Power -> Preheat -> ST'BY -> TX
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {scenario: MDC2060_COASTAL_SCENARIO});
        assert.equal(res.passed, true, `LEARN-01 failed: ${JSON.stringify(res.reasons)}`);
        assert.equal(res.replayVerified, true);
        assert.ok(res.score > 0);
        assertTrainingCompliance(res, "MDC2060-LEARN-01");
      }

      // LEARN-02: Range 6 -> 3 NM + GAIN + STC
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        drv.press("range_down");
        drv.press("range_down");
        drv.rotate("gain", 3);
        drv.rotate("stc", 4);
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-02", {scenario: MDC2060_COASTAL_SCENARIO});
        assert.equal(res.passed, true, `LEARN-02 failed: ${JSON.stringify(res.reasons)}`);
        assert.equal(res.replayVerified, true);
        assert.ok(res.score > 0);
        assertTrainingCompliance(res, "MDC2060-LEARN-02");
      }

      // LEARN-03: EBL1 & VRM1 Target Measurement
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        // Move crosshair cursor to measure target bearing & range as required by MDC2060-LEARN-03
        drv.pad("right");
        drv.pad("up");
        const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
        assert.equal(Boolean(m.ebl1?.enabled && m.vrm1?.enabled), true, "LEARN-03 must enable EBL1 and VRM1");
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-03", {scenario: MDC2060_COASTAL_SCENARIO});
        assert.equal(res.passed, true, `LEARN-03 failed: ${JSON.stringify(res.reasons)}`);
        assert.equal(res.replayVerified, true);
        assert.ok(res.score > 0);
        assertTrainingCompliance(res, "MDC2060-LEARN-03");
      }

      // LEARN-04: Storm Clutter FTC + IR
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_STORM_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^FTC$/i, {adjustSteps: 5, confirm: true, closeAfter: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^IR$/i, {adjustSteps: 2, confirm: true, closeAfter: true});
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-04", {scenario: MDC2060_STORM_SCENARIO});
        assert.equal(res.passed, true, `LEARN-04 failed: ${JSON.stringify(res.reasons)}`);
        assert.equal(res.replayVerified, true);
        assert.ok(res.score > 0);
        assertTrainingCompliance(res, "MDC2060-LEARN-04");
      }
    },
  },
  {
    id: "T4-010",
    name: "Full Positive End-to-End Walkthrough of MDC2060-LEARN-05..07",
    features: [7, 9, 11, 23, 24, 25, 33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();

      // LEARN-05: N-UP + True Trail + PPI/PPI
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        if (String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode ?? "").toUpperCase() !== "T") {
          operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /TRAIL\s*MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        }
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /TRAIL\s*TIME/i, {adjustSteps: 2, confirm: true, closeAfter: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^SCREEN$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        assert.equal(getPresentationMode(drv.state(), MDC2060_ADAPTER), "N-UP", "LEARN-05 requires N-UP");
        assert.equal(String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode ?? "").toUpperCase(), "T", "LEARN-05 requires True Trail (T)");
        assert.equal(getScreenMode(drv.state(), MDC2060_ADAPTER), "PPI/PPI", "LEARN-05 requires PPI/PPI");
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-05", {scenario: MDC2060_COASTAL_SCENARIO});
        assert.equal(res.passed, true, `LEARN-05 failed: ${JSON.stringify(res.reasons)}`);
        assert.equal(res.replayVerified, true);
        assert.ok(res.score > 0);
        assertTrainingCompliance(res, "MDC2060-LEARN-05");
      }

      // LEARN-06: Guard Zone ALARM IN + alarm_ack
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        drv.tick(3);
        drv.press("alarm_ack");
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-06", {scenario: MDC2060_COASTAL_SCENARIO});
        assert.equal(res.passed, true, `LEARN-06 failed: ${JSON.stringify(res.reasons)}`);
        assert.equal(res.replayVerified, true);
        assert.ok(res.score > 0);
        assertTrainingCompliance(res, "MDC2060-LEARN-06");
      }

      // LEARN-07: ATA acquire + AIS CPA/TCPA check
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
        drv.tick(6);
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^AIS$/i, /^INFO$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
        const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-07", {scenario: MDC2060_COASTAL_SCENARIO});
        assert.equal(res.passed, true, `LEARN-07 failed: ${JSON.stringify(res.reasons)}`);
        assert.equal(res.replayVerified, true);
        assert.ok(res.score > 0);
        assertTrainingCompliance(res, "MDC2060-LEARN-07");
      }
    },
  },
  {
    id: "T4-011",
    name: "Full Negative / Abort / Incomplete Verification Across All 7 Lessons",
    features: [33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO, MDC2060_STORM_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();

      const negativeRunners = [
        {
          id: "MDC2060-LEARN-01",
          scenario: MDC2060_COASTAL_SCENARIO,
          run: drv => { drv.powerOnToStandby({fastPreheat: true}); }, // Stopped at ST'BY, never TX
        },
        {
          id: "MDC2060-LEARN-02",
          scenario: MDC2060_COASTAL_SCENARIO,
          run: drv => { drv.powerOnToTransmit({fastPreheat: true}); drv.press("range_down"); }, // Wrong range & no GAIN/STC
        },
        {
          id: "MDC2060-LEARN-03",
          scenario: MDC2060_COASTAL_SCENARIO,
          run: drv => {
            drv.powerOnToTransmit({fastPreheat: true});
            operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
            // Omitted VRM1
          },
        },
        {
          id: "MDC2060-LEARN-04",
          scenario: MDC2060_STORM_SCENARIO,
          run: drv => {
            drv.powerOnToTransmit({fastPreheat: true});
            operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^FTC$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
            // Insufficient FTC and omitted IR
          },
        },
        {
          id: "MDC2060-LEARN-05",
          scenario: MDC2060_COASTAL_SCENARIO,
          run: drv => {
            drv.powerOnToTransmit({fastPreheat: true});
            operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
            // Omitted PPI/PPI and True Trail
          },
        },
        {
          id: "MDC2060-LEARN-06",
          scenario: MDC2060_COASTAL_SCENARIO,
          run: drv => {
            drv.powerOnToTransmit({fastPreheat: true});
            operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
            // Never acknowledged alarm
          },
        },
        {
          id: "MDC2060-LEARN-07",
          scenario: MDC2060_COASTAL_SCENARIO,
          run: drv => {
            drv.powerOnToTransmit({fastPreheat: true});
            // Never acquired ATA target or inspected AIS
          },
        },
      ];

      for (const neg of negativeRunners) {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: neg.scenario});
        neg.run(drv);
        const res = assessMdc2060Lesson(drv.bridge, neg.id, {scenario: neg.scenario});
        assert.equal(res.passed, false, `${neg.id} negative path MUST fail (got passed=true)`);
        assert.ok(Array.isArray(res.reasons) && res.reasons.length > 0, `${neg.id} negative path must report failure reasons`);
        assert.equal(res.score, 0);
        assertTrainingCompliance(res, neg.id);
      }
    },
  },
  {
    id: "T4-012",
    name: "Continuous Multi-Lesson Watch (startSeq > 0 + startSessionHash Chained Witness)",
    features: [31, 33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      // Lesson 1
      drv.powerOnToTransmit({fastPreheat: true});
      const r1 = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(r1.passed, true);

      // Snapshot before Lesson 2
      const seq2 = drv.bridge.history.length;
      const hash2 = bridgeSessionHash(drv.bridge);
      drv.press("range_down");
      drv.press("range_down");
      drv.rotate("gain", 3);
      drv.rotate("stc", 4);
      const r2 = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-02", {
        scenario: MDC2060_COASTAL_SCENARIO,
        startSeq: seq2,
        startSessionHash: hash2,
      });
      assert.equal(r2.passed, true, `Chained LEARN-02 failed: ${JSON.stringify(r2.reasons)}`);

      // Snapshot before Lesson 3
      const seq3 = drv.bridge.history.length;
      const hash3 = bridgeSessionHash(drv.bridge);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      // Move crosshair cursor to measure target bearing & range as required by MDC2060-LEARN-03
      drv.pad("right");
      drv.pad("up");
      const r3 = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-03", {
        scenario: MDC2060_COASTAL_SCENARIO,
        startSeq: seq3,
        startSessionHash: hash3,
      });
      assert.equal(r3.passed, true, `Chained LEARN-03 failed: ${JSON.stringify(r3.reasons)}`);

      // Tampering with witness must fail closed
      let tamperRejected = false;
      try {
        const bad = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-03", {
          scenario: MDC2060_COASTAL_SCENARIO,
          startSeq: seq3,
          startSessionHash: "f0-fnv1a32-deadbeef",
        });
        tamperRejected = bad?.passed === false;
      } catch (err) {
        assert.ok(!(err instanceof ReferenceError || err instanceof SyntaxError), `Unexpected code error: ${err}`);
        tamperRejected = true;
      }
      assert.equal(tamperRejected, true);
    },
  },
];
