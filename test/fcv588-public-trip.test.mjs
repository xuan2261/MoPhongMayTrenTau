import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(nav=false){
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const ev of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},{kind:"tick",steps:4}])s=send(s,ev);
  if(nav)s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  return s;
}
function open(s,id){
  if(s.deviceState.overlay?.kind!=="menu")s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="Data"&&i<6;i++)s=pad(s,"right");
  const target=getFcvMenuItems("Data",s.deviceState).findIndex(x=>x.id===id);
  assert.ok(target>=0,id);
  for(let i=0;s.deviceState.overlay.itemIndex!==target&&i<20;i++)s=pad(s,"down");
  return key(s,"enter");
}

test("Data Trip/Odometer counts only explicit synthetic navigation speed and world ticks",()=>{
  let s=boot();
  assert.equal(s.deviceState.navigation.tripNm,0);
  assert.equal(s.deviceState.navigation.odometerNm,0);
  s=send(s,{kind:"tick",steps:20});
  assert.equal(s.deviceState.navigation.tripNm,0,"NO NAV means NO trip");
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:20});
  assert.ok(Math.abs(s.deviceState.navigation.tripNm-7*20/3600)<1e-9);
  assert.equal(s.deviceState.navigation.tripNm,s.deviceState.navigation.odometerNm);
  const worldBefore=s.worldState.simTick;
  s=send(s,{kind:"ui-tick",elapsedMs:3000});
  assert.equal(s.worldState.simTick,worldBefore);
  assert.ok(Math.abs(s.deviceState.navigation.tripNm-7*20/3600)<1e-9);
  s=open(s,"data.trip");
  assert.equal(s.deviceState.overlay?.kind,"trip-status");
  assert.equal(s.deviceState.overlay?.simulated,true);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("Reset Trip confirms before clearing and never erases Odometer",()=>{
  let s=send(boot(true),{kind:"tick",steps:20});
  const original=s.deviceState.navigation.tripNm;
  assert.ok(original>0);
  s=open(s,"data.resetTrip");
  assert.equal(s.deviceState.overlay?.kind,"confirm-trip-reset");
  s=key(s,"enter"); // default NO
  assert.equal(s.deviceState.navigation.tripNm,original);
  s=open(s,"data.resetTrip");
  s=pad(s,"right"); // YES
  s=key(s,"enter");
  assert.equal(s.deviceState.navigation.tripNm,0);
  assert.equal(s.deviceState.navigation.odometerNm,original);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});
