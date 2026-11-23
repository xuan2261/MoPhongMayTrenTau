/**
 * Deterministic test-only second observer of the existing shared world.
 * This is NOT an AIS transponder, radio, radar, NMEA adapter, or generic menu
 * framework. It cannot mutate the canonical FCV session or WorldState.
 */
import {createSession,dispatch,replay,sessionHash} from "./session.mjs";
import {
  CORE_CONTRACT_VERSION, EVENT_SCHEMA_VERSION, TICK_DURATION_MS,
  fingerprint, snapshotEventData, validateInput, classifyHoldTicks, classifyHoldDurationMs,
} from "./protocol.mjs";
import {observeTrainingStatus} from "./scenario.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO, MARITIME_WORLD_VERSION, NMEA_BUS_CONTRACT_VERSION,
  initialMaritimeWorldState, advanceMaritimeWorld, projectMaritimeSensorBus,
} from "./maritime-world.mjs";

export const INERT_SECOND_DEVICE=Object.freeze({
  id:"synthetic.second-observer.test",
  kind:"inert-test-observer",
  revision:1,
});

// The stream contract belongs to the observer's replay identity. A changed
// schema/name/field set must not reuse a prior observer envelope silently.
export const INERT_OBSERVER_STREAM_CONTRACT=Object.freeze({
  name:"training-observer-world-v1",schemaVersion:1,
  fields:Object.freeze(["simTick","bottomDepthM","sourceClass"]),
});

// v4 also binds the canonical primary final state hash: same-revision reducer
// drift cannot be made believable by a matching inert observer stream.
// Older multi envelopes must not silently inherit the new replay meaning.
const MULTI_RUNTIME_VERSION=4;
const observerFingerprint=observers=>fingerprint(observers.map(o=>({
  id:o.id,kind:"inert-test-observer",revision:o.revision,
  stream:INERT_OBSERVER_STREAM_CONTRACT,
})));
const supported=observers=>{
  if(!Array.isArray(observers) || observers.length>5)throw new TypeError("invalid observer set");
  const ids=new Set();
  for(const observer of observers){
    if(observer?.id!==INERT_SECOND_DEVICE.id ||
      observer?.kind!=="inert-test-observer" ||
      observer?.revision!==INERT_SECOND_DEVICE.revision ||
      ids.has(observer.id)){
      throw new Error("unverified model variant: only an inert test observer is accepted");
    }
    ids.add(observer.id);
  }
};

export function createMultiDeviceRuntime(adapter,scenario,secondary=[]){
  supported(secondary);
  if(!adapter?.id || !scenario?.id)throw new TypeError("invalid primary device/scenario");
  const primary=createSession(adapter,scenario);
  return {
    revision:MULTI_RUNTIME_VERSION,
    adapter,scenario,primary,
    observers:secondary.map(secondary=>({
      id:secondary.id,revision:secondary.revision,
      lastWorldTick:primary.worldState.simTick,readCount:0,events:[],
    })),
    history:[],
  };
}

/**
 * A named read-only subscription to the ONE authoritative world snapshot.
 * It represents neither an AIS/radar observation nor a live navigation feed.
 * FCV-specific raw sensor data and device gain/menus are intentionally absent.
 */
export function readTestObserverStream(runtime,observerId){
  if(!runtime?.primary?.worldState ||
    !runtime.observers?.some(item=>item.id===observerId))
    throw new Error("unknown inert observer stream");
  const world=runtime.primary.worldState;
  const data=Object.freeze({simTick:world.simTick,
    bottomDepthM:world.bottomDepthM,sourceClass:"SYNTHETIC_WORLD"});
  const name=INERT_OBSERVER_STREAM_CONTRACT.name;
  return Object.freeze({name,data,hardwareConnected:false,
    fingerprint:fingerprint({observerId,name,data})});
}

