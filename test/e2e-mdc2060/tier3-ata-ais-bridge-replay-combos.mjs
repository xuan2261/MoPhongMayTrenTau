import assert from "node:assert/strict";
import {
  loadAdapter,
  loadArpaAis,
  loadLessons,
  loadModel,
  loadScenarios,
  loadSignal,
  loadSpec,
} from "./helpers/module-loader.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  FCV588_ADAPTER,
  advanceMaritimeWorld,
  applySettingsViaCodecRestore,
  assertValidNmeaSentence,
  bridgeSessionHash,
  createMdcBridgeDriver,
  createMdcSingleDriver,
  fingerprint,
  getAisInfo,
  getAlarmInfo,
  getAtaInfo,
  getColorPalette,
  getGain,
  getMeasurementInfo,
  getMotorRpm,
  getOverlayKind,
  getPowerMode,
  getRangeInfo,
  getStcCurve,
  initialMaritimeWorldState,
  operateMenuItem,
  projectMaritimeSensorBus,
  closeOverlayOrMenu,
  setChoiceSetting,
  setToggleSetting,
} from "./helpers/session-driver.mjs";
import {
  evalGridStrict,
  extractAisResult,
  extractAtaState,
  extractAtaTargets,
  extractGuardZoneStatus,
  normalizeAisSettings,
  normalizeAtaSettings,
  normalizeGuardZoneSettings,
  sectorEnergy,
} from "./helpers/signal-oracle.mjs";

export const TIER = 3;
export const SUITE = "tier3-ata-ais-bridge-replay-combos";

