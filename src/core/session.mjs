import {
  CORE_CONTRACT_VERSION, EVENT_SCHEMA_VERSION, PRNG_VERSION, TICK_DURATION_MS, REPLAY_ENVELOPE_VERSION,
  fingerprint, validateInput, classifyHoldTicks, classifyHoldDurationMs,
  snapshotEventData,
} from "./protocol.mjs";
import {initialWorldState, advanceWorld, observeTrainingStatus, SENSOR_MODEL_VERSION} from "./scenario.mjs";

/** Generic event log training session. No network and no device I/O. */
// Hold thresholds and admitted physical gestures are executable semantics,
// not just display metadata. Replaying against a same-revision adapter with
// different thresholds could silently reinterpret FUNC LONG as SHORT.
const ADAPTER_HASH_CACHE = new WeakMap();
const SCENARIO_HASH_CACHE = new WeakMap();
const isFrozenAdapter = adapter => Object.isFrozen(adapter) &&
  Object.isFrozen(adapter.profile) && Object.isFrozen(adapter.controls) &&
  Object.isFrozen(adapter.gestures) && Object.isFrozen(adapter.holdThresholdMs);
const computeAdapterProfileHash = adapter => fingerprint({
  id: adapter.id, revision: adapter.revision, profile: adapter.profile,
  controls: adapter.controls, gestures: adapter.gestures,
  holdThresholdMs: adapter.holdThresholdMs,
});
const adapterProfileHash = adapter => {
  if (adapter && typeof adapter === "object" && isFrozenAdapter(adapter)) {
    const cached = ADAPTER_HASH_CACHE.get(adapter);
    if (cached !== undefined) return cached;
    const computed = computeAdapterProfileHash(adapter);
    ADAPTER_HASH_CACHE.set(adapter, computed);
    return computed;
  }
  return computeAdapterProfileHash(adapter);
};
const isFrozenScenario = scenario => Object.isFrozen(scenario) &&
  (scenario.syntheticOwnship === undefined || Object.isFrozen(scenario.syntheticOwnship)) &&
  (scenario.bottomClassification === undefined || (
    Object.isFrozen(scenario.bottomClassification) &&
    (scenario.bottomClassification.classes === undefined ||
      Object.isFrozen(scenario.bottomClassification.classes)))) &&
  (!Array.isArray(scenario.fish) || (Object.isFrozen(scenario.fish) &&
    scenario.fish.every(item => Object.isFrozen(item))));
const scenarioFingerprint = scenario => {
  if (scenario && typeof scenario === "object" && isFrozenScenario(scenario)) {
    const cached = SCENARIO_HASH_CACHE.get(scenario);
    if (cached !== undefined) return cached;
    const computed = fingerprint(scenario);
    SCENARIO_HASH_CACHE.set(scenario, computed);
    return computed;
  }
  return fingerprint(scenario);
};
export function createSession(adapter, scenario) {
  if (!adapter?.id || !adapter.profile || !adapter.gestures ||
      typeof adapter.reduce !== "function" || typeof adapter.initial !== "function") {
    throw new TypeError("device adapter must provide id/profile/gestures/initial/reduce");
  }
  if (!scenario?.id || !Number.isInteger(scenario.version) || !Number.isInteger(scenario.seed)) {
    throw new TypeError("scenario must have id/version/integer seed");
  }
  return {
    meta: Object.freeze({
      schemaVersion: EVENT_SCHEMA_VERSION,
      coreVersion: CORE_CONTRACT_VERSION,
      prngVersion: PRNG_VERSION,
      sensorModelVersion: SENSOR_MODEL_VERSION,
      tickDurationMs: TICK_DURATION_MS,
      phaseOrder: "input -> world -> sensor -> device",
      profileHash: adapterProfileHash(adapter),
      scenarioHash: scenarioFingerprint(scenario),
    }),
    deviceId: adapter.id,
    profileRevision: adapter.revision,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    worldState: initialWorldState(scenario),
    sensorState: {lastWorldTick: 0, modelVersion: SENSOR_MODEL_VERSION},
    deviceState: adapter.initial(),
    heldControls: {},
    pendingEffects: [],
    events: [],
  };
}

function uiElapsedSinceLastDown(events, control) {
  let uiMs = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.kind === "down" && ev.control === control) return uiMs;
    if (ev.kind === "ui-tick" && Number.isInteger(ev.elapsedMs)) uiMs += ev.elapsedMs;
  }
  return uiMs;
}

