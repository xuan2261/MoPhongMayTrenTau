import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import * as Navigation from "../src/devices/fcv588/navigation.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(settings){
  let s=createSession(adapter,TRAINING_SCENARIO);
  if(settings)s=send(s,{kind:"restore-settings",settings:{
    ...s.deviceState.settings,...settings}});
  for(const ev of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},{kind:"tick",steps:4}])s=send(s,ev);
  return s;
}
function chooseDestination(s){
  if(s.deviceState.overlay?.kind!=="menu")s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="Data"&&i<6;i++)s=pad(s,"right");
  const idx=getFcvMenuItems("Data",s.deviceState).findIndex(x=>x.id==="data.destination");
  assert.ok(idx>=0);
  for(let i=0;s.deviceState.overlay.itemIndex!==idx&&i<20;i++)s=pad(s,"down");
  s=key(s,"enter");
  assert.equal(s.deviceState.overlay?.purpose,"destination");
  s=pad(s,"down");
  return key(s,"enter");
}

test("Arrival alarm never guesses a real position or destination",()=>{
  const s=send(boot({arrivalAlarm:"On",arrivalRadius:"0.01"}),
    {kind:"tick",steps:1});
  assert.deepEqual(s.deviceState.alarms.activeIds,[]);
  assert.equal(s.deviceState.navigation.destinationId,null);
  assert.equal(s.deviceState.alarms.audible,false);
  assert.equal(typeof Navigation.distanceNmBetween,"function");
  assert.equal(Navigation.distanceNmBetween(null,null),null);
});

test("arrival radius triggers and clears on typed moving ownship, without actual GPS or NMEA output",()=>{
  let s=boot({arrivalAlarm:"On",arrivalRadius:"0.01"});
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=key(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  s=chooseDestination(s);
  assert.equal(s.deviceState.navigation.destinationId,"WP001");
  s=send(s,{kind:"tick",steps:1});
  assert.deepEqual(s.deviceState.alarms.activeIds,["ARRIVAL"]);
  assert.equal(s.deviceState.alarms.audible,true);
  s=key(s,"enter");
  assert.equal(s.deviceState.alarms.audible,false);
  assert.deepEqual(s.deviceState.alarms.activeIds,["ARRIVAL"]);
  s=send(s,{kind:"tick",steps:20});
  assert.deepEqual(s.deviceState.alarms.activeIds,[],
    "synthetic vessel moves beyond the selected arrival radius");
  assert.equal(s.deviceState.alarms.visualActive,false);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("arrival enable and radius are guarded, offline, versioned device choices",()=>{
  const entries=getFcvMenuItems("Alarm");
  assert.deepEqual(entries.find(e=>e.id==="alarm.arrivalAlarm").choices,["Off","On"]);
  assert.ok(entries.find(e=>e.id==="alarm.arrivalRadius").choices.includes("0.01"));
  assert.match(entries.find(e=>e.id==="alarm.arrivalRadius").sourceStatus,
    /SYNTHETIC|UNVERIFIED/);
});
