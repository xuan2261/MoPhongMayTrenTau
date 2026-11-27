import assert from "node:assert/strict";
import {
  loadAdapter,
  loadArpaAis,
  loadI18n,
  loadModel,
  loadScenarios,
  loadSignal,
  loadSpec,
} from "./helpers/module-loader.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  FCV588_ADAPTER,
  applySettingsViaCodecRestore,
  assertValidNmeaSentence,
  createMdcBridgeDriver,
  fingerprint,
  getAisInfo,
  getAlarmInfo,
  getAtaInfo,
  getBrilliance,
  getColorPalette,
  getFtc,
  getGain,
  getGuardZoneInfo,
  getIr,
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
  getSleepInfo,
  getStc,
  getStcCurve,
  getTmOffset,
  getTrailInfo,
  isHlSuppressed,
  operateMenuItem,
  setChoiceSetting,
  setGuardZoneSettings,
  setToggleSetting,
} from "./helpers/session-driver.mjs";
import {
  binForRange,
  evalGridStrict,
  extractAisResult,
  extractAtaState,
  extractAtaTargets,
  normalizeAisSettings,
  normalizeAtaSettings,
  sectorEnergy,
} from "./helpers/signal-oracle.mjs";

export const TIER = 4;
export const SUITE = "tier4-watchkeeping-workflows";