export const TESTS = [
  {
    id: "T3-017",
    name: "Dual-Device Bridge Session Isolation & Deterministic Multi-Device Replay (40 Events)",
    features: [30, 31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      });
      drv.holdPress("power", 120, FCV588_ADAPTER.id);
      drv.fixture("fastPreheat", true, MDC2060_ADAPTER.id);
      drv.holdPress("power", 150, MDC2060_ADAPTER.id);
      drv.tick(5);
      drv.press("stby_tx", MDC2060_ADAPTER.id);

      for (let i = 0; i < 6; i++) {
        const fcvFp = fingerprint(drv.state(FCV588_ADAPTER.id));
        drv.press(i % 2 === 0 ? "range_down" : "range_up", MDC2060_ADAPTER.id);
        drv.rotate("gain", 2, MDC2060_ADAPTER.id);
        assert.equal(fingerprint(drv.state(FCV588_ADAPTER.id)), fcvFp, "Radar inputs must never alter FCV-588 state");

        const mdcFp = fingerprint(drv.state(MDC2060_ADAPTER.id));
        drv.press("range", FCV588_ADAPTER.id);
        drv.rotate("gain", 1, FCV588_ADAPTER.id);
        assert.equal(fingerprint(drv.state(MDC2060_ADAPTER.id)), mdcFp, "FCV-588 inputs must never alter Radar state");
        drv.tick(2);
      }
      assert.equal(drv.bus().sentences.length, 7);
      drv.verifyReplay();
    },
  },
  {
    id: "T3-018",
    name: "Simultaneous ATA + AIS Dangerous CPA/TCPA Alarms on PACIFIC STAR",
    features: [23, 24, 25],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setToggleSetting(s, keys.aisCpaAlarm, true);
        setChoiceSetting(s, keys.cpaLimitNm, 0.5);
        setChoiceSetting(s, keys.tcpaLimitMin, 15);
      });
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(6);
      assert.equal(getAisInfo(drv.state(), MDC2060_ADAPTER).alarmActive, true, "AIS CPA alarm must activate on PACIFIC STAR");
      drv.press("alarm_ack");
      assert.equal(getAlarmInfo(drv.state(), MDC2060_ADAPTER).audible, false);
      assert.equal(getAlarmInfo(drv.state(), MDC2060_ADAPTER).visualActive, true);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /DEL\s*ALL/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      assert.equal(getAtaInfo(drv.state(), MDC2060_ADAPTER).targetCount, 0);
      assert.equal(getAisInfo(drv.state(), MDC2060_ADAPTER).alarmActive, true, "Deleting ATA tracks must leave AIS danger active");
    },
  },
  {
    id: "T3-019",
    name: "Auto-Acquire & Guard Zone Behavior Across TX -> ST'BY -> TX Transitions",
    features: [2, 23, 25],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /AUTO\s*AREA/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      drv.tick(3);
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
      const countInStby = getAtaInfo(drv.state(), MDC2060_ADAPTER).targetCount;
      drv.tick(3);
      assert.equal(getAtaInfo(drv.state(), MDC2060_ADAPTER).targetCount, countInStby, "No new ATA acquisitions should occur during STANDBY");
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      drv.tick(3);
      drv.verifyReplay();
    },
  },
  {
    id: "T3-020",
    name: "Toggling ATA Option Board & AIS Option Board Never Cross-Interferes",
    features: [23, 24],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("aisBoardOption", false);
      drv.fixture("ataBoardOption", true);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(6);
      assert.equal(getAisInfo(drv.state(), MDC2060_ADAPTER).targetCount, 0);
      assert.ok(getAtaInfo(drv.state(), MDC2060_ADAPTER).targetCount >= 1);

      drv.fixture("ataBoardOption", false);
      drv.fixture("aisBoardOption", true);
      drv.tick(2);
      assert.equal(getAisInfo(drv.state(), MDC2060_ADAPTER).targetCount, 6);
      assert.equal(getAtaInfo(drv.state(), MDC2060_ADAPTER).boardEnabled, false);
    },
  },
  {
    id: "T3-021",
    name: "Full Custom Preset Persistence Across Cold Restart & Replay",
    features: [5, 12, 27, 31],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv1 = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv1, model, (s, keys) => {
        setChoiceSetting(s, keys.colorPalette, "NIGHT");
        setChoiceSetting(s, keys.stcCurve, 6);
        setChoiceSetting(s, keys.cpaLimitNm, 0.8);
        setChoiceSetting(s, keys.motorRpm, 48);
      });
      drv1.powerOnToTransmit({fastPreheat: true});
      const exported = model.encodeMdc2060Settings(drv1.state().settings);
      drv1.holdPress("power", 3100);
      assert.equal(getPowerMode(drv1.state(), MDC2060_ADAPTER), "off");

      const drv2 = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const decoded = model.decodeMdc2060Settings(exported);
      assert.ok(decoded);
      drv2.restoreSettings(decoded);
      drv2.powerOnToTransmit({fastPreheat: true});
      assert.equal(getColorPalette(drv2.state(), MDC2060_ADAPTER), "NIGHT");
      assert.equal(getStcCurve(drv2.state(), MDC2060_ADAPTER), 6);
      assert.equal(getMotorRpm(drv2.state(), MDC2060_ADAPTER), 48);
      assert.equal(getAtaInfo(drv2.state(), MDC2060_ADAPTER).cpaLimitNm, 0.8);
      drv2.verifyReplay();
    },
  },
  {
    id: "T3-022",
    name: "Custom Ownship Maneuver Propagates Consistently to Both FCV-588 & MDC-2060",
    features: [30, 31],
    async run() {
      const {MDC2060_COASTAL_SCENARIO, createCustomOwnshipScenario} = await loadScenarios();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const custom = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, {
        hdgDeg: 45,
        sogKn: 14,
        rotDegPerMin: 6,
      });
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: custom,
      });
      drv.tick(20); // 20s at 6 deg/min = +2.0 deg -> 047.0
      const hdt = drv.bus().sentences.find(s => s.startsWith("$HEHDT,"));
      assert.ok(hdt, "Bus must emit $HEHDT sentence");
      assertValidNmeaSentence(hdt, "HEHDT");
      assert.match(hdt, /^\$HEHDT,0?47\.0,T\*/);
      drv.verifyReplay();
    },
  },
  {
    id: "T3-023",
    name: "Instructor Weather Overrides Persist in Replay & Drive Signal Engine",
    features: [16, 17, 18, 32],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const {evaluatePolarEchoGrid} = await loadSignal();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.analog("inst_sea_state", 6);
      drv.analog("inst_rain", 90);
      drv.fixture("interferenceSource", true);
      drv.tick(2);
      const rough = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {
        rangeNm: 6,
        gain: 65,
        stc: 0,
        ftc: 0,
        ir: "OFF",
        seaStateOverride: 6,
        rainIntensityOverride: 90,
        interferenceSource: true,
      });
      const tuned = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, drv.bus(), {
        rangeNm: 6,
        gain: 65,
        stc: 55,
        ftc: 5,
        ir: 3,
        seaStateOverride: 6,
        rainIntensityOverride: 90,
        interferenceSource: true,
      });
      assert.ok(
        sectorEnergy(tuned.grid, 0, 359, 2, 150).sum < sectorEnergy(rough.grid, 0, 359, 2, 150).sum * 0.75,
        "STC/FTC/IR tuning must substantially clear instructor-injected storm clutter",
      );
      drv.verifyReplay();
    },
  },
  {
    id: "T3-024",
    name: "Long-Horizon ATA Tracking Pipeline (210s) Consistency",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      const pacific = bus.radarContacts.find(c => String(c.contactId).includes("574002101"));
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), pacific, 0, bus));
      const ataCfg = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15, vectorMode: "T", vectorTimeMin: 12});
      let checkpoints = 0;
      for (let t = 1; t <= 210; t++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        st = extractAtaState(arpa.stepAtaTracking(st, bus, ataCfg, t));
        if (t === 6 || t === 60 || t === 120 || t === 210) {
          const tgt = extractAtaTargets(st)[0];
          assert.equal(String(tgt.status).toLowerCase(), "tracking");
          assertValidNmeaSentence(arpa.formatRattmSentence(tgt, bus.ownship, t), "RATTM");
          checkpoints++;
        }
      }
      assert.equal(checkpoints, 4, "All 4 long-horizon tracking checkpoints must execute");
      assert.equal(extractAtaTargets(st)[0].pastPositions.length, 6);
    },
  },
  {
    id: "T3-025",
    name: "Selected AIS Target Coherence When Filter Radius Tightens Below Target Range",
    features: [6, 24],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO));
      const saigon = bus.aisTargets.find(t => /SAIGON EXPRESS/i.test(t.name));
      assert.ok(saigon && saigon.rangeNm > 2.5);
      const wide = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 12, cpaLimitNm: 0.5, tcpaLimitMin: 15}), saigon.mmsi),
      );
      assert.equal(wide.selectedTarget?.mmsi, saigon.mmsi);
      const tight = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 2.0, cpaLimitNm: 0.5, tcpaLimitMin: 15}), saigon.mmsi),
      );
      assert.ok(!tight.targets.some(t => t.mmsi === saigon.mmsi), "SAIGON EXPRESS must be excluded when filter tightened to 2.0 NM");
      assert.equal(tight.selectedTarget, null, "Selected detail must clear cleanly when target falls outside filter radius");
    },
  },
  {
    id: "T3-026",
    name: "Pure Device Transitions Match Between Single-Session & Bridge-Session",
    features: [31],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const single = createMdcSingleDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const bridge = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      for (const drv of [single, bridge]) {
        drv.powerOnToTransmit({fastPreheat: true});
        drv.press("range_down");
        drv.rotate("gain", 4);
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^COLOR$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      }
      assert.equal(getPowerMode(single.state(), MDC2060_ADAPTER), getPowerMode(bridge.state(), MDC2060_ADAPTER));
      assert.equal(getRangeInfo(single.state(), MDC2060_ADAPTER).rangeIndex, getRangeInfo(bridge.state(), MDC2060_ADAPTER).rangeIndex);
      assert.equal(getGain(single.state(), MDC2060_ADAPTER), getGain(bridge.state(), MDC2060_ADAPTER));
      assert.equal(getColorPalette(single.state(), MDC2060_ADAPTER), getColorPalette(bridge.state(), MDC2060_ADAPTER));
      assert.equal(Boolean(getMeasurementInfo(single.state(), MDC2060_ADAPTER).ebl1?.enabled), Boolean(getMeasurementInfo(bridge.state(), MDC2060_ADAPTER).ebl1?.enabled));
    },
  },
  {
    id: "T3-027",
    name: "Mid-Session Lesson Assessment Inside Multi-Device Bridge Session (startSeq > 0)",
    features: [31, 33],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {assessMdc2060Lesson} = await loadLessons();
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      });
      drv.tick(3);
      const startSeq = drv.bridge.history.length;
      const startSessionHash = bridgeSessionHash(drv.bridge);
      drv.powerOnToTransmit({fastPreheat: true});
      const passRes = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
        startSeq,
        startSessionHash,
      });
      assert.equal(passRes.passed, true);

      let badWitnessFailed = false;
      try {
        const failRes = assessMdc2060Lesson(drv.bridge, "MDC2060-LEARN-01", {
          scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
          startSeq,
          startSessionHash: "f0-fnv1a32-00000000",
        });
        badWitnessFailed = failRes?.passed === false;
      } catch (err) {
        assert.ok(!(err instanceof ReferenceError) && !(err instanceof SyntaxError), `Unexpected error: ${err}`);
        badWitnessFailed = true;
      }
      assert.equal(badWitnessFailed, true);
    },
  },
  {
    id: "T3-028",
    name: "ATA Slot Allocation Hygiene & $RATTM Removal Consistency (ACQ -> DEL -> Re-ACQ -> DEL ALL)",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO));
      assert.ok(bus.radarContacts.length >= 4);
      let st = arpa.initialAtaState();
      st = extractAtaState(arpa.acquireAtaTarget(st, bus.radarContacts[0], 0, bus));
      st = extractAtaState(arpa.acquireAtaTarget(st, bus.radarContacts[1], 0, bus));
      st = extractAtaState(arpa.acquireAtaTarget(st, bus.radarContacts[2], 0, bus));
      st = extractAtaState(arpa.deleteAtaTarget(st, "T02"));
      st = extractAtaState(arpa.acquireAtaTarget(st, bus.radarContacts[3], 1, bus));
      const targets = extractAtaTargets(st);
      assert.equal(targets.length, 3);
      const ids = targets.map(t => t.id ?? t.targetId);
      assert.equal(new Set(ids).size, 3, "Re-acquired ATA target must never collide with existing IDs");
      for (const id of ids) assert.match(id, /^T(?:0[1-9]|[1-4][0-9]|50)$/);
      st = extractAtaState(arpa.deleteAllAtaTargets(st));
      assert.equal(extractAtaTargets(st).length, 0);
    },
  },
  {
    id: "T3-029",
    name: "Dynamic Bearing Wrap Across North During Turning Ownship (Guard Zone 330->30, IN -> OUT)",
    features: [25, 30],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO, createCustomOwnshipScenario} = await loadScenarios();
      const turning = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, {hdgDeg: 355, sogKn: 10, rotDegPerMin: 15});
      let ws = initialMaritimeWorldState(turning);
      let gzState = arpa.initialGuardZoneState();
      const gzIn = normalizeGuardZoneSettings({mode: "IN", innerNm: 0.2, outerNm: 10.0, startBrgDeg: 330, endBrgDeg: 30});
      const gzOut = normalizeGuardZoneSettings({mode: "OUT", innerNm: 0.2, outerNm: 10.0, startBrgDeg: 330, endBrgDeg: 30});
      for (let t = 0; t < 20; t++) {
        const bus = projectMaritimeSensorBus(turning, ws);
        const res = extractGuardZoneStatus(arpa.evaluateGuardZone(gzState, bus, gzIn));
        assert.equal(res.mode, "IN", "Guard Zone IN must remain active during ownship turn");
        gzState = res.state;
        ws = advanceMaritimeWorld(turning, ws, 1);
      }
      // Verify exact wrap inclusion at 359.5 deg and exit across 30 deg -> 45 deg when switching IN -> OUT
      const busInsideNorth = {
        ...projectMaritimeSensorBus(turning, ws),
        radarContacts: [{contactId: "tgt-north-wrap", rcsSqm: 500, rangeNm: 2.5, bearingDeg: 359.5}],
      };
      const inHit = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), busInsideNorth, gzIn));
      assert.equal(inHit.mode, "IN");
      assert.equal(inHit.triggered, true, "Target at 359.5 deg must trigger Guard Zone IN [330..30]");

      const outCap = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), busInsideNorth, gzOut));
      assert.equal(outCap.mode, "OUT");
      assert.equal(outCap.triggered, false, "Guard Zone OUT must capture target inside [330..30] without premature trigger");
      const busExited = {
        ...busInsideNorth,
        simTick: busInsideNorth.simTick + 1,
        radarContacts: [{contactId: "tgt-north-wrap", rcsSqm: 500, rangeNm: 2.5, bearingDeg: 45.0}],
      };
      const outTrig = extractGuardZoneStatus(arpa.evaluateGuardZone(outCap.state, busExited, gzOut));
      assert.equal(outTrig.mode, "OUT");
      assert.equal(outTrig.triggered, true, "Target exiting [330..30] to 45 deg must trigger Guard Zone OUT");
    },
  },
  {
    id: "T3-030",
    name: "Maintenance Diagnostics (PANEL TEST / LCD TEST) Preserve Radar Settings & Replay Determinism",
    features: [2, 27],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.press("range_down");
      drv.rotate("gain", 6);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const rangeBefore = getRangeInfo(drv.state(), MDC2060_ADAPTER).rangeIndex;
      const gainBefore = getGain(drv.state(), MDC2060_ADAPTER);

      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^MAINT$/i, /PANEL\s*TEST/i, {system: true, adjustSteps: 0, confirm: true, closeAfter: false});
      assert.match(String(getOverlayKind(drv.state(), MDC2060_ADAPTER) ?? ""), /panel/i);
      drv.press("f1");
      closeOverlayOrMenu(drv);

      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^MAINT$/i, /LCD\s*TEST/i, {system: true, adjustSteps: 0, confirm: true, closeAfter: false});
      assert.match(String(getOverlayKind(drv.state(), MDC2060_ADAPTER) ?? ""), /lcd/i);
      closeOverlayOrMenu(drv);

      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      assert.equal(getRangeInfo(drv.state(), MDC2060_ADAPTER).rangeIndex, rangeBefore);
      assert.equal(getGain(drv.state(), MDC2060_ADAPTER), gainBefore);
      assert.equal(Boolean(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).ebl1?.enabled), true);
      drv.verifyReplay();
    },
  },
];
