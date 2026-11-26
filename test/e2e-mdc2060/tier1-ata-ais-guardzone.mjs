import assert from "node:assert/strict";
import {loadAdapter, loadArpaAis, loadModel, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  advanceMaritimeWorld,
  applySettingsViaCodecRestore,
  assertValidNmeaSentence,
  createMdcBridgeDriver,
  getAisInfo,
  getAlarmInfo,
  getAtaInfo,
  getGuardZoneInfo,
  initialMaritimeWorldState,
  operateMenuItem,
  projectMaritimeSensorBus,
  setChoiceSetting,
  setGuardZoneSettings,
} from "./helpers/session-driver.mjs";
import {
  buildSyntheticMaritimeBus,
  extractAisResult,
  extractAtaState,
  extractAtaTargets,
  extractGuardZoneStatus,
  normalizeAisSettings,
  normalizeAtaSettings,
  normalizeGuardZoneSettings,
} from "./helpers/signal-oracle.mjs";

export const TIER = 1;
export const SUITE = "tier1-ata-ais-guardzone";

function getCoastalBusAt(scenario, steps = 0) {
  let ws = initialMaritimeWorldState(scenario);
  if (steps > 0) ws = advanceMaritimeWorld(scenario, ws, steps);
  return projectMaritimeSensorBus(scenario, ws);
}