export function dispatchMultiDevice(runtime,deviceId,input){
  if(!runtime?.adapter)throw new TypeError("missing runtime");
  if(deviceId==="fcv588" || deviceId===runtime.adapter.id){
    const primary=dispatch(runtime.primary,runtime.adapter,input,runtime.scenario);
    const {schemaVersion,seq,tick,...canonicalInput}=primary.events.at(-1);
    return {...runtime,primary,
      observers:runtime.observers.map(o=>({...o,lastWorldTick:primary.worldState.simTick})),
      history:[...runtime.history,{deviceId:runtime.adapter.id,
        input:snapshotEventData(canonicalInput,{freeze:true})}]};
  }
  const index=runtime.observers.findIndex(o=>o.id===deviceId);
  if(index<0)throw new Error("unknown observer device set");
  // A custom-keyed Array can masquerade as an inspect object while array
  // serialization ignores its named properties. Inspect must be a plain
  // record, not an Array, class instance or proxy for another device family.
  if(!input || typeof input!=="object" || Array.isArray(input) ||
    ![Object.prototype,null].includes(Object.getPrototypeOf(input))){
    throw new TypeError("invalid observer inspect object");
  }
  const canonicalInput=snapshotEventData(input,{freeze:true});
  if(canonicalInput?.kind!=="inspect" ||
    typeof canonicalInput.label!=="string" ||
    canonicalInput.label.length>64 ||
    Object.keys(canonicalInput).sort().join("|")!=="kind|label"){
    throw new TypeError("invalid observer inspect fields");
  }
  const observers=runtime.observers.map((o,i)=>i===index
    ? {...o,readCount:o.readCount+1,events:[...o.events,canonicalInput]}:o);
  return {...runtime,observers,
    history:[...runtime.history,{deviceId,
      input:canonicalInput}]};
}

export function createMultiReplay(runtime){
  const body={
    revision:MULTI_RUNTIME_VERSION,
    deviceSet:[runtime.adapter.id,...runtime.observers.map(o=>o.id)],
    primaryProfileRevision:runtime.adapter.revision,
    primaryMetaFingerprint:fingerprint(runtime.primary.meta),
    primarySessionHash:sessionHash(runtime.primary),
    observerConfigFingerprint:observerFingerprint(runtime.observers),
    scenarioId:runtime.scenario.id,
    scenarioVersion:runtime.scenario.version,
    history:runtime.history.map(event=>({
      deviceId:event.deviceId,input:snapshotEventData(event.input),
    })),
  };
  return {...body,contentFingerprint:fingerprint(body)};
}

export function replayMultiDevice(adapter,scenario,secondary,envelope){
  supported(secondary);
  if(!envelope || envelope.revision!==MULTI_RUNTIME_VERSION ||
    !Array.isArray(envelope.deviceSet) || !Array.isArray(envelope.history)){
    throw new Error("multi replay schema/contract mismatch");
  }
  const {contentFingerprint,...body}=envelope;
  if(Object.keys(envelope).sort().join("|")!==[
    "contentFingerprint","deviceSet","history","primaryProfileRevision",
    "primaryMetaFingerprint","primarySessionHash","observerConfigFingerprint",
    "revision","scenarioId","scenarioVersion",
  ].sort().join("|") || contentFingerprint!==fingerprint(body)){
    throw new Error("multi replay content fingerprint mismatch");
  }
  const deviceSet=[adapter.id,...secondary.map(o=>o.id)];
  // createSession performs the same profile/scenario validation as standalone
  // replay, before any input is re-dispatched to a secondary instance.
  const canonical=createSession(adapter,scenario);
  if(deviceSet.join("|")!==envelope.deviceSet.join("|") ||
    envelope.primaryProfileRevision!==adapter.revision ||
    envelope.primaryMetaFingerprint!==fingerprint(canonical.meta) ||
    envelope.observerConfigFingerprint!==observerFingerprint(secondary) ||
    envelope.scenarioId!==scenario.id ||
    envelope.scenarioVersion!==scenario.version){
    throw new Error("multi replay device set/profile/scenario mismatch");
  }
  let runtime=createMultiDeviceRuntime(adapter,scenario,secondary);
  for(const entry of envelope.history){
    runtime=dispatchMultiDevice(runtime,entry.deviceId,entry.input);
  }
  if(sessionHash(runtime.primary)!==envelope.primarySessionHash){
    throw new Error("multi replay final state hash mismatch / reducer drift");
  }
  return runtime;
}

