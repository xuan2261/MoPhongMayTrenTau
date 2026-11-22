import test from "node:test";
import assert from "node:assert/strict";
import {createSession,dispatch,sessionHash,createReplayEnvelope} from "../src/core/session.mjs";
import * as MultiRuntime from "../src/core/device-runtime.mjs";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO,observeSounder} from "../src/core/scenario.mjs";
import {fingerprint} from "../src/core/protocol.mjs";
import {createMultiDeviceRuntime,dispatchMultiDevice,INERT_SECOND_DEVICE,
  createMultiReplay,replayMultiDevice} from "../src/core/device-runtime.mjs";

const inputs=[
  {kind:"down",control:"power"}, {kind:"up",control:"power",durationMs:100},
  {kind:"tick",steps:4}, {kind:"rotate",control:"mode",steps:1},
  {kind:"ui-tick",elapsedMs:6000}, {kind:"tick",steps:7},
  {kind:"press",control:"range"},
];
const rawHash=s=>{
  const raw=observeSounder(TRAINING_SCENARIO,s.worldState,{columns:24,rows:60});
  return fingerprint({lf:[...raw.channels[50]],hf:[...raw.channels[200]],
    tick:raw.simTick});
};

test("second inert subscriber cannot alter FCV stream, replay hashes or observations",()=>{
  let alone=createSession(FCV588_ADAPTER,TRAINING_SCENARIO);
  let multi=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  for(const event of inputs){
    alone=dispatch(alone,FCV588_ADAPTER,event,TRAINING_SCENARIO);
    multi=dispatchMultiDevice(multi,"fcv588",event);
    assert.equal(sessionHash(multi.primary),sessionHash(alone));
    assert.equal(rawHash(multi.primary),rawHash(alone));
  }
  assert.equal(multi.observers.length,1);
  assert.equal(multi.observers[0].lastWorldTick,alone.worldState.simTick);
});

test("second device event is independently logged and never mutates FCV or world",()=>{
  let multi=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  const before=sessionHash(multi.primary);
  multi=dispatchMultiDevice(multi,INERT_SECOND_DEVICE.id,
    {kind:"inspect",label:"classroom-test"});
  assert.equal(sessionHash(multi.primary),before);
  assert.equal(multi.observers[0].readCount,1);
  assert.equal(multi.observers[0].events.length,1);
});

test("inert observer logs one immutable canonical event rather than a caller-owned object",()=>{
  const input={kind:"inspect",label:"classroom-owned-input"};
  const runtime=dispatchMultiDevice(createMultiDeviceRuntime(
    FCV588_ADAPTER,TRAINING_SCENARIO,[INERT_SECOND_DEVICE]),
    INERT_SECOND_DEVICE.id,input);
  const observed=runtime.observers[0].events[0];
  assert.strictEqual(observed,runtime.history[0].input,
    "observer view and portable replay history must reference the same snapshot");
  assert.equal(Object.isFrozen(observed),true,
    "a later consumer cannot rewrite an already-observed training inspection");
  assert.equal(observed.label,"classroom-owned-input");
  input.label="changed after dispatch";
  assert.equal(observed.label,"classroom-owned-input");
  const restored=replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],createMultiReplay(runtime));
  assert.deepEqual(restored.observers[0].events,runtime.observers[0].events);
});

test("inert observer inspect protocol rejects unrecognized payloads rather than storing arbitrary data",()=>{
  const runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  assert.throws(()=>dispatchMultiDevice(runtime,INERT_SECOND_DEVICE.id,{
    kind:"inspect",label:"valid",debug:{source:"unexpected extra"},
  }),/observer.*field|invalid.*inspect/i);
  assert.equal(runtime.observers[0].events.length,0,
    "rejected input must leave the original observer session untouched");
});

test("observer refuses array objects with spoofed inspect fields hidden from array fingerprint",()=>{
  const runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  const forged=[];
  forged.kind="inspect";
  forged.label="before";
  assert.throws(()=>fingerprint(forged),/array.*field|noncanonical.*array/i,
    "the shared fingerprint must not silently ignore named array properties");
  assert.throws(()=>dispatchMultiDevice(runtime,INERT_SECOND_DEVICE.id,forged),
    /invalid.*inspect|observer.*input|plain.*object|array/i);
  assert.equal(runtime.observers[0].events.length,0);
  assert.equal(runtime.history.length,0);
});