export const TESTS = [
  {
    id: "T1-059",
    name: "Manual ATA Acquisition Assigns Sequential IDs T01, T02, T03",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      assert.ok(bus.radarContacts.length >= 3);
      const s0 = arpa.initialAtaState();
      const r1 = arpa.acquireAtaTarget(s0, bus.radarContacts[0], 0, bus);
      const s1 = extractAtaState(r1);
      const r2 = arpa.acquireAtaTarget(s1, bus.radarContacts[1], 0, bus);
      const s2 = extractAtaState(r2);
      const r3 = arpa.acquireAtaTarget(s2, bus.radarContacts[2], 0, bus);
      const targets = extractAtaTargets(r3);
      assert.equal(extractAtaTargets(s0).length, 0, "initialAtaState must remain unmutated");
      assert.equal(targets.length, 3);
      assert.deepEqual(targets.map(t => t.id ?? t.targetId), ["T01", "T02", "T03"]);
      for (const t of targets) {
        assert.equal(String(t.status).toLowerCase(), "acquiring");
      }
    },
  },
  {
    id: "T1-060",
    name: "ATA 6-Tick Stabilization Transition (acquiring -> tracking)",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      const pacificContact = bus.radarContacts.find(c => String(c.contactId).includes("574002101")) ?? bus.radarContacts[0];
      let ataState = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), pacificContact, 0, bus));
      const settings = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15, vectorMode: "T", vectorTimeMin: 6, ataBoardOption: true});
      for (let t = 1; t <= 5; t++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        ataState = extractAtaState(arpa.stepAtaTracking(ataState, bus, settings, t));
        const tgt = extractAtaTargets(ataState)[0];
        assert.equal(String(tgt.status).toLowerCase(), "acquiring", `Tick ${t} must still be acquiring`);
      }
      ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
      bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      ataState = extractAtaState(arpa.stepAtaTracking(ataState, bus, settings, 6));
      const tracked = extractAtaTargets(ataState)[0];
      assert.equal(String(tracked.status).toLowerCase(), "tracking", "Tick 6 must transition to tracking");
      for (const field of ["cogDeg", "sogKn", "cpaNm", "tcpaMin"]) {
        assert.ok(Number.isFinite(Number(tracked[field])), `Stabilized target missing finite ${field}`);
      }
    },
  },
  {
    id: "T1-061",
    name: "ATA Manual Delete (DEL) & Delete All (DEL ALL)",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      let st = arpa.initialAtaState();
      st = extractAtaState(arpa.acquireAtaTarget(st, bus.radarContacts[0], 0, bus));
      st = extractAtaState(arpa.acquireAtaTarget(st, bus.radarContacts[1], 0, bus));
      st = extractAtaState(arpa.acquireAtaTarget(st, bus.radarContacts[2], 0, bus));
      st = extractAtaState(arpa.deleteAtaTarget(st, "T01"));
      const afterDel = extractAtaTargets(st);
      assert.equal(afterDel.length, 2);
      assert.deepEqual(afterDel.map(t => t.id ?? t.targetId), ["T02", "T03"]);
      st = extractAtaState(arpa.deleteAllAtaTargets(st));
      assert.equal(extractAtaTargets(st).length, 0);
    },
  },
  {
    id: "T1-062",
    name: "ATA AUTO DETECT AREA Auto-Acquires Intruding Contacts",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 1);
      const sample = bus.radarContacts[0];
      assert.ok(sample);
      const settings = normalizeAtaSettings({
        ataBoardOption: true,
        ataAutoArea: true,
        autoDetectArea: {
          enabled: true,
          innerNm: Math.max(0.1, sample.rangeNm - 1.0),
          outerNm: sample.rangeNm + 1.0,
          startBrgDeg: (sample.bearingDeg - 25 + 360) % 360,
          endBrgDeg: (sample.bearingDeg + 25) % 360,
        },
        cpaLimitNm: 0.5,
        tcpaLimitMin: 15,
      });
      const next = arpa.stepAtaTracking(arpa.initialAtaState(), bus, settings, 1);
      const targets = extractAtaTargets(next);
      assert.ok(targets.length >= 1, "AUTO DETECT AREA must auto-acquire intruding contact on stepAtaTracking");
    },
  },
  {
    id: "T1-063",
    name: "ATA Vector Modes (True / Relative) & Vector Length (1-30 min)",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), bus.radarContacts[0], 0, bus));
      for (let t = 1; t <= 6; t++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        st = extractAtaState(arpa.stepAtaTracking(st, bus, normalizeAtaSettings({vectorMode: "T", vectorTimeMin: 6, cpaLimitNm: 0.5, tcpaLimitMin: 15}), t));
      }
      const st30 = extractAtaState(arpa.stepAtaTracking(st, bus, normalizeAtaSettings({vectorMode: "T", vectorTimeMin: 30, cpaLimitNm: 0.5, tcpaLimitMin: 15}), 7));
      const t6 = extractAtaTargets(st)[0];
      const t30 = extractAtaTargets(st30)[0];
      assert.ok(t6 && t30);

      for (const mins of [1, 6, 15, 30]) {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        applySettingsViaCodecRestore(drv, model, (s, keys) => {
          setChoiceSetting(s, keys.vectorTimeMin, mins);
          setChoiceSetting(s, keys.vectorMode, "R");
        });
        drv.powerOnToTransmit({fastPreheat: true});
        assert.equal(getAtaInfo(drv.state(), MDC2060_ADAPTER).vectorTimeMin, mins);
      }
    },
  },
  {
    id: "T1-064",
    name: "ATA Past Positions History (Up to 6 Points at 30s Intervals)",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      const moving = bus.radarContacts.find(c => String(c.contactId).includes("574002101")) ?? bus.radarContacts[0];
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), moving, 0, bus));
      const settings = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15, vectorMode: "T", vectorTimeMin: 6, pastPosIntervalSec: 30, ataPastPos: "30s"});
      for (let t = 1; t <= 210; t++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        st = extractAtaState(arpa.stepAtaTracking(st, bus, settings, t));
      }
      const tgt = extractAtaTargets(st)[0];
      assert.ok(Array.isArray(tgt.pastPositions), "Tracked ATA target must record pastPositions array");
      assert.equal(tgt.pastPositions.length, 6, `pastPositions must cap at 6 after 210s, got ${tgt.pastPositions.length}`);
      const first = tgt.pastPositions[0];
      const last = tgt.pastPositions[tgt.pastPositions.length - 1];
      assert.notDeepEqual(first, last, "Moving target past positions must reflect distinct positions");
    },
  },
  {
    id: "T1-065",
    name: "ATA Dangerous CPA/TCPA Detection on PACIFIC STAR",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      const pacific = bus.radarContacts.find(c => String(c.contactId).includes("574002101"));
      assert.ok(pacific, "Coastal scenario must include PACIFIC STAR radar contact");
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), pacific, 0, bus));
      const settings = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15, vectorMode: "T", vectorTimeMin: 6});
      let res;
      for (let t = 1; t <= 6; t++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        res = arpa.stepAtaTracking(st, bus, settings, t);
        st = extractAtaState(res);
      }
      const tgt = extractAtaTargets(st)[0];
      assert.equal(tgt.dangerous, true, `PACIFIC STAR (CPA=${tgt.cpaNm}, TCPA=${tgt.tcpaMin}) must be flagged dangerous`);
      assert.equal(
        Boolean(res?.alarmActive ?? st?.alarmActive),
        true,
        "stepAtaTracking must set alarmActive === true when a tracked target is dangerous",
      );
    },
  },
  {
    id: "T1-066",
    name: "ATA $RATTM NMEA-0183 Sentence Format & Exact XOR Checksum",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), bus.radarContacts[0], 0, bus));
      const settings = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15});
      for (let t = 1; t <= 6; t++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        st = extractAtaState(arpa.stepAtaTracking(st, bus, settings, t));
      }
      const tgt = extractAtaTargets(st)[0];
      const sentence = arpa.formatRattmSentence(tgt, bus.ownship, 6);
      assertValidNmeaSentence(sentence, "RATTM");
      assert.match(sentence, /^\$RATTM,\d{2},[^*]+\*[0-9A-F]{2}$/);
    },
  },
  {
    id: "T1-067",
    name: "ATA Integration Through MDC2060_ADAPTER Menu & ENT Cursor Acquire",
    features: [23],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(6);
      const ata = getAtaInfo(drv.state(), MDC2060_ADAPTER);
      assert.ok(ata.targetCount >= 1 || ata.targets.length >= 1, "ATA ACQ via menu must track at least one target");
      assert.ok(ata.rattmSentences.length >= 1, "Stabilized ATA track after 6 ticks must emit at least one $RATTM sentence");
      assertValidNmeaSentence(ata.rattmSentences[0], "RATTM");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-068",
    name: "AIS Overlay Projects All Coastal maritimeBus.aisTargets",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      const res = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 24, cpaLimitNm: 0.5, tcpaLimitMin: 15}), null),
      );
      assert.equal(res.targets.length, 6, `Expected all 6 coastal AIS targets, got ${res.targets.length}`);
      for (const t of res.targets) {
        assert.ok(t.mmsi && t.name, "AIS target must expose mmsi and name");
        assert.ok(Number.isFinite(Number(t.rangeNm)) && Number.isFinite(Number(t.bearingDeg)));
        assert.ok(Number.isFinite(Number(t.cpaNm)) && Number.isFinite(Number(t.tcpaMin)));
      }
    },
  },
  {
    id: "T1-069",
    name: "AIS Target Classification (sleeping, active, dangerous)",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      const nonDanger = bus.aisTargets.find(t => !/PACIFIC STAR/i.test(t.name));
      assert.ok(nonDanger);
      const res = extractAisResult(
        arpa.projectAisTargets(
          bus,
          normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 24, cpaLimitNm: 0.5, tcpaLimitMin: 15, aisCpaAlarm: true}),
          nonDanger.mmsi,
        ),
      );
      const pacific = res.targets.find(t => /PACIFIC STAR/i.test(t.name));
      const selected = res.targets.find(t => t.mmsi === nonDanger.mmsi);
      assert.ok(pacific && selected);
      assert.equal(String(pacific.status ?? pacific.classification).toLowerCase(), "dangerous");
      assert.ok(["active", "dangerous"].includes(String(selected.status ?? selected.classification).toLowerCase()));
      const validStatuses = new Set(["sleeping", "active", "dangerous"]);
      for (const t of res.targets) {
        assert.ok(validStatuses.has(String(t.status ?? t.classification).toLowerCase()), `Invalid AIS status: ${t.status}`);
      }
    },
  },
  {
    id: "T1-070",
    name: "AIS Radius Filter (aisFilterRangeNm) Filters Targets by Distance",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      const res = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 2.0, cpaLimitNm: 0.5, tcpaLimitMin: 15}), null),
      );
      assert.ok(res.targets.length > 0 && res.targets.length < bus.aisTargets.length, "2.0 NM filter must exclude distant targets while keeping near ones");
      for (const t of res.targets) {
        assert.ok(Number(t.rangeNm) <= 2.0 + 1e-6, `Filtered AIS target ${t.name} exceeds 2.0 NM: ${t.rangeNm}`);
      }
    },
  },
  {
    id: "T1-071",
    name: "AIS Detail Box Selection (selectedAisMmsi)",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      const pacific = bus.aisTargets.find(t => /PACIFIC STAR/i.test(t.name));
      assert.ok(pacific);
      const res = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 24, cpaLimitNm: 0.5, tcpaLimitMin: 15}), pacific.mmsi),
      );
      assert.ok(res.selectedTarget, "Passing selectedAisMmsi must populate selectedTarget detail box");
      assert.equal(res.selectedTarget.mmsi, pacific.mmsi);
      assert.equal(res.selectedTarget.name, "PACIFIC STAR");
      assert.ok(res.selectedTarget.callSign);
    },
  },
  {
    id: "T1-072",
    name: "AIS CPA Alarm Flag Activates When aisCpaAlarm: true",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      const onRes = arpa.projectAisTargets(
        bus,
        normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 24, cpaLimitNm: 0.5, tcpaLimitMin: 15, aisCpaAlarm: true}),
        null,
      );
      const offRes = arpa.projectAisTargets(
        bus,
        normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 24, cpaLimitNm: 0.5, tcpaLimitMin: 15, aisCpaAlarm: false}),
        null,
      );
      assert.equal(Boolean(onRes?.alarmActive ?? onRes?.cpaAlarmActive), true, "aisCpaAlarm: true must raise AIS alarm on PACIFIC STAR");
      assert.equal(Boolean(offRes?.alarmActive ?? offRes?.cpaAlarmActive), false, "aisCpaAlarm: false must suppress AIS CPA alarm");
      const pacificOff = extractAisResult(offRes).targets.find(t => /PACIFIC STAR/i.test(t.name));
      assert.equal(String(pacificOff?.status ?? pacificOff?.classification).toLowerCase(), "dangerous");
    },
  },
  {
    id: "T1-073",
    name: "AIS Display Toggle (MENU > AIS > DISPLAY OFF/ON)",
    features: [24],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const initialAis = getAisInfo(drv.state(), MDC2060_ADAPTER);
      const busCountBefore = drv.bus().aisTargets.length;
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^AIS$/i, /^DISPLAY$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const toggled = getAisInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(toggled.display, !initialAis.display, "Toggling AIS DISPLAY must flip display boolean");

      const offState = toggled.display ? initialAis : toggled;
      const onState = toggled.display ? toggled : initialAis;
      assert.equal(offState.display, false, "AIS DISPLAY OFF state must report display === false");
      assert.equal(offState.targetCount, 0, "Turning AIS DISPLAY OFF must hide projected AIS targets");
      assert.equal(onState.display, true, "AIS DISPLAY ON state must report display === true");
      assert.ok(onState.targetCount > 0, "AIS DISPLAY ON must project coastal AIS targets");
      assert.equal(drv.bus().aisTargets.length, busCountBefore, "Toggling AIS DISPLAY must never mutate maritimeBus.aisTargets");

      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^AIS$/i, /^DISPLAY$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const restored = getAisInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(restored.display, initialAis.display);
      assert.equal(restored.targetCount, initialAis.targetCount);
    },
  },
  {
    id: "T1-074",
    name: "Guard Zone ALARM IN Triggers When Contact Enters Annular Sector",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = getCoastalBusAt(MDC2060_COASTAL_SCENARIO, 0);
      const haiAu = bus.radarContacts.find(c => String(c.contactId).includes("574009330")) ?? bus.radarContacts[0];
      assert.ok(haiAu);
      const settings = normalizeGuardZoneSettings({
        mode: "IN",
        innerNm: Math.max(0.1, haiAu.rangeNm - 0.5),
        outerNm: haiAu.rangeNm + 0.5,
        startBrgDeg: (haiAu.bearingDeg - 20 + 360) % 360,
        endBrgDeg: (haiAu.bearingDeg + 20) % 360,
      });
      const status = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), bus, settings));
      assert.equal(status.mode, "IN", "Guard Zone must be active in IN mode");
      assert.equal(status.triggered, true, "Guard Zone IN must trigger for contact inside annular sector");
      assert.ok(status.intruders.length >= 1, "Guard Zone IN must list intruding contactId");
    },
  },
  {
    id: "T1-075",
    name: "Guard Zone ALARM IN Remains Quiet When Sector Is Empty",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const bus = buildSyntheticMaritimeBus({
        radarContacts: [{contactId: "tgt-1", rcsSqm: 200, rangeNm: 5.0, bearingDeg: 180}],
      });
      const settings = normalizeGuardZoneSettings({mode: "IN", innerNm: 1.0, outerNm: 2.5, startBrgDeg: 20, endBrgDeg: 70});
      const status = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), bus, settings));
      assert.equal(status.mode, "IN", "Guard Zone must be active in IN mode (never OFF)");
      assert.equal(status.triggered, false);
      assert.equal(status.intruders.length, 0);
    },
  },
  {
    id: "T1-076",
    name: "Guard Zone ALARM OUT Triggers When Captured Target Leaves Sector",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const settings = normalizeGuardZoneSettings({mode: "OUT", innerNm: 1.0, outerNm: 3.0, startBrgDeg: 40, endBrgDeg: 100});
      const busIn = buildSyntheticMaritimeBus({
        simTick: 1,
        radarContacts: [{contactId: "tgt-leave", rcsSqm: 500, rangeNm: 2.0, bearingDeg: 70}],
      });
      const step1 = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), busIn, settings));
      assert.equal(step1.mode, "OUT", "Guard Zone step1 must be active in OUT mode");
      assert.equal(step1.triggered, false, "OUT mode must not trigger while target is still inside sector");

      const busOut = buildSyntheticMaritimeBus({
        simTick: 2,
        radarContacts: [{contactId: "tgt-leave", rcsSqm: 500, rangeNm: 4.2, bearingDeg: 70}],
      });
      const step2 = extractGuardZoneStatus(arpa.evaluateGuardZone(step1.state, busOut, settings));
      assert.equal(step2.mode, "OUT", "Guard Zone step2 must remain active in OUT mode");
      assert.equal(step2.triggered, true, "OUT mode must trigger when previously captured target exits sector");
    },
  },
  {
    id: "T1-077",
    name: "Guard Zone Configuration via MENU > ALARM (MODE, INNER/OUTER RNG, START/END BRG, LEVEL)",
    features: [25],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const initialGz = getGuardZoneInfo(drv.state(), MDC2060_ADAPTER);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /INNER/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /OUTER/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /START/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /END/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /LEVEL/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const afterGz = getGuardZoneInfo(drv.state(), MDC2060_ADAPTER);
      assert.notEqual(afterGz.mode, initialGz.mode, "ALARM > MODE must update Guard Zone mode");
      assert.notEqual(afterGz.innerNm, initialGz.innerNm, "ALARM > INNER RNG must update Guard Zone innerNm");
      assert.notEqual(afterGz.outerNm, initialGz.outerNm, "ALARM > OUTER RNG must update Guard Zone outerNm");
      assert.notEqual(afterGz.startBrgDeg, initialGz.startBrgDeg, "ALARM > START BRG must update Guard Zone startBrgDeg");
      assert.notEqual(afterGz.endBrgDeg, initialGz.endBrgDeg, "ALARM > END BRG must update Guard Zone endBrgDeg");
      assert.notEqual(afterGz.level, initialGz.level, "ALARM > LEVEL must update Guard Zone level");
      assert.ok(
        Number.isFinite(Number(afterGz.innerNm)) && Number.isFinite(Number(afterGz.outerNm)) && Number(afterGz.innerNm) < Number(afterGz.outerNm),
        `Guard Zone innerNm (${afterGz.innerNm}) must remain strictly less than outerNm (${afterGz.outerNm})`,
      );
      drv.assertCanonicalState();
    },
  },
  {
    id: "T1-078",
    name: "alarm_ack Silences Active Guard Zone Audible Alarm While Keeping Visual Alert",
    features: [25],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setGuardZoneSettings(s, keys, {mode: "IN", innerNm: 0.2, outerNm: 6.0, startBrgDeg: 0, endBrgDeg: 359});
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).mode, "IN", "Restored Guard Zone mode must be IN");
      drv.tick(2);
      const beforeAck = getAlarmInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).triggered, true, "Guard Zone IN covering coastal traffic must trigger");
      assert.equal(beforeAck.audible, true, "Active Guard Zone alarm must sound audible buzzer prior to alarm_ack");
      assert.equal(beforeAck.visualActive, true);
      drv.press("alarm_ack");
      const afterAck = getAlarmInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(afterAck.audible, false, "alarm_ack must silence audible buzzer");
      assert.equal(afterAck.visualActive, true, "Visual alert must remain active while intruder stays inside zone");
    },
  },
  {
    id: "T1-079",
    name: "Guard Zone MODE = OFF Clears Active Guard Zone Alarm",
    features: [25],
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
      drv.tick(2);
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).triggered, true);
      // Cycle ALARM > MODE back to OFF
      for (let guard = 0; guard < 3 && getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).mode !== "OFF"; guard++) {
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ALARM$/i, /^MODE$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      }
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).mode, "OFF");
      assert.equal(getGuardZoneInfo(drv.state(), MDC2060_ADAPTER).triggered, false, "Setting Guard Zone MODE=OFF must clear Guard Zone alarm immediately");
    },
  },
];