/**
 * Explicit, opt-in conversion of an already-compatible canonical single-
 * device replay. The source must pass the current profile/schema/scenario
 * verification first. F0 or incompatible historical hardware profiles are
 * rejected rather than guessed into F1 public-reference semantics.
 * No observer traffic is invented for the historical interval.
 */
export function migrateCompatibleSingleReplayToMulti(adapter,scenario,secondary,singleEnvelope){
  supported(secondary);
  const source=replay(adapter,scenario,singleEnvelope);
  let runtime=createMultiDeviceRuntime(adapter,scenario,secondary);
  for(const event of source.events){
    const {schemaVersion,seq,tick,...input}=event;
    runtime=dispatchMultiDevice(runtime,adapter.id,input);
  }
  if(sessionHash(runtime.primary)!==sessionHash(source)){
    throw new Error("canonical single/multi migration drift");
  }
  return createMultiReplay(runtime);
}

// ============================================================================
// Active Multi-Device Bridge Session (2D Maritime World + Shared NMEA Bus)
// ============================================================================

export const BRIDGE_RUNTIME_VERSION = 1;

function bridgeAdapterHash(adapter) {
  return fingerprint({
    id: adapter.id,
    revision: adapter.revision,
    profile: adapter.profile,
    controls: adapter.controls,
    gestures: adapter.gestures,
    holdThresholdMs: adapter.holdThresholdMs ?? {},
    ...(adapter.fixtures !== undefined ? {fixtures: adapter.fixtures} : {}),
  });
}

function validateBridgeAdapters(adapters) {
  if (!Array.isArray(adapters) || adapters.length < 1 || adapters.length > 8) {
    throw new TypeError("bridge requires 1..8 active device adapters");
  }
  const seen = new Set();
  for (const adapter of adapters) {
    if (!adapter?.id || !adapter.profile || !adapter.gestures ||
        typeof adapter.initial !== "function" || typeof adapter.reduce !== "function") {
      throw new TypeError("each bridge adapter must provide id/profile/gestures/initial/reduce");
    }
    if (adapter.id === "bridge" || seen.has(adapter.id)) {
      throw new Error(`duplicate or reserved bridge adapter id: ${adapter.id}`);
    }
    seen.add(adapter.id);
  }
}

function uiElapsedSinceDeviceDown(events, control) {
  let uiMs = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.kind === "down" && ev.control === control) return uiMs;
    if (ev.kind === "ui-tick" && Number.isInteger(ev.elapsedMs)) uiMs += ev.elapsedMs;
  }
  return uiMs;
}

export function createBridgeSession(adapters, scenario = DEFAULT_BRIDGE_WORLD_SCENARIO) {
  validateBridgeAdapters(adapters);
  const maritimeWorld = initialMaritimeWorldState(scenario);
  const sensorBus = projectMaritimeSensorBus(scenario, maritimeWorld);
  const devices = {};
  const deviceOrder = [];
  for (const adapter of adapters) {
    deviceOrder.push(adapter.id);
    devices[adapter.id] = {
      deviceId: adapter.id,
      profileRevision: adapter.revision,
      profileHash: bridgeAdapterHash(adapter),
      deviceState: adapter.initial(),
      heldControls: {},
      events: [],
    };
  }
  return {
    bridgeVersion: BRIDGE_RUNTIME_VERSION,
    meta: Object.freeze({
      coreVersion: CORE_CONTRACT_VERSION,
      eventSchemaVersion: EVENT_SCHEMA_VERSION,
      maritimeWorldVersion: MARITIME_WORLD_VERSION,
      nmeaBusVersion: NMEA_BUS_CONTRACT_VERSION,
      tickDurationMs: TICK_DURATION_MS,
      scenarioHash: fingerprint(scenario),
      deviceProfiles: Object.freeze(adapters.map(a => Object.freeze({
        id: a.id,
        revision: a.revision,
        profileHash: bridgeAdapterHash(a),
      }))),
    }),
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    deviceOrder: Object.freeze(deviceOrder),
    maritimeWorld,
    sensorBus,
    devices,
    history: [],
  };
}

