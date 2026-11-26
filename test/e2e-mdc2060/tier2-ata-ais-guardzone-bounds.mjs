import assert from "node:assert/strict";
import {loadAdapter, loadArpaAis, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  advanceMaritimeWorld,
  assertValidNmeaSentence,
  createMdcBridgeDriver,
  getAisInfo,
  getAtaInfo,
  initialMaritimeWorldState,
  operateMenuItem,
  projectMaritimeSensorBus,
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

export const TIER = 2;
export const SUITE = "tier2-ata-ais-guardzone-bounds";

function makeContacts(count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      contactId: `tgt-cap-${String(i + 1).padStart(3, "0")}`,
      rcsSqm: 500,
      rangeNm: 1.0 + (i % 10) * 0.4,
      bearingDeg: (i * 7) % 360,
      relBearingDeg: (i * 7) % 360,
      relSpeedKn: 8,
      cpaNm: 1.5,
      tcpaMin: 25,
    });
  }
  return list;
}

export const TESTS = [
  {
    id: "T2-052",
    name: "ATA 50-Target Hard Cap (T01..T50) Rejects 51st Target Cleanly",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const contacts = makeContacts(51);
      const bus = buildSyntheticMaritimeBus({radarContacts: contacts});
      let st = arpa.initialAtaState();
      for (let i = 0; i < 50; i++) {
        st = extractAtaState(arpa.acquireAtaTarget(st, contacts[i], 0, bus));
      }
      const at50 = extractAtaTargets(st);
      assert.equal(at50.length, 50);
      assert.equal(at50[0].id ?? at50[0].targetId, "T01");
      assert.equal(at50[49].id ?? at50[49].targetId, "T50");

      const res51 = arpa.acquireAtaTarget(st, contacts[50], 0, bus);
      const at51 = extractAtaTargets(res51);
      assert.equal(at51.length, 50, "51st ATA target must be rejected cleanly at 50-target cap");
      assert.ok(!at51.some(t => t.contactId === contacts[50].contactId));
    },
  },
  {
    id: "T2-053",
    name: "ATA Duplicate Acquisition of Already-Tracked contactId Does Not Consume New Slot",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const contact = makeContacts(1)[0];
      const bus = buildSyntheticMaritimeBus({radarContacts: [contact]});
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), contact, 0, bus));
      st = extractAtaState(arpa.acquireAtaTarget(st, contact, 1, bus));
      const targets = extractAtaTargets(st);
      assert.equal(targets.length, 1);
      assert.equal(targets[0].id ?? targets[0].targetId, "T01");
    },
  },
  {
    id: "T2-054",
    name: "ATA < 6 Ticks Stays acquiring & Exact Tick 6 Transitions to tracking",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), bus.radarContacts[0], 0, bus));
      const settings = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15});
      for (let tick = 1; tick <= 6; tick++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        st = extractAtaState(arpa.stepAtaTracking(st, bus, settings, tick));
        const tgt = extractAtaTargets(st)[0];
        const expected = tick < 6 ? "acquiring" : "tracking";
        assert.equal(String(tgt.status).toLowerCase(), expected, `Tick ${tick} expected "${expected}", got "${tgt.status}"`);
      }
    },
  },
  {
    id: "T2-055",
    name: "ATA Blocked Fail-Closed When ataBoardOption === false",
    features: [23],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("ataBoardOption", false);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      drv.tick(3);
      const ata = getAtaInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(ata.boardEnabled, false);
      assert.equal(ata.targetCount, 0, "ataBoardOption=false must block ATA acquisition fail-closed");
    },
  },
  {
    id: "T2-056",
    name: "ATA deleteAtaTarget on Non-Existent ID (T99) Is Safe No-Op",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const contacts = makeContacts(2);
      const bus = buildSyntheticMaritimeBus({radarContacts: contacts});
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), contacts[0], 0, bus));
      st = extractAtaState(arpa.acquireAtaTarget(st, contacts[1], 0, bus));
      const after = arpa.deleteAtaTarget(st, "T99");
      assert.equal(extractAtaTargets(after).length, 2);
    },
  },
  {
    id: "T2-057",
    name: "ATA Diverging Target (tcpaMin <= 0) Never Flags dangerous Even If cpaNm <= Limit",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const receding = {
        contactId: "tgt-receding",
        rcsSqm: 800,
        rangeNm: 1.2,
        bearingDeg: 270,
        relBearingDeg: 180,
        relSpeedKn: 14,
        cpaNm: 0.1,
        tcpaMin: -3.0,
      };
      const bus = buildSyntheticMaritimeBus({radarContacts: [receding]});
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), receding, 0, bus));
      const ataLimits = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15});
      for (let t = 1; t <= 6; t++) {
        st = extractAtaState(arpa.stepAtaTracking(st, bus, ataLimits, t));
      }
      const tgt = extractAtaTargets(st)[0];
      assert.equal(tgt.dangerous, false, "Receding target (TCPA <= 0) must never flag dangerous");
    },
  },
  {
    id: "T2-058",
    name: "ATA Exact CPA/TCPA Threshold Boundary (cpaNm > limit or tcpaMin > limit Not Dangerous)",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      let ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      const pacific = bus.radarContacts.find(c => String(c.contactId).includes("574002101"));
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), pacific, 0, bus));
      const baseLimits = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15});
      for (let t = 1; t <= 6; t++) {
        ws = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, ws, 1);
        bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
        st = extractAtaState(arpa.stepAtaTracking(st, bus, baseLimits, t));
      }
      assert.equal(extractAtaTargets(st)[0].dangerous, true);

      const tightCpa = arpa.stepAtaTracking(st, bus, normalizeAtaSettings({cpaLimitNm: 0.05, tcpaLimitMin: 15}), 7);
      assert.equal(extractAtaTargets(tightCpa)[0].dangerous, false, "cpaNm > cpaLimitNm must not flag dangerous");

      const tightTcpa = arpa.stepAtaTracking(st, bus, normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 1.0}), 7);
      assert.equal(extractAtaTargets(tightTcpa)[0].dangerous, false, "tcpaMin > tcpaLimitMin must not flag dangerous");
    },
  },
  {
    id: "T2-059",
    name: "ATA Target Lost (Contact Disappears from maritimeBus.radarContacts) Handled Cleanly",
    features: [23],
    async run() {
      const arpa = await loadArpaAis();
      const c = makeContacts(1)[0];
      const busPresent = buildSyntheticMaritimeBus({radarContacts: [c]});
      const busEmpty = buildSyntheticMaritimeBus({radarContacts: []});
      const settings = normalizeAtaSettings({cpaLimitNm: 0.5, tcpaLimitMin: 15});
      let st = extractAtaState(arpa.acquireAtaTarget(arpa.initialAtaState(), c, 0, busPresent));
      for (let t = 1; t <= 6; t++) {
        st = extractAtaState(arpa.stepAtaTracking(st, busPresent, settings, t));
      }
      const beforeLoss = extractAtaTargets(st);
      assert.equal(beforeLoss.length, 1, "Target must be tracked before disappearing");
      assert.equal(String(beforeLoss[0].status).toLowerCase(), "tracking", "Target must reach tracking status at tick 6");

      for (let t = 7; t <= 20; t++) {
        st = extractAtaState(arpa.stepAtaTracking(st, busEmpty, settings, t));
      }
      const remaining = extractAtaTargets(st);
      const prunedOrLost =
        remaining.length === 0 ||
        (remaining.length === 1 && String(remaining[0].status).toLowerCase() === "lost" && remaining[0].dangerous === false);
      assert.equal(
        prunedOrLost,
        true,
        `Disappeared ATA target after 14 missing ticks must be pruned (0) or marked status="lost" with dangerous=false, got ${JSON.stringify(remaining)}`,
      );
      for (const lostTarget of remaining) {
        const sentence = arpa.formatRattmSentence(lostTarget, busEmpty.ownship, 20);
        assertValidNmeaSentence(sentence, "RATTM");
        assert.doesNotMatch(sentence, /NaN|undefined/);
      }
    },
  },
  {
    id: "T2-060",
    name: "AIS 100-Target Hard Cap Truncates Excess Targets Safely",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const aisTargets = [];
      for (let i = 0; i < 120; i++) {
        aisTargets.push({
          mmsi: String(574100000 + i),
          name: `VESSEL ${i + 1}`,
          callSign: `3W${i}`,
          navStatus: 0,
          shipType: 70,
          lat: 10.5 + (i * 0.001),
          lon: 106.75 + (i * 0.001),
          sogKn: 10,
          cogDeg: 90,
          hdgDeg: 90,
          lengthM: 100,
          beamM: 18,
          rangeNm: 0.5 + i * 0.08,
          bearingDeg: (i * 3) % 360,
          relBearingDeg: (i * 3) % 360,
          relSpeedKn: 5,
          cpaNm: 2.0,
          tcpaMin: 20,
        });
      }
      const bus = buildSyntheticMaritimeBus({aisTargets});
      const res = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 64, cpaLimitNm: 0.5, tcpaLimitMin: 15}), null),
      );
      assert.ok(res.targets.length > 0 && res.targets.length <= 100, `AIS overlay must cap at 100 targets, got ${res.targets.length}`);
    },
  },
  {
    id: "T2-061",
    name: "AIS aisBoardOption === false Suppresses All Targets & CPA Alarm",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO));
      const direct = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: false, aisFilterRangeNm: 24, aisCpaAlarm: true}), bus.aisTargets[0].mmsi),
      );
      assert.equal(direct.targets.length, 0);
      assert.equal(direct.selectedTarget, null);
      assert.equal(direct.alarmActive, false);

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.fixture("aisBoardOption", false);
      drv.tick(2);
      const ais = getAisInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(ais.boardEnabled, false);
      assert.equal(ais.targetCount, 0);
      assert.equal(ais.alarmActive, false);
    },
  },
  {
    id: "T2-062",
    name: "AIS Empty aisTargets: [] (0 Targets) Handled Gracefully",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const bus = buildSyntheticMaritimeBus({aisTargets: []});
      const res = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 12, aisCpaAlarm: true}), "574002101"),
      );
      assert.equal(res.targets.length, 0);
      assert.equal(res.selectedTarget, null);
      assert.equal(res.alarmActive, false);
    },
  },
  {
    id: "T2-063",
    name: "AIS Radius Filter Exact Boundary (rangeNm <= filter Included vs rangeNm > filter Excluded)",
    features: [24],
    async run() {
      const arpa = await loadArpaAis();
      const bus = buildSyntheticMaritimeBus({
        aisTargets: [
          {mmsi: "574000001", name: "EXACT IN", callSign: "IN1", navStatus: 0, shipType: 70, lat: 10.55, lon: 106.75, sogKn: 8, cogDeg: 0, hdgDeg: 0, rangeNm: 3.0, bearingDeg: 0, cpaNm: 2, tcpaMin: 20},
          {mmsi: "574000002", name: "JUST OUT", callSign: "OUT1", navStatus: 0, shipType: 70, lat: 10.551, lon: 106.75, sogKn: 8, cogDeg: 0, hdgDeg: 0, rangeNm: 3.001, bearingDeg: 0, cpaNm: 2, tcpaMin: 20},
        ],
      });
      const res = extractAisResult(
        arpa.projectAisTargets(bus, normalizeAisSettings({aisDisplay: true, aisBoardOption: true, aisFilterRangeNm: 3.0, cpaLimitNm: 0.5, tcpaLimitMin: 15}), null),
      );
      assert.deepEqual(res.targets.map(t => t.mmsi), ["574000001"]);
    },
  },
  {
    id: "T2-064",
    name: "Guard Zone North Wrap-Around (330 -> 30) Contains 355, 0, 5 & Excludes 180, 329, 31",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const settings = normalizeGuardZoneSettings({mode: "IN", innerNm: 1.0, outerNm: 4.0, startBrgDeg: 330, endBrgDeg: 30});
      for (const insideBrg of [355, 0, 5, 330, 30]) {
        const bus = buildSyntheticMaritimeBus({
          radarContacts: [{contactId: `in-${insideBrg}`, rcsSqm: 300, rangeNm: 2.5, bearingDeg: insideBrg}],
        });
        const status = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), bus, settings));
        assert.equal(status.mode, "IN", `Guard Zone must stay active in IN mode for bearing ${insideBrg}`);
        assert.equal(status.triggered, true, `Bearing ${insideBrg} deg must be INSIDE wrap zone [330..30]`);
      }
      for (const outsideBrg of [180, 329, 31, 90, 270]) {
        const bus = buildSyntheticMaritimeBus({
          radarContacts: [{contactId: `out-${outsideBrg}`, rcsSqm: 300, rangeNm: 2.5, bearingDeg: outsideBrg}],
        });
        const status = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), bus, settings));
        assert.equal(status.mode, "IN", `Guard Zone must stay active in IN mode for bearing ${outsideBrg}`);
        assert.equal(status.triggered, false, `Bearing ${outsideBrg} deg must be OUTSIDE wrap zone [330..30]`);
      }
    },
  },
  {
    id: "T2-065",
    name: "Guard Zone innerNm >= outerNm Validation / Fail-Closed Enforcement",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const busAt2 = buildSyntheticMaritimeBus({
        radarContacts: [{contactId: "tgt-at2", rcsSqm: 400, rangeNm: 2.0, bearingDeg: 45}],
      });
      const busOutside = buildSyntheticMaritimeBus({
        radarContacts: [
          {contactId: "tgt-near", rcsSqm: 400, rangeNm: 0.5, bearingDeg: 45},
          {contactId: "tgt-far", rcsSqm: 400, rangeNm: 5.0, bearingDeg: 45},
        ],
      });
      const eqSettings = normalizeGuardZoneSettings({mode: "IN", innerNm: 2.0, outerNm: 2.0, startBrgDeg: 0, endBrgDeg: 90});
      const invSettings = normalizeGuardZoneSettings({mode: "IN", innerNm: 4.0, outerNm: 2.0, startBrgDeg: 0, endBrgDeg: 90});

      for (const [label, cfg] of [["innerNm===outerNm", eqSettings], ["innerNm>outerNm", invSettings]]) {
        const res = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), busAt2, cfg));
        const outRes = extractGuardZoneStatus(arpa.evaluateGuardZone(arpa.initialGuardZoneState(), busOutside, cfg));
        assert.equal(res.mode, "IN", `${label}: Guard Zone must evaluate in IN mode (never OFF)`);
        assert.equal(outRes.mode, "IN", `${label}: Guard Zone outside check must evaluate in IN mode (never OFF)`);
        const failClosedOrNormalized =
          res.triggered === false ||
          (Number.isFinite(res.state?.innerNm) &&
            Number.isFinite(res.state?.outerNm) &&
            res.state.innerNm >= 0 &&
            res.state.innerNm < res.state.outerNm);
        assert.equal(
          failClosedOrNormalized,
          true,
          `${label}: degenerate Guard Zone must either fail closed or strictly normalize innerNm < outerNm`,
        );
        assert.equal(outRes.triggered, false, `${label}: must never false-trigger on targets outside the zone`);
        assert.equal(outRes.intruders.length, 0, `${label}: must list 0 intruders for outside targets`);
      }
    },
  },
  {
    id: "T2-066",
    name: "Guard Zone Exact Range Boundaries (innerNm and outerNm)",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const settings = normalizeGuardZoneSettings({mode: "IN", innerNm: 1.0, outerNm: 3.0, startBrgDeg: 20, endBrgDeg: 80});
      const below = extractGuardZoneStatus(
        arpa.evaluateGuardZone(arpa.initialGuardZoneState(), buildSyntheticMaritimeBus({radarContacts: [{contactId: "c1", rangeNm: 0.99, bearingDeg: 50}]}), settings),
      );
      const mid = extractGuardZoneStatus(
        arpa.evaluateGuardZone(arpa.initialGuardZoneState(), buildSyntheticMaritimeBus({radarContacts: [{contactId: "c2", rangeNm: 1.5, bearingDeg: 50}]}), settings),
      );
      const above = extractGuardZoneStatus(
        arpa.evaluateGuardZone(arpa.initialGuardZoneState(), buildSyntheticMaritimeBus({radarContacts: [{contactId: "c3", rangeNm: 3.01, bearingDeg: 50}]}), settings),
      );
      assert.equal(below.mode, "IN");
      assert.equal(mid.mode, "IN");
      assert.equal(above.mode, "IN");
      assert.equal(below.triggered, false);
      assert.equal(mid.triggered, true);
      assert.equal(above.triggered, false);
    },
  },
  {
    id: "T2-067",
    name: "Guard Zone OUT Mode Never False-Triggers When Zone Was Always Empty",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const settings = normalizeGuardZoneSettings({mode: "OUT", innerNm: 1.0, outerNm: 3.0, startBrgDeg: 20, endBrgDeg: 80});
      let st = arpa.initialGuardZoneState();
      for (let t = 1; t <= 5; t++) {
        const bus = buildSyntheticMaritimeBus({
          simTick: t,
          radarContacts: [{contactId: "far", rangeNm: 5.0, bearingDeg: 200}],
        });
        const res = extractGuardZoneStatus(arpa.evaluateGuardZone(st, bus, settings));
        assert.equal(res.mode, "OUT", `Guard Zone must be active in OUT mode at tick ${t} (never OFF)`);
        assert.equal(res.triggered, false, `OUT mode must not false-trigger at tick ${t} when zone was always empty`);
        st = res.state;
      }
    },
  },
  {
    id: "T2-068",
    name: "Guard Zone Negative / >= 360 Bearing Normalization (-30 === 330, 390 === 30)",
    features: [25],
    async run() {
      const arpa = await loadArpaAis();
      const settings = normalizeGuardZoneSettings({mode: "IN", innerNm: 1.0, outerNm: 4.0, startBrgDeg: -30, endBrgDeg: 390});
      const hit = extractGuardZoneStatus(
        arpa.evaluateGuardZone(arpa.initialGuardZoneState(), buildSyntheticMaritimeBus({radarContacts: [{contactId: "n0", rangeNm: 2.0, bearingDeg: 0}]}), settings),
      );
      const miss = extractGuardZoneStatus(
        arpa.evaluateGuardZone(arpa.initialGuardZoneState(), buildSyntheticMaritimeBus({radarContacts: [{contactId: "s180", rangeNm: 2.0, bearingDeg: 180}]}), settings),
      );
      assert.equal(hit.mode, "IN", "Guard Zone hit check must evaluate in IN mode");
      assert.equal(miss.mode, "IN", "Guard Zone miss check must evaluate in IN mode");
      assert.equal(hit.triggered, true, "Unnormalized [-30, 390] must normalize to [330, 30] and catch 0 deg");
      assert.equal(miss.triggered, false, "Unnormalized [-30, 390] must normalize to [330, 30] and strictly exclude 180 deg");
    },
  },
];
