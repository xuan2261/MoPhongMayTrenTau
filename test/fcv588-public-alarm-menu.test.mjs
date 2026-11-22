import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import * as Menu from "../src/devices/fcv588/menu-atlas.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const ev of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},{kind:"tick",steps:4}])s=send(s,ev);
  return s;
}
function openAlarm1(s){
  s=key(s,"menu");
  while(s.deviceState.overlay.category!=="Alarm")s=pad(s,"right");
  assert.equal(s.deviceState.overlay.itemIndex,0);
  return key(s,"enter");
}

test("§1.18 ALARM1 ENTER opens Setting/Alarm menu rather than immediate checkbox",()=>{
  let s=openAlarm1(boot());
  assert.equal(s.deviceState.overlay?.kind,"fish-alarm");
  assert.equal(s.deviceState.overlay?.itemIndex,0);
  assert.equal(s.deviceState.settings.alarm1,"Off");
  s=key(s,"enter");
  assert.equal(s.deviceState.overlay?.kind,"fish-alarm-setting");
  assert.ok(Array.isArray(Menu.FCV_FISH_ALARM_FIELDS));
  assert.ok(Menu.FCV_FISH_ALARM_FIELDS.some(x=>x.key==="bottomType"));
  assert.ok(Menu.FCV_FISH_ALARM_FIELDS.some(x=>x.key==="bottomFrom"));
  assert.ok(Menu.FCV_FISH_ALARM_FIELDS.some(x=>x.key==="bottomSpan"));
  assert.equal(s.deviceState.settings.alarm1,"Off");
});

test("§1.18 ALARM1 setting edit supports staged value/ESC cancellation and replay",()=>{
  let s=openAlarm1(boot());
  s=key(s,"enter"); // Setting
  const fields=Menu.FCV_FISH_ALARM_FIELDS;
  const idx=fields.findIndex(x=>x.key==="bottomFrom");
  while(s.deviceState.overlay.itemIndex!==idx)s=pad(s,"down");
  s=key(s,"enter"); // edit
  const previous=s.deviceState.settings.alarm1BottomFrom;
  s=pad(s,"right");
  assert.equal(s.deviceState.settings.alarm1BottomFrom,previous);
  s=key(s,"menu"); // cancel edit
  assert.equal(s.deviceState.settings.alarm1BottomFrom,previous);
  s=key(s,"enter"); // edit again
  s=pad(s,"right");
  s=key(s,"enter"); // commit
  assert.notEqual(s.deviceState.settings.alarm1BottomFrom,previous);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("§1.18 ALARM1 enable remains independent of parameter editing",()=>{
  let s=openAlarm1(boot());
  s=pad(s,"down"); // Alarm On/Off
  s=key(s,"enter");
  assert.equal(s.deviceState.overlay?.editing,true);
  s=pad(s,"right");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.alarm1,"On");
  assert.equal(s.deviceState.overlay?.kind,"fish-alarm");
  s=key(s,"menu");
  assert.equal(s.deviceState.overlay?.kind,"menu");
  assert.equal(s.deviceState.overlay.category,"Alarm");
});

test("independent ALARM1–5 editable bottom thresholds alter live synthetic causes and persist",()=>{
  const base=createSession(adapter,TRAINING_SCENARIO).deviceState.settings;
  const setup={...base,alarm5:"On",alarm5BottomFrom:"200",
    alarm5BottomSpan:"10"};
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings:setup});
  for(const ev of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},
    {kind:"tick",steps:1}])s=send(s,ev);
  assert.deepEqual(s.deviceState.alarms.activeIds,[],
    "range 200..210 must not match a synthetic 50 m bottom");
  assert.equal(s.deviceState.settings.alarm5BottomFrom,"200");
  const restored={...base,alarm5:"On",alarm5BottomFrom:"40",
    alarm5BottomSpan:"30"};
  let s2=createSession(adapter,TRAINING_SCENARIO);
  s2=send(s2,{kind:"restore-settings",settings:restored});
  for(const ev of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},
    {kind:"tick",steps:1}])s2=send(s2,ev);
  assert.deepEqual(s2.deviceState.alarms.activeIds,["ALARM5"]);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s2))),sessionHash(s2));
});

test("fish alarm Level and synthetic category govern detection, not merely the enabled switch",()=>{
  const base=createSession(adapter,TRAINING_SCENARIO).deviceState.settings;
  function run(level){
    let s=createSession(adapter,TRAINING_SCENARIO);
    s=send(s,{kind:"restore-settings",settings:{...base,
      alarm2:"On",alarm2FishType:"Fish School",alarm2FishLevel:level}});
    for(const ev of [{kind:"down",control:"power"},
      {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},
      {kind:"tick",steps:4}])s=send(s,ev);
    return s;
  }
  assert.deepEqual(run("High").deviceState.alarms.activeIds,[]);
  assert.deepEqual(run("Medium").deviceState.alarms.activeIds,["ALARM2"]);
  assert.deepEqual(run("Low").deviceState.alarms.activeIds,["ALARM2"]);
});

test("ALARM3 temperature Outside triggers only on valid instructor-enabled synthetic data",()=>{
  const base=createSession(adapter,TRAINING_SCENARIO).deviceState.settings;
  function run(withNav,from,span){
    let s=createSession(adapter,TRAINING_SCENARIO);
    s=send(s,{kind:"restore-settings",settings:{...base,
      alarm3:"On",alarm3Temperature:"Outside",
      alarm3TempFrom:from,alarm3TempSpan:span}});
    for(const ev of [{kind:"down",control:"power"},
      {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,ev);
    if(withNav)s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
    return send(s,{kind:"tick",steps:1});
  }
  assert.deepEqual(run(false,"30","5").deviceState.alarms.activeIds,[]);
  assert.deepEqual(run(true,"15","6").deviceState.alarms.activeIds,[]);
  assert.deepEqual(run(true,"30","5").deviceState.alarms.activeIds,["ALARM3"]);
});

test("§1.18 physical FUNC and POWER down silence the synthetic alarm immediately, preserving its active cause",()=>{
  const base=createSession(adapter,TRAINING_SCENARIO).deviceState.settings;
  const setup={...base,alarm5:"On",alarm5BottomFrom:"40",
    alarm5BottomSpan:"30"};
  const alarmOn=()=>{
    let s=createSession(adapter,TRAINING_SCENARIO);
    s=send(s,{kind:"restore-settings",settings:setup});
    for(const ev of [{kind:"down",control:"power"},
      {kind:"up",control:"power",durationMs:100},
      {kind:"tick",steps:4},{kind:"tick",steps:1}])s=send(s,ev);
    assert.equal(s.deviceState.alarms.audible,true);
    assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM5"]);
    return s;
  };
  for(const control of ["func","power"]){
    let s=send(alarmOn(),{kind:"down",control});
    assert.equal(s.deviceState.alarms.audible,false,
      control+" depression must mute, not wait for physical release");
    assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM5"],
      "silencing a keyed alarm cannot erase the current synthetic cause");
    s=send(s,{kind:"cancel",control});
    s=send(s,{kind:"tick",steps:1});
    assert.equal(s.deviceState.alarms.audible,false);
    assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
      createReplayEnvelope(s))),sessionHash(s));
  }
});