test("multi-device replay requires exact device-set version and rejects tampered inputs",()=>{
  let multi=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  for(const input of inputs)multi=dispatchMultiDevice(multi,"fcv588",input);
  multi=dispatchMultiDevice(multi,INERT_SECOND_DEVICE.id,
    {kind:"inspect",label:"inspection"});
  const envelope=createMultiReplay(multi);
  assert.equal(envelope.deviceSet[0],FCV588_ADAPTER.id);
  const replayed=replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],envelope);
  assert.equal(sessionHash(replayed.primary),sessionHash(multi.primary));
  assert.throws(()=>replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,[],envelope),
    /device.*set|profile/i);
  assert.throws(()=>replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],{...envelope,revision:"false"}),/contract|schema|fingerprint/i);
});

test("unidentified AIS R5 family cannot instantiate a claimed SUPREME or SOLID UI",()=>{
  for(const id of ["ais.r5.pending","ais.r5.solid","ais.r5.supreme"]){
    assert.throws(()=>createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
      [{id,kind:"ais"}]),/variant|unverified|not.*inert/i);
  }
});

test("multi replay rejects changed primary profile even with identical id and revision",()=>{
  let runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  runtime=dispatchMultiDevice(runtime,"fcv588",{kind:"tick",steps:2});
  const envelope=createMultiReplay(runtime);
  const altered={...FCV588_ADAPTER,profile:{
    ...FCV588_ADAPTER.profile,firmware:"synthetic-mismatch-no-installed-version",
  }};
  assert.equal(altered.revision,FCV588_ADAPTER.revision);
  assert.throws(()=>replayMultiDevice(altered,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],envelope),/profile|meta|contract/i);
});

test("multi replay inherits canonical same-revision hold threshold and gesture contract protections",()=>{
  let runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  for(const event of [
    {kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},
    {kind:"tick",steps:4},
    {kind:"down",control:"func"},
    {kind:"up",control:"func",durationMs:800},
  ])runtime=dispatchMultiDevice(runtime,FCV588_ADAPTER.id,event);
  assert.equal(runtime.primary.deviceState.overlay?.kind,"func-program");
  const envelope=createMultiReplay(runtime);
  const thresholdDrift={...FCV588_ADAPTER,holdThresholdMs:{
    ...FCV588_ADAPTER.holdThresholdMs,func:1000}};
  assert.throws(()=>replayMultiDevice(thresholdDrift,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],envelope),/contract|profile|meta/i,
    "the inert observer may not hide a changed FCV control interpretation");
  const restored=replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],envelope);
  assert.equal(sessionHash(restored.primary),sessionHash(runtime.primary));
});

test("multi replay detects a same-revision primary reducer drift before returning a believable observer state",()=>{
  let runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  for(const input of [
    {kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4},
    {kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"},
  ])runtime=dispatchMultiDevice(runtime,FCV588_ADAPTER.id,input);
  const envelope=createMultiReplay(runtime);
  const changed={...FCV588_ADAPTER,reduce:(state,event)=>{
    const current=FCV588_ADAPTER.reduce(state,event);
    return event.kind==="press" && event.control==="enter" &&
      current.rangeMode==="manual"?{...current,rangeIndex:4}:current;
  }};
  assert.throws(()=>replayMultiDevice(changed,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],envelope),/state|drift|hash|mismatch/i,
    "observer replay must not make altered FCV operator semantics appear valid");
});

test("multi replay binds inert observer revision and complete core/session contract",()=>{
  const runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  const envelope=createMultiReplay(runtime);
  assert.equal(typeof envelope.primaryMetaFingerprint,"string");
  assert.equal(typeof envelope.observerConfigFingerprint,"string");
  assert.throws(()=>replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [{...INERT_SECOND_DEVICE,revision:2}],envelope),/observer|profile|version|contract/i);
  assert.throws(()=>replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],{...envelope,primaryMetaFingerprint:"spoof"}),
    /content|fingerprint|meta|contract/i);
});

