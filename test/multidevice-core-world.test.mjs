import test from "node:test";
import assert from "node:assert/strict";
import {validateInput, fingerprint} from "../src/core/protocol.mjs";
import {createSession, dispatch, replay, createReplayEnvelope, sessionHash} from "../src/core/session.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  MARITIME_WORLD_VERSION,
  NMEA_BUS_CONTRACT_VERSION,
  initialMaritimeWorldState,
  advanceMaritimeWorld,
  computeTargetEncounter,
  nmeaChecksum,
  formatNmeaSentence,
  projectMaritimeSensorBus,
} from "../src/core/maritime-world.mjs";
import {
  BRIDGE_RUNTIME_VERSION,
  createBridgeSession,
  dispatchBridgeInput,
  bridgeSessionHash,
  createBridgeReplay,
  replayBridgeSession,
} from "../src/core/device-runtime.mjs";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";

const MOCK_AIS_R5_ADAPTER = Object.freeze({
  id: "saab-r5-ais-ref",
  revision: "r5-contract-probe-1",
  profile: Object.freeze({id: "saab-r5-ais-ref", family: "AIS", model: "R5"}),
  controls: Object.freeze(["pwr", "touchscreen", "numpad", "cursorpad"]),
  holdThresholdMs: Object.freeze({pwr: 2000}),
  fixtures: Object.freeze(["gnssFix", "vhfAntennaFault"]),
  gestures: Object.freeze({
    pwr: Object.freeze(["down", "up", "cancel"]),
    touchscreen: Object.freeze(["touch"]),
    numpad: Object.freeze(["keypad"]),
    cursorpad: Object.freeze(["pad"]),
  }),
  initial: () => ({
    power: "off",
    selectedMmsi: null,
    typedBuffer: "",
    lastTouch: null,
    cursorMoves: 0,
    gnssFix: true,
    observedTargetCount: 0,
    lastRmcSentence: null,
  }),
  reduce(state, event) {
    if (event.kind === "press" && event.control === "pwr") {
      return {...state, power: event.hold === "long" ? "off" : "on"};
    }
    if (event.kind === "training-fixture" && event.fixture === "gnssFix") {
      return {...state, gnssFix: event.enabled};
    }
    if (state.power !== "on") return state;
    if (event.kind === "touch") {
      return {...state, lastTouch: {x: event.x, y: event.y, phase: event.phase}};
    }
    if (event.kind === "keypad") {
      const typedBuffer = (state.typedBuffer + event.key).slice(-9);
      return {...state, typedBuffer, selectedMmsi: typedBuffer.length === 9 ? typedBuffer : state.selectedMmsi};
    }
    if (event.kind === "pad" && event.control === "cursorpad") {
      return {...state, cursorMoves: state.cursorMoves + 1};
    }
    if (event.kind === "tick" && event.maritimeBus) {
      const rmc = event.maritimeBus.sentences.find(s => s.startsWith("$GPRMC,")) ?? null;
      return {
        ...state,
        observedTargetCount: event.maritimeBus.aisTargets.length,
        lastRmcSentence: rmc,
      };
    }
    return state;
  },
});

const MOCK_RADAR_MDC2060_ADAPTER = Object.freeze({
  id: "koden-mdc2060-ref",
  revision: "mdc2060-contract-probe-1",
  profile: Object.freeze({id: "koden-mdc2060-ref", family: "RADAR", model: "MDC-2060"}),
  controls: Object.freeze(["standby", "trackball", "sea", "rain", "range"]),
  holdThresholdMs: Object.freeze({standby: 1500}),
  gestures: Object.freeze({
    standby: Object.freeze(["down", "up", "cancel"]),
    trackball: Object.freeze(["pointer"]),
    sea: Object.freeze(["analog"]),
    rain: Object.freeze(["analog"]),
    range: Object.freeze(["press"]),
  }),
  initial: () => ({
    txMode: "standby",
    cursorX: 0,
    cursorY: 0,
    seaClutter: 0.2,
    rainClutter: 0.0,
    rangeNm: 6,
    trackedNearestCpaNm: null,
    lastHeadingSentence: null,
  }),
  reduce(state, event) {
    if (event.kind === "press" && event.control === "standby") {
      return {...state, txMode: event.hold === "long" ? "off" : "transmit"};
    }
    if (event.kind === "pointer" && event.control === "trackball") {
      return {...state, cursorX: state.cursorX + event.dx, cursorY: state.cursorY + event.dy};
    }
    if (event.kind === "analog" && event.control === "sea") {
      return {...state, seaClutter: event.value};
    }
    if (event.kind === "analog" && event.control === "rain") {
      return {...state, rainClutter: event.value};
    }
    if (event.kind === "press" && event.control === "range") {
      return {...state, rangeNm: state.rangeNm === 6 ? 12 : 6};
    }
    if (event.kind === "tick" && state.txMode === "transmit" && event.maritimeBus) {
      const nearestCpa = event.maritimeBus.radarContacts.reduce(
        (min, c) => (min === null || c.cpaNm < min ? c.cpaNm : min),
        null,
      );
      const hdt = event.maritimeBus.sentences.find(s => s.startsWith("$HEHDT,")) ?? null;
      return {...state, trackedNearestCpaNm: nearestCpa, lastHeadingSentence: hdt};
    }
    return state;
  },
});