export const TESTS = [
  {
    id: "T4-001",
    name: "Coastal Approach Collision Avoidance Watch (Authentic 120s Preheat -> N-UP + True Trail -> ATA/AIS Danger -> Replay)",
    features: [1, 2, 5, 7, 11, 23, 24, 30, 31],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const arpa = await loadArpaAis();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {evaluatePolarEchoGrid} = await loadSignal();

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      // Cold boot -> authentic 120s preheat (6x20s ticks) -> STANDBY -> TRANSMIT
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      drv.holdPress("power", 200);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      drv.tick(120);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");

      // Switch to N-UP & True Trail
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(getPresentationMode(drv.state(), MDC2060_ADAPTER), "N-UP", "Watchkeeping setup must enter N-UP presentation");
      if (String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode ?? "").toUpperCase() !== "T") {
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /TRAIL\s*MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      }
      assert.equal(String(getTrailInfo(drv.state(), MDC2060_ADAPTER).mode ?? "").toUpperCase(), "T", "Watchkeeping setup must enable True Trail (T)");
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /TRAIL\s*TIME/i, {adjustSteps: 2, confirm: true, closeAfter: true});

      // Render 6 NM polar grid verifying real returns
      const polar = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {rangeNm: 6, gain: 60});
      assert.ok(sectorEnergy(polar.grid, 0, 359, 0, 159).peak >= 6, "Coastal approach 6 NM grid must show strong land/vessel echoes");

      // Acquire PACIFIC STAR on ATA -> 6 ticks -> tracking + red CPA/TCPA danger + $RATTM
      const pacific = drv.bus().radarContacts.find(c => String(c.contactId).includes("574002101"));
      assert.ok(pacific);
      const ataCfg = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15, vectorMode: "T", vectorTimeMin: 6});
      let ataSt = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), pacific, drv.bus().simTick, drv.bus()));
      for (let t = 1; t <= 6; t++) {
        drv.tick(1);
        ataSt = extractAtaState(arpa.stepAtaTracking(ataSt, drv.bus(), ataCfg, drv.bus().simTick));
      }
      const tracked = extractAtaTargets(ataSt)[0];
      assert.equal(String(tracked.status).toLowerCase(), "tracking");
      assert.equal(tracked.dangerous, true);
      assertValidNmeaSentence(arpa.formatRattmSentence(tracked, drv.bus().ownship, drv.bus().simTick), "RATTM");

      // Inspect PACIFIC STAR AIS detail
      const ais = extractAisResult(
        arpa.projectAisTargets(
          drv.bus(),
          normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 24, cpaLimitNm: 0.5, tcpaLimitMin: 15, aisCpaAlarm: true}),
          "574002101",
        ),
      );
      assert.equal(ais.selectedTarget?.name, "PACIFIC STAR");
      assert.equal(ais.alarmActive, true);

      // Alarm ack in session + replay verification
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(6);
      assert.ok(getAtaInfo(drv.state(), MDC2060_ADAPTER).targetCount >= 1, "ATA ACQ must track at least one target in session");
      drv.press("alarm_ack");
      assert.equal(getAlarmInfo(drv.state(), MDC2060_ADAPTER).audible, false);
      drv.assertProbeParity(model.probeMdc2060);
      drv.verifyReplay();
    },
  },
  {
    id: "T4-002",
    name: "Storm Clutter Target Extraction Workflow (mdc2060-storm-clutter + STC + FTC + IR + ATA)",
    features: [6, 13, 16, 17, 18, 23, 26, 30],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const {evaluatePolarEchoGrid} = await loadSignal();

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_STORM_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("interferenceSource", true);
      drv.tick(1);

      // Capture pre-tuning state before operating physical controls & menus
      const rangeBefore = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES);
      const gainBefore = getGain(drv.state(), MDC2060_ADAPTER);
      const stcBefore = getStc(drv.state(), MDC2060_ADAPTER);
      const ftcBefore = getFtc(drv.state(), MDC2060_ADAPTER);

      // Tune range 6 -> 3 NM, GAIN, STC, FTC=5 via menu, IR=2 via menu
      drv.press("range_down");
      drv.press("range_down");
      const rangeAfter = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES);
      assert.ok(rangeAfter.rangeNm < rangeBefore.rangeNm, `range_down x2 must reduce rangeNm (${rangeAfter.rangeNm} < ${rangeBefore.rangeNm})`);

      drv.rotate("gain", 2);
      const gainAfter = getGain(drv.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(gainAfter) && gainAfter > gainBefore, `rotate("gain", 2) must increase gain (${gainBefore} -> ${gainAfter})`);

      drv.rotate("stc", 8);
      const stcStep1 = getStc(drv.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(stcStep1) && stcStep1 > stcBefore, `rotate("stc", 8) must increase stc (${stcBefore} -> ${stcStep1})`);
      for (let i = 0; i < 10 && getStc(drv.state(), MDC2060_ADAPTER) < 40; i++) {
        drv.rotate("stc", 5);
      }
      const stcAfter = getStc(drv.state(), MDC2060_ADAPTER);
      assert.ok(
        Number.isFinite(stcAfter) && stcAfter >= 40 && stcAfter > stcBefore && stcAfter <= 100,
        `STC tuning must reach [40..100] from ${stcBefore}, got ${stcAfter}`,
      );

      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^FTC$/i, {adjustSteps: 5, confirm: true, closeAfter: true});
      const ftcAfter = getFtc(drv.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(ftcAfter) && ftcAfter >= 4 && ftcAfter > ftcBefore, `ECHO > FTC must raise FTC >= 4 from ${ftcBefore}, got ${ftcAfter}`);

      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^IR$/i, {adjustSteps: 2, confirm: true, closeAfter: true});
      const irAfter = getIr(drv.state(), MDC2060_ADAPTER);
      assert.ok(
        irAfter !== undefined && irAfter !== null && String(irAfter).toUpperCase() !== "OFF" && irAfter !== 0,
        `ECHO > IR must activate interference rejection, got ${String(irAfter)}`,
      );

      const baseline = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, drv.bus(), {
        rangeNm: 6,
        gain: gainAfter,
        stc: 0,
        ftc: 0,
        ir: "OFF",
        interferenceSource: true,
      });
      const baseSum = sectorEnergy(baseline.grid, 0, 359, 2, 155).sum;

      // Pass 100% real device-state values into signal engine (zero hardcoded fallback floors)
      const filtered = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, drv.bus(), {
        rangeNm: 6,
        gain: gainAfter,
        stc: stcAfter,
        ftc: ftcAfter,
        ir: irAfter,
        interferenceSource: true,
      });
      const filtSum = sectorEnergy(filtered.grid, 0, 359, 2, 155).sum;
      assert.ok(filtSum < baseSum * 0.78, `Storm multi-filter must cut clutter: filtered=${filtSum} vs baseline=${baseSum}`);

      const ship = drv.bus().radarContacts.reduce((best, c) =>
        Math.abs(c.rangeNm - 3.2) < Math.abs((best?.rangeNm ?? 999) - 3.2) ? c : best,
      null);
      assert.ok(ship);
      const bin = binForRange(ship.rangeNm, 6);
      assert.ok(sectorEnergy(filtered.grid, Math.round(ship.bearingDeg) - 3, Math.round(ship.bearingDeg) + 3, bin - 4, bin + 4).peak >= 4);

      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(6);
      assert.ok(getAtaInfo(drv.state(), MDC2060_ADAPTER).targetCount >= 1);
      drv.verifyReplay();
    },
  },
  {
    id: "T4-003",
    name: "Narrow Channel Piloting (PI + EBL1/2 + VRM1/2 + 2-Point + HL OFF + Guard Zone Wrap)",
    features: [6, 10, 19, 20, 21, 22, 25, 26],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setGuardZoneSettings(s, keys, {mode: "IN", innerNm: 0.2, outerNm: 6.0, startBrgDeg: 330, endBrgDeg: 30});
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).mode, "IN", "Restored Guard Zone mode must be IN");
      drv.press("range_down");
      drv.press("range_down"); // 3 NM
      drv.pointer(80, -80);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /OFF\s*CENT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /PI\s*LINE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /EBL1\s*FLOAT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL2$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM2$/i, {adjustSteps: 1, confirm: true, closeAfter: true});

      // 2-Point measure + Long-ENT HL OFF
      drv.touch(170, 190, "down");
      drv.touch(170, 190, "up");
      drv.holdPress("ent", 200);
      drv.touch(290, 260, "down");
      drv.touch(290, 260, "up");
      drv.down("ent");
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), true);
      drv.up("ent", 1350);
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), false);

      drv.tick(3);
      drv.press("alarm_ack");
      const oc = getOffCenter(drv.state(), MDC2060_ADAPTER);
      assert.ok(Math.hypot(oc.xFrac, oc.yFrac) <= 0.66 + 1e-6);
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl1?.enabled && m.ebl2?.enabled && m.vrm1?.enabled && m.vrm2?.enabled && m.pi?.enabled), true);
      drv.verifyReplay();
    },
  },
  {
    id: "T4-004",
    name: "Sensor Fault Degradation & Mid-Watch Recovery (HDG + GPS + SPD)",
    features: [7, 8, 9, 11, 32],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.presentationMode, "N-UP");
        setChoiceSetting(s, keys.motionMode, "TM");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.screenMode, "PPI/NAV");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("headingSensor", false);
      drv.fixture("gpsSensor", false);
      drv.fixture("speedSensor", false);
      drv.tick(10);
      const faults = getSensorWarnings(drv.state(), MDC2060_ADAPTER);
      assert.equal(faults.hdgNoSignal, true);
      assert.equal(faults.llNoSignal, true);
      assert.equal(faults.speedNoSignal, true);
      drv.assertCanonicalState();

      drv.fixture("headingSensor", true);
      drv.fixture("gpsSensor", true);
      drv.fixture("speedSensor", true);
      drv.tick(10);
      const recovered = getSensorWarnings(drv.state(), MDC2060_ADAPTER);
      assert.equal(recovered.hdgNoSignal, false);
      assert.equal(recovered.llNoSignal, false);
      assert.equal(recovered.speedNoSignal, false);
      assert.equal(getScreenMode(drv.state(), MDC2060_ADAPTER), "PPI/NAV");
      drv.verifyReplay();
    },
  },
  {
    id: "T4-005",
    name: "Full Synchronized Bridge Watch (FCV-588 + MDC-2060) Over 30 Seconds + Replay",
    features: [9, 19, 20, 23, 24, 30, 31],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      });
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.screenMode, "PPI/NAV");
      });
      // Power ON FCV-588 + MDC-2060
      drv.holdPress("power", 120, FCV588_ADAPTER.id);
      drv.fixture("fastPreheat", true, MDC2060_ADAPTER.id);
      drv.holdPress("power", 150, MDC2060_ADAPTER.id);
      drv.tick(5);
      assert.equal(drv.probe(FCV588_ADAPTER.id).power, "on");
      drv.press("stby_tx", MDC2060_ADAPTER.id);
      assert.equal(getPowerMode(drv.state(MDC2060_ADAPTER.id), MDC2060_ADAPTER), "transmit");

      // Operate both devices concurrently across 30s watch
      const fcvBefore = fingerprint(drv.state(FCV588_ADAPTER.id));
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      const mBridge = getMeasurementInfo(drv.state(MDC2060_ADAPTER.id), MDC2060_ADAPTER);
      assert.equal(Boolean(mBridge.ebl1?.enabled && mBridge.vrm1?.enabled), true, "MDC-2060 EBL1/VRM1 must activate during bridge watch");
      assert.equal(fingerprint(drv.state(FCV588_ADAPTER.id)), fcvBefore, "Radar watch ops must not mutate FCV-588");

      const mdcBefore = fingerprint(drv.state(MDC2060_ADAPTER.id));
      drv.press("range", FCV588_ADAPTER.id);
      drv.rotate("gain", 2, FCV588_ADAPTER.id);
      assert.equal(fingerprint(drv.state(MDC2060_ADAPTER.id)), mdcBefore, "FCV-588 watch ops must not mutate Radar");

      drv.tick(25);
      assert.equal(drv.bus().simTick, 30);
      const dbt = drv.bus().sentences.find(s => s.startsWith("$SDDBT,"));
      const hdt = drv.bus().sentences.find(s => s.startsWith("$HEHDT,"));
      assertValidNmeaSentence(dbt, "SDDBT");
      assertValidNmeaSentence(hdt, "HEHDT");
      drv.verifyReplay();
    },
  },
  {
    id: "T4-006",
    name: "Settings Backup -> Power-Down -> Cold Restore -> Deterministic Replay",
    features: [2, 3, 5, 12, 27, 31],
    async run() {
      const i18n = await loadI18n();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {vi} = getLanguageCodes(i18n.MDC2060_LANGUAGES);

      assert.ok(vi, "MDC2060_LANGUAGES must include Vietnamese language code");

      const drv1 = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const defaultBrill = getBrilliance(drv1.state(), MDC2060_ADAPTER);
      applySettingsViaCodecRestore(drv1, model, (s, keys) => {
        setChoiceSetting(s, keys.colorPalette, "NIGHT");
        setChoiceSetting(s, keys.motorRpm, 48);
        setChoiceSetting(s, keys.rangeUnit, "km");
        setChoiceSetting(s, keys.stcCurve, 6);
        setChoiceSetting(s, keys.language, vi);
        setChoiceSetting(s, keys.ftc, 4);
        setToggleSetting(s, keys.ringsVisible, false);
      });
      drv1.powerOnToTransmit({fastPreheat: true});
      drv1.holdPress("power", 250);
      drv1.pad("left");
      drv1.holdPress("ent", 150);
      const savedBrill = getBrilliance(drv1.state(), MDC2060_ADAPTER);
      assert.ok(Number.isFinite(savedBrill), `savedBrill must be finite number, got ${savedBrill}`);
      assert.notEqual(savedBrill, defaultBrill, `POWER/BRILL adjustment must change brightness from default ${defaultBrill}`);
      const exported = model.encodeMdc2060Settings(drv1.state().settings);
      drv1.holdPress("power", 3100);
      assert.equal(getPowerMode(drv1.state(), MDC2060_ADAPTER), "off");

      const drv2 = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const decoded = model.decodeMdc2060Settings(exported);
      assert.ok(decoded);
      drv2.restoreSettings(decoded);
      drv2.powerOnToTransmit({fastPreheat: true});
      assert.equal(getColorPalette(drv2.state(), MDC2060_ADAPTER), "NIGHT");
      assert.equal(getMotorRpm(drv2.state(), MDC2060_ADAPTER), 48);
      assert.equal(getRangeInfo(drv2.state(), MDC2060_ADAPTER).rangeUnit, "km");
      assert.equal(getRangeInfo(drv2.state(), MDC2060_ADAPTER).ringsVisible, false);
      assert.equal(getFtc(drv2.state(), MDC2060_ADAPTER), 4);
      assert.equal(getStcCurve(drv2.state(), MDC2060_ADAPTER), 6);
      assert.equal(String(getLanguage(drv2.state(), MDC2060_ADAPTER)).toLowerCase(), String(vi).toLowerCase());
      // Panel-only brightness (like gain/stc/rangeIndex) is excluded from the 48-key menu settings allowlist and resets on cold boot
      assert.equal(getBrilliance(drv2.state(), MDC2060_ADAPTER), defaultBrill);
      drv2.verifyReplay();
    },
  },
  {
    id: "T4-007",
    name: "Multi-Alarm Watchkeeping & Economy SLEEP Duty Cycle",
    features: [2, 4, 23, 24, 25],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setToggleSetting(s, keys.aisCpaAlarm, true);
        setGuardZoneSettings(s, keys, {mode: "IN", innerNm: 0.2, outerNm: 6.0, startBrgDeg: 0, endBrgDeg: 359});
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).mode, "IN", "Restored Guard Zone mode must be IN");
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(6);
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).triggered, true);
      assert.equal(getAisInfo(drv.state(), MDC2060_ADAPTER).alarmActive, true);
      drv.press("alarm_ack");
      assert.equal(getAlarmInfo(drv.state(), MDC2060_ADAPTER).audible, false);

      // Enter SLEEP duty cycle -> tick -> wake on key -> shutdown
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SLEEP$/i, /MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "sleep");
      let sawBurst = getSleepInfo(drv.state(), MDC2060_ADAPTER).inBurst;
      for (let i = 0; i < 36; i++) {
        drv.tick(10);
        if (getSleepInfo(drv.state(), MDC2060_ADAPTER).inBurst) sawBurst = true;
      }
      assert.equal(sawBurst, true);
      drv.press("f1");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      drv.holdPress("power", 3100);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      drv.verifyReplay();
    },
  },
  {
    id: "T4-008",
    name: "Custom Ownship Maneuvering Watch (createCustomOwnshipScenario + TM Auto-Reset + ATA)",
    features: [8, 11, 23, 30, 31],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO, createCustomOwnshipScenario} = await loadScenarios();
      const custom = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, {
        hdgDeg: 45,
        sogKn: 14.0,
        rotDegPerMin: 6.0,
      });
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: custom});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.motionMode, "TM");
        setChoiceSetting(s, keys.trailMode, "T");
        setChoiceSetting(s, keys.trailTime, typeof s[keys.trailTime] === "number" ? 3 : "3m");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      // Step to 0.5 NM (index 3)
      for (let i = 0; i < 12; i++) drv.press("range_down");
      drv.press("range_up");
      drv.press("range_up");
      drv.press("range_up");
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      const hdg0 = drv.bus().ownship.hdgDeg;
      drv.tick(40); // +4.0 deg turn at 6.0 deg/min
      const hdg1 = drv.bus().ownship.hdgDeg;
      assert.ok(Math.abs((((hdg1 - hdg0) % 360) + 360) % 360 - 4.0) < 0.2, `Expected +4.0 deg heading turn, got ${hdg0} -> ${hdg1}`);
      const tm = getTmOffset(drv.state(), MDC2060_ADAPTER);
      assert.ok(Math.hypot(tm.xFrac, tm.yFrac) <= 0.66 + 0.05);
      assert.equal(getMotionMode(drv.state(), MDC2060_ADAPTER), "TM");
      assert.ok(getAtaInfo(drv.state(), MDC2060_ADAPTER).targetCount >= 1, "ATA track must remain active during 40s ownship maneuver");
      drv.verifyReplay();
    },
  },
];
