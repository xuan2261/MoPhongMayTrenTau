/**
 * Deterministic test-only second observer of the existing shared world.
 * This is NOT an AIS transponder, radio, radar, NMEA adapter, or generic menu
 * framework. It cannot mutate the canonical FCV session or WorldState.
 */
import {createSession,dispatch,replay,sessionHash} from "./session.mjs";
import {fingerprint,snapshotEventData} from "./protocol.mjs";

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