test("multi replay fingerprints the published inert stream schema, not only observer id and revision",()=>{
  const runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  const envelope=createMultiReplay(runtime);
  assert.equal(envelope.revision,4,
    "new primary final-state drift guard must advance multi replay format");
  const requiredContract={
    name:"training-observer-world-v1",schemaVersion:1,
    fields:["simTick","bottomDepthM","sourceClass"],
  };
  assert.deepEqual(MultiRuntime.INERT_OBSERVER_STREAM_CONTRACT,requiredContract);
  assert.equal(envelope.observerConfigFingerprint,fingerprint([{
    id:INERT_SECOND_DEVICE.id,kind:INERT_SECOND_DEVICE.kind,
    revision:INERT_SECOND_DEVICE.revision,stream:requiredContract,
  }]));
  assert.equal(MultiRuntime.readTestObserverStream(runtime,
    INERT_SECOND_DEVICE.id).name,requiredContract.name);
  const {contentFingerprint,...body}=envelope;
  const historical={...body,revision:3};
  assert.throws(()=>replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],{...historical,
      contentFingerprint:fingerprint(historical)}),/schema|contract/i,
    "a prior multi v3 log must never silently inherit the final-state guard");
});

test("historical compatible single-device envelope migrates only through an explicit validated adapter",()=>{
  assert.equal(typeof MultiRuntime.migrateCompatibleSingleReplayToMulti,"function",
    "explicit single replay compatibility adapter must be present");
  let alone=createSession(FCV588_ADAPTER,TRAINING_SCENARIO);
  for(const event of inputs)alone=dispatch(alone,FCV588_ADAPTER,event,TRAINING_SCENARIO);
  const single=createReplayEnvelope(alone);
  const upgraded=MultiRuntime.migrateCompatibleSingleReplayToMulti(
    FCV588_ADAPTER,TRAINING_SCENARIO,[INERT_SECOND_DEVICE],single);
  const restored=replayMultiDevice(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],upgraded);
  assert.equal(sessionHash(restored.primary),sessionHash(alone));
  assert.ok(upgraded.history.every(e=>e.deviceId===FCV588_ADAPTER.id));
  assert.throws(()=>MultiRuntime.migrateCompatibleSingleReplayToMulti(
    FCV588_ADAPTER,TRAINING_SCENARIO,[INERT_SECOND_DEVICE],
    {...single,envelopeVersion:0}),/schema|replay|contract/i,
    "F0/v1 envelopes must not silently inherit F1 semantics");
});

test("Phase7 observer consumes a named typed immutable world stream without inheriting FCV sonar controls",()=>{
  let runtime=createMultiDeviceRuntime(FCV588_ADAPTER,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE]);
  assert.equal(typeof MultiRuntime.readTestObserverStream,"function");
  const initial=MultiRuntime.readTestObserverStream(runtime,INERT_SECOND_DEVICE.id);
  assert.equal(initial.name,"training-observer-world-v1");
  assert.equal(initial.data.simTick,0);
  assert.equal(Object.isFrozen(initial.data),true);
  assert.equal(initial.hardwareConnected,false);
  const before=initial.fingerprint;
  runtime=dispatchMultiDevice(runtime,"fcv588",{kind:"tick",steps:5});
  const later=MultiRuntime.readTestObserverStream(runtime,INERT_SECOND_DEVICE.id);
  assert.equal(later.data.simTick,5);
  assert.notEqual(later.fingerprint,before);
  const primaryHash=sessionHash(runtime.primary);
  const inspection=dispatchMultiDevice(runtime,INERT_SECOND_DEVICE.id,
    {kind:"inspect",label:"read-only"});
  assert.equal(sessionHash(inspection.primary),primaryHash);
  assert.equal(MultiRuntime.readTestObserverStream(inspection,
    INERT_SECOND_DEVICE.id).fingerprint,later.fingerprint);
  assert.equal(Object.hasOwn(later.data,"gainMode"),false);
  assert.equal(Object.hasOwn(later.data,"targets"),false);
  assert.throws(()=>MultiRuntime.readTestObserverStream(runtime,
    "ais.r5.pending"),/unknown|observer/i);
});
