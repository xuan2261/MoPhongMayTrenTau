import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from
  "../src/core/session.mjs";
import {projectFcvTrainingFaults} from "../src/devices/fcv588/training-faults.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const teacher=(s,fixture,enabled)=>send(s,{kind:"training-fixture",fixture,enabled});
function boot(s=createSession(adapter,TRAINING_SCENARIO)){
  for(const event of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,event);
  return s;
}

test("D10 starts with no invented hardware faults; only bounded instructor events inject warnings",()=>{
  let s=boot();
  assert.deepEqual(projectFcvTrainingFaults(s.deviceState),[]);
  for(const invalid of [
    {kind:"training-fixture",fixture:"lowBattery",enabled:"true"},
    {kind:"training-fixture",fixture:"systemError",enabled:true,voltage:11.2},
    {kind:"training-fixture",fixture:"realBattery",enabled:true},
  ])assert.throws(()=>send(s,invalid),/invalid|unknown|unsupported|fixture/i);
  s=teacher(s,"lowBattery",true);
  s=teacher(s,"systemError",true);
  const faults=projectFcvTrainingFaults(s.deviceState);
  assert.deepEqual(faults.map(x=>x.code),["LOW_BATTERY","SYSTEM_ERROR"]);
  assert.ok(faults.every(x=>x.sourceClass==="SIMULATED_ONLY"));
  assert.ok(faults.every(x=>x.hardwareObserved===false));
  assert.equal(s.deviceState.settings.lowBattery,undefined);
  assert.equal(s.deviceState.settings.systemError,undefined);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("D10 warnings survive physical keys and world ticks; only teacher clears them",()=>{
  let s=teacher(boot(),"systemError",true);
  s=teacher(s,"lowBattery",true);
  s=send(s,{kind:"press",control:"menu"});
  s=send(s,{kind:"tick",steps:8});
  assert.equal(projectFcvTrainingFaults(s.deviceState).length,2);
  s=teacher(s,"lowBattery",false);
  assert.deepEqual(projectFcvTrainingFaults(s.deviceState).map(x=>x.code),
    ["SYSTEM_ERROR"]);
  s=teacher(s,"systemError",false);
  assert.deepEqual(projectFcvTrainingFaults(s.deviceState),[]);
  assert.equal(projectFcvTrainingFaults(createSession(adapter,TRAINING_SCENARIO).deviceState).length,0);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("D10 fixture controls exist only in instructor area and readouts reveal their synthetic provenance",async()=>{
  const html=await readFile(new URL("../web/index.html",import.meta.url),"utf8");
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const [device,teacherUi]=html.split('<aside class="training-panel">');
  for(const id of ["btn-battery-fixture","btn-error-fixture","training-fault-status"]){
    assert.ok(teacherUi.includes('id="'+id+'"'),id+" must be outside hardware UI");
    assert.ok(!device.includes('id="'+id+'"'));
    assert.ok(app.includes(id),"JS must wire and render "+id);
  }
  assert.match(app,/projectFcvTrainingFaults/);
  assert.match(app,/SIMULATED|TRAINING ONLY/);
  assert.doesNotMatch(app,/navigator\.serial\.requestPort|navigator\.usb\.requestDevice/);
});
