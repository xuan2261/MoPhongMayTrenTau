import test from "node:test";
import assert from "node:assert/strict";
import * as MenuAtlas from "../src/devices/fcv588/menu-atlas.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import {encodeFcvSettings,decodeFcvSettings} from "../src/devices/fcv588/settings.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const press=(s,control)=>send(s,{kind:"press",control});
const func=(s,durationMs)=>send(send(s,{kind:"down",control:"func"}),
  {kind:"up",control:"func",durationMs});
const boot=()=>{
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const event of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},{kind:"tick",steps:4}])
    s=send(s,event);
  return s;
};

test("manual §1.19 enumerates exactly 11 operator-programmable FUNC targets",()=>{
  const targets=MenuAtlas.FCV_FUNC_TARGETS;
  assert.ok(Array.isArray(targets),"source-backed public FUNC targets must be exported");
  assert.deepEqual(targets.map(x=>x.label),[
    "Pic. Advance","Shift","Interference","Clutter","Color Erase",
    "White Line","White Marker","WPT List","Bottom Zone","TVG","Fish Symbols",
  ]);
  assert.deepEqual(MenuAtlas.getFcvMenuItems("System").find(x=>
    x.id==="system.keySetup").choices,targets.map(x=>x.label));
});

test("FUNC short key opens staged assignment setting, MENU cancels and ENTER commits",()=>{
  let s=func(boot(),100);
  assert.equal(s.deviceState.overlay?.kind,"func-setting");
  assert.equal(s.deviceState.overlay?.settingKey,"pictureAdvance");
  const original=s.deviceState.settings.pictureAdvance;
  s=pad(s,"down");
  assert.notEqual(s.deviceState.overlay?.draftValue,original);
  s=press(s,"menu");
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.settings.pictureAdvance,original);
  s=func(s,100);
  s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.pictureAdvance,"1/2");
  assert.equal(s.deviceState.overlay,null);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("FUNC long key configures target; assignment persists and second short key uses it",()=>{
  let s=func(boot(),1000);
  assert.equal(s.deviceState.overlay?.kind,"func-program");
  s=pad(s,"down");
  assert.equal(s.deviceState.overlay?.itemIndex,1);
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.keySetup,"Shift");
  assert.deepEqual(decodeFcvSettings(encodeFcvSettings(s.deviceState.settings)),
    s.deviceState.settings);
  s=func(s,100);
  assert.equal(s.deviceState.overlay,null,
    "Shift cannot open while automatic range is active (manual §1.9)");
  assert.match(s.deviceState.notice,/SHIFT_UNAVAILABLE_IN_AUTO_RANGE/);
  s=press(s,"range");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.rangeMode,"manual");
  s=func(s,100);
  assert.equal(s.deviceState.overlay?.kind,"func-setting");
  assert.equal(s.deviceState.overlay?.settingKey,"shift");
  const previous=s.deviceState.settings.shift;
  s=pad(s,"down");
  s=press(s,"enter");
  assert.notEqual(s.deviceState.settings.shift,previous);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});
