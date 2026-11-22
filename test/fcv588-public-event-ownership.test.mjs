import test from "node:test";
import assert from "node:assert/strict";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from
  "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createMultiDeviceRuntime,dispatchMultiDevice,createMultiReplay,
  INERT_SECOND_DEVICE,replayMultiDevice} from "../src/core/device-runtime.mjs";
import {fingerprint} from "../src/core/protocol.mjs";

test("fingerprint rejects arrays with hidden custom properties or empty slots",()=>{
  const properties=["expected"];
  properties.claim="corrupted";
  assert.throws(()=>fingerprint(properties),/array.*field|noncanonical.*array/i);
  const sparse=new Array(2);
  sparse[0]="present";
  assert.throws(()=>fingerprint(sparse),/array.*field|noncanonical.*array/i);
  assert.equal(typeof fingerprint(["safe","dense"]),"string");
});

test("replay log owns an immutable snapshot of restored settings, not the caller's mutable object",()=>{
  const original=createSession(adapter,TRAINING_SCENARIO);
  const settings={...original.deviceState.settings};
  const input={kind:"restore-settings",settings};
  const s=dispatch(original,adapter,input,TRAINING_SCENARIO);
  const initialHash=sessionHash(s);
  const envelope=createReplayEnvelope(s);
  assert.equal(s.events[0].settings.units,"Metric");
  settings.units="Feet";
  input.settings={units:"Fathom"};
  assert.equal(s.events[0].settings.units,"Metric");
  assert.equal(sessionHash(s),initialHash);
  assert.equal(s.deviceState.settings.units,"Metric");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,envelope)),initialHash);
  assert.equal(Object.isFrozen(s.events[0].settings),true);
});

test("portable replay envelope cannot mutate its source session through a nested field",()=>{
  const original=createSession(adapter,TRAINING_SCENARIO);
  const s=dispatch(original,adapter,{kind:"restore-settings",
    settings:{...original.deviceState.settings}},TRAINING_SCENARIO);
  const before=sessionHash(s);
  const envelope=createReplayEnvelope(s);
  envelope.events[0].settings.units="Feet";
  assert.equal(s.events[0].settings.units,"Metric");
  assert.equal(sessionHash(s),before);
  assert.throws(()=>replay(adapter,TRAINING_SCENARIO,envelope),/content mismatch/i);
});

test("inert second-device history owns the caller's input and is independently replayable",()=>{
  let runtime=createMultiDeviceRuntime(adapter,TRAINING_SCENARIO,[INERT_SECOND_DEVICE]);
  const input={kind:"restore-settings",settings:{...runtime.primary.deviceState.settings}};
  runtime=dispatchMultiDevice(runtime,adapter.id,input);
  const hash=sessionHash(runtime.primary);
  const before=createMultiReplay(runtime);
  input.settings.units="Feet";
  assert.equal(runtime.history[0].input.settings.units,"Metric");
  assert.equal(sessionHash(runtime.primary),hash);
  const replayed=replayMultiDevice(adapter,TRAINING_SCENARIO,[INERT_SECOND_DEVICE],before);
  assert.equal(sessionHash(replayed.primary),hash);
  before.history[0].input.settings.units="Feet";
  assert.throws(()=>replayMultiDevice(adapter,TRAINING_SCENARIO,
    [INERT_SECOND_DEVICE],before),/content.*fingerprint|content mismatch/i);
});