test("extended protocol validates multi-device gestures (pointer, touch, analog, keypad) and custom adapter contracts", () => {
  assert.doesNotThrow(() => validateInput({kind: "pointer", control: "trackball", dx: 12.5, dy: -4}, MOCK_RADAR_MDC2060_ADAPTER));
  assert.throws(() => validateInput({kind: "pointer", control: "trackball", dx: 0, dy: 0}, MOCK_RADAR_MDC2060_ADAPTER), /non-zero/);
  assert.throws(() => validateInput({kind: "pointer", control: "trackball", dx: 900, dy: 1}, MOCK_RADAR_MDC2060_ADAPTER), /-500\.\.500/);

  assert.doesNotThrow(() => validateInput({kind: "touch", control: "touchscreen", x: 320, y: 240, phase: "down"}, MOCK_AIS_R5_ADAPTER));
  assert.throws(() => validateInput({kind: "touch", control: "touchscreen", x: -1, y: 20, phase: "down"}, MOCK_AIS_R5_ADAPTER), /touch/);

  assert.doesNotThrow(() => validateInput({kind: "analog", control: "sea", value: 0.65}, MOCK_RADAR_MDC2060_ADAPTER));
  assert.throws(() => validateInput({kind: "analog", control: "sea", value: 5000}, MOCK_RADAR_MDC2060_ADAPTER), /-1000\.\.1000/);

  assert.doesNotThrow(() => validateInput({kind: "keypad", control: "numpad", key: "5"}, MOCK_AIS_R5_ADAPTER));
  assert.throws(() => validateInput({kind: "keypad", control: "numpad", key: "INVALID KEY!"}, MOCK_AIS_R5_ADAPTER), /keypad/);

  // Custom adapter pad control, hold-capable key, and training fixture work in standalone session too
  let r5 = createSession(MOCK_AIS_R5_ADAPTER, DEFAULT_BRIDGE_WORLD_SCENARIO);
  r5 = dispatch(r5, MOCK_AIS_R5_ADAPTER, {kind: "down", control: "pwr"}, DEFAULT_BRIDGE_WORLD_SCENARIO);
  r5 = dispatch(r5, MOCK_AIS_R5_ADAPTER, {kind: "up", control: "pwr", durationMs: 250}, DEFAULT_BRIDGE_WORLD_SCENARIO);
  r5 = dispatch(r5, MOCK_AIS_R5_ADAPTER, {kind: "pad", control: "cursorpad", direction: "down"}, DEFAULT_BRIDGE_WORLD_SCENARIO);
  r5 = dispatch(r5, MOCK_AIS_R5_ADAPTER, {kind: "training-fixture", fixture: "gnssFix", enabled: false}, DEFAULT_BRIDGE_WORLD_SCENARIO);
  assert.equal(r5.deviceState.power, "on");
  assert.equal(r5.deviceState.cursorMoves, 1);
  assert.equal(r5.deviceState.gnssFix, false);
  const env = createReplayEnvelope(r5);
  assert.equal(sessionHash(replay(MOCK_AIS_R5_ADAPTER, DEFAULT_BRIDGE_WORLD_SCENARIO, env)), sessionHash(r5));
});

