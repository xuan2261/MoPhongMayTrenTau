import assert from "node:assert/strict";
import {loadAdapter, loadModel, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  FCV588_ADAPTER,
  applySettingsViaCodecRestore,
  assertDeepFrozen,
  createMdcBridgeDriver,
  createMdcSingleDriver,
  deepCloneFreeze,
  fingerprint,
  getColorPalette,
  getMotorRpm,
  getPowerMode,
  getRangeInfo,
  getStcCurve,
  initialMaritimeWorldState,
  operateMenuItem,
  projectMaritimeSensorBus,
  setChoiceSetting,
  stableSerialize,
} from "./helpers/session-driver.mjs";

export const TIER = 1;
export const SUITE = "tier1-settings-replay-scenarios-bridge";

export const TESTS = [
  {
    id: "T1-080",
    name: "Settings Codec Round-Trip (encodeMdc2060Settings -> decodeMdc2060Settings)",
    features: [31],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      assert.equal(typeof model.MDC2060_SETTINGS_STORAGE_KEY, "string");
      assert.ok(model.MDC2060_SETTINGS_STORAGE_KEY.length > 0);
      assert.ok(Number.isInteger(model.MDC2060_SETTINGS_SCHEMA_VERSION) && model.MDC2060_SETTINGS_SCHEMA_VERSION >= 1);

      const base = structuredClone(model.initialMdc2060State().settings);
      const raw = model.encodeMdc2060Settings(base);
      assert.equal(typeof raw, "string");
      const env = JSON.parse(raw);
      assert.equal(env.schemaVersion, model.MDC2060_SETTINGS_SCHEMA_VERSION);
      assert.equal(env.profileClass, "PUBLIC_REFERENCE");
      assert.equal(env.profileRevision, spec.MDC2060_PROFILE_REVISION);
      assert.match(String(env.contentFingerprint ?? ""), /^f0-fnv1a32-[0-9a-f]{8}$/);

      const decoded = model.decodeMdc2060Settings(raw);
      assert.ok(decoded && typeof decoded === "object");
      assert.deepEqual(decoded, base, "decodeMdc2060Settings must round-trip exact allowlisted settings");
    },
  },
  {
    id: "T1-081",
    name: "restore-settings Event Restores Allowlisted Settings While Powered OFF",
    features: [31],
    async run() {
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.colorPalette, "NIGHT");
        setChoiceSetting(s, keys.motorRpm, 48);
        setChoiceSetting(s, keys.rangeUnit, "km");
        setChoiceSetting(s, keys.stcCurve, 6);
      });
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(getColorPalette(drv.state(), MDC2060_ADAPTER), "NIGHT");
      assert.equal(getMotorRpm(drv.state(), MDC2060_ADAPTER), 48);
      assert.equal(getRangeInfo(drv.state(), MDC2060_ADAPTER).rangeUnit, "km");
      assert.equal(getStcCurve(drv.state(), MDC2060_ADAPTER), 6);
      drv.verifyReplay();
    },
  },
  {
    id: "T1-082",
    name: "Single-Session Replay Determinism (createSession -> createReplayEnvelope -> replay)",
    features: [31],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcSingleDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.press("range_down");
      drv.press("range_up");
      drv.rotate("gain", 5);
      drv.rotate("stc", 4);
      drv.pad("up");
      drv.pad("right");
      drv.holdPress("menu", 200);
      drv.pad("down");
      drv.holdPress("menu", 200);
      drv.tick(5);
      drv.holdPress("ent", 1300);
      const {envelope} = drv.verifyReplay();
      assert.equal(envelope.envelopeVersion, 7);
      assert.equal(envelope.deviceId, spec.MDC2060_ID);
    },
  },
  {
    id: "T1-083",
    name: "Bridge-Session Replay Determinism (createBridgeSession -> createBridgeReplay -> replayBridgeSession)",
    features: [31],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.tick(3);
      drv.press("range_down");
      drv.rotate("gain", 3);
      drv.rotate("stc", 6);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      drv.pointer(25, -20);
      drv.tick(5);
      const {restored} = drv.verifyReplay();
      assert.deepEqual(restored.devices[MDC2060_ADAPTER.id].deviceState, drv.state());
      assert.deepEqual(restored.maritimeWorld, drv.world());
    },
  },
  {
    id: "T1-084",
    name: "probeMdc2060(state) Returns Flat Operator-Observable Summary Matching MDC2060_ADAPTER.probe",
    features: [31],
    async run() {
      const {probeMdc2060} = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.assertProbeParity(probeMdc2060);
      drv.powerOnToTransmit({fastPreheat: true});
      drv.assertProbeParity(probeMdc2060);
      const p = probeMdc2060(drv.state());
      assert.ok(p && typeof p === "object" && !Array.isArray(p));
      stableSerialize(p);
      assert.ok(Object.keys(p).length >= 8, "probeMdc2060 must summarize core radar state observables");
    },
  },
  {
    id: "T1-085",
    name: "MDC2060_ADAPTER Frozen Contract & Control ID Schema Compliance",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      assertDeepFrozen(MDC2060_ADAPTER, "MDC2060_ADAPTER");
      assert.deepEqual(MDC2060_ADAPTER.holdThresholdMs, {power: 3000, ent: 1200, menu: 1500});
      for (const ctrl of MDC2060_ADAPTER.controls) {
        assert.match(ctrl, /^[a-z][a-z0-9_-]{1,23}$/, `Invalid protocol control id: ${ctrl}`);
        assert.ok(Array.isArray(MDC2060_ADAPTER.gestures[ctrl]) && MDC2060_ADAPTER.gestures[ctrl].length > 0);
      }
      const requiredFixtures = [
        "fastPreheat",
        "skipPreheat",
        "ataBoardOption",
        "aisBoardOption",
        "headingSensor",
        "gpsSensor",
        "speedSensor",
        "interferenceSource",
      ];
      for (const f of requiredFixtures) {
        assert.ok(MDC2060_ADAPTER.fixtures.includes(f), `MDC2060_ADAPTER.fixtures missing "${f}"`);
      }
    },
  },
  {
    id: "T1-086",
    name: "Pure Reducer Immutability (Input State & Event Never Mutated)",
    features: [31],
    async run() {
      const {initialMdc2060State, reduceMdc2060} = await loadModel();
      const s0 = deepCloneFreeze(initialMdc2060State());
      const evt1 = deepCloneFreeze({kind: "press", control: "power", hold: "short", seq: 1});
      const s1 = reduceMdc2060(s0, evt1);
      assert.notEqual(s1, s0, "State-changing event must return a new state reference");
      const s1Frozen = deepCloneFreeze(s1);
      const evt2 = deepCloneFreeze({kind: "tick", steps: 1, seq: 2});
      const s2 = reduceMdc2060(s1Frozen, evt2);
      assert.notEqual(s2, s1Frozen);
    },
  },
  {
    id: "T1-087",
    name: "Scenario Registry Contains All 3 Frozen Scenarios & Lookup Works",
    features: [30],
    async run() {
      const scen = await loadScenarios();
      assert.equal(scen.MDC2060_SCENARIOS.length, 3);
      assertDeepFrozen(scen.MDC2060_SCENARIOS, "MDC2060_SCENARIOS");
      assert.equal(scen.MDC2060_BRIDGE_SYNC_SCENARIO, DEFAULT_BRIDGE_WORLD_SCENARIO, "MDC2060_BRIDGE_SYNC_SCENARIO must strictly === DEFAULT_BRIDGE_WORLD_SCENARIO");
      assert.equal(scen.getMdc2060ScenarioById("mdc2060-coastal-approach"), scen.MDC2060_COASTAL_SCENARIO);
      assert.equal(scen.getMdc2060ScenarioById("mdc2060-storm-clutter"), scen.MDC2060_STORM_SCENARIO);
      assert.equal(scen.getMdc2060ScenarioById("bridge-coastal-traffic-001"), DEFAULT_BRIDGE_WORLD_SCENARIO);
    },
  },
  {
    id: "T1-088",
    name: "mdc2060-coastal-approach Exact Entities (6 Vessels, 4 Buoys, Coastline + 2 Islands)",
    features: [30],
    async run() {
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const sc = MDC2060_COASTAL_SCENARIO;
      assertDeepFrozen(sc, "MDC2060_COASTAL_SCENARIO");
      assert.equal(sc.id, "mdc2060-coastal-approach");
      assert.equal(sc.ownship.name, "MV BIEN DONG 01");
      assert.equal(sc.ownship.hdgDeg, 89);
      assert.equal(sc.ownship.sogKn, 10.5);
      assert.equal(sc.traffic.length, 6);
      const names = sc.traffic.map(t => t.name);
      for (const expectedName of ["PACIFIC STAR", "HAI AU 18", "SAIGON EXPRESS", "PHU QUOC FERRY", "VIETNAM TANKER 09", "SMALL PILOT 02"]) {
        assert.ok(names.some(n => n.toUpperCase().includes(expectedName)), `Coastal scenario missing vessel ${expectedName}`);
      }
      assert.equal(sc.traffic.find(t => /HAI AU 18/i.test(t.name)).rcsSqm, 85);
      assert.equal(sc.traffic.find(t => /VIETNAM TANKER 09/i.test(t.name)).sogKn, 0);
      assert.equal(sc.traffic.find(t => /SMALL PILOT 02/i.test(t.name)).rcsSqm, 32);
      assert.equal(sc.buoys.length, 4);
      assert.ok(sc.landmasses.length >= 3, "Coastal scenario must have coastline + 2 islands (>= 3 landmasses)");
      assert.equal(sc.weather.seaState, 2);
      assert.equal(sc.weather.windDirDeg, 135);
      assert.ok(Array.isArray(sc.fish) && Number.isFinite(sc.bottomDepthM) && Number.isFinite(sc.bottomVariationM));
    },
  },
  {
    id: "T1-089",
    name: "mdc2060-coastal-approach PACIFIC STAR CPA/TCPA Geometry Verified by Core World",
    features: [30],
    async run() {
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const ws = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
      const bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, ws);
      const pacific = bus.aisTargets.find(t => /PACIFIC STAR/i.test(t.name));
      const haiAu = bus.aisTargets.find(t => /HAI AU 18/i.test(t.name));
      assert.ok(pacific && haiAu);
      assert.ok(pacific.cpaNm < 0.5, `PACIFIC STAR CPA must be < 0.5 NM, got ${pacific.cpaNm}`);
      assert.ok(pacific.tcpaMin > 0 && pacific.tcpaMin <= 15, `PACIFIC STAR TCPA must be in (0, 15] min, got ${pacific.tcpaMin}`);
      assert.ok(haiAu.rangeNm >= 0.8 && haiAu.rangeNm <= 2.2, `HAI AU 18 expected near-range (~1.4 NM), got ${haiAu.rangeNm}`);
    },
  },
  {
    id: "T1-090",
    name: "mdc2060-storm-clutter Exact Weather & Crossing Vessel Geometry",
    features: [30],
    async run() {
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const sc = MDC2060_STORM_SCENARIO;
      assertDeepFrozen(sc, "MDC2060_STORM_SCENARIO");
      assert.equal(sc.id, "mdc2060-storm-clutter");
      assert.equal(sc.weather.seaState, 5);
      assert.ok(Array.isArray(sc.weather.rainSqualls) && sc.weather.rainSqualls.length >= 2);
      assert.ok(sc.weather.rainSqualls.some(sq => Number(sq.intensity ?? sq.strength ?? 0) >= 0.8));
      assert.ok(Array.isArray(sc.fish) && Number.isFinite(sc.bottomDepthM) && Number.isFinite(sc.bottomVariationM));
      const bus = projectMaritimeSensorBus(sc, initialMaritimeWorldState(sc));
      assert.ok(bus.radarContacts.some(c => c.rangeNm >= 2.2 && c.rangeNm <= 4.5), "Storm scenario must place a crossing vessel near ~3.2 NM");
    },
  },
  {
    id: "T1-091",
    name: "All 3 Scenarios Pass initialMaritimeWorldState + advanceMaritimeWorld + observeTrainingStatus",
    features: [30],
    async run() {
      const {MDC2060_SCENARIOS} = await loadScenarios();
      const {MDC2060_ADAPTER} = await loadAdapter();
      for (const sc of MDC2060_SCENARIOS) {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: sc});
        drv.tick(10);
        assert.match(drv.bus().busFingerprint, /^f0-fnv1a32-[0-9a-f]{8}$/);
        assert.equal(drv.bus().simTick, 10);
        drv.verifyReplay();
      }
    },
  },
  {
    id: "T1-092",
    name: "createCustomOwnshipScenario Produces Deeply Frozen Deterministic Derived Scenario",
    features: [30],
    async run() {
      const {MDC2060_COASTAL_SCENARIO, createCustomOwnshipScenario} = await loadScenarios();
      const baseFp = fingerprint(MDC2060_COASTAL_SCENARIO);
      const custom = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, {hdgDeg: 135, sogKn: 14, rotDegPerMin: 5});
      assertDeepFrozen(custom, "customOwnshipScenario");
      assert.equal(custom.ownship.hdgDeg, 135);
      assert.equal(custom.ownship.sogKn, 14);
      assert.equal(custom.ownship.rotDegPerMin, 5);
      assert.equal(fingerprint(MDC2060_COASTAL_SCENARIO), baseFp, "Base scenario must never be mutated");
      assert.notEqual(fingerprint(custom), baseFp);
    },
  },
  {
    id: "T1-093",
    name: "Bridge Sync: FCV588_ADAPTER + MDC2060_ADAPTER Co-Initialize on DEFAULT_BRIDGE_WORLD_SCENARIO",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      });
      assert.deepEqual(drv.bridge.deviceOrder, [FCV588_ADAPTER.id, MDC2060_ADAPTER.id]);
      assert.equal(drv.bus().sentences.length, 7);
      assert.equal(drv.probe(FCV588_ADAPTER.id).power, "off");
      assert.equal(getPowerMode(drv.state(MDC2060_ADAPTER.id), MDC2060_ADAPTER), "off");
    },
  },
  {
    id: "T1-094",
    name: "Bridge Sync: Shared NMEA Bus Consistency Across Synchronized Bridge Ticks",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      });
      drv.tick(5);
      assert.equal(drv.bus().simTick, 5);
      assert.equal(drv.world().simTick, 5);
      assert.ok(Number.isFinite(drv.bus().depthM) && drv.bus().depthM > 0);
      assert.match(drv.bus().busFingerprint, /^f0-fnv1a32-[0-9a-f]{8}$/);
    },
  },
  {
    id: "T1-095",
    name: "Bridge Sync: Strict Cross-Device State Isolation",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const drv = createMdcBridgeDriver({
        adapter: MDC2060_ADAPTER,
        adapters: [FCV588_ADAPTER, MDC2060_ADAPTER],
        scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      });
      const fcvBefore = fingerprint(drv.state(FCV588_ADAPTER.id));
      drv.fixture("fastPreheat", true, MDC2060_ADAPTER.id);
      drv.holdPress("power", 150, MDC2060_ADAPTER.id);
      drv.fixture("skipPreheat", true, MDC2060_ADAPTER.id);
      drv.press("stby_tx", MDC2060_ADAPTER.id);
      drv.press("range_down", MDC2060_ADAPTER.id);
      drv.rotate("gain", 5, MDC2060_ADAPTER.id);
      drv.rotate("stc", 3, MDC2060_ADAPTER.id);
      drv.pad("up", "cursorpad", MDC2060_ADAPTER.id);
      assert.equal(fingerprint(drv.state(FCV588_ADAPTER.id)), fcvBefore, "MDC-2060 inputs must never mutate FCV-588 state");

      const mdcBefore = fingerprint(drv.state(MDC2060_ADAPTER.id));
      drv.holdPress("power", 120, FCV588_ADAPTER.id);
      drv.press("range", FCV588_ADAPTER.id);
      drv.rotate("gain", 2, FCV588_ADAPTER.id);
      assert.equal(fingerprint(drv.state(MDC2060_ADAPTER.id)), mdcBefore, "FCV-588 inputs must never mutate MDC-2060 state");
    },
  },
  {
    id: "T1-096",
    name: "Bridge Sync: Full Multi-Device replayBridgeSession Verification",
    features: [31],
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
      drv.press("range_down", MDC2060_ADAPTER.id);
      drv.press("range", FCV588_ADAPTER.id);
      drv.tick(4);
      const {envelope} = drv.verifyReplay();
      assert.equal(envelope.finalBridgeHash, drv.hash());
    },
  },
];