export function dispatchBridgeInput(bridge, adapters, targetId, input, scenario = DEFAULT_BRIDGE_WORLD_SCENARIO) {
  validateBridgeAdapters(adapters);
  if (!bridge || bridge.bridgeVersion !== BRIDGE_RUNTIME_VERSION ||
      bridge.scenarioId !== scenario?.id || bridge.scenarioVersion !== scenario?.version ||
      bridge.meta?.scenarioHash !== fingerprint(scenario)) {
    throw new Error("bridge scenario/contract mismatch");
  }
  if (adapters.length !== bridge.deviceOrder.length ||
      adapters.some((a, idx) => a.id !== bridge.deviceOrder[idx] ||
        bridge.devices[a.id]?.profileHash !== bridgeAdapterHash(a))) {
    throw new Error("bridge adapter set/profile mismatch");
  }
  if (input?.seq !== undefined || input?.tick !== undefined || input?.schemaVersion !== undefined) {
    throw new TypeError("input must not override runtime event metadata");
  }

  if (targetId === "bridge") {
    if (input?.kind !== "tick") {
      throw new TypeError("bridge-wide target only accepts synchronized tick events");
    }
    validateInput(input);
    const steps = input.steps ?? 1;
    const prevTick = bridge.maritimeWorld.simTick;
    const maritimeWorld = advanceMaritimeWorld(scenario, bridge.maritimeWorld, steps);
    const sensorBus = projectMaritimeSensorBus(scenario, maritimeWorld);
    const sensorObservation = observeTrainingStatus(scenario, maritimeWorld);
    const canonicalInput = snapshotEventData(input, {freeze: true});
    const nextDevices = {};
    for (const adapter of adapters) {
      const slot = bridge.devices[adapter.id];
      const devEvent = Object.freeze({
        schemaVersion: EVENT_SCHEMA_VERSION,
        tick: prevTick,
        seq: slot.events.length + 1,
        ...canonicalInput,
      });
      const nextState = adapter.reduce(slot.deviceState, {
        ...devEvent,
        sensorObservation,
        maritimeBus: sensorBus,
      });
      nextDevices[adapter.id] = {
        ...slot,
        deviceState: nextState,
        events: [...slot.events, devEvent],
      };
    }
    const historyRecord = Object.freeze({
      seq: bridge.history.length + 1,
      tick: prevTick,
      targetId: "bridge",
      input: canonicalInput,
    });
    return {
      ...bridge,
      maritimeWorld,
      sensorBus,
      devices: nextDevices,
      history: [...bridge.history, historyRecord],
    };
  }

  const adapter = adapters.find(a => a.id === targetId);
  if (!adapter) {
    throw new Error(`unknown bridge target device: ${targetId}`);
  }
  if (input?.kind === "tick") {
    throw new TypeError("synchronized tick must be dispatched to targetId 'bridge'");
  }
  validateInput(input, adapter);
  if (!["ui-tick", "restore-settings", "training-fixture"].includes(input.kind) &&
      !adapter.gestures[input.control]?.includes(input.kind)) {
    throw new TypeError("unsupported control gesture for target bridge device");
  }

  const slot = bridge.devices[targetId];
  const canonicalInput = snapshotEventData(input, {freeze: true});
  const devEvent = Object.freeze({
    schemaVersion: EVENT_SCHEMA_VERSION,
    tick: bridge.maritimeWorld.simTick,
    seq: slot.events.length + 1,
    ...canonicalInput,
  });
  const sensorObservation = observeTrainingStatus(scenario, bridge.maritimeWorld);
  const enrich = payload => ({
    ...payload,
    sensorObservation,
    maritimeBus: bridge.sensorBus,
  });

  let heldControls = slot.heldControls;
  let deviceState = slot.deviceState;
  if (devEvent.kind === "down") {
    if (Object.hasOwn(heldControls, devEvent.control)) throw new Error("duplicate press edge");
    heldControls = {...heldControls, [devEvent.control]: bridge.maritimeWorld.simTick};
    deviceState = adapter.reduce(deviceState, enrich(devEvent));
  } else if (devEvent.kind === "cancel") {
    if (!Object.hasOwn(heldControls, devEvent.control)) throw new Error("cancel without press edge");
    heldControls = {...heldControls};
    delete heldControls[devEvent.control];
    deviceState = adapter.reduce(deviceState, enrich(devEvent));
  } else if (devEvent.kind === "up") {
    if (!Object.hasOwn(heldControls, devEvent.control)) throw new Error("release without press edge");
    const heldSinceTick = heldControls[devEvent.control];
    heldControls = {...heldControls};
    delete heldControls[devEvent.control];
    const threshold = adapter.holdThresholdMs?.[devEvent.control];
    if (!Number.isInteger(threshold)) throw new Error("missing device hold threshold");
    const fallbackDurationMs = Math.max(
      (bridge.maritimeWorld.simTick - heldSinceTick) * TICK_DURATION_MS,
      Math.min(120000, uiElapsedSinceDeviceDown(slot.events, devEvent.control)),
    );
    const hold = devEvent.durationMs === undefined
      ? (bridge.maritimeWorld.simTick - heldSinceTick < 0
        ? classifyHoldTicks(bridge.maritimeWorld.simTick - heldSinceTick, threshold)
        : classifyHoldDurationMs(Math.min(120000, fallbackDurationMs), threshold))
      : classifyHoldDurationMs(devEvent.durationMs, threshold);
    deviceState = adapter.reduce(deviceState, enrich({
      kind: "press", control: devEvent.control, hold,
    }));
  } else {
    deviceState = adapter.reduce(deviceState, enrich(devEvent));
  }

  const nextDevices = {
    ...bridge.devices,
    [targetId]: {
      ...slot,
      deviceState,
      heldControls,
      events: [...slot.events, devEvent],
    },
  };
  const historyRecord = Object.freeze({
    seq: bridge.history.length + 1,
    tick: bridge.maritimeWorld.simTick,
    targetId,
    input: canonicalInput,
  });
  return {
    ...bridge,
    devices: nextDevices,
    history: [...bridge.history, historyRecord],
  };
}