test("2D maritime world kinematics, CPA/TCPA, and NMEA-0183 sensor bus checksums are exact and deterministic", () => {
  const initial = initialMaritimeWorldState(DEFAULT_BRIDGE_WORLD_SCENARIO);
  assert.equal(initial.worldVersion, MARITIME_WORLD_VERSION);
  assert.equal(initial.simTick, 0);
  assert.equal(initial.targets.length, 2);

  // Head-on encounter sanity check: target 6 NM due East moving West at 12 kn vs ownship stationary
  const headOn = computeTargetEncounter(
    {lat: 10.0, lon: 106.0, sogKn: 0, cogDeg: 90, hdgDeg: 90},
    {lat: 10.0, lon: 106.0 + 6 / (60 * Math.cos(10 * Math.PI / 180)), sogKn: 12, cogDeg: 270, hdgDeg: 270},
  );
  assert.ok(Math.abs(headOn.rangeNm - 6) < 0.01);
  assert.ok(Math.abs(headOn.bearingDeg - 90) < 0.01);
  assert.equal(headOn.cpaNm, 0);
  assert.ok(Math.abs(headOn.tcpaMin - 30) < 0.05);

  const steppedA = advanceMaritimeWorld(DEFAULT_BRIDGE_WORLD_SCENARIO, initial, 60);
  const steppedB = advanceMaritimeWorld(
    DEFAULT_BRIDGE_WORLD_SCENARIO,
    advanceMaritimeWorld(DEFAULT_BRIDGE_WORLD_SCENARIO, initial, 25),
    35,
  );
  assert.equal(fingerprint(steppedA), fingerprint(steppedB));
  assert.ok(steppedA.ownship.lon > initial.ownship.lon, "Eastbound ownship advances in longitude");

  const bus = projectMaritimeSensorBus(DEFAULT_BRIDGE_WORLD_SCENARIO, steppedA);
  assert.equal(bus.contractVersion, NMEA_BUS_CONTRACT_VERSION);
  assert.equal(bus.sentences.length, 7);
  for (const sentence of bus.sentences) {
    assert.match(sentence, /^\$[A-Z]{5},.*\*[0-9A-F]{2}$/);
    const [rawBody, expectedHex] = sentence.slice(1).split("*");
    assert.equal(nmeaChecksum(rawBody), expectedHex);
  }
  assert.equal(formatNmeaSentence("HEHDT", ["089.0", "T"]), "$HEHDT,089.0,T*2E");
});

test("staging historical folders contain zero duplicate src/ or web/ source trees", async () => {
  const {readdir, stat} = await import("node:fs/promises");
  const {resolve} = await import("node:path");
  const stagingRoot = resolve(import.meta.dirname, "..", "staging");
  const entries = await readdir(stagingRoot, {withFileTypes: true});
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    for (const duplicateDir of ["src", "web", "bundle", "bundle-host-upgrade-0.0.2"]) {
      let exists = true;
      try {
        await stat(resolve(stagingRoot, entry.name, duplicateDir));
      } catch {
        exists = false;
      }
      assert.equal(exists, false, `staging/${entry.name}/${duplicateDir} duplicate source tree must not exist`);
    }
  }
});

