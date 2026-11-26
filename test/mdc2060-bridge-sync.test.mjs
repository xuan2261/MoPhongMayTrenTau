import test from "node:test";
import assert from "node:assert/strict";
import { fingerprint } from "../src/core/protocol.mjs";
import { DEFAULT_BRIDGE_WORLD_SCENARIO } from "../src/core/maritime-world.mjs";
import {
  BRIDGE_RUNTIME_VERSION,
  createBridgeSession,
  dispatchBridgeInput,
  bridgeSessionHash,
  createBridgeReplay,
  replayBridgeSession,
} from "../src/core/device-runtime.mjs";
import { FCV588_ADAPTER } from "../src/devices/fcv588/adapter.mjs";
import { MDC2060_ADAPTER } from "../src/devices/mdc2060/adapter.mjs";

const ADAPTERS = [FCV588_ADAPTER, MDC2060_ADAPTER];
const SCENARIO = DEFAULT_BRIDGE_WORLD_SCENARIO;
const FCV_ID = FCV588_ADAPTER.id;
const MDC_ID = MDC2060_ADAPTER.id;

function verifyNmeaChecksum(sentence) {
  assert.match(sentence, /^\$[A-Z0-9,.-]+\*[0-9A-F]{2}$/);
  const star = sentence.indexOf("*");
  const body = sentence.slice(1, star);
  const expected = sentence.slice(star + 1);
  let xor = 0;
  for (let i = 0; i < body.length; i++) {
    xor ^= body.charCodeAt(i);
  }
  assert.equal(xor.toString(16).toUpperCase().padStart(2, "0"), expected);
}

test("FCV588_ADAPTER + MDC2060_ADAPTER run concurrently on unmodified DEFAULT_BRIDGE_WORLD_SCENARIO with strict bidirectional isolation", () => {
  let bridge = createBridgeSession(ADAPTERS, SCENARIO);
  assert.equal(bridge.bridgeVersion, BRIDGE_RUNTIME_VERSION);
  assert.deepEqual(bridge.deviceOrder, [FCV_ID, MDC_ID]);
  assert.equal(bridge.scenarioId, "bridge-coastal-traffic-001");

  // Device-targeted tick must throw; only targetId 'bridge' advances synchronized clock
  assert.throws(
    () => dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "tick", steps: 1 }, SCENARIO),
    /bridge/,
  );
  assert.throws(
    () => dispatchBridgeInput(bridge, ADAPTERS, "bridge", { kind: "press", control: "stby_tx" }, SCENARIO),
    /synchronized tick/,
  );

  // Power on BOTH devices independently; local inputs NEVER advance maritimeWorld.simTick
  bridge = dispatchBridgeInput(bridge, ADAPTERS, FCV_ID, { kind: "down", control: "power" }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, FCV_ID, { kind: "up", control: "power", durationMs: 200 }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "training-fixture", fixture: "fastPreheat", enabled: true }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "down", control: "power" }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "up", control: "power", durationMs: 200 }, SCENARIO);
  assert.equal(bridge.maritimeWorld.simTick, 0);

  // Advance synchronized world clock 5 ticks: FCV-588 boots ON (4 ticks) & MDC-2060 completes 5s fast preheat -> standby
  bridge = dispatchBridgeInput(bridge, ADAPTERS, "bridge", { kind: "tick", steps: 5 }, SCENARIO);
  assert.equal(bridge.maritimeWorld.simTick, 5);
  assert.equal(bridge.devices[FCV_ID].deviceState.power, "on");
  assert.equal(bridge.devices[MDC_ID].deviceState.powerMode, "standby");

  // Snapshot FCV-588 state fingerprint, then hammer MDC-2060 controls -> FCV-588 must stay byte-identical
  const fcvFpBefore = fingerprint(bridge.devices[FCV_ID].deviceState);
  const mdcControls = [
    { kind: "press", control: "stby_tx" },
    { kind: "press", control: "range_down" },
    { kind: "rotate", control: "gain", steps: 5 },
    { kind: "rotate", control: "stc", steps: 4 },
    { kind: "press", control: "f1" },
    { kind: "pad", control: "cursorpad", direction: "right" },
    { kind: "pointer", control: "ppi_cursor", dx: 25, dy: -15 },
    { kind: "analog", control: "inst_sea_state", value: 3 },
    { kind: "analog", control: "inst_rain", value: 40 },
    { kind: "analog", control: "inst_ftc", value: 3 },
    { kind: "down", control: "menu" },
    { kind: "up", control: "menu", durationMs: 200 },
    { kind: "pad", control: "cursorpad", direction: "right" },
    { kind: "down", control: "menu" },
    { kind: "up", control: "menu", durationMs: 200 },
  ];
  for (const input of mdcControls) {
    bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, input, SCENARIO);
  }
  assert.equal(fingerprint(bridge.devices[FCV_ID].deviceState), fcvFpBefore);
  assert.equal(bridge.devices[MDC_ID].deviceState.powerMode, "transmit");
  assert.equal(bridge.maritimeWorld.simTick, 5);

  // Snapshot MDC-2060 state fingerprint, then operate FCV-588 controls -> MDC-2060 must stay byte-identical
  const mdcFpBefore = fingerprint(bridge.devices[MDC_ID].deviceState);
  const fcvControls = [
    { kind: "press", control: "range" },
    { kind: "pad", control: "trackpad", direction: "right" },
    { kind: "press", control: "enter" },
    { kind: "rotate", control: "mode", steps: 1 },
    { kind: "ui-tick", elapsedMs: 6000 },
    { kind: "rotate", control: "gain", steps: 2 },
  ];
  for (const input of fcvControls) {
    bridge = dispatchBridgeInput(bridge, ADAPTERS, FCV_ID, input, SCENARIO);
  }
  assert.equal(fingerprint(bridge.devices[MDC_ID].deviceState), mdcFpBefore);
  assert.equal(bridge.devices[FCV_ID].deviceState.rangeMode, "manual");
  assert.equal(bridge.devices[FCV_ID].deviceState.mode, "DUAL");
});