export function dispatch(session, adapter, input, scenario) {
  if (session.deviceId !== adapter.id || session.profileRevision !== adapter.revision ||
      session.meta.profileHash !== adapterProfileHash(adapter)) {
    throw new Error("device profile mismatch");
  }
  if (!scenario || session.meta.scenarioHash !== scenarioFingerprint(scenario) ||
      session.scenarioId !== scenario.id || session.scenarioVersion !== scenario.version) {
    throw new Error("scenario mismatch");
  }
  validateInput(input);
  if (input.seq !== undefined || input.tick !== undefined || input.schemaVersion !== undefined) {
    throw new TypeError("input must not override runtime event metadata");
  }
  if (!["tick", "ui-tick", "restore-settings", "training-fixture"].includes(input.kind) &&
      !adapter.gestures[input.control]?.includes(input.kind)) {
    throw new TypeError("unsupported control gesture for this device");
  }
  const event = Object.freeze({
    schemaVersion: EVENT_SCHEMA_VERSION,
    tick: session.worldState.simTick,
    seq: session.events.length + 1,
    ...snapshotEventData(input,{freeze:true}),
  });
  let worldState = session.worldState;
  let sensorState = session.sensorState;
  let deviceState = session.deviceState;
  let heldControls = session.heldControls;
  const withObservation = transientEvent => ({
    ...transientEvent, sensorObservation: observeTrainingStatus(scenario, worldState),
  });
  if (event.kind === "tick") {
    // Core time/world ALWAYS advances, even when this device is powered off.
    worldState = advanceWorld(scenario, worldState, event.steps ?? 1);
    sensorState = {lastWorldTick: worldState.simTick, modelVersion: SENSOR_MODEL_VERSION};
    deviceState = adapter.reduce(deviceState, withObservation(event));
  } else if (event.kind === "ui-tick") {
    // UI-only event is recorded, but never advances the shared WorldState.
    deviceState = adapter.reduce(deviceState, withObservation(event));
  } else if (event.kind === "down") {
    if (Object.hasOwn(heldControls, event.control)) throw new Error("duplicate press edge");
    heldControls = {...heldControls, [event.control]: worldState.simTick};
    deviceState = adapter.reduce(deviceState,withObservation(event));
  } else if (event.kind === "cancel") {
    if (!Object.hasOwn(heldControls, event.control)) throw new Error("cancel without press edge");
    heldControls = {...heldControls};
    delete heldControls[event.control];
    deviceState = adapter.reduce(deviceState,withObservation(event));
  } else if (event.kind === "up") {
    if (!Object.hasOwn(heldControls, event.control)) throw new Error("release without press edge");
    const heldSinceTick = heldControls[event.control];
    heldControls = {...heldControls};
    delete heldControls[event.control];
    const threshold = adapter.holdThresholdMs?.[event.control];
    if (!Number.isInteger(threshold)) throw new Error("missing device hold threshold");
    // Physical UI captures duration on release, while test scripts may rely
    // on explicit simulated ticks or UI ticks. Both paths are stored in the event log.
    const fallbackDurationMs = Math.max(
      (worldState.simTick - heldSinceTick) * TICK_DURATION_MS,
      Math.min(120000, uiElapsedSinceLastDown(session.events, event.control)),
    );
    const hold = event.durationMs === undefined
      ? (worldState.simTick - heldSinceTick < 0
        ? classifyHoldTicks(worldState.simTick - heldSinceTick, threshold)
        : classifyHoldDurationMs(Math.min(120000, fallbackDurationMs), threshold))
      : classifyHoldDurationMs(event.durationMs, threshold);
    deviceState = adapter.reduce(deviceState, withObservation({
      kind: "press", control: event.control, hold,
    }));
  } else {
    deviceState = adapter.reduce(deviceState, withObservation(event));
  }
  return {...session, worldState, sensorState, deviceState, heldControls, events: [...session.events, event]};
}

/**
 * Portable, self-contained replay envelope. Binding is a deterministic drift
 * check, NOT authentication: untrusted clients can always forge a new digest.
 */
export function createReplayEnvelope(session) {
  const body = {
    envelopeVersion: REPLAY_ENVELOPE_VERSION,
    deviceId: session.deviceId,
    profileRevision: session.profileRevision,
    scenarioId: session.scenarioId,
    scenarioVersion: session.scenarioVersion,
    meta: {...session.meta},
    events: session.events.map(event => snapshotEventData(event)),
    // Final state drift bound to the canonical event log. This detects a
    // reducer changing behavior without a proper profile revision bump. The
    // fingerprint remains a checksum, NEVER client authentication.
    finalSessionHash: sessionHash(session),
  };
  return {...body, contentFingerprint: fingerprint(body)};
}

/** Replay only a complete, integrity-checked envelope, never loose log/meta. */
export function replay(adapter, scenario, envelope) {
  let session = createSession(adapter, scenario);
  const required = ["contentFingerprint", "deviceId", "envelopeVersion", "events",
    "meta", "profileRevision", "scenarioId", "scenarioVersion",
    "finalSessionHash"];
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
      Object.keys(envelope).sort().join("|") !== required.sort().join("|") ||
      envelope.envelopeVersion !== REPLAY_ENVELOPE_VERSION ||
      !Array.isArray(envelope.events)) {
    throw new TypeError("invalid replay envelope/schema");
  }
  const {contentFingerprint, ...body} = envelope;
  if (contentFingerprint !== fingerprint(body)) {
    throw new Error("replay envelope content mismatch");
  }
  if (envelope.deviceId !== session.deviceId ||
      envelope.profileRevision !== session.profileRevision ||
      envelope.scenarioId !== session.scenarioId ||
      envelope.scenarioVersion !== session.scenarioVersion ||
      fingerprint(envelope.meta) !== fingerprint(session.meta)) {
    throw new Error("replay contract/profile/scenario mismatch");
  }
  for (const input of envelope.events) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("invalid replay event");
    }
    if (input.seq !== session.events.length + 1) throw new Error("noncontiguous event sequence");
    if (input.tick !== session.worldState.simTick || input.schemaVersion !== EVENT_SCHEMA_VERSION) {
      throw new Error("event clock/schema mismatch");
    }
    const {seq, tick, schemaVersion, ...payload} = input;
    session = dispatch(session, adapter, payload, scenario);
  }
  if(sessionHash(session)!==envelope.finalSessionHash){
    throw new Error("replay final state hash mismatch / reducer drift");
  }
  return session;
}

export function reset(adapter, scenario) {
  return createSession(adapter, scenario);
}

export function sessionHash(session) {
  return fingerprint({
    meta: session.meta, worldState: session.worldState, sensorState: session.sensorState,
    deviceState: session.deviceState, heldControls: session.heldControls, events: session.events,
  });
}
