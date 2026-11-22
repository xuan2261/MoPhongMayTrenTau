import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {FCV_MENU_CATEGORIES,getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const press=(s,key)=>send(s,{kind:"press",control:key});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const input of [{kind:"down",control:"power"},{kind:"up",control:"power"},{kind:"tick",steps:4}])s=send(s,input);
  return s;
}
function soundingBottomType(){
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings:{...s.deviceState.settings,
    alarm1:"On",transducer:"525STID-PWD",draft:"1",
    bottomDiscrimination:"Graphic"}});
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},
    {kind:"training-fixture",fixture:"virtualMounting",enabled:true},
    {kind:"tick",steps:1}])s=send(s,input);
  assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM1"]);
  return s;
}
function open(s,category,id){
  if(s.deviceState.overlay?.kind!=="menu")s=press(s,"menu");
  const categoryIndex=FCV_MENU_CATEGORIES.indexOf(category);
  while(s.deviceState.overlay.categoryIndex!==categoryIndex)s=pad(s,"right");
  const target=getFcvMenuItems(category,s.deviceState).findIndex(x=>x.id===id);
  assert.ok(target>=0,"operator option missing: "+id);
  while(s.deviceState.overlay.itemIndex!==target)s=pad(s,"down");
  return press(s,"enter");
}

test("Diagnostics is visibly synthetic and never invents an installed firmware",()=>{
  let s=open(boot(),"System","system.diagnostics");
  assert.equal(s.deviceState.overlay?.kind,"diagnostics");
  assert.equal(s.deviceState.overlay?.simulated,true);
  assert.equal(s.deviceState.overlay?.firmwareInstalled,null);
  s=press(s,"menu");
  assert.equal(s.deviceState.overlay?.kind,"menu");
});

test("LCD test runs on simulated colors; restore requires explicit confirmation",()=>{
  let s=open(boot(),"System","system.lcdTest");
  assert.equal(s.deviceState.overlay?.kind,"lcd-test");
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay?.colorIndex,1);
  s=press(s,"menu");
  s=open(s,"System","system.restore");
  assert.equal(s.deviceState.overlay?.kind,"confirm-restore");
  s=press(s,"enter"); // default No cancels, not silent factory reset
  assert.equal(s.deviceState.overlay?.kind,"menu");
  s=open(s,"System","system.restore");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.pictureAdvance,"1x");
  assert.equal(s.deviceState.demoOn,true);
});

test("MARK refuses absent synthetic position and records deterministic waypoint when enabled",()=>{
  let s=press(boot(),"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,0);
  assert.match(s.deviceState.notice,/NO POSITION/);
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  assert.match(s.deviceState.notice,/WP001/);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("named virtual Bottom Disc ALARM1 two-condition cause acknowledges without clearing",()=>{
  let s=soundingBottomType();
  assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM1"]);
  assert.equal(s.deviceState.alarms.audible,true);
  s=press(s,"enter");
  assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM1"]);
  assert.equal(s.deviceState.alarms.audible,false);
});

test("FCV operator manual §1.18 any physical key silences sound, without suppressing the key action",()=>{
  function sounding(){
    return soundingBottomType();
  }
  // RANGE is intentionally unavailable while Bottom Disc. is active (§1.5).
  // MARK and MENU still acknowledge while honoring their own normal effects.
  for(const [key,expectedOverlay] of [["mark",null],["menu","menu"]]){
    let s=sounding();
    assert.equal(s.deviceState.alarms.audible,true);
    s=press(s,key);
    assert.equal(s.deviceState.alarms.audible,false,key+" must mute audible alarm");
    assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM1"]);
    assert.equal(s.deviceState.alarms.visualActive,true);
    assert.equal(s.deviceState.overlay?.kind??null,expectedOverlay,
      key+" still carries out its normal panel action");
    if(key==="mark")assert.match(s.deviceState.notice,/NO POSITION/);
    s=send(s,{kind:"tick",steps:1});
    assert.equal(s.deviceState.alarms.audible,false,"condition persisted but acknowledged");
  }
  let s=sounding();
  s=pad(s,"up");
  assert.equal(s.deviceState.alarms.audible,false,"TrackPad is a physical key too");
});
