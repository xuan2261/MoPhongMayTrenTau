import assert from "node:assert/strict";
import {
  loadAdapter,
  loadI18n,
  loadLessons,
  loadModel,
  loadScenarios,
  loadSpec,
  readWorkspaceText,
} from "./helpers/module-loader.mjs";
import {
  assertDeepFrozen,
  createMdcBridgeDriver,
  getLanguage,
  getLanguageCodes,
  getMeasurementInfo,
  getTrailInfo,
  operateMenuItem,
} from "./helpers/session-driver.mjs";

export const TIER = 1;
export const SUITE = "tier1-lessons-i18n";

function assertUnvalidatedTrainingResult(res) {
  assert.equal(res.hardwareApproved, false, "hardwareApproved must be false");
  assert.equal(res.publicReleaseEligible, false, "publicReleaseEligible must be false");
  assert.equal(res.firmwareInstalled, null, "firmwareInstalled must be null");
}

export const TESTS = [
  {
    id: "T1-097",
    name: "MDC2060_LESSONS Exports Exact 7 Frozen Lessons (MDC2060-LEARN-01..07)",
    features: [33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_LESSONS, getMdc2060Lesson} = await loadLessons();
      assert.equal(MDC2060_LESSONS.length, 7);
      assertDeepFrozen(MDC2060_LESSONS, "MDC2060_LESSONS");
      for (let i = 1; i <= 7; i++) {
        const id = `MDC2060-LEARN-0${i}`;
        const lesson = MDC2060_LESSONS[i - 1];
        assert.equal(lesson.id, id);
        assert.equal(getMdc2060Lesson(id), lesson);
        assert.equal(lesson.profileId, spec.MDC2060_ID);
        assert.equal(lesson.hardwareValidated, false);
        assert.equal(lesson.releaseApproved, false);
        assert.ok(typeof lesson.titleVi === "string" && lesson.titleVi.length > 0);
        assert.ok(typeof lesson.instructionVi === "string" && lesson.instructionVi.length > 0);
      }
    },
  },
  {
    id: "T1-098",
    name: "MDC2060-LEARN-01 Positive Pass (Power ON -> Preheat/ST'BY -> TX)",
    features: [33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(res.passed, true, `LEARN-01 failed unexpectedly: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.ok(res.score > 0);
      assertUnvalidatedTrainingResult(res);
    },
  },
  {
    id: "T1-099",
    name: "MDC2060-LEARN-02 Positive Pass (Range 6 NM -> 3 NM + GAIN & STC)",
    features: [33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      // Default 6 NM (idx 10) -> 4 NM (idx 9) -> 3 NM (idx 8)
      drv.press("range_down");
      drv.press("range_down");
      drv.rotate("gain", 3);
      drv.rotate("stc", 4);
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-02", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(res.passed, true, `LEARN-02 failed unexpectedly: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.ok(res.score > 0);
      assertUnvalidatedTrainingResult(res);
    },
  },
  {
    id: "T1-100",
    name: "MDC2060-LEARN-03 Positive Pass (EBL1 & VRM1 Target Measurement)",
    features: [33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      // Move crosshair cursor to measure target bearing & range as required by MDC2060-LEARN-03
      drv.pad("right");
      drv.pad("up");
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl1?.enabled) && Boolean(m.vrm1?.enabled), true, "LEARN-03 must enable both EBL1 and VRM1");
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-03", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(res.passed, true, `LEARN-03 failed unexpectedly: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.ok(res.score > 0);
      assertUnvalidatedTrainingResult(res);
    },
  },
  {
    id: "T1-101",
    name: "MDC2060-LEARN-04 Positive Pass (Storm Clutter FTC via MENU > ECHO > FTC + IR)",
    features: [33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_STORM_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^FTC$/i, {adjustSteps: 5, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^IR$/i, {adjustSteps: 2, confirm: true, closeAfter: true});
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-04", {scenario: MDC2060_STORM_SCENARIO});
      assert.equal(res.passed, true, `LEARN-04 failed unexpectedly: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.ok(res.score > 0);
      assertUnvalidatedTrainingResult(res);
    },
  },
  {
    id: "T1-102",
    name: "MDC2060-LEARN-05 Positive Pass (N-UP + True Trail (T) + PPI/PPI)",
    features: [33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      if (!/^T|TRUE$/i.test(String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode ?? ""))) {
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /TRAIL\s*MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      }
      assert.match(String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode), /^T|TRUE$/i, "LEARN-05 requires True Trail (T)");
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /TRAIL\s*TIME/i, {adjustSteps: 2, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^SCREEN$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-05", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(res.passed, true, `LEARN-05 failed unexpectedly: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.ok(res.score > 0);
      assertUnvalidatedTrainingResult(res);
    },
  },
  {
    id: "T1-103",
    name: "MDC2060-LEARN-06 Positive Pass (Guard Zone ALARM IN + alarm_ack)",
    features: [33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      drv.tick(3);
      drv.press("alarm_ack");
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-06", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(res.passed, true, `LEARN-06 failed unexpectedly: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.ok(res.score > 0);
      assertUnvalidatedTrainingResult(res);
    },
  },
  {
    id: "T1-104",
    name: "MDC2060-LEARN-07 Positive Pass (Manual ATA Acquisition + AIS CPA/TCPA Check)",
    features: [33],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(6);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^AIS$/i, /^INFO$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      const res = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-07", {scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(res.passed, true, `LEARN-07 failed unexpectedly: ${JSON.stringify(res.reasons)}`);
      assert.equal(res.replayVerified, true);
      assert.ok(res.score > 0);
      assertUnvalidatedTrainingResult(res);
    },
  },
  {
    id: "T1-105",
    name: "i18n.mjs Declares EN & VI Languages with Complete Key Parity",
    features: [32],
    async run() {
      const i18n = await loadI18n();
      const {en, vi} = getLanguageCodes(i18n.MDC2060_LANGUAGES);
      assert.ok(en, `MDC2060_LANGUAGES must include an English code, got ${JSON.stringify(i18n.MDC2060_LANGUAGES)}`);
      assert.ok(vi, `MDC2060_LANGUAGES must include a Vietnamese code, got ${JSON.stringify(i18n.MDC2060_LANGUAGES)}`);
      const probeFallback = "__E2E_FALLBACK__";
      assert.equal(i18n.tMdc2060(en, "__nonexistent_key_e2e__", probeFallback), probeFallback);
      assert.equal(i18n.tMdc2060(vi, "__nonexistent_key_e2e__", probeFallback), probeFallback);

      // Introspect exported dictionaries AND string-key arrays (e.g. MDC2060_I18N_KEYS) for EN/VI parity
      const discoveredKeys = new Set();
      for (const val of Object.values(i18n)) {
        if (val && typeof val === "object" && !Array.isArray(val) && val[en] && val[vi] && typeof val[en] === "object" && typeof val[vi] === "object") {
          const enKeys = Object.keys(val[en]);
          const viKeys = Object.keys(val[vi]);
          assert.ok(enKeys.length > 0 && viKeys.length > 0, "Exported EN/VI dictionaries must be non-empty");
          for (const k of enKeys) discoveredKeys.add(k);
          for (const k of viKeys) discoveredKeys.add(k);
        } else if (
          Array.isArray(val) &&
          val !== i18n.MDC2060_LANGUAGES &&
          val.length >= 20 &&
          val.every(x => typeof x === "string" && x.trim().length > 0)
        ) {
          for (const k of val) discoveredKeys.add(k);
        }
      }
      assert.ok(
        discoveredKeys.size >= 20,
        `i18n.mjs must expose >= 20 EN/VI translation keys via dictionary or key list, discovered ${discoveredKeys.size}`,
      );

      let distinctCount = 0;
      for (const k of discoveredKeys) {
        const enStr = i18n.tMdc2060(en, k, probeFallback);
        const viStr = i18n.tMdc2060(vi, k, probeFallback);
        assert.equal(typeof enStr, "string", `EN translation for ${k} must be a string`);
        assert.equal(typeof viStr, "string", `VI translation for ${k} must be a string`);
        assert.notEqual(enStr, probeFallback, `EN translation missing for key ${k}`);
        assert.notEqual(viStr, probeFallback, `VI translation missing for key ${k}`);
        assert.ok(enStr.trim().length > 0 && viStr.trim().length > 0, `Empty translation for key ${k}`);
        if (enStr !== viStr) distinctCount++;
      }
      assert.ok(
        distinctCount >= 10,
        `i18n.mjs must contain genuine distinct EN/VI translations (>= 10), found ${distinctCount}/${discoveredKeys.size}`,
      );

      for (const [fnName, fn] of Object.entries(i18n)) {
        if (fnName === "tMdc2060" || typeof fn !== "function") continue;
        if (/^is[A-Z]/.test(fnName)) {
          assert.equal(typeof fn(en), "boolean", `${fnName}(en) must return boolean`);
          assert.equal(typeof fn(vi), "boolean", `${fnName}(vi) must return boolean`);
        } else if (/^has[A-Z]/.test(fnName)) {
          const sampleKey = [...discoveredKeys][0];
          const resEn = fn.length >= 2 ? fn(en, sampleKey) : fn(sampleKey);
          const resVi = fn.length >= 2 ? fn(vi, sampleKey) : fn(sampleKey);
          const resMiss = fn.length >= 2 ? fn(en, "__nonexistent_key_e2e__") : fn("__nonexistent_key_e2e__");
          assert.equal(resEn, true, `${fnName} must return true for discovered EN key ${sampleKey}`);
          assert.equal(resVi, true, `${fnName} must return true for discovered VI key ${sampleKey}`);
          assert.equal(resMiss, false, `${fnName} must return false for missing key`);
        } else if (/^resolve[A-Z]/.test(fnName)) {
          assert.equal(fn(en), en, `${fnName}(en) must resolve to ${en}`);
          assert.equal(fn(vi), vi, `${fnName}(vi) must resolve to ${vi}`);
        } else if (/^localize[A-Z]/.test(fnName)) {
          const sample = /MenuGroup/i.test(fnName)
            ? "echo"
            : /MenuItem/i.test(fnName)
              ? "ftc"
              : /Choice/i.test(fnName)
                ? "OFF"
                : /PowerMode/i.test(fnName)
                  ? "standby"
                  : /Alarm/i.test(fnName)
                    ? "cpaDanger"
                    : "H-UP";
          const resEn = fn(sample, en);
          const resVi = fn(sample, vi);
          assert.ok(typeof resEn === "string" && resEn.trim().length > 0, `${fnName}(${sample}, en) must return non-empty string`);
          assert.ok(typeof resVi === "string" && resVi.trim().length > 0, `${fnName}(${sample}, vi) must return non-empty string`);
        } else {
          const resEn = fn(en, "H-UP");
          const resVi = fn(vi, "H-UP");
          assert.equal(typeof resEn, "string", `${fnName}(en, ...) must return string`);
          assert.equal(typeof resVi, "string", `${fnName}(vi, ...) must return string`);
        }
      }
    },
  },
  {
    id: "T1-106",
    name: "Default LCD Language Is Standard Maritime English with VI/EN Toggle",
    features: [32],
    async run() {
      const spec = await loadSpec();
      const i18n = await loadI18n();
      const {initialMdc2060State} = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {en, vi} = getLanguageCodes(i18n.MDC2060_LANGUAGES);
      assert.ok(en && vi);
      const initialLang = getLanguage(initialMdc2060State(), MDC2060_ADAPTER);
      assert.equal(String(initialLang).toLowerCase(), String(en).toLowerCase(), "Default LCD language must be English");

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /LANG/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(String(getLanguage(drv.state(), MDC2060_ADAPTER)).toLowerCase(), String(vi).toLowerCase());
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /LANG/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(String(getLanguage(drv.state(), MDC2060_ADAPTER)).toLowerCase(), String(en).toLowerCase());
    },
  },
  {
    id: "T1-107",
    name: "D15 Instructor Labels & Lesson Prompts Default to Vietnamese",
    features: [32],
    async run() {
      const {MDC2060_LESSONS} = await loadLessons();
      const html = await readWorkspaceText("web/mdc2060/index.html");
      assert.match(html, /<html[^>]*\blang=["']vi["']/i, "web/mdc2060/index.html must declare <html lang=\"vi\">");
      assert.match(html, /\blang=["']en["']/i, "Hardware/LCD English labels should declare lang=\"en\" for WCAG 3.1.2");
      for (const l of MDC2060_LESSONS) {
        assert.ok(l.titleVi.length >= 6 && l.instructionVi.length >= 12, `Lesson ${l.id} must have Vietnamese titleVi/instructionVi`);
      }
    },
  },
];