test("Shared NMEA-0183 bus consistency, $RATTM emission in bridge mode, and exact bridge replay + tamper rejection", () => {
  let bridge = createBridgeSession(ADAPTERS, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, FCV_ID, { kind: "down", control: "power" }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, FCV_ID, { kind: "up", control: "power", durationMs: 200 }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "training-fixture", fixture: "skipPreheat", enabled: true }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "down", control: "power" }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "up", control: "power", durationMs: 200 }, SCENARIO);
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "press", control: "stby_tx" }, SCENARIO);

  // Synchronized tick populates shared bus for both FCV-588 and MDC-2060
  bridge = dispatchBridgeInput(bridge, ADAPTERS, "bridge", { kind: "tick", steps: 4 }, SCENARIO);
  const bus = bridge.sensorBus;
  assert.ok(bus.sentences.some(s => s.startsWith("$HEHDT,")));
  assert.ok(bus.sentences.some(s => s.startsWith("$GPRMC,")));
  assert.ok(bus.sentences.some(s => s.startsWith("$SDDBT,")));
  assert.equal(bus.radarContacts.length, 2);
  assert.equal(bus.aisTargets.length, 2);
  assert.equal(
    bridge.devices[MDC_ID].deviceState.ownshipSnapshot.depthM,
    Math.round(bus.depthM * 1000) / 1000,
  );
  assert.equal(bridge.devices[MDC_ID].deviceState.ais.targetCount, 2);

  // Acquire ATA target via F2 and stabilize over 6 synchronized ticks -> valid $RATTM sentence
  bridge = dispatchBridgeInput(bridge, ADAPTERS, MDC_ID, { kind: "press", control: "f2" }, SCENARIO);
  assert.equal(bridge.devices[MDC_ID].deviceState.ata.targets.length, 1);
  assert.equal(bridge.devices[MDC_ID].deviceState.ata.targets[0].status, "acquiring");

  bridge = dispatchBridgeInput(bridge, ADAPTERS, "bridge", { kind: "tick", steps: 6 }, SCENARIO);
  const mdcAta = bridge.devices[MDC_ID].deviceState.ata;
  assert.equal(mdcAta.targets[0].status, "tracking");
  assert.equal(mdcAta.rattmSentences.length, 1);
  assert.ok(mdcAta.rattmSentences[0].startsWith("$RATTM,01,"));
  verifyNmeaChecksum(mdcAta.rattmSentences[0]);

  // Exact bridge replay reproduces identical bridgeSessionHash
  const envelope = createBridgeReplay(bridge);
  const replayed = replayBridgeSession(ADAPTERS, SCENARIO, envelope);
  assert.equal(bridgeSessionHash(replayed), bridgeSessionHash(bridge));
  assert.deepEqual(
    replayed.devices[MDC_ID].deviceState.ata.rattmSentences,
    mdcAta.rattmSentences,
  );

  // Tamper rejection: mutated finalBridgeHash, mutated history, drifted holdThresholdMs
  assert.throws(
    () => replayBridgeSession(ADAPTERS, SCENARIO, { ...envelope, finalBridgeHash: "f0-fnv1a32-00000000" }),
    /fingerprint|mismatch/,
  );
  const driftedMdc = Object.freeze({
    ...MDC2060_ADAPTER,
    holdThresholdMs: Object.freeze({ power: 2500, ent: 1200, menu: 1500 }),
  });
  assert.throws(
    () => replayBridgeSession([FCV588_ADAPTER, driftedMdc], SCENARIO, envelope),
    /profile|mismatch/,
  );
});
