import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {projectFcvConfiguration} from "../web/lcd-config-presentation.mjs";
import {projectFcvAlarmPresentation} from "../web/lcd-presentation.mjs";

const send=(s,input)=>dispatch(s,adapter,input,scenario);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function activeProfile(){
  let s=createSession(adapter,scenario);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,input);
  s=key(s,"menu");s=pad(pad(s,"right"),"right");
  for(let i=0;i<4;i++)s=pad(s,"down");
  s=pad(key(s,"enter"),"down"); // ALARM5 > Alarm
  s=key(pad(key(s,"enter"),"right"),"enter");
  s=send(s,{kind:"tick",steps:1});
  assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM5"]);
  return s;
}

test("review A: committed Off suppresses the effective displayed alarm without rewriting its cached observation",()=>{
  let s=activeProfile();
  const tick=s.worldState.simTick;
  s=key(pad(key(s,"enter"),"left"),"enter");
  assert.equal(s.deviceState.settings.alarm5,"Off");
  assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM5"],
    "the existing reducer recomputes its sensor snapshot only on world ticks");
  const view=projectFcvConfiguration(s.deviceState);
  assert.equal(view.profileStatus.active,false,
    "an Off profile must not be presented as an effective ACTIVE alarm from a cached tick");
  assert.equal(view.profileStatus.acknowledged,false);
  assert.deepEqual(projectFcvAlarmPresentation(s.deviceState).activeIds,[]);
  assert.equal(projectFcvAlarmPresentation(s.deviceState).audible,false);
  assert.equal(s.worldState.simTick,tick);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("review A: pending Off cannot suppress a committed On alarm or its current cause",()=>{
  let s=activeProfile();
  s=pad(key(s,"enter"),"left");
  assert.equal(s.deviceState.overlay.draftValue,"Off");
  const view=projectFcvConfiguration(s.deviceState);
  assert.equal(view.profileStatus.enabled,"On");
  assert.equal(view.profileStatus.active,true);
  assert.equal(view.transaction.committedValue,"On");
  assert.equal(view.transaction.draftValue,"Off");
  s=key(s,"menu");
  assert.equal(s.deviceState.settings.alarm5,"On");
  assert.equal(projectFcvConfiguration(s.deviceState).profileStatus.active,true);
});

test("shared alarm view recomputes audible only from enabled unacknowledged causes and ignores drafts",()=>{
  const state={...activeProfile().deviceState,
    settings:{alarm1:"On",alarm2:"Off",arrivalAlarm:"On"},
    overlay:{kind:"menu",editing:true,editEntryId:"alarm.arrivalAlarm",draftValue:"Off"},
    alarms:{sourceClass:"SYNTHETIC_TRAINING_CAUSES",
      activeIds:["ALARM1","ALARM2","ARRIVAL"],acknowledgedIds:["ALARM1","ARRIVAL"],audible:true}};
  const before=structuredClone(state);
  const view=projectFcvAlarmPresentation(state);
  assert.deepEqual(view.activeIds,["ALARM1","ARRIVAL"]);
  assert.deepEqual(view.acknowledgedIds,["ALARM1","ARRIVAL"]);
  assert.equal(view.audible,false,
    "a disabled unacknowledged cause must not make remaining acknowledged alarms audible");
  assert.deepEqual(state,before);
  assert.deepEqual(projectFcvAlarmPresentation({...state,power:"off"}).activeIds,[]);
  assert.equal(projectFcvAlarmPresentation({...state,alarms:null}).snapshotAvailable,false);
});