test("active multi-device bridge session synchronizes FCV-588, AIS R5, and Radar MDC-2060 with isolated controls and verified replay", () => {
  const adapters = [FCV588_ADAPTER, MOCK_AIS_R5_ADAPTER, MOCK_RADAR_MDC2060_ADAPTER];
  let bridge = createBridgeSession(adapters, DEFAULT_BRIDGE_WORLD_SCENARIO);
  assert.equal(bridge.bridgeVersion, BRIDGE_RUNTIME_VERSION);
  assert.deepEqual(bridge.deviceOrder, [FCV588_ADAPTER.id, "saab-r5-ais-ref", "koden-mdc2060-ref"]);

  // Boot FCV-588, AIS R5, and Radar MDC-2060 independently
  bridge = dispatchBridgeInput(bridge, adapters, FCV588_ADAPTER.id, {kind: "down", control: "power"});
  bridge = dispatchBridgeInput(bridge, adapters, FCV588_ADAPTER.id, {kind: "up", control: "power", durationMs: 120});

  bridge = dispatchBridgeInput(bridge, adapters, "saab-r5-ais-ref", {kind: "down", control: "pwr"});
  bridge = dispatchBridgeInput(bridge, adapters, "saab-r5-ais-ref", {kind: "up", control: "pwr", durationMs: 200});

  bridge = dispatchBridgeInput(bridge, adapters, "koden-mdc2060-ref", {kind: "down", control: "standby"});
  bridge = dispatchBridgeInput(bridge, adapters, "koden-mdc2060-ref", {kind: "up", control: "standby", durationMs: 200});

  // Device-local inputs do NOT advance the shared maritime world clock
  assert.equal(bridge.maritimeWorld.simTick, 0);

  // Synchronized 4-second bridge tick boots FCV-588 and feeds NMEA/AIS/Radar contacts to all three devices
  bridge = dispatchBridgeInput(bridge, adapters, "bridge", {kind: "tick", steps: 4});
  assert.equal(bridge.maritimeWorld.simTick, 4);
  assert.equal(bridge.devices[FCV588_ADAPTER.id].deviceState.power, "on");
  assert.equal(bridge.devices["saab-r5-ais-ref"].deviceState.observedTargetCount, 2);
  assert.match(bridge.devices["saab-r5-ais-ref"].deviceState.lastRmcSentence, /^\$GPRMC,/);
  assert.equal(typeof bridge.devices["koden-mdc2060-ref"].deviceState.trackedNearestCpaNm, "number");
  assert.match(bridge.devices["koden-mdc2060-ref"].deviceState.lastHeadingSentence, /^\$HEHDT,/);

  // Dispatching radar trackball & analog clutter never mutates FCV-588 or AIS R5 state
  const fcvBefore = fingerprint(bridge.devices[FCV588_ADAPTER.id].deviceState);
  const aisBefore = fingerprint(bridge.devices["saab-r5-ais-ref"].deviceState);
  bridge = dispatchBridgeInput(bridge, adapters, "koden-mdc2060-ref", {
    kind: "pointer", control: "trackball", dx: 18, dy: -9,
  });
  bridge = dispatchBridgeInput(bridge, adapters, "koden-mdc2060-ref", {
    kind: "analog", control: "sea", value: 0.45,
  });
  assert.equal(fingerprint(bridge.devices[FCV588_ADAPTER.id].deviceState), fcvBefore);
  assert.equal(fingerprint(bridge.devices["saab-r5-ais-ref"].deviceState), aisBefore);
  assert.equal(bridge.devices["koden-mdc2060-ref"].deviceState.cursorX, 18);
  assert.equal(bridge.devices["koden-mdc2060-ref"].deviceState.seaClutter, 0.45);

  // Dispatching AIS keypad MMSI & touch never mutates FCV-588 or Radar
  for (const digit of "574002101") {
    bridge = dispatchBridgeInput(bridge, adapters, "saab-r5-ais-ref", {
      kind: "keypad", control: "numpad", key: digit,
    });
  }
  bridge = dispatchBridgeInput(bridge, adapters, "saab-r5-ais-ref", {
    kind: "touch", control: "touchscreen", x: 140, y: 88, phase: "down",
  });
  assert.equal(bridge.devices["saab-r5-ais-ref"].deviceState.selectedMmsi, "574002101");
  assert.deepEqual(bridge.devices["saab-r5-ais-ref"].deviceState.lastTouch, {x: 140, y: 88, phase: "down"});

  // Portable bridge replay reproduces exact multi-device hash and rejects tampered envelopes/profiles
  const envelope = createBridgeReplay(bridge);
  const restored = replayBridgeSession(adapters, DEFAULT_BRIDGE_WORLD_SCENARIO, envelope);
  assert.equal(bridgeSessionHash(restored), bridgeSessionHash(bridge));

  const driftedRadar = {
    ...MOCK_RADAR_MDC2060_ADAPTER,
    holdThresholdMs: {standby: 3000},
  };
  assert.throws(
    () => replayBridgeSession([FCV588_ADAPTER, MOCK_AIS_R5_ADAPTER, driftedRadar], DEFAULT_BRIDGE_WORLD_SCENARIO, envelope),
    /profile|mismatch/,
  );
});