export function bridgeSessionHash(bridge) {
  return fingerprint({
    bridgeVersion: bridge.bridgeVersion,
    meta: bridge.meta,
    maritimeWorld: bridge.maritimeWorld,
    sensorBusFingerprint: bridge.sensorBus.busFingerprint,
    devices: bridge.devices,
    history: bridge.history,
  });
}

export function createBridgeReplay(bridge) {
  const body = {
    bridgeVersion: BRIDGE_RUNTIME_VERSION,
    scenarioId: bridge.scenarioId,
    scenarioVersion: bridge.scenarioVersion,
    deviceOrder: [...bridge.deviceOrder],
    meta: snapshotEventData(bridge.meta),
    history: bridge.history.map(entry => snapshotEventData(entry)),
    finalBridgeHash: bridgeSessionHash(bridge),
  };
  return {...body, contentFingerprint: fingerprint(body)};
}

export function replayBridgeSession(adapters, scenario, envelope) {
  let session = createBridgeSession(adapters, scenario);
  const required = [
    "bridgeVersion", "contentFingerprint", "deviceOrder",
    "finalBridgeHash", "history", "meta", "scenarioId", "scenarioVersion",
  ];
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
      Object.keys(envelope).sort().join("|") !== required.sort().join("|") ||
      envelope.bridgeVersion !== BRIDGE_RUNTIME_VERSION ||
      !Array.isArray(envelope.history) || !Array.isArray(envelope.deviceOrder)) {
    throw new Error("bridge replay schema/contract mismatch");
  }
  const {contentFingerprint, ...body} = envelope;
  if (contentFingerprint !== fingerprint(body)) {
    throw new Error("bridge replay content fingerprint mismatch");
  }
  if (envelope.scenarioId !== session.scenarioId ||
      envelope.scenarioVersion !== session.scenarioVersion ||
      envelope.deviceOrder.join("|") !== session.deviceOrder.join("|") ||
      fingerprint(envelope.meta) !== fingerprint(session.meta)) {
    throw new Error("bridge replay device set/profile/scenario mismatch");
  }
  for (const entry of envelope.history) {
    if (entry.seq !== session.history.length + 1 ||
        entry.tick !== session.maritimeWorld.simTick) {
      throw new Error("bridge replay clock/sequence mismatch");
    }
    session = dispatchBridgeInput(session, adapters, entry.targetId, entry.input, scenario);
  }
  if (bridgeSessionHash(session) !== envelope.finalBridgeHash) {
    throw new Error("bridge replay final state hash mismatch / reducer drift");
  }
  return session;
}

